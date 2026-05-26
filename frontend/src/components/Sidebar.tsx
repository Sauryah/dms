import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Settings, Disc, Orbit, Workflow } from 'lucide-react';
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

  return (
    <aside className="sidebar">
      <div style={{ padding: '0.5rem 0', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="icon-wrapper icon-blue" style={{ borderRadius: '8px', padding: '0.5rem' }}>
          <Disc size={24} />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          DMS
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <NavLink 
          to="/" 
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          style={{ justifyContent: 'flex-start', textDecoration: 'none' }}
        >
          <LayoutDashboard size={20} /> Equipment Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink 
            to="/topology" 
            className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
            style={{ justifyContent: 'flex-start', textDecoration: 'none' }}
          >
            <Orbit size={20} /> 3D Fleet View
          </NavLink>
        )}

        <NavLink 
          to="/search" 
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          style={{ justifyContent: 'flex-start', textDecoration: 'none' }}
        >
          <Search size={20} /> Universal Search
        </NavLink>

        {isAdmin && (
          <NavLink 
            to="/codebase" 
            className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
            style={{ 
              justifyContent: 'flex-start', 
              textDecoration: 'none', 
              marginTop: '1.5rem', 
              borderTop: '1px solid var(--border)', 
              paddingTop: '1.5rem', 
              borderRadius: '8px' 
            }}
          >
            <Workflow size={20} /> 3D Codebase View
          </NavLink>
        )}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          style={{ justifyContent: 'flex-start', textDecoration: 'none' }}
        >
          <Settings size={20} /> Settings
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
