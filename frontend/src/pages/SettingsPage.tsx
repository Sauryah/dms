import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Shield, Plus, X, Lock, Users, Trash2, Settings, FileText, Download, RefreshCw, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [sseStatus, setSseStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [logsLoading, setLogsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Advanced Audit Log Filter States
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Audit Logs Pagination States
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

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
      const queryParams = new URLSearchParams();
      queryParams.append('page', logsPage.toString());
      queryParams.append('limit', '15');
      if (actorFilter) queryParams.append('actor', actorFilter);
      if (actionFilter) queryParams.append('action', actionFilter);
      if (startDateFilter) queryParams.append('startDate', startDateFilter);
      if (endDateFilter) queryParams.append('endDate', endDateFilter);
      if (logSearch) queryParams.append('search', logSearch);

      const response = await api.get(`/audit-logs?${queryParams.toString()}`);
      setAuditLogs(response.data.logs);
      setLogsTotalCount(response.data.totalCount);
      setLogsTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleActorChange = (val: string) => {
    setActorFilter(val);
    setLogsPage(1);
  };

  const handleActionChange = (val: string) => {
    setActionFilter(val);
    setLogsPage(1);
  };

  const handleStartDateChange = (val: string) => {
    setStartDateFilter(val);
    setLogsPage(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDateFilter(val);
    setLogsPage(1);
  };

  const handleSearchChange = (val: string) => {
    setLogSearch(val);
    setLogsPage(1);
  };

  // Debounced/Immediate listener for state filters
  useEffect(() => {
    if (isAdmin) {
      const handler = setTimeout(() => {
        fetchAuditLogs();
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [isAdmin, logsPage, actorFilter, actionFilter, startDateFilter, endDateFilter, logSearch]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Real-time EventSource connection for streaming audit log telemetry
  useEffect(() => {
    if (!isAdmin || activeTab !== 'audit') return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const streamUrl = `${apiBase}/audit-logs/stream`;
    let eventSource: EventSource;
    let reconnectDelay = 1000;
    const maxDelay = 16000;
    let timerId: number;

    const connectSSE = () => {
      console.log('Establishing connection to real-time audit logs SSE stream...');
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      eventSource.onopen = () => {
        setSseStatus('connected');
        reconnectDelay = 1000; // Reset delay
      };

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return; // Ignore pings/heartbeats
          const logPayload = JSON.parse(event.data);
          
          if (logPayload && logPayload.id) {
            setAuditLogs((prev) => {
              // De-duplicate incoming logs
              if (prev.some((log) => log.id === logPayload.id)) return prev;

              // Filter check: only slide in if the incoming log matches active filters
              if (actorFilter && !logPayload.actorName.toLowerCase().includes(actorFilter.toLowerCase())) return prev;
              if (actionFilter && logPayload.action !== actionFilter) return prev;
              if (logSearch && !Object.values(logPayload).some(v => String(v).toLowerCase().includes(logSearch.toLowerCase()))) return prev;

              // Only prepend to page 1 to preserve layout
              if (logsPage === 1) {
                const nextLogs = [logPayload, ...prev];
                return nextLogs.slice(0, 15); // limit to current grid page size
              }
              return prev;
            });
            setLogsTotalCount((prev) => prev + 1);
          }
        } catch (err) {
          console.error('Failed parsing real-time SSE stream log payload:', err);
        }
      };

      eventSource.onerror = (err) => {
        setSseStatus('reconnecting');
        console.warn(`Real-time audit log stream disconnected or failed. Reconnecting in ${reconnectDelay / 1000}s...`, err);
        eventSource.close();
        
        // Reconnection logic with exponential backoff
        timerId = window.setTimeout(() => {
          if (isAdmin && activeTab === 'audit') {
            reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
            connectSSE();
          }
        }, reconnectDelay);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        console.log('Cleaning up SSE stream connection');
        eventSource.close();
      }
      window.clearTimeout(timerId);
      setSseStatus('disconnected');
    };
  }, [isAdmin, activeTab, logsPage, actorFilter, actionFilter, logSearch]);

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

  // Dynamic custom action badge color themes
  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE')) return { bg: 'var(--danger-light)', text: 'var(--danger)' };
    if (act.includes('CREATE')) return { bg: 'var(--primary-light)', text: 'var(--primary)' };
    if (act.includes('UPDATE')) return { bg: 'hsla(38, 92%, 50%, 0.15)', text: 'hsl(38, 92%, 60%)' };
    if (act.includes('IMPORT') || act.includes('EXPORT')) return { bg: 'var(--warning-light)', text: 'var(--warning)' };
    if (act.includes('LOGIN')) return { bg: 'var(--success-light)', text: 'var(--success)' };
    return { bg: 'hsl(222, 20%, 16%)', text: 'var(--text-muted)' };
  };

  // Since we use database-level server-side filtering, auditLogs is mapped directly
  const filteredLogs = auditLogs;

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
      {isAdmin && activeTab === 'users' && (
        <div style={{ marginTop: '2rem', padding: '2.5rem', background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
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
            <div style={{ padding: '0.75rem 1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(142, 70%, 45%, 0.2)', fontWeight: 500 }}>
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
        <div style={{ marginTop: '2rem', padding: '2.5rem', background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <FileText size={24} style={{ color: 'var(--primary)' }} /> Audit Trails & Compliance Logs
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Monitor administrative logins, Excel file ingests, and inventory operations</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(2, 6, 23, 0.4)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <span className={`telemetry-dot dot-${sseStatus}`} />
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Telemetry: {sseStatus}
                  </span>
                </div>
              </div>
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

          {/* Advanced Multi-Dimensional Database Filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            padding: '1.25rem',
            background: 'rgba(2, 6, 23, 0.3)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Term</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Filter logs..." 
                  value={logSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  style={{ paddingLeft: '2.25rem', height: '2.5rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* Actor Name Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Actor Name</label>
              <select 
                className="input" 
                value={actorFilter}
                onChange={(e) => handleActorChange(e.target.value)}
                style={{ height: '2.5rem', fontSize: '0.875rem', padding: '0 0.5rem', background: 'var(--white)' }}
              >
                <option value="">All Actors</option>
                <option value="admin">admin</option>
                <option value="viewer">viewer</option>
                {/* Dynamically extract unique actor names from existing logs to cover custom users */}
                {Array.from(new Set(auditLogs.map(l => l.actorName).filter(Boolean)))
                  .filter(name => name !== 'admin' && name !== 'viewer')
                  .map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))
                }
              </select>
            </div>

            {/* Action Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Action Type</label>
              <select 
                className="input" 
                value={actionFilter}
                onChange={(e) => handleActionChange(e.target.value)}
                style={{ height: '2.5rem', fontSize: '0.875rem', padding: '0 0.5rem', background: 'var(--white)' }}
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE_USER">CREATE_USER</option>
                <option value="DELETE_USER">DELETE_USER</option>
                <option value="CHANGE_PASSWORD">CHANGE_PASSWORD</option>
                <option value="CREATE_MACHINE">CREATE_MACHINE</option>
                <option value="UPDATE_MACHINE">UPDATE_MACHINE</option>
                <option value="DELETE_MACHINE">DELETE_MACHINE</option>
                <option value="CREATE_SET">CREATE_SET</option>
                <option value="UPDATE_SET">UPDATE_SET</option>
                <option value="DELETE_SET">DELETE_SET</option>
                <option value="ASSIGN_SET">ASSIGN_SET</option>
                <option value="CREATE_DIE">CREATE_DIE</option>
                <option value="UPDATE_DIE">UPDATE_DIE</option>
                <option value="DELETE_DIE">DELETE_DIE</option>
                <option value="ASSIGN_DIE">ASSIGN_DIE</option>
                <option value="IMPORT_DIES">IMPORT_DIES</option>
                <option value="EXPORT_LOGS">EXPORT_LOGS</option>
              </select>
            </div>

            {/* Start Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Start Date</label>
              <input 
                type="date" 
                className="input" 
                value={startDateFilter}
                onChange={(e) => handleStartDateChange(e.target.value)}
                style={{ height: '2.5rem', fontSize: '0.875rem', padding: '0 0.5rem' }}
              />
            </div>

            {/* End Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>End Date</label>
              <input 
                type="date" 
                className="input" 
                value={endDateFilter}
                onChange={(e) => handleEndDateChange(e.target.value)}
                style={{ height: '2.5rem', fontSize: '0.875rem', padding: '0 0.5rem' }}
              />
            </div>

            {/* Reset Button */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setActorFilter('');
                  setActionFilter('');
                  setStartDateFilter('');
                  setEndDateFilter('');
                  setLogSearch('');
                  setLogsPage(1);
                }}
                style={{ height: '2.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Reset Filters
              </button>
            </div>
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

          {/* Scale-Safe Audit Log Pagination Controls */}
          {logsTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Showing page <strong>{logsPage}</strong> of <strong>{logsTotalPages}</strong> ({logsTotalCount} total logs)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  disabled={logsPage === 1} 
                  onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.35rem 0.75rem', height: '2rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  disabled={logsPage === logsTotalPages} 
                  onClick={() => setLogsPage(prev => Math.min(logsTotalPages, prev + 1))}
                  style={{ padding: '0.35rem 0.75rem', height: '2rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(0, 84%, 60%, 0.2)' }}>
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
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
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
                <span style={{ fontWeight: 600 }}>{selectedLog.actorName} <small style={{ color: 'var(--text-muted)', fontFamily: 'monospace', marginLeft: '0.5rem' }}>({selectedLog.actorId})</small></span>
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
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <strong style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Event Details:</strong>
                <div style={{ background: 'rgba(2, 6, 23, 0.34)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', lineHeight: 1.5, color: 'var(--text-main)' }}>
                  {(() => {
                    try {
                      if (selectedLog.details && selectedLog.details.trim().startsWith('{')) {
                        const parsed = JSON.parse(selectedLog.details);
                        if (parsed && parsed.isDiff) {
                          const isSwap = parsed.changeType === 'ALLOCATION_SWAP';
                          const isDieMapping = parsed.changeType === 'DIE_MAPPING';
                          
                          const beforeItems = isSwap ? (parsed.before.sets || []) : (isDieMapping ? (parsed.before.dies || []) : []);
                          const afterItems = isSwap ? (parsed.after.sets || []) : (isDieMapping ? (parsed.after.dies || []) : []);
                          
                          // Find items removed and items added
                          const removed = beforeItems.filter((i: string) => !afterItems.includes(i));
                          const added = afterItems.filter((i: string) => !beforeItems.includes(i));
                          const unchanged = beforeItems.filter((i: string) => afterItems.includes(i));
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', fontWeight: 600 }}>
                                configuration state transition
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>BEFORE:</div>
                                  <span className="badge badge-neutral" style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }}>
                                    {isSwap ? `${parsed.before.setsCount} Toolsets` : `${parsed.before.diesCount} Dies`}
                                  </span>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>AFTER:</div>
                                  <span className="badge badge-primary" style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }}>
                                    {isSwap ? `${parsed.after.setsCount} Toolsets` : `${parsed.after.diesCount} Dies`}
                                  </span>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MAPPING CHANGES:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                  {unchanged.map((item: string) => (
                                    <span key={item} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                      {item}
                                    </span>
                                  ))}
                                  {removed.map((item: string) => (
                                    <span key={item} style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                      - {item}
                                    </span>
                                  ))}
                                  {added.map((item: string) => (
                                    <span key={item} style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                      + {item}
                                    </span>
                                  ))}
                                  {beforeItems.length === 0 && afterItems.length === 0 && (
                                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Empty Configuration</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      }
                    } catch (e) {
                      // Fallback to normal rendering if JSON parse fails
                    }
                    return selectedLog.details;
                  })()}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>IP Address:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{selectedLog.ipAddress || 'Not recorded'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>User Agent:</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, wordBreak: 'break-all' }}>{selectedLog.userAgent || 'Not recorded'}</span>
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
