import { useState } from 'react';
import { Copy, Check, Database, FileCode, Server, Shield, Download, FileArchive, FileText } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const phpFiles = [
  {
    id: 'config',
    name: 'config.php',
    path: 'config.php',
    icon: <Database size={16} />,
    description: 'Database Configuration & Helper Classes',
    code: `<?php
// ============================================
// API Verification System - Database Config
// File: config.php
// ============================================

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'api_verification');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// API Settings
define('API_VERSION', '1.0.0');
define('RATE_LIMIT', 1000);          // requests per minute
define('MAX_DEVICES', 5);            // max devices per license
define('TOKEN_EXPIRY', 86400);       // 24 hours in seconds
define('SECRET_KEY', 'change-this-secret-key-2024');
define('LOG_RETENTION_DAYS', 30);

// Paths
define('BASE_PATH', dirname(__FILE__));
define('LOG_PATH', BASE_PATH . '/logs/');

// CORS Settings
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory if not exists
if (!is_dir(LOG_PATH)) {
    mkdir(LOG_PATH, 0755, true);
}

// ============================================
// Database Connection Class (Singleton)
// ============================================
class Database {
    private $conn;
    private static $instance = null;
    
    private function __construct() {}
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        if ($this->conn === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ];
                $this->conn = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch(PDOException $e) {
                Response::error('Database connection failed', 500);
            }
        }
        return $this->conn;
    }
    
    private function __clone() {}
}

// ============================================
// Response Helper Class
// ============================================
class Response {
    public static function success($data = null, $message = 'Success', $code = 200) {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d\\TH:i:s\\Z'),
            'version' => API_VERSION
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public static function error($message = 'Error', $code = 400, $data = null) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d\\TH:i:s\\Z'),
            'version' => API_VERSION
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================
// Logger Class
// ============================================
class Logger {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    public function log($action, $status, $details = '', $apiKey = null, $licenseKey = null, $userId = null) {
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO activity_logs (action, api_key, license_key, user_id, ip_address, user_agent, status, details) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $action, $apiKey, $licenseKey, $userId,
                $this->getIP(),
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                $status, $details
            ]);
        } catch (Exception $e) {
            error_log('Logging failed: ' . $e->getMessage());
        }
    }
    
    public function getIP() {
        $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                return trim(explode(',', $_SERVER[$key])[0]);
            }
        }
        return '0.0.0.0';
    }
}

// ============================================
// Auth Helper (JWT)
// ============================================
class Auth {
    public static function generateToken($userId) {
        $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode([
            'user_id' => $userId,
            'exp' => time() + TOKEN_EXPIRY,
            'iat' => time()
        ]));
        $signature = hash_hmac('sha256', "$header.$payload", SECRET_KEY);
        return "$header.$payload.$signature";
    }
    
    public static function verifyToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        
        list($header, $payload, $signature) = $parts;
        $expectedSig = hash_hmac('sha256', "$header.$payload", SECRET_KEY);
        
        if (!hash_equals($expectedSig, $signature)) return false;
        
        $data = json_decode(base64_decode($payload), true);
        if (!$data || $data['exp'] < time()) return false;
        
        return $data;
    }
    
    public static function getBearerToken() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    public static function requireAuth() {
        $token = self::getBearerToken();
        if (!$token) Response::error('Authorization token required', 401);
        
        $data = self::verifyToken($token);
        if (!$data) Response::error('Invalid or expired token', 401);
        
        return $data;
    }
    
    public static function requireAdmin() {
        $data = self::requireAuth();
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ? AND role = 'admin' AND status = 'active'");
        $stmt->execute([$data['user_id']]);
        $user = $stmt->fetch();
        if (!$user) Response::error('Admin access required', 403);
        return $user;
    }
}

// ============================================
// Input Validation
// ============================================
class Validator {
    public static function sanitize($input) {
        if (is_string($input)) {
            return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
        }
        return $input;
    }
    
    public static function getInput() {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            return json_decode(file_get_contents('php://input'), true) ?? [];
        }
        return $_POST;
    }
    
    public static function required($data, $fields) {
        foreach ($fields as $field) {
            if (empty($data[$field])) {
                Response::error("Field '$field' is required", 400);
            }
        }
    }
}
?>`
  },
  {
    id: 'verify',
    name: 'api/verify.php',
    path: 'api/verify.php',
    icon: <Shield size={16} />,
    description: 'API Key Verification Endpoint',
    code: `<?php
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
    
    public function verify($apiKey, $ip = null) {
        $ip = $ip ?? $this->logger->getIP();
        
        try {
            // Check if IP is blocked
            if ($this->isIPBlocked($ip)) {
                $this->logger->log('IP Blocked', 'failed', 'Access denied', $apiKey);
                Response::error('Access denied: IP is blocked', 403);
            }
            
            // Get API key
            $key = $this->getApiKey($apiKey);
            if (!$key) {
                $this->logger->log('Key Not Found', 'failed', 'Invalid key', $apiKey);
                Response::error('Invalid API key', 401);
            }
            
            // Check status
            if ($key['status'] !== 'active') {
                $this->logger->log('Key Inactive', 'failed', "Status: {$key['status']}", $apiKey);
                Response::error("API key is {$key['status']}", 403);
            }
            
            // Check expiration
            if (strtotime($key['expires_at']) < time()) {
                $this->updateKeyStatus($key['id'], 'expired');
                $this->logger->log('Key Expired', 'failed', 'Expired', $apiKey);
                Response::error('API key expired on ' . $key['expires_at'], 403);
            }
            
            // Check rate limit
            if ($this->isRateLimited($apiKey, $key['rate_limit'])) {
                $this->logger->log('Rate Limited', 'warning', 'Limit exceeded', $apiKey);
                Response::error('Rate limit exceeded', 429, ['retry_after' => 60]);
            }
            
            // Check request limit
            if ($key['request_count'] >= $key['request_limit']) {
                $this->logger->log('Request Limit', 'warning', 'Limit reached', $apiKey);
                Response::error('Request limit exceeded', 429);
            }
            
            // Check allowed IPs
            if (!empty($key['allowed_ips']) && !$this->isIPAllowed($ip, $key['allowed_ips'])) {
                $this->logger->log('IP Not Allowed', 'failed', "IP: $ip", $apiKey);
                Response::error('IP not authorized', 403);
            }
            
            // All checks passed
            $this->updateKeyUsage($key['id']);
            $this->incrementRateLimit($apiKey, $ip);
            
            $responseTime = round((microtime(true) - $this->startTime) * 1000, 2);
            
            $this->logger->log('Verified', 'success', 'Key valid', $apiKey);
            
            Response::success([
                'key_name' => $key['name'],
                'status' => $key['status'],
                'permissions' => json_decode($key['permissions'] ?? '["read"]'),
                'requests_used' => $key['request_count'] + 1,
                'requests_limit' => $key['request_limit'],
                'requests_remaining' => $key['request_limit'] - $key['request_count'] - 1,
                'rate_limit' => $key['rate_limit'] . ' req/min',
                'expires_at' => $key['expires_at'],
                'verified_at' => date('Y-m-d H:i:s'),
                'response_time' => $responseTime . 'ms',
                'ip' => $ip
            ], 'API key is valid');
            
        } catch (Exception $e) {
            $this->logger->log('Error', 'error', $e->getMessage(), $apiKey);
            Response::error('Server error', 500);
        }
    }
    
    public function getStats($apiKey) {
        $key = $this->getApiKey($apiKey);
        if (!$key) Response::error('Invalid API key', 401);
        
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as total, 
                    SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
             FROM activity_logs WHERE api_key = ? AND DATE(created_at) = CURDATE()"
        );
        $stmt->execute([$apiKey]);
        $today = $stmt->fetch();
        
        Response::success([
            'key_name' => $key['name'],
            'total_requests' => $key['request_count'],
            'request_limit' => $key['request_limit'],
            'usage_percentage' => round(($key['request_count'] / $key['request_limit']) * 100, 2),
            'today' => $today
        ]);
    }
    
    private function getApiKey($apiKey) {
        $stmt = $this->db->prepare("SELECT * FROM api_keys WHERE api_key = ?");
        $stmt->execute([$apiKey]);
        return $stmt->fetch();
    }
    
    private function isIPBlocked($ip) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM blocked_ips WHERE ip_address = ?");
        $stmt->execute([$ip]);
        return $stmt->fetchColumn() > 0;
    }
    
    private function isRateLimited($apiKey, $limit) {
        $this->db->prepare("DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 MINUTE)")->execute();
        $stmt = $this->db->prepare("SELECT COALESCE(SUM(request_count),0) FROM rate_limits WHERE api_key = ? AND window_start > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
        $stmt->execute([$apiKey]);
        return $stmt->fetchColumn() >= $limit;
    }
    
    private function isIPAllowed($ip, $allowedIPs) {
        return in_array($ip, array_map('trim', explode(',', $allowedIPs)));
    }
    
    private function updateKeyUsage($keyId) {
        $stmt = $this->db->prepare("UPDATE api_keys SET request_count = request_count + 1, last_used_at = NOW() WHERE id = ?");
        $stmt->execute([$keyId]);
    }
    
    private function updateKeyStatus($keyId, $status) {
        $stmt = $this->db->prepare("UPDATE api_keys SET status = ? WHERE id = ?");
        $stmt->execute([$status, $keyId]);
    }
    
    private function incrementRateLimit($apiKey, $ip) {
        $stmt = $this->db->prepare("INSERT INTO rate_limits (api_key, ip_address, request_count, window_start) VALUES (?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE request_count = request_count + 1");
        $stmt->execute([$apiKey, $ip]);
    }
}

// Handle Request
$method = $_SERVER['REQUEST_METHOD'];
$input = Validator::getInput();
$verifier = new APIVerifier();

if ($method === 'POST' || $method === 'GET') {
    $action = $input['action'] ?? $_GET['action'] ?? 'verify';
    $apiKey = $input['api_key'] ?? $_GET['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? null;
    $ip = $input['ip'] ?? $_GET['ip'] ?? null;
    
    if (!$apiKey) Response::error('API key required', 400);
    
    match($action) {
        'verify' => $verifier->verify($apiKey, $ip),
        'stats' => $verifier->getStats($apiKey),
        default => Response::error("Unknown action: $action", 400)
    };
} else {
    Response::error('Method not allowed', 405);
}
?>`
  },
  {
    id: 'license',
    name: 'api/license.php',
    path: 'api/license.php',
    icon: <FileCode size={16} />,
    description: 'License Verification & Device Management',
    code: `<?php
// ============================================
// License Verification Endpoint
// File: api/license.php
// Method: POST
// Actions: verify, activate, deactivate, check
// ============================================

require_once __DIR__ . '/../config.php';

class LicenseManager {
    private $db;
    private $logger;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->logger = new Logger();
    }
    
    public function verify($licenseKey, $deviceId = null, $deviceName = null) {
        $license = $this->getLicense($licenseKey);
        if (!$license) {
            $this->logger->log('License Not Found', 'failed', 'Invalid key', null, $licenseKey);
            Response::error('Invalid license key', 401);
        }
        
        if ($license['status'] !== 'active') {
            Response::error("License is {$license['status']}", 403);
        }
        
        // Check expiration
        if ($license['license_type'] !== 'lifetime' && strtotime($license['expires_at']) < time()) {
            $this->updateStatus($license['id'], 'expired');
            Response::error('License expired on ' . $license['expires_at'], 403);
        }
        
        // Device handling
        $deviceInfo = null;
        if ($deviceId) {
            $existing = $this->getDevice($license['id'], $deviceId);
            if ($existing) {
                $this->updateDeviceActive($existing['id']);
                $deviceInfo = ['device_id' => $deviceId, 'status' => 'registered'];
            } else {
                if ($license['active_devices'] >= $license['max_devices']) {
                    Response::error('Max devices reached (' . $license['max_devices'] . ')', 403);
                }
                $this->registerDevice($license['id'], $deviceId, $deviceName);
                $deviceInfo = ['device_id' => $deviceId, 'status' => 'new'];
            }
        }
        
        $devices = $this->getDevices($license['id']);
        $this->logger->log('License Verified', 'success', 'Valid', null, $licenseKey);
        
        Response::success([
            'license_key' => $licenseKey,
            'product' => $license['product_name'],
            'type' => $license['license_type'],
            'status' => $license['status'],
            'expires_at' => $license['license_type'] === 'lifetime' ? 'Never' : $license['expires_at'],
            'max_devices' => $license['max_devices'],
            'active_devices' => $license['active_devices'],
            'devices' => $devices,
            'device' => $deviceInfo,
            'verified_at' => date('Y-m-d H:i:s')
        ], 'License is valid');
    }
    
    public function activate($licenseKey, $deviceId, $deviceName = null) {
        $license = $this->getLicense($licenseKey);
        if (!$license) Response::error('Invalid license key', 401);
        if ($license['status'] !== 'active') Response::error('License not active', 403);
        
        $existing = $this->getDevice($license['id'], $deviceId);
        if ($existing) Response::success(['already_registered' => true], 'Device already registered');
        
        if ($license['active_devices'] >= $license['max_devices']) {
            Response::error('Max device limit reached', 403);
        }
        
        $this->registerDevice($license['id'], $deviceId, $deviceName);
        $this->logger->log('Device Activated', 'success', "Device: $deviceId", null, $licenseKey);
        
        Response::success([
            'license_key' => $licenseKey,
            'device_id' => $deviceId,
            'activated_at' => date('Y-m-d H:i:s')
        ], 'License activated');
    }
    
    public function deactivate($licenseKey, $deviceId) {
        $license = $this->getLicense($licenseKey);
        if (!$license) Response::error('Invalid license key', 401);
        
        $device = $this->getDevice($license['id'], $deviceId);
        if (!$device) Response::error('Device not found', 404);
        
        $this->removeDevice($device['id']);
        $stmt = $this->db->prepare("UPDATE licenses SET active_devices = GREATEST(0, active_devices - 1) WHERE id = ?");
        $stmt->execute([$license['id']]);
        
        $this->logger->log('Device Deactivated', 'success', "Device: $deviceId", null, $licenseKey);
        Response::success(null, 'Device deactivated');
    }
    
    public function checkStatus($licenseKey) {
        $license = $this->getLicense($licenseKey);
        if (!$license) Response::error('Invalid license key', 401);
        
        Response::success([
            'license_key' => $licenseKey,
            'product' => $license['product_name'],
            'type' => $license['license_type'],
            'status' => $license['status'],
            'expires_at' => $license['expires_at'],
            'max_devices' => $license['max_devices'],
            'active_devices' => $license['active_devices'],
            'devices' => $this->getDevices($license['id']),
            'days_remaining' => $license['license_type'] === 'lifetime' ? -1 : max(0, (strtotime($license['expires_at']) - time()) / 86400)
        ]);
    }
    
    private function getLicense($key) {
        $stmt = $this->db->prepare("SELECT * FROM licenses WHERE license_key = ?");
        $stmt->execute([$key]);
        return $stmt->fetch();
    }
    
    private function getDevice($licenseId, $deviceId) {
        $stmt = $this->db->prepare("SELECT * FROM license_devices WHERE license_id = ? AND device_id = ?");
        $stmt->execute([$licenseId, $deviceId]);
        return $stmt->fetch();
    }
    
    private function getDevices($licenseId) {
        $stmt = $this->db->prepare("SELECT * FROM license_devices WHERE license_id = ? ORDER BY activated_at DESC");
        $stmt->execute([$licenseId]);
        return $stmt->fetchAll();
    }
    
    private function registerDevice($licenseId, $deviceId, $deviceName = null) {
        $stmt = $this->db->prepare("INSERT INTO license_devices (license_id, device_id, device_name, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$licenseId, $deviceId, $deviceName, $this->logger->getIP(), $_SERVER['HTTP_USER_AGENT'] ?? '']);
        $stmt = $this->db->prepare("UPDATE licenses SET active_devices = active_devices + 1 WHERE id = ?");
        $stmt->execute([$licenseId]);
    }
    
    private function updateDeviceActive($id) {
        $stmt = $this->db->prepare("UPDATE license_devices SET last_active = NOW() WHERE id = ?");
        $stmt->execute([$id]);
    }
    
    private function removeDevice($id) {
        $stmt = $this->db->prepare("DELETE FROM license_devices WHERE id = ?");
        $stmt->execute([$id]);
    }
    
    private function updateStatus($id, $status) {
        $stmt = $this->db->prepare("UPDATE licenses SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
    }
}

// Handle Request
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') Response::error('Use POST', 405);

$input = Validator::getInput();
$action = $input['action'] ?? 'verify';
$manager = new LicenseManager();

match($action) {
    'verify' => $manager->verify($input['license_key'] ?? null, $input['device_id'] ?? null, $input['device_name'] ?? null),
    'activate' => $manager->activate($input['license_key'] ?? null, $input['device_id'] ?? null, $input['device_name'] ?? null),
    'deactivate' => $manager->deactivate($input['license_key'] ?? null, $input['device_id'] ?? null),
    'check' => $manager->checkStatus($input['license_key'] ?? null),
    default => Response::error("Unknown action: $action", 400)
};
?>`
  },
  {
    id: 'admin',
    name: 'api/admin.php',
    path: 'api/admin.php',
    icon: <Server size={16} />,
    description: 'Admin API - Full Management System',
    code: `<?php
// ============================================
// Admin API - Complete Management System
// File: api/admin.php
// Requires: Bearer Token (Admin)
// ============================================

require_once __DIR__ . '/../config.php';

class AdminAPI {
    private $db;
    private $logger;
    private $admin;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->logger = new Logger();
        $this->admin = Auth::requireAdmin();
    }
    
    // === API KEY MANAGEMENT ===
    
    public function generateKey($data) {
        Validator::required($data, ['user_id', 'name']);
        $prefix = ($data['type'] ?? 'live') === 'test' ? 'ak_test_' : 'ak_live_';
        $apiKey = $prefix . bin2hex(random_bytes(10));
        
        $stmt = $this->db->prepare("INSERT INTO api_keys (user_id, api_key, name, request_limit, rate_limit, permissions, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$data['user_id'], $apiKey, $data['name'], $data['request_limit'] ?? 100000, $data['rate_limit'] ?? 1000, json_encode($data['permissions'] ?? ['read']), $data['expires_at'] ?? date('Y-m-d', strtotime('+1 year'))]);
        
        $this->logger->log('Key Generated', 'success', $apiKey, $apiKey, null, $this->admin['id']);
        Response::success(['api_key' => $apiKey, 'id' => $this->db->lastInsertId()], 'Key generated', 201);
    }
    
    public function revokeKey($data) {
        Validator::required($data, ['id']);
        $stmt = $this->db->prepare("UPDATE api_keys SET status = 'inactive' WHERE id = ?");
        $stmt->execute([$data['id']]);
        $this->logger->log('Key Revoked', 'success', "ID: {$data['id']}", null, null, $this->admin['id']);
        Response::success(null, 'Key revoked');
    }
    
    public function deleteKey($data) {
        Validator::required($data, ['id']);
        $stmt = $this->db->prepare("DELETE FROM api_keys WHERE id = ?");
        $stmt->execute([$data['id']]);
        Response::success(null, 'Key deleted');
    }
    
    public function getKeys($page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        $stmt = $this->db->prepare("SELECT ak.*, u.name as user_name FROM api_keys ak JOIN users u ON ak.user_id = u.id ORDER BY ak.created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        $total = $this->db->query("SELECT COUNT(*) FROM api_keys")->fetchColumn();
        Response::success(['keys' => $stmt->fetchAll(), 'total' => (int)$total, 'page' => $page]);
    }
    
    // === LICENSE MANAGEMENT ===
    
    public function createLicense($data) {
        Validator::required($data, ['user_id', 'product_name', 'license_type']);
        $seg = fn() => strtoupper(bin2hex(random_bytes(2)));
        $licenseKey = "LIC-" . date('Y') . "-{$seg()}-{$seg()}-{$seg()}";
        
        $stmt = $this->db->prepare("INSERT INTO licenses (license_key, product_name, license_type, user_id, max_devices, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$licenseKey, $data['product_name'], $data['license_type'], $data['user_id'], $data['max_devices'] ?? 5, $data['expires_at'] ?? date('Y-m-d', strtotime('+1 month'))]);
        
        $this->logger->log('License Created', 'success', $licenseKey, null, $licenseKey, $this->admin['id']);
        Response::success(['license_key' => $licenseKey, 'id' => $this->db->lastInsertId()], 'License created', 201);
    }
    
    public function getLicenses($page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        $stmt = $this->db->prepare("SELECT l.*, u.name as user_name FROM licenses l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        $total = $this->db->query("SELECT COUNT(*) FROM licenses")->fetchColumn();
        Response::success(['licenses' => $stmt->fetchAll(), 'total' => (int)$total]);
    }
    
    // === USER MANAGEMENT ===
    
    public function createUser($data) {
        Validator::required($data, ['name', 'email', 'password']);
        $hash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $this->db->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        try {
            $stmt->execute([$data['name'], $data['email'], $hash, $data['role'] ?? 'user']);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) Response::error('Email already exists', 409);
            throw $e;
        }
        Response::success(['id' => $this->db->lastInsertId()], 'User created', 201);
    }
    
    public function getUsers($page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        $stmt = $this->db->prepare("SELECT id, name, email, role, status, created_at, last_login FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        $total = $this->db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        Response::success(['users' => $stmt->fetchAll(), 'total' => (int)$total]);
    }
    
    // === SECURITY ===
    
    public function blockIP($data) {
        Validator::required($data, ['ip']);
        $stmt = $this->db->prepare("INSERT INTO blocked_ips (ip_address, reason, blocked_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?");
        $stmt->execute([$data['ip'], $data['reason'] ?? 'Blocked', $this->admin['id'], $data['reason'] ?? 'Blocked']);
        $this->logger->log('IP Blocked', 'success', $data['ip'], null, null, $this->admin['id']);
        Response::success(['ip' => $data['ip']], 'IP blocked');
    }
    
    public function unblockIP($data) {
        Validator::required($data, ['ip']);
        $stmt = $this->db->prepare("DELETE FROM blocked_ips WHERE ip_address = ?");
        $stmt->execute([$data['ip']]);
        Response::success(['ip' => $data['ip']], 'IP unblocked');
    }
    
    // === STATISTICS ===
    
    public function getStats() {
        $stats = [];
        $stats['active_keys'] = (int)$this->db->query("SELECT COUNT(*) FROM api_keys WHERE status='active'")->fetchColumn();
        $stats['total_requests'] = (int)$this->db->query("SELECT COALESCE(SUM(request_count),0) FROM api_keys")->fetchColumn();
        $stats['active_licenses'] = (int)$this->db->query("SELECT COUNT(*) FROM licenses WHERE status='active'")->fetchColumn();
        $stats['active_users'] = (int)$this->db->query("SELECT COUNT(*) FROM users WHERE status='active'")->fetchColumn();
        $stats['today_requests'] = (int)$this->db->query("SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at)=CURDATE()")->fetchColumn();
        $stats['blocked_ips'] = (int)$this->db->query("SELECT COUNT(*) FROM blocked_ips")->fetchColumn();
        
        // Chart data
        $stmt = $this->db->query("SELECT DATE(created_at) as date, COUNT(*) as total, SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success FROM activity_logs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date");
        $stats['chart'] = $stmt->fetchAll();
        
        Response::success($stats);
    }
    
    public function getLogs($page = 1, $limit = 50) {
        $offset = ($page - 1) * $limit;
        $stmt = $this->db->prepare("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        Response::success(['logs' => $stmt->fetchAll(), 'page' => $page]);
    }
    
    // === AUTH ===
    
    public function login($data) {
        Validator::required($data, ['email', 'password']);
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Invalid credentials', 401);
        }
        
        $this->db->prepare("UPDATE users SET login_attempts=0, last_login=NOW() WHERE id=?")->execute([$user['id']]);
        $token = Auth::generateToken($user['id']);
        
        Response::success(['token' => $token, 'user' => ['id' => $user['id'], 'name' => $user['name'], 'role' => $user['role']]], 'Login successful');
    }
}

// Route Handling
$input = Validator::getInput();
$action = $_GET['action'] ?? $input['action'] ?? '';
$page = (int)($_GET['page'] ?? 1);
$limit = (int)($_GET['limit'] ?? 20);

// Login (no auth required)
if ($action === 'login') {
    $db = Database::getInstance()->getConnection();
    Validator::required($input, ['email', 'password']);
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($input['password'], $user['password'])) Response::error('Invalid credentials', 401);
    $token = Auth::generateToken($user['id']);
    Response::success(['token' => $token, 'user' => ['id' => $user['id'], 'name' => $user['name'], 'role' => $user['role']]]);
    exit;
}

$admin = new AdminAPI();

match($action) {
    'generate_key' => $admin->generateKey($input),
    'revoke_key' => $admin->revokeKey($input),
    'delete_key' => $admin->deleteKey($input),
    'get_keys' => $admin->getKeys($page, $limit),
    'create_license' => $admin->createLicense($input),
    'get_licenses' => $admin->getLicenses($page, $limit),
    'create_user' => $admin->createUser($input),
    'get_users' => $admin->getUsers($page, $limit),
    'block_ip' => $admin->blockIP($input),
    'unblock_ip' => $admin->unblockIP($input),
    'stats' => $admin->getStats(),
    'get_logs' => $admin->getLogs($page, $limit),
    default => Response::error("Unknown action: $action", 400)
};
?>`
  },
  {
    id: 'htaccess',
    name: '.htaccess',
    path: '.htaccess',
    icon: <Server size={16} />,
    description: 'Apache Security Configuration',
    code: `# API Verification System - Apache Config
RewriteEngine On
RewriteBase /

# API Routes
RewriteRule ^api/verify/?$ api/verify.php [L,QSA]
RewriteRule ^api/license/?$ api/license.php [L,QSA]
RewriteRule ^api/admin/?$ api/admin.php [L,QSA]

# Security
Options -Indexes

<Files "config.php">
    Require all denied
</Files>

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# CORS
<IfModule mod_headers.c>
    <FilesMatch "\\.(php)$">
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key"
    </FilesMatch>
</IfModule>`
  },
  {
    id: 'readme',
    name: 'README.md',
    path: 'README.md',
    icon: <FileText size={16} />,
    description: 'Installation & Usage Guide',
    code: `# API Verification System - PHP & MySQL

## Installation

1. Import database.sql into MySQL
2. Update config.php with your DB credentials
3. Upload files to your server
4. Set permissions: chmod 755 logs/

## API Endpoints

### Verify API Key
POST /api/verify
Body: {"api_key": "ak_live_xxx"}

### Verify License  
POST /api/license
Body: {"action": "verify", "license_key": "LIC-xxx", "device_id": "xxx"}

### Admin Login
POST /api/admin?action=login
Body: {"email": "admin@site.com", "password": "xxx"}

## Default Credentials
- Email: admin@apiverify.com
- Password: admin123

## Requirements
- PHP 7.4+
- MySQL 5.7+
- Apache with mod_rewrite`
  }
];

