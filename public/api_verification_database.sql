-- ============================================
-- API Verification System - Complete Database
-- PHP & MySQL API Verification Software
-- ============================================
-- Version: 1.0.0
-- Author: API Verify System
-- Date: 2024
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS api_verification 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE api_verification;

-- ============================================
-- TABLE: users
-- Stores all system users (admin, developer, user)
-- ============================================
DROP TABLE IF EXISTS license_devices;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS blocked_ips;
DROP TABLE IF EXISTS licenses;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'developer', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    avatar VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: api_keys
-- Stores API keys with limits and permissions
-- ============================================
CREATE TABLE api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    status ENUM('active', 'inactive', 'expired', 'suspended') DEFAULT 'active',
    request_count BIGINT DEFAULT 0,
    request_limit BIGINT DEFAULT 100000,
    rate_limit INT DEFAULT 1000,
    allowed_ips TEXT DEFAULT NULL,
    blocked_ips TEXT DEFAULT NULL,
    permissions JSON DEFAULT NULL,
    webhook_url VARCHAR(500) DEFAULT NULL,
    expires_at DATE NOT NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_api_key (api_key),
    INDEX idx_status (status),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: licenses
-- Software license management
-- ============================================
CREATE TABLE licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_key VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    license_type ENUM('trial', 'monthly', 'quarterly', 'yearly', 'lifetime') NOT NULL DEFAULT 'monthly',
    status ENUM('active', 'expired', 'suspended', 'cancelled') DEFAULT 'active',
    user_id INT NOT NULL,
    order_id VARCHAR(100) DEFAULT NULL,
    max_devices INT DEFAULT 5,
    active_devices INT DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT DEFAULT NULL,
    expires_at DATE NOT NULL,
    activated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_license_key (license_key),
    INDEX idx_status (status),
    INDEX idx_user (user_id),
    INDEX idx_product (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: license_devices
-- Track devices using each license
-- ============================================
CREATE TABLE license_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(150) DEFAULT NULL,
    device_type VARCHAR(50) DEFAULT NULL,
    os_version VARCHAR(100) DEFAULT NULL,
    app_version VARCHAR(50) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    hwid VARCHAR(255) DEFAULT NULL,
    mac_address VARCHAR(17) DEFAULT NULL,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_license_device (license_id, device_id),
    INDEX idx_device (device_id),
    INDEX idx_license (license_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: activity_logs
-- Track all API activities and system events
-- ============================================
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) DEFAULT NULL,
    license_key VARCHAR(100) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT DEFAULT NULL,
    country VARCHAR(2) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    status ENUM('success', 'failed', 'warning', 'error') NOT NULL,
    response_code INT DEFAULT NULL,
    response_time INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_api_key (api_key),
    INDEX idx_ip (ip_address),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: rate_limits
-- Track API rate limiting per key
-- ============================================
CREATE TABLE rate_limits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_key (api_key),
    INDEX idx_window (window_start),
    INDEX idx_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: blocked_ips
-- Store blocked IP addresses
-- ============================================
CREATE TABLE blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT DEFAULT NULL,
    block_type ENUM('temporary', 'permanent') DEFAULT 'permanent',
    blocked_until TIMESTAMP NULL,
    blocked_by INT DEFAULT NULL,
    attempt_count INT DEFAULT 1,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ip (ip_address),
    INDEX idx_blocked_until (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: settings
-- System configuration settings
-- ============================================
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT DEFAULT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(255) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: email_templates
-- Store email templates for notifications
-- ============================================
CREATE TABLE email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    variables JSON DEFAULT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default Admin User (password: admin123)
INSERT INTO users (name, email, password, role, status) VALUES 
('Admin', 'admin@apiverify.com', '$2y$10$YourHashedPasswordHere', 'admin', 'active');

-- Default Settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'API Verification System', 'string', 'Website name'),
('site_url', 'https://api.example.com', 'string', 'Website URL'),
('rate_limit', '1000', 'number', 'API requests per minute'),
('max_devices', '5', 'number', 'Max devices per license'),
('token_expiry', '86400', 'number', 'Token expiry in seconds'),
('allow_registration', '1', 'boolean', 'Allow new user registration'),
('email_verification', '1', 'boolean', 'Require email verification'),
('ip_blocking', '1', 'boolean', 'Auto-block suspicious IPs'),
('log_retention', '30', 'number', 'Log retention in days'),
('maintenance_mode', '0', 'boolean', 'Maintenance mode'),
('debug_mode', '0', 'boolean', 'Debug mode'),
('cors_enabled', '1', 'boolean', 'Enable CORS'),
('cors_origin', '*', 'string', 'CORS allowed origin'),
('smtp_host', 'smtp.gmail.com', 'string', 'SMTP host'),
('smtp_port', '587', 'number', 'SMTP port'),
('smtp_user', '', 'string', 'SMTP username'),
('smtp_pass', '', 'string', 'SMTP password'),
('secret_key', 'change-this-secret-key-2024', 'string', 'Application secret key'),
('api_version', '1.0.0', 'string', 'API version');

-- Default Email Templates
INSERT INTO email_templates (name, subject, body, variables) VALUES
('welcome', 'Welcome to API Verification System', 'Hello {{name}},\n\nWelcome to our API Verification System. Your account has been created successfully.\n\nAPI Key: {{api_key}}\n\nRegards,\nAPI Verify Team', '["name", "api_key"]'),
('key_expiring', 'Your API Key is Expiring Soon', 'Hello {{name}},\n\nYour API key "{{key_name}}" will expire on {{expires_at}}.\n\nPlease renew it to continue using our services.\n\nRegards,\nAPI Verify Team', '["name", "key_name", "expires_at"]'),
('license_expiring', 'Your License is Expiring Soon', 'Hello {{name}},\n\nYour license "{{product_name}}" will expire on {{expires_at}}.\n\nPlease renew to continue using the software.\n\nRegards,\nAPI Verify Team', '["name", "product_name", "expires_at"]'),
('ip_blocked', 'Security Alert: IP Blocked', 'Alert!\n\nIP Address {{ip}} has been blocked due to: {{reason}}\n\nTime: {{time}}\n\nRegards,\nAPI Verify System', '["ip", "reason", "time"]');

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure: Clean up expired rate limits
CREATE PROCEDURE IF NOT EXISTS cleanup_rate_limits()
BEGIN
    DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR);
