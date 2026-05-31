import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Shield, Lock, Settings } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';
import { UserAdminSettings } from '../components/UserAdminSettings';
import { AuditTrailSettings } from '../components/AuditTrailSettings';


const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  // UI Preferences & Tabs
  const [isCompact, setIsCompact] = useState(localStorage.getItem('ui-density') === 'compact');
  const [activeTab, setActiveTab] = useState('profile');

  // Password Change States
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (isCompact) {
      document.body.classList.add('compact-mode');
      localStorage.setItem('ui-density', 'compact');
    } else {
      document.body.classList.remove('compact-mode');
      localStorage.setItem('ui-density', 'relaxed');
    }
  }, [isCompact]);



  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdData.newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }

    if (pwdData.newPassword !== pwdData.confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    try {
      setPwdLoading(true);
      const response = await api.post('/auth/change-password', {
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword,
        confirmNewPassword: pwdData.confirmNewPassword
      });
      setPwdSuccess(response.data.message || 'Password changed successfully.');
      setPwdData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err: any) {
      setPwdError(err.response?.data?.error || 'Failed to change password. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  const segmentedOptions = [
    { label: 'My Account', value: 'profile' },
    ...(isAdmin ? [
      { label: 'User Administration', value: 'users' },
      { label: 'Audit Trails & Compliance', value: 'audit' }
    ] : [])
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your credentials, profile information, and facility users</p>
        </div>
      </div>

      {/* Segmented Control Navigation Tab Bar (visible to Administrators) */}
      {isAdmin && (
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-start' }}>
          <SegmentedControl 
            value={activeTab} 
            options={segmentedOptions} 
            onChange={(val) => {
              setActiveTab(val);
            }} 
          />
        </div>
      )}

      {/* Tab 1: Profile & Appearance settings */}
      {activeTab === 'profile' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '3rem' }}>
          {/* Profile Card */}
          <div className="card" style={{ cursor: 'default', padding: '2rem' }}>
            <div className="flex-between" style={{ gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div className="icon-wrapper icon-blue" style={{ padding: '1.25rem', borderRadius: '50%' }}>
                  <User size={36} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{user?.username}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                    <Shield size={14} /> Role: <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem' }}>{user?.role}</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-danger" onClick={logout} style={{ height: '2.75rem', padding: '0 1.25rem' }}>
                <LogOut size={16} /> Sign Out Account
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="card" style={{ cursor: 'default', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Lock size={20} className="icon-blue" /> Change Password
            </h2>

            {pwdSuccess && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(142, 70%, 45%, 0.2)', fontWeight: 500 }}>
                {pwdSuccess}
              </div>
            )}

            {pwdError && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(0, 84%, 60%, 0.2)', fontWeight: 500 }}>
                {pwdError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', margin: 0 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="label">Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="input" 
                      placeholder="Enter current password..." 
                      value={pwdData.currentPassword} 
                      onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })} 
                      style={{ paddingLeft: '2.5rem' }}
                      required 
                    />
                  </div>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="input" 
                      placeholder="Min 8 characters..." 
                      value={pwdData.newPassword} 
                      onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })} 
                      style={{ paddingLeft: '2.5rem' }}
                      required 
                    />
                  </div>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="input" 
                      placeholder="Re-enter new password..." 
                      value={pwdData.confirmNewPassword} 
                      onChange={(e) => setPwdData({ ...pwdData, confirmNewPassword: e.target.value })} 
                      style={{ paddingLeft: '2.5rem' }}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={pwdLoading} style={{ height: '2.5rem', padding: '0 1.5rem' }}>
                  {pwdLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Appearance Settings */}
          <div className="card" style={{ cursor: 'default', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Settings size={20} className="icon-blue" /> Appearance Settings
            </h2>
            <div className="flex-between">
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>UI Density</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Choose between a spacious or data-compact layout for tables and panels.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-sidebar)', padding: '0.25rem', borderRadius: '8px' }}>
                <button 
                  className={`btn ${!isCompact ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setIsCompact(false)}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                >
                  Relaxed
                </button>
                <button 
                  className={`btn ${isCompact ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setIsCompact(true)}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Admin User Management Section */}
      {isAdmin && activeTab === 'users' && <UserAdminSettings />}

      {/* Tab 3: Admin Compliance Audit Trails Section */}
      {isAdmin && activeTab === 'audit' && <AuditTrailSettings />}
    </div>
  );
};

export default SettingsPage;