export default function PhpCode() {
  const [activeFile, setActiveFile] = useState(phpFiles[0].id);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<'zip' | 'sql' | null>(null);

  const currentFile = phpFiles.find(f => f.id === activeFile)!;

  const copyCode = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSQL = async () => {
    setDownloading('sql');
    try {
      const response = await fetch('/api_verification_database.sql');
      const blob = await response.blob();
      saveAs(blob, 'api_verification_database.sql');
    } catch (error) {
      alert('Failed to download SQL file');
    }
    setDownloading(null);
  };

  const downloadZIP = async () => {
    setDownloading('zip');
    try {
      const zip = new JSZip();
      const folder = zip.folder('api-verification-system');
      
      if (!folder) throw new Error('Failed to create ZIP folder');

      // Add all PHP files
      for (const file of phpFiles) {
        folder.file(file.path, file.code);
      }

      // Add SQL file
      const sqlResponse = await fetch('/api_verification_database.sql');
      const sqlContent = await sqlResponse.text();
      folder.file('database.sql', sqlContent);

      // Generate ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'api-verification-system.zip');
    } catch (error) {
      console.error('ZIP error:', error);
      alert('Failed to create ZIP file. Please try again.');
    }
    setDownloading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">PHP Backend Code</h1>
          <p className="text-gray-400 mt-1">Complete PHP & MySQL source code - Ready to deploy</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn-primary flex items-center gap-2" 
            onClick={downloadSQL}
            disabled={downloading !== null}
          >
            {downloading === 'sql' ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Download size={18} />
            )}
            Download SQL
          </button>
          <button 
            className="btn-success flex items-center gap-2" 
            onClick={downloadZIP}
            disabled={downloading !== null}
          >
            {downloading === 'zip' ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <FileArchive size={18} />
            )}
            Download ZIP
          </button>
        </div>
      </div>

      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 cursor-pointer hover:border-blue-400/40 transition-all" onClick={downloadSQL}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Database size={28} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">Database SQL File</h3>
              <p className="text-gray-400 text-sm">Complete MySQL schema with tables, views, procedures & events</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge bg-blue-500/20 text-blue-400">.sql</span>
                <span className="text-xs text-gray-500">7 tables • 4 procedures • 3 events • 3 views</span>
              </div>
            </div>
            <Download size={20} className="text-blue-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 cursor-pointer hover:border-green-400/40 transition-all" onClick={downloadZIP}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
              <FileArchive size={28} className="text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">Complete Source ZIP</h3>
              <p className="text-gray-400 text-sm">All PHP files + SQL + .htaccess + README</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge bg-green-500/20 text-green-400">.zip</span>
                <span className="text-xs text-gray-500">6 files • Ready to deploy</span>
              </div>
            </div>
            <Download size={20} className="text-green-400" />
          </div>
        </div>
      </div>

      {/* Installation Guide */}
      <div className="card bg-blue-500/5 border-blue-500/20">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">📋 Quick Installation Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">1</span>
              <p className="text-sm text-gray-300">Download the ZIP file and extract it</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">2</span>
              <p className="text-sm text-gray-300">Import <code className="bg-gray-700 px-1 rounded text-xs">database.sql</code> into MySQL</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">3</span>
              <p className="text-sm text-gray-300">Edit <code className="bg-gray-700 px-1 rounded text-xs">config.php</code> with your DB credentials</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">4</span>
              <p className="text-sm text-gray-300">Upload files to your web server</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">5</span>
              <p className="text-sm text-gray-300">Set permissions: <code className="bg-gray-700 px-1 rounded text-xs">chmod 755 logs/</code></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">6</span>
              <p className="text-sm text-gray-300">Login: admin@apiverify.com / admin123</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-3">SOURCE FILES</h3>
          {phpFiles.map((file) => (
            <div
              key={file.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${activeFile === file.id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'}`}
              onClick={() => setActiveFile(file.id)}
            >
              <div className="flex items-center gap-2">
                <span className={activeFile === file.id ? 'text-blue-400' : 'text-gray-400'}>{file.icon}</span>
                <span className={`text-sm font-medium ${activeFile === file.id ? 'text-blue-400' : 'text-gray-300'}`}>{file.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">{file.description}</p>
            </div>
          ))}
        </div>

        {/* Code Display */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-gray-400">{currentFile.name}</span>
              </div>
              <button onClick={copyCode} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700">
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm text-gray-300 max-h-[600px] overflow-y-auto bg-gray-900">
              <code>{currentFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
