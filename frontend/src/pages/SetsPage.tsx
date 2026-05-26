import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, X, Search } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import SegmentedControl from '../components/SegmentedControl';
import Skeleton from '../components/Skeleton';

interface Set {
  id: string;
  name: string;
  description: string;
  dies?: any[];
  machine?: any;
}

const SetsPage: React.FC = () => {
  const [sets, setSets] = useState<Set[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSet, setNewSet] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';

  const fetchSets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sets');
      setSets(response.data);
    } catch (error) {
      console.error('Failed to fetch sets', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/sets', newSet);
      setNewSet({ name: '', description: '' });
      setShowModal(false);
      fetchSets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create set');
    }
  };

  const assignedCount = sets.filter((set) => set.machine).length;
  const unassignedCount = sets.filter((set) => !set.machine).length;
  const emptyCount = sets.filter((set) => !set.dies?.length).length;

  const filteredSets = sets
    .filter((set) => {
      if (statusFilter === 'assigned') return !!set.machine;
      if (statusFilter === 'unassigned') return !set.machine;
      if (statusFilter === 'empty') return !set.dies?.length;
      return true;
    })
    .filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const SetsPageSkeleton = () => (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Sets' }]} />
      <div className="page-header">
        <div>
          <Skeleton width={250} height="2.5rem" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width={400} height="1rem" />
        </div>
      </div>
      <div className="ops-toolbar">
        <Skeleton width={150} height="1.5rem" />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Skeleton width={320} height="2.5rem" />
          <Skeleton width={300} height="2.5rem" />
        </div>
      </div>
      <div className="grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <Skeleton variant="circle" width={48} height={48} />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height="1.25rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="80%" height="0.875rem" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <Skeleton width="40%" height="0.75rem" style={{ marginBottom: '0.25rem' }} />
                <Skeleton width="30%" height="1rem" />
              </div>
              <div style={{ flex: 1 }}>
                <Skeleton width="40%" height="0.75rem" style={{ marginBottom: '0.25rem' }} />
                <Skeleton width="50%" height="1rem" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && sets.length === 0) return <SetsPageSkeleton />;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Sets' }]} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Sets Management</h1>
          <p className="page-subtitle">Manage groups of dies for machine assignment</p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} /> Add Set
          </button>
        )}
      </div>

      <div className="ops-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>All Toolsets</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All', value: 'all', count: sets.length },
              { label: 'Assigned', value: 'assigned', count: assignedCount },
              { label: 'Unassigned', value: 'unassigned', count: unassignedCount },
              { label: 'Empty', value: 'empty', count: emptyCount },
            ]}
          />
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search sets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
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
            <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', gap: '1rem' }}>
              <div className="flex-between" style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Dies</span>
                <span className="badge badge-neutral">{set.dies?.length || 0}</span>
              </div>
              <div className="flex-between" style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status</span>
                <span className={`badge ${set.machine ? 'badge-primary' : 'badge-neutral'}`}>
                  {set.machine ? 'Assigned' : 'Unassigned'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredSets.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            {searchQuery ? `No sets matching "${searchQuery}"` : 'No toolsets available.'}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Create New Set</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSet} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Set Name</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Precision Set A"
                  value={newSet.name}
                  onChange={(e) => setNewSet({ ...newSet, name: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label className="label">Description</label>
                <textarea 
                  className="input" 
                  placeholder="Optional description of the set"
                  value={newSet.description}
                  onChange={(e) => setNewSet({ ...newSet, description: e.target.value })}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Set</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetsPage;
