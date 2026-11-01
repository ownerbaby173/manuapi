import { useState } from 'react';
import { Copy, Check, Database, FileCode, Server, Shield } from 'lucide-react';

const phpFiles = [
  {
    id: 'config',
    name: 'config.php',
    icon: <Database size={16} />,
    description: 'Database Configuration',
    code: `<?php
// ============================================
// API Verification System - Database Config
// ============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'api_verification');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// API Settings
define('API_VERSION', '1.0.0');
define('RATE_LIMIT', 1000);        // requests per minute
define('MAX_DEVICES', 5);          // max devices per license
define('TOKEN_EXPIRY', 86400);     // 24 hours in seconds
define('SECRET_KEY', 'your-secret-key-here');

// CORS Settings
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
header('Content-Type: application/json');

// Database Connection
class Database {
    private $conn;
    
    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $this->conn = new PDO($dsn, DB_USER, DB_PASS);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
        return $this->conn;
    }
}
?>`
  },
  {
    id: 'database',
    name: 'database.sql',
    icon: <Database size={16} />,
    description: 'MySQL Database Schema',
    code: `-- ============================================
-- API Verification System - Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS api_verification 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE api_verification;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'developer', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB;

-- API Keys Table
CREATE TABLE api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    request_count INT DEFAULT 0,
    request_limit INT DEFAULT 100000,
    rate_limit INT DEFAULT 1000,
    allowed_ips TEXT NULL,
    permissions JSON DEFAULT NULL,
    expires_at DATE NOT NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_api_key (api_key),
    INDEX idx_status (status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Licenses Table
CREATE TABLE licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_key VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    license_type ENUM('monthly', 'yearly', 'lifetime') NOT NULL,
    status ENUM('active', 'expired', 'suspended') DEFAULT 'active',
    user_id INT NOT NULL,
    max_devices INT DEFAULT 5,
    active_devices INT DEFAULT 0,
    expires_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_license_key (license_key),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- License Devices Table
CREATE TABLE license_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(150),
    ip_address VARCHAR(45),
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_device (license_id, device_id)
) ENGINE=InnoDB;

-- Activity Logs Table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    status ENUM('success', 'failed', 'warning') NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Rate Limiting Table
CREATE TABLE rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_key (api_key),
    INDEX idx_window (window_start)
) ENGINE=InnoDB;

-- Blocked IPs Table
CREATE TABLE blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_by INT NULL,
    FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Insert Default Admin User
-- Password: admin123 (hashed with password_hash)
INSERT INTO users (name, email, password, role) VALUES 
('Admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2u dBmFzGyS', 'admin');`
  },
  {
    id: 'verify',
    name: 'api/verify.php',
    icon: <Shield size={16} />,
    description: 'API Key Verification Endpoint',
    code: `<?php
// ============================================
// API Key Verification Endpoint
// POST /api/verify.php
// ============================================

require_once '../config.php';

class APIVerifier {
    private $db;
    private $response;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->response = ['success' => false, 'message' => '', 'data' => null];
    }
    
    // Main verification method
    public function verify($apiKey, $ipAddress = null) {
        try {
            // Step 1: Check if IP is blocked
            if ($this->isIPBlocked($ipAddress)) {
                $this->response['message'] = 'Access denied: IP address is blocked';
                $this->logActivity('IP Blocked', $apiKey, $ipAddress, 'failed');
                return $this->sendResponse(403);
            }
            
            // Step 2: Validate API Key exists
            $key = $this->getApiKey($apiKey);
            if (!$key) {
                $this->response['message'] = 'Invalid API key';
                $this->logActivity('Invalid Key', $apiKey, $ipAddress, 'failed');
                return $this->sendResponse(401);
            }
            
            // Step 3: Check key status
            if ($key['status'] !== 'active') {
                $this->response['message'] = 'API key is ' . $key['status'];
                $this->logActivity('Inactive Key', $apiKey, $ipAddress, 'failed');
                return $this->sendResponse(403);
            }
            
            // Step 4: Check expiration
            if (strtotime($key['expires_at']) < time()) {
                $this->updateKeyStatus($key['id'], 'expired');
                $this->response['message'] = 'API key has expired';
                $this->logActivity('Expired Key', $apiKey, $ipAddress, 'failed');
                return $this->sendResponse(403);
            }
            
            // Step 5: Check rate limit
            if ($this->isRateLimited($apiKey, $key['rate_limit'])) {
                $this->response['message'] = 'Rate limit exceeded';
                $this->logActivity('Rate Limited', $apiKey, $ipAddress, 'warning');
                return $this->sendResponse(429);
            }
            
            // Step 6: Check request limit
            if ($key['request_count'] >= $key['request_limit']) {
                $this->response['message'] = 'Request limit exceeded';
                $this->logActivity('Request Limit', $apiKey, $ipAddress, 'warning');
                return $this->sendResponse(429);
            }
            
            // Step 7: Check allowed IPs (if set)
            if ($key['allowed_ips'] && !$this->isIPAllowed($ipAddress, $key['allowed_ips'])) {
                $this->response['message'] = 'IP address not allowed';
                $this->logActivity('IP Not Allowed', $apiKey, $ipAddress, 'failed');
                return $this->sendResponse(403);
            }
            
            // Step 8: All checks passed - Update usage
            $this->updateKeyUsage($key['id']);
            $this->incrementRateLimit($apiKey);
            
            // Success response
            $this->response = [
                'success' => true,
                'message' => 'API key is valid',
                'data' => [
                    'key_name' => $key['name'],
                    'permissions' => json_decode($key['permissions'] ?? '[]'),
                    'requests_remaining' => $key['request_limit'] - $key['request_count'] - 1,
                    'expires_at' => $key['expires_at'],
                    'rate_limit' => $key['rate_limit'],
                    'verified_at' => date('Y-m-d H:i:s')
                ]
            ];
            
            $this->logActivity('Verified', $apiKey, $ipAddress, 'success');
            return $this->sendResponse(200);
            
        } catch (Exception $e) {
            $this->response['message'] = 'Server error: ' . $e->getMessage();
            return $this->sendResponse(500);
        }
    }
    
    // Get API key from database
    private function getApiKey($apiKey) {
        $stmt = $this->db->prepare("SELECT * FROM api_keys WHERE api_key = ?");
        $stmt->execute([$apiKey]);
        return $stmt->fetch();
    }
    
    // Check if IP is blocked
    private function isIPBlocked($ip) {
        if (!$ip) return false;
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM blocked_ips WHERE ip_address = ?");
        $stmt->execute([$ip]);
        return $stmt->fetchColumn() > 0;
    }
    
    // Check rate limiting
    private function isRateLimited($apiKey, $limit) {
        $stmt = $this->db->prepare(
            "SELECT request_count FROM rate_limits 
             WHERE api_key = ? AND window_start > DATE_SUB(NOW(), INTERVAL 1 MINUTE)"
        );
        $stmt->execute([$apiKey]);
        $result = $stmt->fetch();
        return $result && $result['request_count'] >= $limit;
    }
    
    // Check if IP is in allowed list
    private function isIPAllowed($ip, $allowedIPs) {
        if (!$ip || !$allowedIPs) return true;
        $ips = explode(',', $allowedIPs);
        return in_array($ip, array_map('trim', $ips));
    }
    
    // Update key usage count
    private function updateKeyUsage($keyId) {
        $stmt = $this->db->prepare(
            "UPDATE api_keys SET request_count = request_count + 1, last_used_at = NOW() WHERE id = ?"
        );
        $stmt->execute([$keyId]);
    }
    
    // Update key status
    private function updateKeyStatus($keyId, $status) {
        $stmt = $this->db->prepare("UPDATE api_keys SET status = ? WHERE id = ?");
        $stmt->execute([$status, $keyId]);
    }
    
    // Increment rate limit counter
    private function incrementRateLimit($apiKey) {
        $stmt = $this->db->prepare(
            "INSERT INTO rate_limits (api_key, request_count, window_start) 
             VALUES (?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE request_count = request_count + 1"
        );
        $stmt->execute([$apiKey]);
    }
    
    // Log activity
    private function logActivity($action, $apiKey, $ip, $status) {
        $stmt = $this->db->prepare(
            "INSERT INTO activity_logs (action, api_key, ip_address, user_agent, status, details) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $action,
            $apiKey,
            $ip ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            $status,
            $this->response['message']
        ]);
    }
    
    // Send JSON response
    private function sendResponse($httpCode) {
        http_response_code($httpCode);
        echo json_encode($this->response, JSON_PRETTY_PRINT);
        exit;
    }
}

// Handle Request
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' || $method === 'GET') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $apiKey = $input['api_key'] ?? $_GET['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? null;
    $ipAddress = $input['ip'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    if (!$apiKey) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'API key is required']);
        exit;
    }
    
    $verifier = new APIVerifier();
    $verifier->verify($apiKey, $ipAddress);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>`
  },
  {
    id: 'license',
    name: 'api/license.php',
    icon: <FileCode size={16} />,
    description: 'License Verification Endpoint',
    code: `<?php
// ============================================
// License Verification Endpoint
// POST /api/license.php
// ============================================

require_once '../config.php';

class LicenseVerifier {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    // Verify License
    public function verifyLicense($licenseKey, $deviceId = null) {
        $response = ['success' => false, 'message' => '', 'data' => null];
        
        try {
            // Get license
            $stmt = $this->db->prepare("SELECT * FROM licenses WHERE license_key = ?");
            $stmt->execute([$licenseKey]);
            $license = $stmt->fetch();
            
            if (!$license) {
                $response['message'] = 'Invalid license key';
                return $this->send($response, 401);
            }
            
            // Check status
            if ($license['status'] !== 'active') {
                $response['message'] = 'License is ' . $license['status'];
                return $this->send($response, 403);
            }
            
            // Check expiration
            if ($license['license_type'] !== 'lifetime' && strtotime($license['expires_at']) < time()) {
                $this->updateStatus($license['id'], 'expired');
                $response['message'] = 'License has expired on ' . $license['expires_at'];
                return $this->send($response, 403);
            }
            
            // Device verification
            if ($deviceId) {
                $deviceCheck = $this->checkDevice($license['id'], $deviceId);
                
                if (!$deviceCheck) {
                    // New device - check limit
                    if ($license['active_devices'] >= $license['max_devices']) {
                        $response['message'] = 'Maximum devices reached (' . $license['max_devices'] . ')';
                        return $this->send($response, 403);
                    }
                    // Register new device
                    $this->registerDevice($license['id'], $deviceId);
                }
            }
            
            $response = [
                'success' => true,
                'message' => 'License is valid',
                'data' => [
                    'product' => $license['product_name'],
                    'type' => $license['license_type'],
                    'expires_at' => $license['expires_at'],
                    'max_devices' => $license['max_devices'],
                    'active_devices' => $license['active_devices'] + ($deviceId && !$deviceCheck ? 1 : 0),
                    'verified_at' => date('Y-m-d H:i:s')
                ]
            ];
            
            return $this->send($response, 200);
            
        } catch (Exception $e) {
            $response['message'] = 'Server error: ' . $e->getMessage();
            return $this->send($response, 500);
        }
    }
    
    // Activate License
    public function activateLicense($licenseKey, $deviceId, $deviceName = null) {
        $response = ['success' => false, 'message' => ''];
        
        $stmt = $this->db->prepare("SELECT * FROM licenses WHERE license_key = ?");
        $stmt->execute([$licenseKey]);
        $license = $stmt->fetch();
        
        if (!$license) {
            $response['message'] = 'Invalid license key';
            return $this->send($response, 401);
        }
        
        if ($license['status'] !== 'active') {
            $response['message'] = 'License is not active';
            return $this->send($response, 403);
        }
        
        if ($license['active_devices'] >= $license['max_devices']) {
            $response['message'] = 'Maximum devices limit reached';
            return $this->send($response, 403);
        }
        
        $this->registerDevice($license['id'], $deviceId, $deviceName);
        
        $response = [
            'success' => true,
            'message' => 'License activated successfully',
            'data' => [
                'product' => $license['product_name'],
                'expires_at' => $license['expires_at']
            ]
        ];
        
        return $this->send($response, 200);
    }
    
    // Deactivate License
    public function deactivateLicense($licenseKey, $deviceId) {
        $response = ['success' => false, 'message' => ''];
        
        $stmt = $this->db->prepare("SELECT id FROM licenses WHERE license_key = ?");
        $stmt->execute([$licenseKey]);
        $license = $stmt->fetch();
        
        if (!$license) {
            $response['message'] = 'Invalid license key';
            return $this->send($response, 401);
        }
        
        $stmt = $this->db->prepare("DELETE FROM license_devices WHERE license_id = ? AND device_id = ?");
        $stmt->execute([$license['id'], $deviceId]);
        
        // Update device count
        $stmt = $this->db->prepare("UPDATE licenses SET active_devices = active_devices - 1 WHERE id = ?");
        $stmt->execute([$license['id']]);
        
        $response = ['success' => true, 'message' => 'License deactivated successfully'];
        return $this->send($response, 200);
    }
    
    private function checkDevice($licenseId, $deviceId) {
        $stmt = $this->db->prepare("SELECT id FROM license_devices WHERE license_id = ? AND device_id = ?");
        $stmt->execute([$licenseId, $deviceId]);
        $device = $stmt->fetch();
        
        if ($device) {
            // Update last active
            $stmt = $this->db->prepare("UPDATE license_devices SET last_active = NOW() WHERE id = ?");
            $stmt->execute([$device['id']]);
            return true;
        }
        return false;
    }
    
    private function registerDevice($licenseId, $deviceId, $deviceName = null) {
        $stmt = $this->db->prepare(
            "INSERT INTO license_devices (license_id, device_id, device_name, ip_address) 
             VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$licenseId, $deviceId, $deviceName, $_SERVER['REMOTE_ADDR'] ?? '']);
        
        $stmt = $this->db->prepare("UPDATE licenses SET active_devices = active_devices + 1 WHERE id = ?");
        $stmt->execute([$licenseId]);
    }
    
    private function updateStatus($id, $status) {
        $stmt = $this->db->prepare("UPDATE licenses SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
    }
    
    private function send($response, $code) {
        http_response_code($code);
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }
}

// Handle Request
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
$verifier = new LicenseVerifier();

switch ($method) {
    case 'POST':
        $action = $input['action'] ?? 'verify';
        switch ($action) {
            case 'verify':
                $verifier->verifyLicense($input['license_key'], $input['device_id'] ?? null);
                break;
            case 'activate':
                $verifier->activateLicense($input['license_key'], $input['device_id'], $input['device_name'] ?? null);
                break;
            case 'deactivate':
                $verifier->deactivateLicense($input['license_key'], $input['device_id']);
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>`
  },
  {
    id: 'admin',
    name: 'api/admin.php',
    icon: <Server size={16} />,
    description: 'Admin API - Key & License Management',
    code: `<?php
// ============================================
// Admin API - Key & License Management
// Requires Authentication (Bearer Token)
// ============================================

require_once '../config.php';

class AdminAPI {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->authenticate();
    }
    
    // Authentication check
    private function authenticate() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? '';
        
        if (empty($auth) || !str_starts_with($auth, 'Bearer ')) {
            $this->send(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $token = substr($auth, 7);
        // Verify JWT or session token here
        // For simplicity, checking against a stored token
        $stmt = $this->db->prepare("SELECT * FROM users WHERE role = 'admin' AND status = 'active'");
        $stmt->execute();
        $admin = $stmt->fetch();
        
        if (!$admin) {
            $this->send(['success' => false, 'message' => 'Admin access required'], 403);
        }
    }
    
    // Generate new API key
    public function generateKey($data) {
        $apiKey = 'ak_live_' . bin2hex(random_bytes(10));
        
        $stmt = $this->db->prepare(
            "INSERT INTO api_keys (user_id, api_key, name, request_limit, rate_limit, expires_at, permissions) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['user_id'],
            $apiKey,
            $data['name'],
            $data['request_limit'] ?? 100000,
            $data['rate_limit'] ?? 1000,
            $data['expires_at'],
            json_encode($data['permissions'] ?? ['read'])
        ]);
        
        $this->send([
            'success' => true,
            'message' => 'API key generated successfully',
            'data' => ['api_key' => $apiKey, 'id' => $this->db->lastInsertId()]
        ], 201);
    }
    
    // Revoke API key
    public function revokeKey($keyId) {
        $stmt = $this->db->prepare("UPDATE api_keys SET status = 'inactive' WHERE id = ?");
        $stmt->execute([$keyId]);
        
        $this->send(['success' => true, 'message' => 'API key revoked']);
    }
    
    // Delete API key
    public function deleteKey($keyId) {
        $stmt = $this->db->prepare("DELETE FROM api_keys WHERE id = ?");
        $stmt->execute([$keyId]);
        
        $this->send(['success' => true, 'message' => 'API key deleted']);
    }
    
    // Get all API keys
    public function getKeys($page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->db->prepare(
            "SELECT ak.*, u.name as user_name 
             FROM api_keys ak 
             JOIN users u ON ak.user_id = u.id 
             ORDER BY ak.created_at DESC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$limit, $offset]);
        $keys = $stmt->fetchAll();
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM api_keys");
        $total = $stmt->fetchColumn();
        
        $this->send([
            'success' => true,
            'data' => $keys,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    // Create license
    public function createLicense($data) {
        $licenseKey = 'LIC-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(6)));
        $licenseKey = preg_replace('/(.{4})/', '$1-', $licenseKey, 3);
        
        $stmt = $this->db->prepare(
            "INSERT INTO licenses (license_key, product_name, license_type, user_id, max_devices, expires_at) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $licenseKey,
            $data['product_name'],
            $data['license_type'],
            $data['user_id'],
            $data['max_devices'] ?? 5,
            $data['expires_at']
        ]);
        
        $this->send([
            'success' => true,
            'message' => 'License created',
            'data' => ['license_key' => $licenseKey, 'id' => $this->db->lastInsertId()]
        ], 201);
    }
    
    // Block IP
    public function blockIP($ip, $reason = null) {
        $stmt = $this->db->prepare(
            "INSERT INTO blocked_ips (ip_address, reason) VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE reason = ?"
        );
        $stmt->execute([$ip, $reason, $reason]);
        
        $this->send(['success' => true, 'message' => 'IP blocked: ' . $ip]);
    }
    
    // Get statistics
    public function getStats() {
        $stats = [];
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM api_keys WHERE status = 'active'");
        $stats['active_keys'] = $stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT SUM(request_count) FROM api_keys");
        $stats['total_requests'] = $stmt->fetchColumn() ?? 0;
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM licenses WHERE status = 'active'");
        $stats['active_licenses'] = $stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM users WHERE status = 'active'");
        $stats['active_users'] = $stmt->fetchColumn();
        
        $stmt = $this->db->query(
            "SELECT COUNT(*) FROM activity_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
        );
        $stats['requests_today'] = $stmt->fetchColumn();
        
        $this->send(['success' => true, 'data' => $stats]);
    }
    
    private function send($response, $code = 200) {
        http_response_code($code);
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }
}

// Route handling
$admin = new AdminAPI();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? $input['action'] ?? '';

switch ($action) {
    case 'generate_key':
        $admin->generateKey($input);
        break;
    case 'revoke_key':
        $admin->revokeKey($_GET['id'] ?? $input['id']);
        break;
    case 'delete_key':
        $admin->deleteKey($_GET['id'] ?? $input['id']);
        break;
    case 'get_keys':
        $admin->getKeys($_GET['page'] ?? 1);
        break;
    case 'create_license':
        $admin->createLicense($input);
        break;
    case 'block_ip':
        $admin->blockIP($input['ip'], $input['reason'] ?? null);
        break;
    case 'stats':
        $admin->getStats();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>`
  },
  {
    id: 'htaccess',
    name: '.htaccess',
    icon: <Server size={16} />,
    description: 'Apache Configuration',
    code: `# ============================================
# API Verification System - Apache Config
# ============================================

# Enable Rewrite Engine
RewriteEngine On

# Force HTTPS (uncomment in production)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Routes
RewriteRule ^api/verify/?$ api/verify.php [L,QSA]
RewriteRule ^api/license/?$ api/license.php [L,QSA]
RewriteRule ^api/admin/?$ api/admin.php [L,QSA]

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# Prevent directory listing
Options -Indexes

# Protect config file
<Files "config.php">
    Order Allow,Deny
    Deny from all
</Files>

# Protect .env files
<FilesMatch "^\\.env">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Rate limiting (if mod_ratelimit is available)
<IfModule mod_ratelimit.c>
    <Location /api/>
        SetOutputFilter RATE_LIMIT
        SetEnv rate-limit 500
    </Location>
</IfModule>

# CORS for API
<IfModule mod_headers.c>
    SetEnvIf Origin "^(.*)$" ORIGIN=$1
    <FilesMatch "\\.(php)$">
        Header set Access-Control-Allow-Origin "%{ORIGIN}e"
        Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key"
        Header set Access-Control-Max-Age "3600"
    </FilesMatch>
</IfModule>`
  }
];

export default function PhpCode() {
  const [activeFile, setActiveFile] = useState(phpFiles[0].id);
  const [copied, setCopied] = useState(false);

  const currentFile = phpFiles.find(f => f.id === activeFile)!;

  const copyCode = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">PHP Backend Code</h1>
          <p className="text-gray-400 mt-1">Complete PHP & MySQL source code for API Verification System</p>
        </div>
        <button className="btn-success flex items-center gap-2" onClick={copyCode}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Installation Guide */}
      <div className="card bg-blue-500/5 border-blue-500/20">
        <h3 className="text-lg font-semibold text-blue-400 mb-2">📋 Installation Guide</h3>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Create MySQL database using the SQL schema</li>
          <li>Update <code className="bg-gray-700 px-1 rounded">config.php</code> with your database credentials</li>
          <li>Upload all PHP files to your server</li>
          <li>Configure Apache with the .htaccess file</li>
          <li>Test the API endpoints</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-3">FILES</h3>
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
            <div className="flex items-center justify-between px-4 py-3 bg-gray-750 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-gray-400">{currentFile.name}</span>
              </div>
              <button onClick={copyCode} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm text-gray-300 max-h-[600px] overflow-y-auto">
              <code>{currentFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
