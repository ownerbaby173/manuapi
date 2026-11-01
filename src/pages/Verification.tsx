import { useState } from 'react';
import { ShieldCheck, ShieldX, Search, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VerificationResult {
  status: 'valid' | 'invalid' | 'expired' | 'rate_limited' | 'error';
  message: string;
  details: Record<string, string>;
}

export default function Verification() {
  const [apiKey, setApiKey] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verifyType, setVerifyType] = useState<'api' | 'license'>('api');

  const handleVerify = () => {
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      setLoading(false);
      const key = verifyType === 'api' ? apiKey : licenseKey;

      if (!key) {
        setResult({ status: 'error', message: 'Please enter a key to verify', details: {} });
        return;
      }

      // Simulate verification
      if (key.includes('live_7x9K') || key.includes('ABCD')) {
        setResult({
          status: 'valid',
          message: 'Key is valid and active',
          details: {
            'Key Type': verifyType === 'api' ? 'API Key' : 'License Key',
            'Status': 'Active',
            'Created': '2024-01-15',
            'Expires': '2025-01-15',
            'Requests Used': '45,230 / 100,000',
            'IP Address': ipAddress || '192.168.1.100',
            'Rate Limit': '1000 req/min',
            'Permissions': 'read, write, delete',
          }
        });
      } else if (key.includes('live_2eR5') || key.includes('YZAB')) {
        setResult({
          status: 'expired',
          message: 'Key has expired',
          details: {
            'Key Type': verifyType === 'api' ? 'API Key' : 'License Key',
            'Status': 'Expired',
            'Created': '2023-06-15',
            'Expired On': '2024-06-15',
            'Action Required': 'Renew or generate new key',
          }
        });
      } else if (key.includes('live_5dG8')) {
        setResult({
          status: 'rate_limited',
          message: 'Rate limit exceeded',
          details: {
            'Key Type': 'API Key',
            'Status': 'Rate Limited',
            'Current Rate': '1050 req/min',
            'Limit': '1000 req/min',
            'Retry After': '30 seconds',
          }
        });
      } else {
        setResult({
          status: 'invalid',
          message: 'Invalid key - not found in database',
          details: {
            'Key Type': verifyType === 'api' ? 'API Key' : 'License Key',
            'Status': 'Not Found',
            'Suggestion': 'Check the key format and try again',
          }
        });
      }
    }, 1500);
  };

  const getStatusIcon = () => {
    if (!result) return null;
    switch (result.status) {
      case 'valid': return <CheckCircle size={48} className="text-green-400" />;
      case 'invalid': return <XCircle size={48} className="text-red-400" />;
      case 'expired': return <AlertCircle size={48} className="text-yellow-400" />;
      case 'rate_limited': return <AlertCircle size={48} className="text-orange-400" />;
      default: return <XCircle size={48} className="text-red-400" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return '';
    switch (result.status) {
      case 'valid': return 'border-green-500/30 bg-green-500/5';
      case 'invalid': return 'border-red-500/30 bg-red-500/5';
      case 'expired': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'rate_limited': return 'border-orange-500/30 bg-orange-500/5';
      default: return 'border-red-500/30 bg-red-500/5';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">API Verification</h1>
        <p className="text-gray-400 mt-1">Verify API keys and licenses in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Form */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-400" />
            Verify Key
          </h3>

          {/* Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${verifyType === 'api' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setVerifyType('api')}
            >
              API Key
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${verifyType === 'license' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setVerifyType('license')}
            >
              License Key
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                {verifyType === 'api' ? 'API Key' : 'License Key'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={verifyType === 'api' ? 'ak_live_xxxxxxxxxxxx' : 'LIC-2024-XXXX-XXXX-XXXX'}
                value={verifyType === 'api' ? apiKey : licenseKey}
                onChange={(e) => verifyType === 'api' ? setApiKey(e.target.value) : setLicenseKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">IP Address (Optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="192.168.1.100"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </div>
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Verify Now
                </>
              )}
            </button>
          </div>

          {/* Test Keys */}
          <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">Test Keys (try these):</p>
            <div className="space-y-1">
              <code className="text-xs text-green-400 block">ak_live_7x9K2mN4pQ8rT1wY → Valid</code>
              <code className="text-xs text-yellow-400 block">ak_live_2eR5tY8uI1oP4aS → Expired</code>
              <code className="text-xs text-orange-400 block">ak_live_5dG8hK1lM3nO6pQ → Rate Limited</code>
              <code className="text-xs text-red-400 block">ak_live_invalid_key → Invalid</code>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {loading ? <Loader2 size={20} className="text-blue-400 animate-spin" /> : <ShieldCheck size={20} className="text-green-400" />}
            Verification Result
          </h3>

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShieldX size={48} className="mb-3" />
              <p>Enter a key and click Verify to see results</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 size={48} className="text-blue-400 animate-spin mb-3" />
              <p className="text-gray-400">Verifying key against database...</p>
            </div>
          )}

          {result && !loading && (
            <div className={`border rounded-xl p-6 ${getStatusColor()}`}>
              <div className="flex items-center gap-4 mb-4">
                {getStatusIcon()}
                <div>
                  <h4 className="text-lg font-bold text-white">{result.message}</h4>
                  <span className={`badge ${
                    result.status === 'valid' ? 'badge-active' :
                    result.status === 'expired' ? 'badge-expired' : 'badge-inactive'
                  }`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {Object.keys(result.details).length > 0 && (
                <div className="space-y-2 mt-4 border-t border-gray-700 pt-4">
                  {Object.entries(result.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-400">{key}</span>
                      <span className="text-sm text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON Response */}
              <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">API Response (JSON):</p>
                <pre className="text-xs text-green-400 overflow-x-auto">
{JSON.stringify({
  success: result.status === 'valid',
  status: result.status,
  message: result.message,
  timestamp: new Date().toISOString(),
  ...result.details
}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
