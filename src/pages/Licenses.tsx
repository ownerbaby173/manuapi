import { useState } from 'react';
import { Plus, Search, Trash2, Copy, Monitor } from 'lucide-react';
import { mockLicenses, License } from '../data/mockData';

export default function Licenses() {
  const [licenses, setLicenses] = useState<License[]>(mockLicenses);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newLicense, setNewLicense] = useState({ product: '', type: 'monthly' as License['type'], maxDevices: '5', expires: '' });

  const filteredLicenses = licenses.filter(l =>
    l.licenseKey.toLowerCase().includes(search.toLowerCase()) ||
    l.product.toLowerCase().includes(search.toLowerCase()) ||
    l.user.toLowerCase().includes(search.toLowerCase())
  );

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `LIC-2024-${segment()}-${segment()}-${segment()}`;
  };

  const handleCreate = () => {
    const license: License = {
      id: String(licenses.length + 1),
      licenseKey: generateLicenseKey(),
      product: newLicense.product,
      type: newLicense.type,
      status: 'active',
      user: 'New User',
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: newLicense.expires,
      maxDevices: parseInt(newLicense.maxDevices),
      activeDevices: 0,
    };
    setLicenses([license, ...licenses]);
    setShowModal(false);
    setNewLicense({ product: '', type: 'monthly', maxDevices: '5', expires: '' });
  };

  const handleDelete = (id: string) => {
    setLicenses(licenses.filter(l => l.id !== id));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">License Management</h1>
          <p className="text-gray-400 mt-1">Create and manage software licenses</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Create License
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{licenses.length}</div>
          <div className="text-sm text-gray-400">Total Licenses</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{licenses.filter(l => l.status === 'active').length}</div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{licenses.filter(l => l.status === 'expired').length}</div>
          <div className="text-sm text-gray-400">Expired</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-400">{licenses.filter(l => l.status === 'suspended').length}</div>
          <div className="text-sm text-gray-400">Suspended</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search licenses..." className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Licenses Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3 font-medium">License Key</th>
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">User</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Devices</th>
              <th className="pb-3 font-medium">Expires</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.map((license) => (
              <tr key={license.id} className="table-row">
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">{license.licenseKey}</code>
                    <button onClick={() => copyKey(license.licenseKey)} className="text-gray-400 hover:text-white">
                      <Copy size={12} />
                    </button>
                  </div>
                </td>
                <td className="py-4 text-white">{license.product}</td>
                <td className="py-4">
                  <span className="badge bg-blue-500/20 text-blue-400">{license.type}</span>
                </td>
                <td className="py-4 text-gray-300">{license.user}</td>
                <td className="py-4">
                  <span className={`badge ${license.status === 'active' ? 'badge-active' : license.status === 'expired' ? 'badge-expired' : 'badge-inactive'}`}>
                    {license.status}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-1">
                    <Monitor size={14} className="text-gray-400" />
                    <span className="text-white">{license.activeDevices}/{license.maxDevices}</span>
                  </div>
                </td>
                <td className="py-4 text-gray-300">{license.expiresAt}</td>
                <td className="py-4">
                  <button onClick={() => handleDelete(license.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create New License</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Product Name</label>
                <input type="text" className="input-field" placeholder="API Pro Plan" value={newLicense.product} onChange={(e) => setNewLicense({ ...newLicense, product: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">License Type</label>
                <select className="input-field" value={newLicense.type} onChange={(e) => setNewLicense({ ...newLicense, type: e.target.value as License['type'] })}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Max Devices</label>
                <input type="number" className="input-field" placeholder="5" value={newLicense.maxDevices} onChange={(e) => setNewLicense({ ...newLicense, maxDevices: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Expiration Date</label>
                <input type="date" className="input-field" value={newLicense.expires} onChange={(e) => setNewLicense({ ...newLicense, expires: e.target.value })} />
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary flex-1" onClick={handleCreate}>Create License</button>
                <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
