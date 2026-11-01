import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ApiKeys from './pages/ApiKeys';
import Verification from './pages/Verification';
import Users from './pages/Users';
import Licenses from './pages/Licenses';
import Logs from './pages/Logs';
import PhpCode from './pages/PhpCode';
import Settings from './pages/Settings';

export type Page = 'dashboard' | 'api-keys' | 'verification' | 'users' | 'licenses' | 'logs' | 'php-code' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'api-keys': return <ApiKeys />;
      case 'verification': return <Verification />;
      case 'users': return <Users />;
      case 'licenses': return <Licenses />;
      case 'logs': return <Logs />;
      case 'php-code': return <PhpCode />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
