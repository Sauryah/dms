import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Settings, Disc, Orbit, Workflow, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Side navigation menu linking to core views.
 * 
 * @concept Hierarchy-First Navigation (GEMINI.md section 4)
 * Promotes Equipment Dashboard as the primary route to enforce Machine -> Set -> Die navigation.
 */
const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (document.body.classList.contains('sidebar-open')) {
        const sidebar = document.querySelector('.sidebar');
        const hamburger = document.querySelector('.hamburger-btn');
        if (sidebar && !sidebar.contains(e.target as Node) && hamburger && !hamburger.contains(e.target as Node)) {
          document.body.classList.remove('sidebar-open');
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-wrapper icon-blue" style={{ borderRadius: '8px', padding: '0.5rem' }}>
            <Disc size={24} />
          </div>
          <span className="sidebar-logo-text">
            DMS
          </span>
        </div>
        <button 
          className="btn-icon sidebar-close-btn" 
          onClick={closeSidebar}
          style={{ display: 'none' }}
          title="Close Navigation"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          style={{ textDecoration: 'none' }}
          onClick={closeSidebar}
        >
          <LayoutDashboard size={20} /> <span>Equipment Dashboard</span>
        </NavLink>
        {isAdmin && (
          <NavLink 
            to="/topology" 
            className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textDecoration: 'none' }}
            onClick={closeSidebar}
          >
            <Orbit size={20} /> <span>3D Fleet View</span>
          </NavLink>
        )}

        <NavLink 
          to="/search" 
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          style={{ textDecoration: 'none' }}
          onClick={closeSidebar}
        >
          <Search size={20} /> <span>Universal Search</span>
        </NavLink>

        {isAdmin && (
          <NavLink 
            to="/codebase" 
            className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textDecoration: 'none' }}
            id="sidebar-codebase-link"
            onClick={closeSidebar}
          >
            <Workflow size={20} /> <span>3D Codebase View</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          style={{ textDecoration: 'none' }}
          onClick={closeSidebar}
        >
          <Settings size={20} /> <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
