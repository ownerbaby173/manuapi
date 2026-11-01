import { useState } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { mockUsers, User } from '../data/mockData';

export default function Users() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' as User['role'] });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const user: User = {
      id: String(users.length + 1),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '-',
      apiKeys: 0,
    };
    setUsers([user, ...users]);
    setShowModal(false);
    setNewUser({ name: '', email: '', role: 'user' });
  };

  const toggleStatus = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  };

  const handleDelete = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage users and their permissions</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search users..." className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="card hover:border-blue-500/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.name.charAt(0)}
              </div>
              <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                {user.status}
              </span>
            </div>
            <h3 className="text-white font-semibold">{user.name}</h3>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge bg-purple-500/20 text-purple-400">{user.role}</span>
              <span className="text-xs text-gray-500">• {user.apiKeys} keys</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
              <span>Joined: {user.createdAt}</span>
              <span>Last: {user.lastLogin}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => toggleStatus(user.id)} className="flex-1 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm flex items-center justify-center gap-1">
                {user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                {user.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300">
                <Edit size={14} />
              </button>
              <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg bg-gray-700 hover:bg-red-500/20 text-gray-300 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add New User</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                <input type="text" className="input-field" placeholder="John Doe" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email</label>
                <input type="email" className="input-field" placeholder="john@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Role</label>
                <select className="input-field" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}>
                  <option value="user">User</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary flex-1" onClick={handleCreate}>Add User</button>
                <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
