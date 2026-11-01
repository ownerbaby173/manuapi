export interface ApiKey {
  id: string;
  key: string;
  name: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  lastUsed: string;
  requests: number;
  limit: number;
  expiresAt: string;
  ip: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'developer';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
  apiKeys: number;
}

export interface License {
  id: string;
  licenseKey: string;
  product: string;
  type: 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'expired' | 'suspended';
  user: string;
  createdAt: string;
  expiresAt: string;
  maxDevices: number;
  activeDevices: number;
}

export interface LogEntry {
  id: string;
  action: string;
  apiKey: string;
  ip: string;
  status: 'success' | 'failed' | 'warning';
  timestamp: string;
  details: string;
}

export const mockApiKeys: ApiKey[] = [
  { id: '1', key: 'ak_live_7x9K2mN4pQ8rT1wY', name: 'Production API', status: 'active', createdAt: '2024-01-15', lastUsed: '2024-03-20', requests: 45230, limit: 100000, expiresAt: '2025-01-15', ip: '192.168.1.100' },
  { id: '2', key: 'ak_test_3bF6hJ9kL2nR5vX', name: 'Testing API', status: 'active', createdAt: '2024-02-01', lastUsed: '2024-03-19', requests: 12450, limit: 50000, expiresAt: '2025-02-01', ip: '192.168.1.101' },
  { id: '3', key: 'ak_live_8wQ4rT7yU0iP3aS', name: 'Mobile App API', status: 'inactive', createdAt: '2024-01-20', lastUsed: '2024-02-28', requests: 8920, limit: 25000, expiresAt: '2024-12-20', ip: '192.168.1.102' },
  { id: '4', key: 'ak_live_5dG8hK1lM3nO6pQ', name: 'Web Dashboard', status: 'active', createdAt: '2024-03-01', lastUsed: '2024-03-20', requests: 67800, limit: 200000, expiresAt: '2025-03-01', ip: '192.168.1.103' },
  { id: '5', key: 'ak_live_2eR5tY8uI1oP4aS', name: 'Legacy System', status: 'expired', createdAt: '2023-06-15', lastUsed: '2024-01-10', requests: 156000, limit: 100000, expiresAt: '2024-06-15', ip: '192.168.1.104' },
];

export const mockUsers: User[] = [
  { id: '1', name: 'Ahmed Khan', email: 'ahmed@example.com', role: 'admin', status: 'active', createdAt: '2024-01-01', lastLogin: '2024-03-20', apiKeys: 3 },
  { id: '2', name: 'Sara Ali', email: 'sara@example.com', role: 'developer', status: 'active', createdAt: '2024-01-15', lastLogin: '2024-03-19', apiKeys: 2 },
  { id: '3', name: 'Usman Malik', email: 'usman@example.com', role: 'user', status: 'active', createdAt: '2024-02-01', lastLogin: '2024-03-18', apiKeys: 1 },
  { id: '4', name: 'Fatima Noor', email: 'fatima@example.com', role: 'developer', status: 'inactive', createdAt: '2024-02-15', lastLogin: '2024-03-01', apiKeys: 0 },
  { id: '5', name: 'Bilal Ahmed', email: 'bilal@example.com', role: 'user', status: 'active', createdAt: '2024-03-01', lastLogin: '2024-03-20', apiKeys: 1 },
];

export const mockLicenses: License[] = [
  { id: '1', licenseKey: 'LIC-2024-ABCD-1234-EFGH', product: 'API Pro Plan', type: 'yearly', status: 'active', user: 'Ahmed Khan', createdAt: '2024-01-15', expiresAt: '2025-01-15', maxDevices: 5, activeDevices: 3 },
  { id: '2', licenseKey: 'LIC-2024-IJKL-5678-MNOP', product: 'API Basic Plan', type: 'monthly', status: 'active', user: 'Sara Ali', createdAt: '2024-03-01', expiresAt: '2024-04-01', maxDevices: 2, activeDevices: 1 },
  { id: '3', licenseKey: 'LIC-2024-QRST-9012-UVWX', product: 'API Enterprise', type: 'lifetime', status: 'active', user: 'Usman Malik', createdAt: '2024-02-01', expiresAt: '2099-12-31', maxDevices: 10, activeDevices: 7 },
  { id: '4', licenseKey: 'LIC-2023-YZAB-3456-CDEF', product: 'API Pro Plan', type: 'yearly', status: 'expired', user: 'Fatima Noor', createdAt: '2023-03-01', expiresAt: '2024-03-01', maxDevices: 5, activeDevices: 0 },
  { id: '5', licenseKey: 'LIC-2024-GHIJ-7890-KLMN', product: 'API Basic Plan', type: 'monthly', status: 'suspended', user: 'Bilal Ahmed', createdAt: '2024-02-15', expiresAt: '2024-03-15', maxDevices: 2, activeDevices: 0 },
];

export const mockLogs: LogEntry[] = [
  { id: '1', action: 'API Verification', apiKey: 'ak_live_7x9K...', ip: '203.0.113.50', status: 'success', timestamp: '2024-03-20 14:32:15', details: 'Key verified successfully' },
  { id: '2', action: 'License Check', apiKey: 'LIC-2024-ABCD...', ip: '198.51.100.25', status: 'success', timestamp: '2024-03-20 14:30:00', details: 'License is valid and active' },
  { id: '3', action: 'API Verification', apiKey: 'ak_live_5dG8...', ip: '203.0.113.75', status: 'failed', timestamp: '2024-03-20 14:28:45', details: 'Rate limit exceeded' },
  { id: '4', action: 'Key Generated', apiKey: 'ak_live_8wQ4...', ip: '192.168.1.100', status: 'success', timestamp: '2024-03-20 14:25:30', details: 'New API key created for Mobile App' },
  { id: '5', action: 'IP Blocked', apiKey: 'ak_live_2eR5...', ip: '10.0.0.55', status: 'warning', timestamp: '2024-03-20 14:20:00', details: 'Suspicious activity detected - IP blocked' },
  { id: '6', action: 'License Renewed', apiKey: 'LIC-2024-IJKL...', ip: '192.168.1.101', status: 'success', timestamp: '2024-03-20 13:55:00', details: 'License renewed for 1 month' },
  { id: '7', action: 'API Verification', apiKey: 'ak_test_3bF6...', ip: '203.0.113.100', status: 'success', timestamp: '2024-03-20 13:45:00', details: 'Test key verified' },
  { id: '8', action: 'User Login', apiKey: '-', ip: '192.168.1.100', status: 'success', timestamp: '2024-03-20 13:30:00', details: 'Admin login successful' },
  { id: '9', action: 'API Verification', apiKey: 'ak_live_7x9K...', ip: '203.0.113.200', status: 'failed', timestamp: '2024-03-20 13:15:00', details: 'Invalid API key' },
  { id: '10', action: 'Settings Updated', apiKey: '-', ip: '192.168.1.100', status: 'warning', timestamp: '2024-03-20 12:00:00', details: 'Rate limit changed from 1000 to 5000' },
];
