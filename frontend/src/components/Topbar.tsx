import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';

const Topbar: React.FC = () => {
  const { user, logout } = useAuth();

  const toggleSidebar = (e: React.MouseEvent) => {
    e.stopPropagation();
    document.body.classList.toggle('sidebar-open');
  };

  return (
    <header className="topbar">
      <button 
        className="btn-icon hamburger-btn" 
        onClick={toggleSidebar} 
        style={{ display: 'none', marginRight: '0.75rem' }}
        title="Open Navigation"
      >
        <Menu size={20} />
      </button>
      <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
        Welcome back, <span style={{ color: 'var(--primary)' }}>{user?.username}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="icon-wrapper icon-blue" style={{ padding: '0.4rem', borderRadius: '6px' }}>
            <UserIcon size={16} />
          </div>
          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
            {user?.role?.toLowerCase()}
          </span>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
        <button 
          onClick={logout}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 0.75rem' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
