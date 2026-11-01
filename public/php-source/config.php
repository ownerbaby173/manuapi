<?php
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
// Database Connection Class
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
    
    // Prevent cloning
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
            'timestamp' => date('Y-m-d\TH:i:s\Z'),
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
            'timestamp' => date('Y-m-d\TH:i:s\Z'),
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
                $action,
                $apiKey,
                $licenseKey,
                $userId,
                $this->getIP(),
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                $status,
                $details
            ]);
        } catch (Exception $e) {
            error_log('Logging failed: ' . $e->getMessage());
        }
    }
    
    public function getIP() {
        $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = explode(',', $_SERVER[$key])[0];
                return trim($ip);
            }
        }
        return '0.0.0.0';
    }
}

// ============================================
// Auth Helper
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
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    public static function requireAuth() {
        $token = self::getBearerToken();
        if (!$token) {
            Response::error('Authorization token required', 401);
        }
        $data = self::verifyToken($token);
        if (!$data) {
            Response::error('Invalid or expired token', 401);
        }
        return $data;
    }
    
    public static function requireAdmin() {
        $data = self::requireAuth();
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ? AND role = 'admin' AND status = 'active'");
        $stmt->execute([$data['user_id']]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('Admin access required', 403);
        }
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
            $input = json_decode(file_get_contents('php://input'), true);
        } else {
            $input = $_POST;
        }
        return $input ?? [];
    }
    
    public static function required($data, $fields) {
        foreach ($fields as $field) {
            if (empty($data[$field])) {
                Response::error("Field '$field' is required", 400);
            }
        }
    }
}
?>
