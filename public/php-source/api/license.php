<?php
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
    
    /**
     * Verify a license key
     */
    public function verify($licenseKey, $deviceId = null, $deviceName = null) {
        // Get license
        $license = $this->getLicense($licenseKey);
        if (!$license) {
            $this->logger->log('License Not Found', 'failed', 'License key not found', null, $licenseKey);
            Response::error('Invalid license key', 401);
        }
        
        // Check status
        if ($license['status'] === 'suspended') {
            $this->logger->log('License Suspended', 'failed', 'License is suspended', null, $licenseKey);
            Response::error('License has been suspended', 403);
        }
        
        if ($license['status'] === 'cancelled') {
            $this->logger->log('License Cancelled', 'failed', 'License is cancelled', null, $licenseKey);
            Response::error('License has been cancelled', 403);
        }
        
        // Check expiration
        if ($license['license_type'] !== 'lifetime') {
            if (strtotime($license['expires_at']) < time()) {
                $this->updateLicenseStatus($license['id'], 'expired');
                $this->logger->log('License Expired', 'failed', 'License expired', null, $licenseKey);
                Response::error('License expired on ' . $license['expires_at'], 403, [
                    'expired_at' => $license['expires_at'],
                    'renew_url' => '/renew/' . $licenseKey
                ]);
            }
        }
        
        // Device verification
        $deviceInfo = null;
        if ($deviceId) {
            $existingDevice = $this->getDevice($license['id'], $deviceId);
            
            if ($existingDevice) {
                // Update last active
                $this->updateDeviceActive($existingDevice['id']);
                $deviceInfo = [
                    'device_id' => $deviceId,
                    'status' => 'registered',
                    'activated_at' => $existingDevice['activated_at'],
                    'last_active' => date('Y-m-d H:i:s')
                ];
            } else {
                // Check device limit
                if ($license['active_devices'] >= $license['max_devices']) {
                    $this->logger->log('Device Limit', 'failed', 'Max devices reached', null, $licenseKey);
                    Response::error('Maximum device limit reached', 403, [
                        'max_devices' => $license['max_devices'],
                        'active_devices' => $license['active_devices']
                    ]);
                }
                
                // Register new device
                $this->registerDevice($license['id'], $deviceId, $deviceName);
                $deviceInfo = [
                    'device_id' => $deviceId,
                    'status' => 'new',
                    'activated_at' => date('Y-m-d H:i:s'),
                    'message' => 'Device registered successfully'
                ];
            }
        }
        
        // Get registered devices
        $devices = $this->getDevices($license['id']);
        
        $this->logger->log('License Verified', 'success', 'License verified successfully', null, $licenseKey);
        
        Response::success([
            'license_key' => $licenseKey,
            'product' => $license['product_name'],
            'type' => $license['license_type'],
            'status' => $license['status'],
            'expires_at' => $license['license_type'] === 'lifetime' ? 'Never' : $license['expires_at'],
            'max_devices' => $license['max_devices'],
            'active_devices' => $license['active_devices'] + ($deviceInfo && $deviceInfo['status'] === 'new' ? 1 : 0),
            'devices' => $devices,
            'device' => $deviceInfo,
            'verified_at' => date('Y-m-d H:i:s')
        ], 'License is valid');
    }
    
    /**
     * Activate license on a device
     */
    public function activate($licenseKey, $deviceId, $deviceName = null) {
        Validator::required(['license_key' => $licenseKey, 'device_id' => $deviceId], ['license_key', 'device_id']);
        
        $license = $this->getLicense($licenseKey);
        if (!$license) {
            Response::error('Invalid license key', 401);
        }
        
        if ($license['status'] !== 'active') {
            Response::error('License is not active (status: ' . $license['status'] . ')', 403);
        }
        
        // Check if already activated
        $existing = $this->getDevice($license['id'], $deviceId);
        if ($existing) {
            Response::success([
                'device_id' => $deviceId,
                'already_registered' => true,
                'activated_at' => $existing['activated_at']
            ], 'Device already registered');
        }
        
        // Check device limit
        if ($license['active_devices'] >= $license['max_devices']) {
            Response::error('Maximum device limit reached (' . $license['max_devices'] . ')', 403);
        }
        
        // Register device
        $this->registerDevice($license['id'], $deviceId, $deviceName);
        
        $this->logger->log('Device Activated', 'success', "Device $deviceId activated", null, $licenseKey);
        
        Response::success([
            'license_key' => $licenseKey,
            'product' => $license['product_name'],
            'device_id' => $deviceId,
            'device_name' => $deviceName,
            'activated_at' => date('Y-m-d H:i:s'),
            'expires_at' => $license['expires_at']
        ], 'License activated successfully');
    }
    
    /**
     * Deactivate license from a device
     */
    public function deactivate($licenseKey, $deviceId) {
        Validator::required(['license_key' => $licenseKey, 'device_id' => $deviceId], ['license_key', 'device_id']);
        
        $license = $this->getLicense($licenseKey);
        if (!$license) {
            Response::error('Invalid license key', 401);
        }
        
        $device = $this->getDevice($license['id'], $deviceId);
        if (!$device) {
            Response::error('Device not found for this license', 404);
        }
        
        // Remove device
        $this->removeDevice($device['id']);
        
        // Update count
        $stmt = $this->db->prepare("UPDATE licenses SET active_devices = GREATEST(0, active_devices - 1) WHERE id = ?");
        $stmt->execute([$license['id']]);
        
        $this->logger->log('Device Deactivated', 'success', "Device $deviceId deactivated", null, $licenseKey);
        
        Response::success([
            'license_key' => $licenseKey,
            'device_id' => $deviceId,
            'deactivated_at' => date('Y-m-d H:i:s')
        ], 'Device deactivated successfully');
    }
    
    /**
     * Check license status
     */
    public function checkStatus($licenseKey) {
        $license = $this->getLicense($licenseKey);
        if (!$license) {
            Response::error('Invalid license key', 401);
        }
        
        $devices = $this->getDevices($license['id']);
        
        Response::success([
            'license_key' => $licenseKey,
            'product' => $license['product_name'],
            'type' => $license['license_type'],
            'status' => $license['status'],
            'expires_at' => $license['expires_at'],
            'max_devices' => $license['max_devices'],
            'active_devices' => $license['active_devices'],
            'devices' => $devices,
            'days_remaining' => $license['license_type'] === 'lifetime' ? -1 : 
                max(0, (strtotime($license['expires_at']) - time()) / 86400)
        ]);
    }
    
    // Private methods
    
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
        $stmt = $this->db->prepare(
            "INSERT INTO license_devices (license_id, device_id, device_name, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $licenseId, $deviceId, $deviceName,
            $this->logger->getIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
        
        $stmt = $this->db->prepare("UPDATE licenses SET active_devices = active_devices + 1 WHERE id = ?");
        $stmt->execute([$licenseId]);
    }
    
    private function updateDeviceActive($deviceId) {
        $stmt = $this->db->prepare("UPDATE license_devices SET last_active = NOW(), ip_address = ? WHERE id = ?");
        $stmt->execute([$this->logger->getIP(), $deviceId]);
    }
    
    private function removeDevice($id) {
        $stmt = $this->db->prepare("DELETE FROM license_devices WHERE id = ?");
        $stmt->execute([$id]);
    }
    
    private function updateLicenseStatus($id, $status) {
        $stmt = $this->db->prepare("UPDATE licenses SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
    }
}

// ============================================
// Handle Request
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    Response::error('Method not allowed. Use POST.', 405);
}

$input = Validator::getInput();
$action = $input['action'] ?? 'verify';
$manager = new LicenseManager();

switch ($action) {
    case 'verify':
        $manager->verify(
            $input['license_key'] ?? null,
            $input['device_id'] ?? null,
            $input['device_name'] ?? null
        );
        break;
    case 'activate':
        $manager->activate(
            $input['license_key'] ?? null,
            $input['device_id'] ?? null,
            $input['device_name'] ?? null
        );
        break;
    case 'deactivate':
        $manager->deactivate(
            $input['license_key'] ?? null,
            $input['device_id'] ?? null
        );
        break;
    case 'check':
        $manager->checkStatus($input['license_key'] ?? null);
        break;
    default:
        Response::error("Unknown action: $action. Available: verify, activate, deactivate, check", 400);
}
?>
