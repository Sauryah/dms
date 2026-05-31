import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, User, Trash2, Lock, X } from 'lucide-react';
import Skeleton from './Skeleton';

export const UserAdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form States
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'VIEWER', confirmPassword: '' });
  
  // Success & Error States
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
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

  useEffect(() => {
    fetchUsers();
  }, []);

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

  return (
    <>
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

        {error && !showModal && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(0, 84%, 60%, 0.2)', fontWeight: 500 }}>
            {error}
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
    </>
  );
};
