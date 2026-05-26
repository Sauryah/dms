import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Shield, Plus, X, Lock, Users, Trash2, Settings, FileText, Download, RefreshCw, Eye, Search } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';
import Skeleton from '../components/Skeleton';

interface UserInfo {
  id: string;
  username: string;
  role: string;
}

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [usersList, setUsersList] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '', role: 'VIEWER', confirmPassword: '' });
  
  // UI Preferences & Tabs
  const [isCompact, setIsCompact] = useState(localStorage.getItem('ui-density') === 'compact');
  const [activeTab, setActiveTab] = useState('profile');

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

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

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      setUsersList(response.data);
    } catch (err) {
      console.error('Failed to fetch users list', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    try {
      setLogsLoading(true);
      const response = await api.get('/audit-logs');
      setAuditLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAuditLogs();
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/register', formData);
      setSuccess(`User "${formData.username}" successfully registered.`);
      setFormData({ username: '', password: '', role: 'VIEWER', confirmPassword: '' });
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user account');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the user account "${username}"? This action cannot be undone.`)) {
      try {
        setError('');
        setSuccess('');
        await api.delete(`/auth/users/${userId}`);
        setSuccess(`User "${username}" was successfully deleted.`);
        fetchUsers();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete user account');
      }
    }
  };

  const handleExportLogs = async () => {
    try {
      setExporting(true);
      const response = await api.get('/audit-logs/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_log_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit logs', err);
      alert('Failed to export audit logs. Please try again later.');
    } finally {
      setExporting(false);
    }
  };

  // Dynamic custom action badge color themes
  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE')) return { bg: '#fee2e2', text: '#ef4444' };
    if (act.includes('CREATE')) return { bg: '#e0f2fe', text: '#0284c7' };
    if (act.includes('UPDATE')) return { bg: '#fef3c7', text: '#d97706' };
    if (act.includes('IMPORT') || act.includes('EXPORT')) return { bg: '#f3e8ff', text: '#7c3aed' };
    if (act.includes('LOGIN')) return { bg: '#d1fae5', text: '#059669' };
    return { bg: '#f1f5f9', text: '#475569' };
  };

  // Real-time search filter for audit logs
  const filteredLogs = auditLogs.filter(log => {
    const q = logSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.target || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  const segmentedOptions = [
    { label: 'My Account', value: 'profile' },
    ...(isAdmin ? [
      { label: 'User Administration', value: 'users', count: usersList.length },
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
              setError('');
              setSuccess('');
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
      {isAdmin && activeTab === 'users' && (
        <div style={{ marginTop: '2rem', padding: '2.5rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex-between" style={{ marginBottom: '2rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Users size={24} style={{ color: 'var(--primary)' }} /> User Administration
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>List, audit, and provision operator or viewer accounts</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}>
              <Plus size={16} /> Add User Account
            </button>
          </div>

          {success && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #d1fae5', fontWeight: 500 }}>
              {success}
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Database ID</th>
                  <th>System Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && usersList.length === 0 ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Skeleton variant="circle" width={16} height={16} />
                          <Skeleton width="60%" height="1.25rem" />
                        </div>
                      </td>
                      <td><Skeleton width="80%" height="1rem" /></td>
                      <td><Skeleton width="60px" height="1.25rem" /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Skeleton variant="circle" width={6} height={6} />
                          <Skeleton width="40px" height="1rem" />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Skeleton width={24} height={24} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                          <User size={16} style={{ color: 'var(--text-muted)' }} />
                          {u.username}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.id}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`} style={{ fontWeight: 700, fontSize: '0.6875rem' }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }}></span> Active
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {u.username !== user?.username && u.username !== 'admin' ? (
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '0.4rem', color: 'var(--danger)' }} 
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Admin Compliance Audit Trails Section */}
      {isAdmin && activeTab === 'audit' && (
        <div style={{ marginTop: '2rem', padding: '2.5rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <FileText size={24} style={{ color: 'var(--primary)' }} /> Audit Trails & Compliance Logs
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Monitor administrative logins, Excel file ingests, and inventory operations</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={fetchAuditLogs} disabled={logsLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.5rem' }}>
                <RefreshCw size={14} className={logsLoading ? 'spin-anim' : ''} /> Refresh Logs
              </button>
              <button className="btn btn-primary" onClick={handleExportLogs} disabled={exporting || auditLogs.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.5rem' }}>
                <Download size={14} /> {exporting ? 'Exporting...' : 'Export to CSV'}
              </button>
            </div>
          </div>

          {/* Real-time search filter */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Filter logs by actor, action, target, or details..." 
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', height: '2.75rem' }}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action Type</th>
                  <th>Target</th>
                  <th>Details Summary</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading && auditLogs.length === 0 ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td><Skeleton width="120px" height="1rem" /></td>
                      <td><Skeleton width="80px" height="1.125rem" /></td>
                      <td><Skeleton width="60px" height="1.25rem" /></td>
                      <td><Skeleton width="90px" height="1rem" /></td>
                      <td><Skeleton width="220px" height="1rem" /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Skeleton width={50} height={20} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No matching audit logs found.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const colors = getActionColor(log.action);
                    return (
                      <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                        <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.actorName}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.text}1a`, fontWeight: 700, fontSize: '0.625rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{log.target}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-ghost" onClick={() => setSelectedLog(log)} style={{ padding: '0.25rem 0.5rem', height: '1.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} /> Register New Account
              </h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Username</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. operator_smith" 
                  value={formData.username} 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                  required 
                />
              </div>
              <div className="input-group">
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    className="input" 
                    placeholder="Enter password..." 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    style={{ paddingLeft: '2.5rem' }}
                    required 
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">System Access Role</label>
                <select 
                  className="input" 
                  value={formData.role} 
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                  required
                >
                  <option value="VIEWER">VIEWER (Read-Only access)</option>
                  <option value="OPERATOR">OPERATOR (Assocations & Building tools)</option>
                  <option value="ADMIN">ADMIN (Full administrative CRUD controls)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Authorize Action (Your Admin Password)</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    className="input" 
                    placeholder="Enter YOUR admin password..." 
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                    style={{ paddingLeft: '2.5rem' }}
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setFormData({ ...formData, confirmPassword: '' }); }} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Audit Log Modal */}
      {selectedLog && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <Eye size={20} style={{ color: 'var(--primary)' }} /> Audit Log Details
              </h2>
              <button onClick={() => setSelectedLog(null)} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Timestamp:</strong>
                <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Actor Name:</strong>
                <span style={{ fontWeight: 600 }}>{selectedLog.actorName} <small style={{ color: '#64748b', fontFamily: 'monospace', marginLeft: '0.5rem' }}>({selectedLog.actorId})</small></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Action Type:</strong>
                <div>
                  {(() => {
                    const colors = getActionColor(selectedLog.action);
                    return (
                      <span className="badge" style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.text}1a`, fontWeight: 700, fontSize: '0.625rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {selectedLog.action}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Target:</strong>
                <span style={{ fontWeight: 600 }}>{selectedLog.target}</span>
              </div>
              
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <strong style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Event Details:</strong>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.5, color: '#334155' }}>
                  {selectedLog.details}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>IP Address:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{selectedLog.ipAddress || 'Not recorded'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>User Agent:</strong>
                  <span style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4, wordBreak: 'break-all' }}>{selectedLog.userAgent || 'Not recorded'}</span>
                </div>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={() => setSelectedLog(null)} style={{ width: '100%', marginTop: '2rem', height: '2.5rem' }}>Close Details</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
