import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Cpu, MapPin, Package, ArrowLeft, Edit2, Trash2, Plus, X, Search } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

interface Set {
  id: string;
  name: string;
  description: string;
  dies?: any[];
}

interface Machine {
  id: string;
  name: string;
  location: string;
  sets: Set[];
}

const MachineDetails: React.FC = () => {
  const { id } = useParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [availableSets, setAvailableSets] = useState<Set[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', location: '' });
  const [selectedSetId, setSelectedSetId] = useState('');
  const [error, setError] = useState('');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const canAssign = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const fetchMachine = async () => {
    try {
      const response = await api.get(`/machines/${id}`);
      setMachine(response.data);
      setEditData({ name: response.data.name, location: response.data.location });
    } catch (error) {
      console.error('Failed to fetch machine', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSets = async () => {
    try {
      const response = await api.get('/sets');
      setAvailableSets(response.data);
    } catch (error) {
      console.error('Failed to fetch sets', error);
    }
  };

  const openAssignModal = async () => {
    try {
      // Attempt to acquire lock on the machine
      await api.post('/locks/acquire', { entityId: id });
      setAssignSearchQuery('');
      setSelectedSetId('');
      setShowAssignModal(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'This machine is currently locked by another operator.';
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
    fetchMachine();
    fetchAvailableSets();
    
    // Cleanup: release lock if still held on unmount
    return () => {
      api.post('/locks/release', { entityId: id }).catch(() => {});
    };
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/machines/${id}`, editData);
      setShowEditModal(false);
      fetchMachine();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update machine');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this machine? This action cannot be undone.')) {
      try {
        await api.delete(`/machines/${id}`);
        navigate('/');
      } catch (err) {
        alert('Failed to delete machine');
      }
    }
  };

  const handleAssignSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetId) return;
    try {
      await api.post(`/machines/${id}/sets/${selectedSetId}`);
      setShowAssignModal(false);
      setSelectedSetId('');
      fetchMachine();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign set');
    }
  };

  const filteredSets = machine?.sets.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const MachineDetailsSkeleton = () => (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Machines', to: '/' }, { label: 'Loading...' }]} />
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={120} height="2rem" />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width={80} height="2.5rem" />
          <Skeleton width={80} height="2.5rem" />
        </div>
      </div>
      
      {/* Tactile Header Card Skeleton */}
      <div className="card" style={{ cursor: 'default', marginBottom: '2.5rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Skeleton variant="circle" width={64} height={64} />
          <div style={{ flex: 1 }}>
            <Skeleton width="30%" height="2rem" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="50%" height="1.25rem" />
          </div>
        </div>
      </div>

      {/* Subsections Grid Skeleton */}
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={180} height="1.75rem" />
        <Skeleton width={150} height="2.5rem" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <Skeleton variant="circle" width={40} height={40} />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height="1.25rem" style={{ marginBottom: '0.25rem' }} />
                <Skeleton width="80%" height="0.875rem" />
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
              <Skeleton width="100%" height="2rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <MachineDetailsSkeleton />;
  if (!machine) return <div>Machine not found.</div>;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Machines', to: '/' }, { label: machine.name }]} />
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-ghost"
        >
          <ArrowLeft size={18} /> Back
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div className="icon-wrapper icon-blue" style={{ padding: '1.25rem' }}>
              <Cpu size={32} />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{machine.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <MapPin size={18} /> {machine.location || 'Unknown Location'}
              </div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'left', minWidth: '100px' }}>
              <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Assigned Sets</span>
              <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{machine.sets.length}</strong>
            </div>
            <div style={{ textAlign: 'left', minWidth: '100px' }}>
              <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total Dies</span>
              <strong style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>{machine.sets.reduce((sum, s) => sum + (s.dies?.length || 0), 0)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Assigned Sets</h2>
          <span className="badge badge-neutral">{machine.sets.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search sets..." 
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
              <Plus size={16} /> Assign Set
            </button>
          )}
        </div>
      </div>
      
      <div className="grid">
        {filteredSets.map((set) => (
          <div key={set.id} className="card" onClick={() => navigate(`/sets/${set.id}`)}>
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="icon-wrapper icon-green">
                  <Package size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{set.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{set.description || 'No description'}</p>
                </div>
              </div>
            </div>
            <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Dies in Set</span>
              <span className="badge badge-neutral">
                {set.dies?.length || 0}
              </span>
            </div>
          </div>
        ))}
        {filteredSets.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            {searchQuery ? `No sets matching "${searchQuery}"` : 'No sets assigned to this machine.'}
          </div>
        )}
      </div>

      {/* Edit Machine Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Edit Machine</h2>
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Machine Name</label>
                <input type="text" className="input" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="label">Location</label>
                <input type="text" className="input" value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Set Modal */}
      {canAssign && showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Assign Set to Machine</h2>
              <button type="button" onClick={closeAssignModal} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignSet} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Search & Filter Sets</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Type to filter sets..." 
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  style={{ marginBottom: '0.75rem' }}
                />
                <label className="label">Select Set</label>
                <select 
                  className="input" 
                  value={selectedSetId} 
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  required
                >
                  <option value="">Choose a set...</option>
                  {availableSets
                    .filter(s => !machine.sets.some(ms => ms.id === s.id))
                    .filter(s => s.name.toLowerCase().includes(assignSearchQuery.toLowerCase()))
                    .map(set => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))
                  }
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeAssignModal} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!selectedSetId}>Assign Set</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineDetails;
