<?php
// ============================================
// Admin API - Key & License Management
// File: api/admin.php
// Method: POST (all operations)
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
    
    // ============================================
    // API KEY MANAGEMENT
    // ============================================
    
    /**
     * Generate a new API key
     */
    public function generateKey($data) {
        Validator::required($data, ['user_id', 'name']);
        
        $prefix = ($data['type'] ?? 'live') === 'test' ? 'ak_test_' : 'ak_live_';
        $apiKey = $prefix . bin2hex(random_bytes(10));
        
        $stmt = $this->db->prepare(
            "INSERT INTO api_keys (user_id, api_key, name, description, request_limit, rate_limit, allowed_ips, permissions, expires_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['user_id'],
            $apiKey,
            Validator::sanitize($data['name']),
            $data['description'] ?? null,
            $data['request_limit'] ?? 100000,
            $data['rate_limit'] ?? 1000,
            $data['allowed_ips'] ?? null,
            json_encode($data['permissions'] ?? ['read']),
            $data['expires_at'] ?? date('Y-m-d', strtotime('+1 year'))
        ]);
        
        $this->logger->log('Key Generated', 'success', "New key: $apiKey", $apiKey, null, $this->admin['id']);
        
        Response::success([
            'id' => $this->db->lastInsertId(),
            'api_key' => $apiKey,
            'name' => $data['name'],
            'expires_at' => $data['expires_at'] ?? date('Y-m-d', strtotime('+1 year'))
        ], 'API key generated successfully', 201);
    }
    
    /**
     * Update API key
     */
    public function updateKey($data) {
        Validator::required($data, ['id']);
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['name', 'status', 'request_limit', 'rate_limit', 'allowed_ips', 'permissions', 'expires_at', 'description'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $field === 'permissions' ? json_encode($data[$field]) : $data[$field];
            }
        }
        
        if (empty($fields)) {
            Response::error('No fields to update', 400);
        }
        
        $values[] = $data['id'];
        $sql = "UPDATE api_keys SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);
        
        $this->logger->log('Key Updated', 'success', "Key ID {$data['id']} updated", null, null, $this->admin['id']);
        Response::success(null, 'API key updated successfully');
    }
    
    /**
     * Revoke (deactivate) API key
     */
    public function revokeKey($data) {
        Validator::required($data, ['id']);
        
        $stmt = $this->db->prepare("UPDATE api_keys SET status = 'inactive' WHERE id = ?");
        $stmt->execute([$data['id']]);
        
        $this->logger->log('Key Revoked', 'success', "Key ID {$data['id']} revoked", null, null, $this->admin['id']);
        Response::success(null, 'API key revoked successfully');
    }
    
    /**
     * Delete API key permanently
     */
    public function deleteKey($data) {
        Validator::required($data, ['id']);
        
        $stmt = $this->db->prepare("DELETE FROM api_keys WHERE id = ?");
        $stmt->execute([$data['id']]);
        
        $this->logger->log('Key Deleted', 'success', "Key ID {$data['id']} deleted", null, null, $this->admin['id']);
        Response::success(null, 'API key deleted successfully');
    }
    
    /**
     * Get all API keys with pagination
     */
    public function getKeys($page = 1, $limit = 20, $status = null) {
        $offset = ($page - 1) * $limit;
        $where = $status ? "WHERE ak.status = ?" : "";
        
        $stmt = $this->db->prepare(
            "SELECT ak.*, u.name as user_name, u.email as user_email 
             FROM api_keys ak 
             JOIN users u ON ak.user_id = u.id 
             $where
             ORDER BY ak.created_at DESC 
             LIMIT ? OFFSET ?"
        );
        
        if ($status) {
            $stmt->execute([$status, $limit, $offset]);
        } else {
            $stmt->execute([$limit, $offset]);
        }
        $keys = $stmt->fetchAll();
        
        // Total count
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM api_keys $where");
        $countStmt->execute($status ? [$status] : []);
        $total = $countStmt->fetchColumn();
        
        Response::success([
            'keys' => $keys,
            'pagination' => [
                'total' => (int)$total,
                'page' => (int)$page,
                'limit' => (int)$limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    // ============================================
    // LICENSE MANAGEMENT
    // ============================================
    
    /**
     * Create new license
     */
    public function createLicense($data) {
        Validator::required($data, ['user_id', 'product_name', 'license_type']);
        
        // Generate license key
        $segment = function() {
            return strtoupper(bin2hex(random_bytes(2)));
        };
        $licenseKey = 'LIC-' . date('Y') . '-' . $segment() . '-' . $segment() . '-' . $segment();
        
        $stmt = $this->db->prepare(
            "INSERT INTO licenses (license_key, product_name, license_type, user_id, max_devices, expires_at, price, currency, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $licenseKey,
            Validator::sanitize($data['product_name']),
            $data['license_type'],
            $data['user_id'],
            $data['max_devices'] ?? 5,
            $data['expires_at'] ?? $this->calculateExpiry($data['license_type']),
            $data['price'] ?? 0,
            $data['currency'] ?? 'USD',
            $data['notes'] ?? null
        ]);
        
        $this->logger->log('License Created', 'success', "License: $licenseKey", null, $licenseKey, $this->admin['id']);
        
        Response::success([
            'id' => $this->db->lastInsertId(),
            'license_key' => $licenseKey,
            'product_name' => $data['product_name'],
            'expires_at' => $data['expires_at'] ?? $this->calculateExpiry($data['license_type'])
        ], 'License created successfully', 201);
    }
    
    /**
     * Update license
     */
    public function updateLicense($data) {
        Validator::required($data, ['id']);
        
        $fields = [];
        $values = [];
        $allowedFields = ['status', 'max_devices', 'expires_at', 'notes', 'price'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            Response::error('No fields to update', 400);
        }
        
        $values[] = $data['id'];
        $sql = "UPDATE licenses SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);
        
        $this->logger->log('License Updated', 'success', "License ID {$data['id']} updated", null, null, $this->admin['id']);
        Response::success(null, 'License updated successfully');
    }
    
    /**
     * Get all licenses
     */
    public function getLicenses($page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->db->prepare(
            "SELECT l.*, u.name as user_name, u.email as user_email 
             FROM licenses l 
             JOIN users u ON l.user_id = u.id 
             ORDER BY l.created_at DESC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$limit, $offset]);
        $licenses = $stmt->fetchAll();
        
        $total = $this->db->query("SELECT COUNT(*) FROM licenses")->fetchColumn();
        
        Response::success([
            'licenses' => $licenses,
            'pagination' => [
                'total' => (int)$total,
                'page' => (int)$page,
                'limit' => (int)$limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    // ============================================
    // USER MANAGEMENT
    // ============================================
    
    /**
     * Create user
     */
    public function createUser($data) {
        Validator::required($data, ['name', 'email', 'password']);
        
        $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        
        $stmt = $this->db->prepare(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
        );
        
        try {
            $stmt->execute([
                Validator::sanitize($data['name']),
                filter_var($data['email'], FILTER_SANITIZE_EMAIL),
                $hashedPassword,
                $data['role'] ?? 'user'
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                Response::error('Email already exists', 409);
            }
            throw $e;
        }
        
        $this->logger->log('User Created', 'success', "User: {$data['email']}", null, null, $this->admin['id']);
        
        Response::success([
            'id' => $this->db->lastInsertId(),
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'] ?? 'user'
        ], 'User created successfully', 201);
    }
    
    /**
     * Get all users
     */
    public function getUsers($page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->db->prepare(
            "SELECT id, name, email, role, status, created_at, last_login,
                    (SELECT COUNT(*) FROM api_keys WHERE user_id = users.id) as api_keys_count,
                    (SELECT COUNT(*) FROM licenses WHERE user_id = users.id) as licenses_count
             FROM users 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$limit, $offset]);
        $users = $stmt->fetchAll();
        
        $total = $this->db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        
        Response::success([
            'users' => $users,
            'pagination' => [
                'total' => (int)$total,
                'page' => (int)$page,
                'limit' => (int)$limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    // ============================================
    // SECURITY
    // ============================================
    
    /**
     * Block an IP address
     */
    public function blockIP($data) {
        Validator::required($data, ['ip']);
        
        $stmt = $this->db->prepare(
            "INSERT INTO blocked_ips (ip_address, reason, block_type, blocked_by, blocked_until) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = ?, blocked_until = ?"
        );
        $stmt->execute([
            $data['ip'],
            $data['reason'] ?? 'Blocked by admin',
            $data['block_type'] ?? 'permanent',
            $this->admin['id'],
            $data['blocked_until'] ?? null,
            $data['reason'] ?? 'Blocked by admin',
            $data['blocked_until'] ?? null
        ]);
        
        $this->logger->log('IP Blocked', 'success', "IP {$data['ip']} blocked", null, null, $this->admin['id']);
        Response::success(['ip' => $data['ip']], 'IP blocked successfully');
    }
    
    /**
     * Unblock an IP address
     */
    public function unblockIP($data) {
        Validator::required($data, ['ip']);
        
        $stmt = $this->db->prepare("DELETE FROM blocked_ips WHERE ip_address = ?");
        $stmt->execute([$data['ip']]);
        
        $this->logger->log('IP Unblocked', 'success', "IP {$data['ip']} unblocked", null, null, $this->admin['id']);
        Response::success(['ip' => $data['ip']], 'IP unblocked successfully');
    }
    
    /**
     * Get blocked IPs
     */
    public function getBlockedIPs() {
        $stmt = $this->db->query(
            "SELECT b.*, u.name as blocked_by_name 
             FROM blocked_ips b 
             LEFT JOIN users u ON b.blocked_by = u.id 
             ORDER BY b.blocked_at DESC"
        );
        Response::success(['blocked_ips' => $stmt->fetchAll()]);
    }
    
    // ============================================
    // STATISTICS & REPORTS
    // ============================================
    
    /**
     * Get dashboard statistics
     */
    public function getStats() {
        $stats = [];
        
        // API Keys
        $stmt = $this->db->query("SELECT COUNT(*) FROM api_keys WHERE status = 'active'");
        $stats['active_keys'] = (int)$stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM api_keys");
        $stats['total_keys'] = (int)$stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT COALESCE(SUM(request_count), 0) FROM api_keys");
        $stats['total_requests'] = (int)$stmt->fetchColumn();
        
        // Licenses
        $stmt = $this->db->query("SELECT COUNT(*) FROM licenses WHERE status = 'active'");
        $stats['active_licenses'] = (int)$stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT COALESCE(SUM(price), 0) FROM licenses WHERE status = 'active'");
        $stats['revenue'] = (float)$stmt->fetchColumn();
        
        // Users
        $stmt = $this->db->query("SELECT COUNT(*) FROM users WHERE status = 'active'");
        $stats['active_users'] = (int)$stmt->fetchColumn();
        
        // Today's activity
        $stmt = $this->db->query(
            "SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at) = CURDATE()"
        );
        $stats['today_requests'] = (int)$stmt->fetchColumn();
        
        $stmt = $this->db->query(
            "SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at) = CURDATE() AND status = 'failed'"
        );
        $stats['today_failed'] = (int)$stmt->fetchColumn();
        
        // Blocked IPs
        $stmt = $this->db->query("SELECT COUNT(*) FROM blocked_ips");
        $stats['blocked_ips'] = (int)$stmt->fetchColumn();
        
        // Last 7 days chart data
        $stmt = $this->db->query(
            "SELECT DATE(created_at) as date, COUNT(*) as requests,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
             FROM activity_logs 
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC"
        );
        $stats['chart_data'] = $stmt->fetchAll();
        
        Response::success($stats);
    }
    
    /**
     * Get activity logs
     */
    public function getLogs($page = 1, $limit = 50, $status = null) {
        $offset = ($page - 1) * $limit;
        $where = $status ? "WHERE status = ?" : "";
        
        $stmt = $this->db->prepare(
            "SELECT * FROM activity_logs $where ORDER BY created_at DESC LIMIT ? OFFSET ?"
        );
        
        if ($status) {
            $stmt->execute([$status, $limit, $offset]);
        } else {
            $stmt->execute([$limit, $offset]);
        }
        
        $total = $this->db->query("SELECT COUNT(*) FROM activity_logs")->fetchColumn();
        
        Response::success([
            'logs' => $stmt->fetchAll(),
            'pagination' => [
                'total' => (int)$total,
                'page' => (int)$page,
                'limit' => (int)$limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    // ============================================
    // AUTH
    // ============================================
    
    /**
     * Admin login
     */
    public function login($data) {
        Validator::required($data, ['email', 'password']);
        
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'");
        $stmt->execute([filter_var($data['email'], FILTER_SANITIZE_EMAIL)]);
        $user = $stmt->fetch();
        
        if (!$user || !password_hash($data['password'], PASSWORD_BCRYPT)) {
            // Check if account is locked
            if ($user && $user['locked_until'] && strtotime($user['locked_until']) > time()) {
                Response::error('Account temporarily locked. Try again later.', 423);
            }
            
            // Increment login attempts
            if ($user) {
                $attempts = $user['login_attempts'] + 1;
                $lockedUntil = $attempts >= 5 ? date('Y-m-d H:i:s', strtotime('+15 minutes')) : null;
                $stmt = $this->db->prepare("UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?");
                $stmt->execute([$attempts, $lockedUntil, $user['id']]);
            }
            
            Response::error('Invalid email or password', 401);
        }
        
        if (!password_verify($data['password'], $user['password'])) {
            Response::error('Invalid email or password', 401);
        }
        
        if ($user['status'] !== 'active') {
            Response::error('Account is inactive', 403);
        }
        
        // Reset login attempts
        $stmt = $this->db->prepare("UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        $token = Auth::generateToken($user['id']);
        
        Response::success([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ],
            'expires_in' => TOKEN_EXPIRY
        ], 'Login successful');
    }
    
    // Helper methods
    
    private function calculateExpiry($type) {
        switch ($type) {
            case 'trial': return date('Y-m-d', strtotime('+14 days'));
            case 'monthly': return date('Y-m-d', strtotime('+1 month'));
            case 'quarterly': return date('Y-m-d', strtotime('+3 months'));
            case 'yearly': return date('Y-m-d', strtotime('+1 year'));
            case 'lifetime': return date('Y-m-d', strtotime('+100 years'));
            default: return date('Y-m-d', strtotime('+1 month'));
        }
    }
}

// ============================================
// Route Handling
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
$input = Validator::getInput();
$action = $_GET['action'] ?? $input['action'] ?? '';
$page = (int)($_GET['page'] ?? $input['page'] ?? 1);
$limit = (int)($_GET['limit'] ?? $input['limit'] ?? 20);

// Login doesn't require auth
if ($action === 'login') {
    $admin = new class {
        private $db;
        public function __construct() {
            $this->db = Database::getInstance()->getConnection();
        }
        public function login($data) {
            Validator::required($data, ['email', 'password']);
            $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$data['email']]);
            $user = $stmt->fetch();
            if (!$user || !password_verify($data['password'], $user['password'])) {
                Response::error('Invalid credentials', 401);
            }
            $token = Auth::generateToken($user['id']);
            Response::success(['token' => $token, 'user' => ['id' => $user['id'], 'name' => $user['name'], 'role' => $user['role']]]);
        }
    };
    $admin->login($input);
    exit;
}

$adminAPI = new AdminAPI();

switch ($action) {
    // API Keys
    case 'generate_key': $adminAPI->generateKey($input); break;
    case 'update_key': $adminAPI->updateKey($input); break;
    case 'revoke_key': $adminAPI->revokeKey($input); break;
    case 'delete_key': $adminAPI->deleteKey($input); break;
    case 'get_keys': $adminAPI->getKeys($page, $limit, $_GET['status'] ?? null); break;
    
    // Licenses
    case 'create_license': $adminAPI->createLicense($input); break;
    case 'update_license': $adminAPI->updateLicense($input); break;
    case 'get_licenses': $adminAPI->getLicenses($page, $limit); break;
    
    // Users
    case 'create_user': $adminAPI->createUser($input); break;
    case 'get_users': $adminAPI->getUsers($page, $limit); break;
    
    // Security
    case 'block_ip': $adminAPI->blockIP($input); break;
    case 'unblock_ip': $adminAPI->unblockIP($input); break;
    case 'get_blocked_ips': $adminAPI->getBlockedIPs(); break;
    
    // Stats & Logs
    case 'stats': $adminAPI->getStats(); break;
    case 'get_logs': $adminAPI->getLogs($page, $limit, $_GET['status'] ?? null); break;
    
    default:
        Response::error("Unknown action: $action", 400, [
            'available_actions' => [
                'generate_key', 'update_key', 'revoke_key', 'delete_key', 'get_keys',
                'create_license', 'update_license', 'get_licenses',
                'create_user', 'get_users',
                'block_ip', 'unblock_ip', 'get_blocked_ips',
                'stats', 'get_logs'
            ]
        ]);
}
?>
