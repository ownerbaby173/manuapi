# API Verification System - PHP & MySQL
## Complete Source Code Package

### 📋 Overview
Complete API Verification System built with PHP and MySQL. Includes API key management, license verification, user management, rate limiting, IP blocking, and admin panel.

### 📁 File Structure
```
├── config.php              # Database config & helper classes
├── .htaccess               # Apache configuration
├── api/
│   ├── verify.php          # API Key verification endpoint
│   ├── license.php         # License verification endpoint
│   └── admin.php           # Admin management API
├── logs/                   # Activity logs directory (auto-created)
└── database.sql            # MySQL database schema
```

### 🚀 Installation

#### Step 1: Database Setup
```bash
# Import the SQL file
mysql -u root -p < database.sql
```

Or use phpMyAdmin to import `database.sql`

#### Step 2: Configuration
Edit `config.php` and update:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'api_verification');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');
define('SECRET_KEY', 'your-unique-secret-key');
```

#### Step 3: Upload Files
Upload all files to your web server:
- Place `config.php` and `.htaccess` in root
- Create `api/` directory and place API files inside
- Ensure `logs/` directory is writable (chmod 755)

#### Step 4: Set Permissions
```bash
chmod 755 logs/
chmod 644 config.php
chmod 644 api/*.php
```

### 🔑 API Endpoints

#### 1. Verify API Key
```
POST /api/verify
Headers: X-API-Key: ak_live_xxxxx
Body: { "api_key": "ak_live_xxxxx" }
```

#### 2. Verify License
```
POST /api/license
Body: {
    "action": "verify",
    "license_key": "LIC-2024-XXXX-XXXX-XXXX",
    "device_id": "unique-device-id"
}
```

#### 3. Admin Login
```
POST /api/admin?action=login
Body: { "email": "admin@example.com", "password": "admin123" }
```

#### 4. Generate API Key (Admin)
```
POST /api/admin?action=generate_key
Headers: Authorization: Bearer <token>
Body: {
    "user_id": 1,
    "name": "Production API",
    "request_limit": 100000,
    "rate_limit": 1000,
    "expires_at": "2025-12-31"
}
```

### 🛡️ Security Features
- JWT Token Authentication
- Rate Limiting (per API key)
- IP Whitelisting/Blacklisting
- Request Limits
- SQL Injection Prevention (PDO)
- XSS Protection
- CORS Configuration
- HTTPS Support

### 📊 Features
- ✅ API Key Management (Create, Update, Delete, Revoke)
- ✅ License Management (Monthly, Yearly, Lifetime)
- ✅ Device Tracking (per license)
- ✅ Rate Limiting
- ✅ IP Blocking
- ✅ Activity Logging
- ✅ Admin Dashboard
- ✅ User Management
- ✅ Email Notifications
- ✅ Auto-expiration
- ✅ Statistics & Reports

### 🔧 Requirements
- PHP 7.4 or higher (PHP 8.x recommended)
- MySQL 5.7 or higher (MySQL 8.x recommended)
- Apache with mod_rewrite enabled
- PDO Extension
- JSON Extension

### 📝 Default Credentials
- Admin Email: admin@apiverify.com
- Admin Password: admin123 (change after first login!)

### 🔄 Auto Tasks (MySQL Events)
- Rate limit cleanup: Every hour
- Auto-expire keys/licenses: Daily at midnight
- Log cleanup: Weekly

### 📄 License
MIT License - Free for personal and commercial use.

### 🆘 Support
For issues and questions, please refer to the documentation or contact support.
