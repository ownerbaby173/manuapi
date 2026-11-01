import { useState } from 'react';
import { Plus, Copy, Trash2, RefreshCw, Search, Eye, EyeOff, Edit } from 'lucide-react';
import { mockApiKeys, ApiKey } from '../data/mockData';

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', limit: '10000', expires: '' });

  const filteredKeys = keys.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.key.toLowerCase().includes(search.toLowerCase())
  );

  const generateKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'ak_live_';
    for (let i = 0; i < 20; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const handleCreate = () => {
    const key: ApiKey = {
      id: String(keys.length + 1),
      key: generateKey(),
      name: newKey.name,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: '-',
      requests: 0,
      limit: parseInt(newKey.limit),
      expiresAt: newKey.expires,
      ip: '0.0.0.0',
    };
    setKeys([key, ...keys]);
    setShowModal(false);
    setNewKey({ name: '', limit: '10000', expires: '' });
  };

  const handleDelete = (id: string) => {
    setKeys(keys.filter(k => k.id !== id));
  };

  const toggleStatus = (id: string) => {
    setKeys(keys.map(k => k.id === id ? { ...k, status: k.status === 'active' ? 'inactive' : 'active' } : k));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="text-gray-400 mt-1">Manage your API keys and access tokens</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Generate New Key
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search API keys..."
          className="input-field pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Keys Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3 font-medium">Key Name</th>
              <th className="pb-3 font-medium">API Key</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Requests</th>
              <th className="pb-3 font-medium">Expires</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((key) => (
              <tr key={key.id} className="table-row">
                <td className="py-4">
                  <div className="font-medium text-white">{key.name}</div>
                  <div className="text-xs text-gray-400">Created: {key.createdAt}</div>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-gray-300 bg-gray-700 px-2 py-1 rounded">
                      {showKey[key.id] ? key.key : key.key.substring(0, 12) + '••••••••'}
                    </code>
                    <button onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })} className="text-gray-400 hover:text-white">
                      {showKey[key.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => copyToClipboard(key.key)} className="text-gray-400 hover:text-white">
                      <Copy size={14} />
                    </button>
                  </div>
                </td>
                <td className="py-4">
                  <span className={`badge ${key.status === 'active' ? 'badge-active' : key.status === 'expired' ? 'badge-expired' : 'badge-inactive'}`}>
                    {key.status}
                  </span>
                </td>
                <td className="py-4">
                  <div className="text-white">{key.requests.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">/ {key.limit.toLocaleString()}</div>
                </td>
                <td className="py-4 text-gray-300">{key.expiresAt}</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleStatus(key.id)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="Toggle Status">
                      <RefreshCw size={14} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(key.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
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
            <h2 className="text-xl font-bold text-white mb-4">Generate New API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Key Name</label>
                <input type="text" className="input-field" placeholder="e.g., Production API" value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Request Limit</label>
                <input type="number" className="input-field" placeholder="10000" value={newKey.limit} onChange={(e) => setNewKey({ ...newKey, limit: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Expiration Date</label>
                <input type="date" className="input-field" value={newKey.expires} onChange={(e) => setNewKey({ ...newKey, expires: e.target.value })} />
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary flex-1" onClick={handleCreate}>Generate Key</button>
                <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
