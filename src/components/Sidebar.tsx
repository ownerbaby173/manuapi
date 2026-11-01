import { Page } from '../App';
import {
  LayoutDashboard,
  Key,
  ShieldCheck,
  Users,
  CreditCard,
  ScrollText,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'api-keys', label: 'API Keys', icon: <Key size={20} /> },
  { id: 'verification', label: 'Verification', icon: <ShieldCheck size={20} /> },
  { id: 'users', label: 'Users', icon: <Users size={20} /> },
  { id: 'licenses', label: 'Licenses', icon: <CreditCard size={20} /> },
  { id: 'logs', label: 'Activity Logs', icon: <ScrollText size={20} /> },
  { id: 'php-code', label: 'PHP Backend Code', icon: <Code2 size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }: SidebarProps) {
  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-16'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white whitespace-nowrap">API Verify</h1>
            <p className="text-xs text-gray-400">PHP & MySQL</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-2 space-y-1">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-link ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
            title={!isOpen ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
          </div>
        ))}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-4 right-3 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </aside>
  );
}