END //

-- Procedure: Clean up old logs
CREATE PROCEDURE IF NOT EXISTS cleanup_old_logs(IN days INT)
BEGIN
    DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL days DAY);
END //

-- Procedure: Get API statistics
CREATE PROCEDURE IF NOT EXISTS get_api_stats()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM api_keys WHERE status = 'active') as active_keys,
        (SELECT COUNT(*) FROM api_keys) as total_keys,
        (SELECT SUM(request_count) FROM api_keys) as total_requests,
        (SELECT COUNT(*) FROM licenses WHERE status = 'active') as active_licenses,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at) = CURDATE()) as today_requests,
        (SELECT COUNT(*) FROM activity_logs WHERE status = 'failed' AND DATE(created_at) = CURDATE()) as today_failed,
        (SELECT COUNT(*) FROM blocked_ips) as blocked_ips_count;
END //

-- Procedure: Auto-expire keys and licenses
CREATE PROCEDURE IF NOT EXISTS auto_expire()
BEGIN
    -- Expire API keys
    UPDATE api_keys SET status = 'expired' 
    WHERE status = 'active' AND expires_at < CURDATE();
    
    -- Expire licenses
    UPDATE licenses SET status = 'expired' 
    WHERE status = 'active' AND license_type != 'lifetime' AND expires_at < CURDATE();
    
    -- Remove temporary IP blocks
    DELETE FROM blocked_ips 
    WHERE block_type = 'temporary' AND blocked_until < NOW();
END //

DELIMITER ;

-- ============================================
-- EVENTS (Scheduled Tasks)
-- ============================================

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Clean up rate limits every hour
CREATE EVENT IF NOT EXISTS evt_cleanup_rate_limits
ON SCHEDULE EVERY 1 HOUR
DO CALL cleanup_rate_limits();

-- Auto expire keys/licenses daily at midnight
CREATE EVENT IF NOT EXISTS evt_auto_expire
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 00:00:00')
DO CALL auto_expire();

-- Clean old logs weekly
CREATE EVENT IF NOT EXISTS evt_cleanup_logs
ON SCHEDULE EVERY 1 WEEK
STARTS CONCAT(CURDATE() + INTERVAL 1 WEEK, ' 02:00:00')
DO CALL cleanup_old_logs(30);

-- ============================================
-- VIEWS
-- ============================================

-- View: API Key details with user info
CREATE OR REPLACE VIEW v_api_keys AS
SELECT 
    ak.id,
    ak.api_key,
    ak.name,
    ak.status,
    ak.request_count,
    ak.request_limit,
    ak.rate_limit,
    ak.expires_at,
    ak.last_used_at,
    ak.created_at,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    ROUND((ak.request_count / ak.request_limit) * 100, 2) as usage_percentage
FROM api_keys ak
JOIN users u ON ak.user_id = u.id;

-- View: License details with user info
CREATE OR REPLACE VIEW v_licenses AS
SELECT 
    l.id,
    l.license_key,
    l.product_name,
    l.license_type,
    l.status,
    l.max_devices,
    l.active_devices,
    l.expires_at,
    l.created_at,
    u.name as user_name,
    u.email as user_email,
    ROUND((l.active_devices / l.max_devices) * 100, 2) as device_usage_percentage,
    CASE 
        WHEN l.license_type = 'lifetime' THEN 'Never'
        WHEN l.expires_at < CURDATE() THEN 'Expired'
        WHEN l.expires_at < DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Expiring Soon'
        ELSE 'Active'
    END as expiry_status
FROM licenses l
JOIN users u ON l.user_id = u.id;

-- View: Today's activity summary
CREATE OR REPLACE VIEW v_today_summary AS
SELECT 
    action,
    status,
    COUNT(*) as count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM activity_logs
WHERE DATE(created_at) = CURDATE()
GROUP BY action, status
ORDER BY count DESC;

-- ============================================
-- END OF DATABASE SETUP
-- ============================================
