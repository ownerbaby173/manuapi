import { useState } from 'react';
import { Search, Filter, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { mockLogs } from '../data/mockData';

export default function Logs() {
  const [logs] = useState(mockLogs);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'warning'>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.apiKey.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || log.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-400" />;
      case 'failed': return <XCircle size={16} className="text-red-400" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Logs</h1>
          <p className="text-gray-400 mt-1">Track all API activities and system events</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download size={18} /> Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search logs..." className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          {(['all', 'success', 'failed', 'warning'] as const).map((f) => (
            <button
              key={f}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <CheckCircle size={20} className="text-green-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{logs.filter(l => l.status === 'success').length}</div>
            <div className="text-sm text-gray-400">Successful</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
            <XCircle size={20} className="text-red-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{logs.filter(l => l.status === 'failed').length}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <AlertTriangle size={20} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{logs.filter(l => l.status === 'warning').length}</div>
            <div className="text-sm text-gray-400">Warnings</div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Action</th>
              <th className="pb-3 font-medium">API Key</th>
              <th className="pb-3 font-medium">IP Address</th>
              <th className="pb-3 font-medium">Details</th>
              <th className="pb-3 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="table-row">
                <td className="py-3">
                  {getStatusIcon(log.status)}
                </td>
                <td className="py-3 text-white font-medium">{log.action}</td>
                <td className="py-3">
                  <code className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">{log.apiKey}</code>
                </td>
                <td className="py-3 text-gray-300 font-mono text-sm">{log.ip}</td>
                <td className="py-3 text-gray-400 text-sm max-w-xs truncate">{log.details}</td>
                <td className="py-3 text-gray-400 text-sm whitespace-nowrap">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
