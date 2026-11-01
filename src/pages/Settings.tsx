import { useState } from 'react';
import { Save, Bell, Shield, Globe, Database, Key, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'API Verification System',
    siteUrl: 'https://api.example.com',
    adminEmail: 'admin@example.com',
    rateLimit: '1000',
    maxDevices: '5',
    tokenExpiry: '86400',
    allowRegistration: true,
    emailVerification: true,
    ipBlocking: true,
    logRetention: '30',
    maintenanceMode: false,
    debugMode: false,
    corsEnabled: true,
    corsOrigin: '*',
    webhookUrl: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    secretKey: 'your-secret-key-here',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Configure your API Verification System</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
          <Save size={18} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-400 flex items-center gap-2">
          <Shield size={18} />
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            General Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Site Name</label>
              <input type="text" className="input-field" value={settings.siteName} onChange={(e) => updateSetting('siteName', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Site URL</label>
              <input type="url" className="input-field" value={settings.siteUrl} onChange={(e) => updateSetting('siteUrl', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Admin Email</label>
              <input type="email" className="input-field" value={settings.adminEmail} onChange={(e) => updateSetting('adminEmail', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Secret Key</label>
              <input type="password" className="input-field" value={settings.secretKey} onChange={(e) => updateSetting('secretKey', e.target.value)} />
            </div>
          </div>
        </div>

        {/* API Settings */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-purple-400" />
            API Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Rate Limit (requests/minute)</label>
              <input type="number" className="input-field" value={settings.rateLimit} onChange={(e) => updateSetting('rateLimit', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Max Devices per License</label>
              <input type="number" className="input-field" value={settings.maxDevices} onChange={(e) => updateSetting('maxDevices', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Token Expiry (seconds)</label>
              <input type="number" className="input-field" value={settings.tokenExpiry} onChange={(e) => updateSetting('tokenExpiry', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Log Retention (days)</label>
              <input type="number" className="input-field" value={settings.logRetention} onChange={(e) => updateSetting('logRetention', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={18} className="text-green-400" />
            Security Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">IP Blocking</p>
                <p className="text-xs text-gray-400">Auto-block suspicious IPs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.ipBlocking} onChange={(e) => updateSetting('ipBlocking', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Email Verification</p>
                <p className="text-xs text-gray-400">Require email verification for new users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.emailVerification} onChange={(e) => updateSetting('emailVerification', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Allow Registration</p>
                <p className="text-xs text-gray-400">Allow new user registrations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.allowRegistration} onChange={(e) => updateSetting('allowRegistration', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Debug Mode</p>
                <p className="text-xs text-gray-400">Show detailed error messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.debugMode} onChange={(e) => updateSetting('debugMode', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* CORS & Webhook */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-orange-400" />
            CORS & Webhooks
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Enable CORS</p>
                <p className="text-xs text-gray-400">Allow cross-origin requests</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.corsEnabled} onChange={(e) => updateSetting('corsEnabled', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">CORS Origin</label>
              <input type="text" className="input-field" placeholder="* or https://example.com" value={settings.corsOrigin} onChange={(e) => updateSetting('corsOrigin', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Webhook URL</label>
              <input type="url" className="input-field" placeholder="https://hooks.example.com/webhook" value={settings.webhookUrl} onChange={(e) => updateSetting('webhookUrl', e.target.value)} />
            </div>
          </div>
        </div>

        {/* SMTP Settings */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell size={18} className="text-yellow-400" />
            Email / SMTP Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">SMTP Host</label>
              <input type="text" className="input-field" value={settings.smtpHost} onChange={(e) => updateSetting('smtpHost', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">SMTP Port</label>
              <input type="text" className="input-field" value={settings.smtpPort} onChange={(e) => updateSetting('smtpPort', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">SMTP Username</label>
              <input type="text" className="input-field" value={settings.smtpUser} onChange={(e) => updateSetting('smtpUser', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">SMTP Password</label>
              <input type="password" className="input-field" value={settings.smtpPass} onChange={(e) => updateSetting('smtpPass', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-gray-400">Disable all API endpoints</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.maintenanceMode} onChange={(e) => updateSetting('maintenanceMode', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-gray-700/30 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-gray-300">System Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-400">PHP Version:</span>
                <span className="text-white">8.2.x</span>
                <span className="text-gray-400">MySQL Version:</span>
                <span className="text-white">8.0.x</span>
                <span className="text-gray-400">Server:</span>
                <span className="text-white">Apache 2.4</span>
                <span className="text-gray-400">API Version:</span>
                <span className="text-white">1.0.0</span>
                <span className="text-gray-400">Database Size:</span>
                <span className="text-white">24.5 MB</span>
                <span className="text-gray-400">Uptime:</span>
                <span className="text-green-400">99.9%</span>
              </div>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30">
                  Clear All Logs
                </button>
                <button className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30">
                  Reset All Keys
                </button>
                <button className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30">
                  Backup Database
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
