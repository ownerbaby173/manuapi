<?php
// ============================================
// API Key Verification Endpoint
// File: api/verify.php
// Method: POST, GET
// ============================================

require_once __DIR__ . '/../config.php';

class APIVerifier {
    private $db;
    private $logger;
    private $startTime;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->logger = new Logger();
        $this->startTime = microtime(true);
    }
    
    /**
     * Main verification method
     * @param string $apiKey - The API key to verify
     * @param string|null $ip - Optional IP to check against
     * @return void
     */
    public function verify($apiKey, $ip = null) {
        $ip = $ip ?? $this->logger->getIP();
        $responseTime = 0;
        
        try {
            // Step 1: Check if IP is blocked
            if ($this->isIPBlocked($ip)) {
                $this->logger->log('IP Blocked', 'failed', 'Access denied: IP is blocked', $apiKey);
                $responseTime = $this->getResponseTime();
                Response::error('Access denied: Your IP address has been blocked', 403, [
                    'ip' => $ip,
                    'response_time' => $responseTime
                ]);
            }
            
            // Step 2: Validate API Key format
            if (!$this->isValidKeyFormat($apiKey)) {
                $this->logger->log('Invalid Format', 'failed', 'Invalid API key format', $apiKey);
                Response::error('Invalid API key format', 400);
            }
            
            // Step 3: Get API key from database
            $key = $this->getApiKey($apiKey);
            if (!$key) {
                $this->logger->log('Key Not Found', 'failed', 'API key not found in database', $apiKey);
                Response::error('Invalid API key', 401);
            }
            
            // Step 4: Check key status
            if ($key['status'] === 'suspended') {
                $this->logger->log('Key Suspended', 'failed', 'API key is suspended', $apiKey);
                Response::error('API key has been suspended', 403);
            }
            
            if ($key['status'] === 'inactive') {
                $this->logger->log('Key Inactive', 'failed', 'API key is inactive', $apiKey);
                Response::error('API key is inactive', 403);
            }
            
            // Step 5: Check expiration
            if (strtotime($key['expires_at']) < time()) {
                $this->updateKeyStatus($key['id'], 'expired');
                $this->logger->log('Key Expired', 'failed', 'API key has expired', $apiKey);
                Response::error('API key has expired on ' . $key['expires_at'], 403, [
                    'expired_at' => $key['expires_at']
                ]);
            }
            
            // Step 6: Check rate limit
            if ($this->isRateLimited($apiKey, $key['rate_limit'])) {
                $this->logger->log('Rate Limited', 'warning', 'Rate limit exceeded', $apiKey);
                Response::error('Rate limit exceeded. Please try again later.', 429, [
                    'limit' => $key['rate_limit'],
                    'retry_after' => 60
                ]);
            }
            
            // Step 7: Check request limit
            if ($key['request_count'] >= $key['request_limit']) {
                $this->logger->log('Request Limit', 'warning', 'Request limit exceeded', $apiKey);
                Response::error('API request limit exceeded', 429, [
                    'used' => $key['request_count'],
                    'limit' => $key['request_limit']
                ]);
            }
            
            // Step 8: Check allowed IPs (if configured)
            if (!empty($key['allowed_ips'])) {
                if (!$this->isIPAllowed($ip, $key['allowed_ips'])) {
                    $this->logger->log('IP Not Allowed', 'failed', "IP $ip not in allowed list", $apiKey);
                    Response::error('IP address not authorized for this API key', 403);
                }
            }
            
            // Step 9: Check blocked IPs for this key
            if (!empty($key['blocked_ips'])) {
                if ($this->isIPInList($ip, $key['blocked_ips'])) {
                    $this->logger->log('IP Key Blocked', 'failed', "IP $ip blocked for this key", $apiKey);
                    Response::error('Your IP is blocked for this API key', 403);
                }
            }
            
            // Step 10: All checks passed - Update usage
            $this->updateKeyUsage($key['id']);
            $this->incrementRateLimit($apiKey, $ip);
            
            // Build success response
            $responseTime = $this->getResponseTime();
            $permissions = json_decode($key['permissions'] ?? '["read"]', true);
            
            $this->logger->log('Verified', 'success', 'API key verified successfully', $apiKey);
            
            Response::success([
                'key_name' => $key['name'],
                'status' => $key['status'],
                'permissions' => $permissions,
                'requests_used' => $key['request_count'] + 1,
                'requests_limit' => $key['request_limit'],
                'requests_remaining' => $key['request_limit'] - $key['request_count'] - 1,
                'rate_limit' => $key['rate_limit'] . ' req/min',
                'expires_at' => $key['expires_at'],
                'verified_at' => date('Y-m-d H:i:s'),
                'response_time' => $responseTime . 'ms',
                'ip' => $ip
            ], 'API key is valid and active');
            
        } catch (Exception $e) {
            $this->logger->log('Server Error', 'error', $e->getMessage(), $apiKey);
            Response::error('Internal server error', 500);
        }
    }
    
    /**
     * Check API key usage statistics
     */
    public function getStats($apiKey) {
        $key = $this->getApiKey($apiKey);
        if (!$key) {
            Response::error('Invalid API key', 401);
        }
        
        // Get detailed stats
        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(*) as total_today,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_today,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_today
             FROM activity_logs 
             WHERE api_key = ? AND DATE(created_at) = CURDATE()"
        );
        $stmt->execute([$apiKey]);
        $todayStats = $stmt->fetch();
        
        Response::success([
            'key_name' => $key['name'],
            'status' => $key['status'],
            'total_requests' => $key['request_count'],
            'request_limit' => $key['request_limit'],
            'usage_percentage' => round(($key['request_count'] / $key['request_limit']) * 100, 2),
            'rate_limit' => $key['rate_limit'],
            'expires_at' => $key['expires_at'],
            'last_used' => $key['last_used_at'],
            'today' => [
                'total' => $todayStats['total_today'] ?? 0,
                'success' => $todayStats['success_today'] ?? 0,
                'failed' => $todayStats['failed_today'] ?? 0
            ]
        ]);
    }
    
    // Private helper methods
    
    private function getApiKey($apiKey) {
        $stmt = $this->db->prepare("SELECT * FROM api_keys WHERE api_key = ?");
        $stmt->execute([$apiKey]);
        return $stmt->fetch();
    }
    
    private function isValidKeyFormat($key) {
        return preg_match('/^ak_(live|test)_[a-zA-Z0-9]{10,}$/', $key);
    }
    
    private function isIPBlocked($ip) {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM blocked_ips 
             WHERE ip_address = ? 
             AND (block_type = 'permanent' OR blocked_until > NOW())"
        );
        $stmt->execute([$ip]);
        return $stmt->fetchColumn() > 0;
    }
    
    private function isRateLimited($apiKey, $limit) {
        // Clean old entries
        $this->db->prepare("DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 MINUTE)")->execute();
        
        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(request_count), 0) as total 
             FROM rate_limits 
             WHERE api_key = ? AND window_start > DATE_SUB(NOW(), INTERVAL 1 MINUTE)"
        );
        $stmt->execute([$apiKey]);
        $result = $stmt->fetch();
        return $result['total'] >= $limit;
    }
    
    private function isIPAllowed($ip, $allowedIPs) {
        $ips = array_map('trim', explode(',', $allowedIPs));
        return in_array($ip, $ips);
    }
    
    private function isIPInList($ip, $ipList) {
        $ips = array_map('trim', explode(',', $ipList));
        return in_array($ip, $ips);
    }
    
    private function updateKeyUsage($keyId) {
        $stmt = $this->db->prepare(
            "UPDATE api_keys SET request_count = request_count + 1, last_used_at = NOW() WHERE id = ?"
        );
        $stmt->execute([$keyId]);
    }
    
    private function updateKeyStatus($keyId, $status) {
        $stmt = $this->db->prepare("UPDATE api_keys SET status = ? WHERE id = ?");
        $stmt->execute([$status, $keyId]);
    }
    
    private function incrementRateLimit($apiKey, $ip) {
        $stmt = $this->db->prepare(
            "INSERT INTO rate_limits (api_key, ip_address, request_count, window_start) 
             VALUES (?, ?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE request_count = request_count + 1"
        );
        $stmt->execute([$apiKey, $ip]);
    }
    
    private function getResponseTime() {
        return round((microtime(true) - $this->startTime) * 1000, 2);
    }
}

// ============================================
// Handle Request
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
$input = Validator::getInput();

$verifier = new APIVerifier();

if ($method === 'POST' || $method === 'GET') {
    $action = $input['action'] ?? $_GET['action'] ?? 'verify';
    $apiKey = $input['api_key'] ?? $_GET['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? null;
    $ip = $input['ip'] ?? $_GET['ip'] ?? null;
    
    if (!$apiKey) {
        Response::error('API key is required. Send via X-API-Key header, api_key parameter, or POST body.', 400);
    }
    
    switch ($action) {
        case 'verify':
            $verifier->verify($apiKey, $ip);
            break;
        case 'stats':
            $verifier->getStats($apiKey);
            break;
        default:
            Response::error("Unknown action: $action", 400);
    }
} else {
    Response::error('Method not allowed. Use POST or GET.', 405);
}
?>
