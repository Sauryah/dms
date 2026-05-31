import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, ArrowLeft, Disc, Edit2, Trash2, Plus, X, Cpu, Search } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

interface Die {
  id: string;
  dieId: string;
  size: string;
  casing: string;
  details: string;
}

interface Set {
  id: string;
  name: string;
  description: string;
  dies: Die[];
  machine?: {
    id: string;
    name: string;
  };
}

const SetDetails: React.FC = () => {
  const { id } = useParams();
  const [set, setSet] = useState<Set | null>(null);
  const [availableDies, setAvailableDies] = useState<Die[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [selectedDieId, setSelectedDieId] = useState('');
  const [error, setError] = useState('');
  const [showDieModal, setShowDieModal] = useState(false);
  const [editingDie, setEditingDie] = useState<Die | null>(null);
  const [dieFormData, setDieFormData] = useState({ dieId: '', size: '', casing: '', details: '' });
  const [dieError, setDieError] = useState('');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const canAssign = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const fetchSet = async () => {
    try {
      const response = await api.get(`/sets/${id}`);
      setSet(response.data);
      setEditData({ name: response.data.name, description: response.data.description || '' });
    } catch (error) {
      console.error('Failed to fetch set', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDies = async () => {
    try {
      const response = await api.get('/dies', {
        params: {
          status: 'unassigned',
          limit: 100
        }
      });
      setAvailableDies(response.data.dies);
    } catch (error) {
      console.error('Failed to fetch dies', error);
    }
  };

  const openAssignModal = async () => {
    try {
      // Attempt to acquire lock on the set
      await api.post('/locks/acquire', { entityId: id });
      setAssignSearchQuery('');
      setSelectedDieId('');
      setShowAssignModal(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'This set is currently locked by another operator.';
      const lockOwner = err.response?.data?.lock?.operatorName;
      const customMsg = lockOwner 
        ? `Locked by Operator: ${lockOwner}. Please try again later!` 
        : errorMsg;
      addToast('error', 'Resource Locked', customMsg);
    }
  };

  const closeAssignModal = async () => {
    setShowAssignModal(false);
    try {
      await api.post('/locks/release', { entityId: id });
    } catch (releaseErr) {
      console.error('Failed to release lock:', releaseErr);
    }
  };

  useEffect(() => {
    fetchSet();
    fetchAvailableDies();
    
    // Cleanup: release lock if still held on unmount
    return () => {
      api.post('/locks/release', { entityId: id }).catch(() => {});
    };
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/sets/${id}`, editData);
      setShowEditModal(false);
      fetchSet();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update set');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this set? This will not delete the dies themselves.')) {
      try {
        await api.delete(`/sets/${id}`);
        navigate('/sets');
      } catch (err) {
        alert('Failed to delete set');
      }
    }
  };

  const handleAssignDie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDieId) return;
    try {
      await api.post(`/sets/${id}/dies/${selectedDieId}`);
      setShowAssignModal(false);
      setSelectedDieId('');
      fetchSet();
      // Release lock
      try {
        await api.post('/locks/release', { entityId: id });
      } catch (releaseErr) {
        console.error('Failed to release lock:', releaseErr);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign die');
    }
  };

  const openEditDieModal = (die: Die) => {
    setEditingDie(die);
    setDieFormData({ dieId: die.dieId, size: die.size, casing: die.casing, details: die.details || '' });
    setDieError('');
    setShowDieModal(true);
  };

  const handleUpdateDie = async (e: React.FormEvent) => {
    e.preventDefault();
    setDieError('');
    if (!editingDie) return;
    try {
      await api.put(`/dies/${editingDie.id}`, dieFormData);
      setShowDieModal(false);
      setEditingDie(null);
      fetchSet();
    } catch (err: any) {
      setDieError(err.response?.data?.error || 'Failed to update die');
    }
  };

  const filteredDies = set?.dies.filter(d => 
    d.dieId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.casing.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const SetDetailsSkeleton = () => (
    <div className="fade-in">
      <Breadcrumbs
        items={[
          { label: 'Sets', to: '/sets' },
          { label: 'Loading...' },
        ]}
      />
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={150} height="2rem" />
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Skeleton width={80} height="2.5rem" />
            <Skeleton width={80} height="2.5rem" />
          </div>
        )}
      </div>

      <div className="card" style={{ cursor: 'default', marginBottom: '2.5rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Skeleton variant="circle" width={64} height={64} />
          <div style={{ flex: 1 }}>
            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
              <Skeleton width="30%" height="2rem" />
              <Skeleton width="15%" height="1.5rem" />
            </div>
            <Skeleton width="60%" height="1.25rem" />
          </div>
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Skeleton width={180} height="1.75rem" />
          <Skeleton width={40} height="1.5rem" />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Skeleton width={250} height="2.5rem" />
          {canAssign && <Skeleton width={120} height="2.5rem" />}
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Die ID</th>
              <th>Size</th>
              <th>Casing</th>
              <th>Details</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Skeleton variant="circle" width={16} height={16} />
                    <Skeleton width="60%" height="1.25rem" />
                  </div>
                </td>
                <td><Skeleton width="40%" height="1rem" /></td>
                <td><Skeleton width="50%" height="1rem" /></td>
                <td><Skeleton width="70%" height="1rem" /></td>
                {isAdmin && (
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Skeleton width={24} height={24} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <SetDetailsSkeleton />;
  if (!set) return <div>Set not found.</div>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Sets', to: '/sets' },
          ...(set.machine ? [{ label: set.machine.name, to: `/machines/${set.machine.id}` }] : []),
          { label: set.name },
        ]}
      />
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/sets')} 
          className="btn btn-ghost"
        >
          <ArrowLeft size={18} /> Back to Sets
        </button>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => setShowEditModal(true)}
              className="btn btn-secondary"
            >
              <Edit2 size={16} /> Edit
            </button>
            <button 
              onClick={handleDelete}
              className="btn btn-danger"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ cursor: 'default', marginBottom: '2.5rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="icon-wrapper icon-green" style={{ padding: '1.25rem' }}>
            <Package size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex-between">
              <h1 className="page-title" style={{ margin: 0 }}>{set.name}</h1>
              {set.machine ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                  <Cpu size={20} /> Assigned to: {set.machine.name}
                </div>
              ) : (
                <span className="badge badge-neutral">Unassigned</span>
              )}
            </div>
            <p className="page-subtitle">{set.description || 'No description provided.'}</p>
          </div>
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Dies in this Set</h2>
          <span className="badge badge-neutral">{set.dies.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search dies..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', height: '2.5rem' }}
            />
          </div>
          {canAssign && (
            <button 
              onClick={openAssignModal}
              className="btn btn-primary"
            >
              <Plus size={16} /> Assign Die
            </button>
          )}
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Die ID</th>
              <th>Size</th>
              <th>Casing</th>
              <th>Details</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredDies.map((die) => (
              <tr key={die.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Disc size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 500 }}>{die.dieId}</span>
                  </div>
                </td>
                <td>{die.size}</td>
                <td>{die.casing}</td>
                <td style={{ color: 'var(--text-muted)' }}>{die.details || '-'}</td>
                {isAdmin && (
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => openEditDieModal(die)} 
                      className="btn btn-ghost" 
                      style={{ padding: '0.4rem' }} 
                      title="Edit Die"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredDies.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state" style={{ border: 'none' }}>
                  {searchQuery ? `No dies matching "${searchQuery}"` : 'No dies assigned to this set.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Set Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Edit Set</h2>
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Set Name</label>
                <input type="text" className="input" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="label">Description</label>
                <textarea className="input" value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} style={{ minHeight: '100px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Die Modal */}
      {canAssign && showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Assign Die to Set</h2>
              <button type="button" onClick={closeAssignModal} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignDie} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Search & Filter Dies</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Search by ID or size..." 
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  style={{ marginBottom: '0.75rem' }}
                />
                <label className="label">Select Die</label>
                <select 
                  className="input" 
                  value={selectedDieId} 
                  onChange={(e) => setSelectedDieId(e.target.value)}
                  required
                >
                  <option value="">Choose a die...</option>
                  {availableDies
                    .filter(d => !set.dies.some(sd => sd.id === d.id))
                    .filter(d => 
                      d.dieId.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
                      d.size.toLowerCase().includes(assignSearchQuery.toLowerCase())
                    )
                    .map(die => (
                      <option key={die.id} value={die.id}>{die.dieId} ({die.size})</option>
                    ))
                  }
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeAssignModal} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!selectedDieId}>Assign Die</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Die Modal */}
      {showDieModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Edit Die</h2>
              <button onClick={() => { setShowDieModal(false); setEditingDie(null); }} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>

            {dieError && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {dieError}
              </div>
            )}

            <form onSubmit={handleUpdateDie} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Die ID</label>
                <input 
                  type="text" 
                  className="input" 
                  value={dieFormData.dieId} 
                  onChange={(e) => setDieFormData({ ...dieFormData, dieId: e.target.value })} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="label">Size</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={dieFormData.size} 
                    onChange={(e) => setDieFormData({ ...dieFormData, size: e.target.value })} 
                    required 
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="label">Casing</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={dieFormData.casing} 
                    onChange={(e) => setDieFormData({ ...dieFormData, casing: e.target.value })} 
                    required 
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Details</label>
                <textarea 
                  className="input" 
                  value={dieFormData.details} 
                  onChange={(e) => setDieFormData({ ...dieFormData, details: e.target.value })} 
                  style={{ minHeight: '80px', resize: 'vertical' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDieModal(false); setEditingDie(null); }} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetDetails;
