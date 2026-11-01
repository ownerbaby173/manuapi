import { Key, ShieldCheck, Users, CreditCard, TrendingUp, AlertTriangle, Activity, Zap } from 'lucide-react';
import { mockApiKeys, mockUsers, mockLicenses, mockLogs } from '../data/mockData';

export default function Dashboard() {
  const stats = [
    { label: 'Total API Keys', value: mockApiKeys.length, icon: <Key size={24} />, color: 'blue', change: '+12%' },
    { label: 'Active Verifications', value: '45,230', icon: <ShieldCheck size={24} />, color: 'green', change: '+23%' },
    { label: 'Total Users', value: mockUsers.length, icon: <Users size={24} />, color: 'purple', change: '+8%' },
    { label: 'Active Licenses', value: mockLicenses.filter(l => l.status === 'active').length, icon: <CreditCard size={24} />, color: 'orange', change: '+5%' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">API Verification Software Overview</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm">
          <Activity size={14} />
          <span>All Systems Operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[stat.color]}`}>
                {stat.icon}
              </div>
              <span className="text-green-400 text-sm flex items-center gap-1">
                <TrendingUp size={14} />
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
            <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Usage Chart (Simulated) */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={18} className="text-blue-400" />
            API Requests (Last 7 Days)
          </h3>
          <div className="flex items-end gap-2 h-48">
            {[65, 45, 78, 52, 90, 68, 85].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">Total: 45,230 requests</span>
            <span className="text-green-400">↑ 23% from last week</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {mockLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-700/30">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  log.status === 'success' ? 'bg-green-400' :
                  log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{log.action}</p>
                  <p className="text-xs text-gray-400">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Success Rate</h4>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-green-400">98.5%</div>
            <div className="flex-1">
              <div className="h-2 bg-gray-700 rounded-full">
                <div className="h-2 bg-green-400 rounded-full" style={{ width: '98.5%' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Avg Response Time</h4>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-blue-400">45ms</div>
            <div className="flex-1">
              <div className="h-2 bg-gray-700 rounded-full">
                <div className="h-2 bg-blue-400 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Blocked Requests</h4>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-red-400">152</div>
            <div className="flex-1">
              <div className="h-2 bg-gray-700 rounded-full">
                <div className="h-2 bg-red-400 rounded-full" style={{ width: '3%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
