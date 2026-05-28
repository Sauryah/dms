import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AlertTriangle, Cpu, MapPin, X, Plus, Package, Disc, Search, Workflow, ExternalLink, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import ActivityFeed from '../components/ActivityFeed';
import SegmentedControl from '../components/SegmentedControl';
import Skeleton from '../components/Skeleton';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface Machine {
  id: string;
  name: string;
  location: string;
  sets?: any[];
}



interface DashboardStats {
  machines: number;
  sets: number;
  dies: number;
  unassignedSets: number;
  emptySets: number;
  unassignedDies: number;
  machinesWithoutSets: number;
  previews: {
    machinesWithoutSets: any[];
    unassignedSets: any[];
    emptySets: any[];
    unassignedDies: any[];
  }
}

const Dashboard: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    machines: 0,
    sets: 0,
    dies: 0,
    unassignedSets: 0,
    emptySets: 0,
    unassignedDies: 0,
    machinesWithoutSets: 0,
    previews: {
      machinesWithoutSets: [],
      unassignedSets: [],
      emptySets: [],
      unassignedDies: []
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [machineFilter, setMachineFilter] = useState('all');
  
  // Dynamic utilization timeline states
  const [timelineData, setTimelineData] = useState<{
    utilization: any[];
    history: any[];
  }>({ utilization: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newMachine, setNewMachine] = useState({ name: '', location: '' });
  const [error, setError] = useState('');
  
  // Bulk Set Add & Assign States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedBulkMachine, setSelectedBulkMachine] = useState('');
  const [bulkSets, setBulkSets] = useState<Array<{ name: string; description: string; dieIds: string[] }>>([
    { name: '', description: '', dieIds: [] }
  ]);
  const [unassignedDiesList, setUnassignedDiesList] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  
  // Scale-Safe Pagination States (10 machines per view)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'OPERATOR';
  const canModify = isAdmin || isOperator;

  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [machinesRes, statsRes, timelineRes] = await Promise.all([
        api.get('/machines'),
        api.get('/machines/stats'),
        api.get('/machines/timeline')
      ]);
      setMachines(machinesRes.data);
      setStats(statsRes.data);
      setTimelineData(timelineRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      addToast('error', 'Sync Failure', 'Failed to retrieve the latest inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Server-Sent Events (SSE) subscriber loop for real-time Gantt timelines
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const streamUrl = `${apiBase}/audit-logs/stream`;
    let eventSource: EventSource;

    const connectSSE = () => {
      console.log('Establishing connection to real-time dashboard SSE stream...');
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return; // Heartbeat ping
          const logPayload = JSON.parse(event.data);
          
          if (logPayload && logPayload.id) {
            const action = logPayload.action.toUpperCase();
            // Automatically refresh utilization panels on assignment actions
            if (
              action.includes('MACHINE') || 
              action.includes('SET') || 
              action.includes('DIE') || 
              action.includes('IMPORT')
            ) {
              console.log('Incoming equipment assignment, refreshing Gantt timelines...', action);
              fetchData(true);
            }
          }
        } catch (err) {
          console.error('Failed parsing real-time SSE stream dashboard payload:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('Dashboard SSE stream disconnected, reconnecting in 5 seconds...', err);
        eventSource.close();
        setTimeout(() => {
          connectSSE();
        }, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/machines', newMachine);
      addToast('success', 'Machine Registered', `Successfully added "${newMachine.name}" to the fleet.`);
      setNewMachine({ name: '', location: '' });
      setShowModal(false);
      fetchData(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create machine';
      setError(msg);
      addToast('error', 'Registration Error', msg);
    }
  };

  const fetchUnassignedDies = async () => {
    try {
      const res = await api.get('/dies');
      // Filter out dies that are already assigned to a set
      const unassigned = res.data.filter((die: any) => !die.setId);
      setUnassignedDiesList(unassigned);
    } catch (err) {
      console.error('Failed to load unassigned dies:', err);
    }
  };

  useEffect(() => {
    if (showBulkModal) {
      fetchUnassignedDies();
    }
  }, [showBulkModal]);

  const handleAddBulkRow = () => {
    setBulkSets([...bulkSets, { name: '', description: '', dieIds: [] }]);
  };

  const handleRemoveBulkRow = (idx: number) => {
    if (bulkSets.length === 1) {
      setBulkSets([{ name: '', description: '', dieIds: [] }]);
      return;
    }
    setBulkSets(bulkSets.filter((_, i) => i !== idx));
  };

  const handleBulkRowChange = (idx: number, field: string, value: any) => {
    const updated = [...bulkSets];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    };
    setBulkSets(updated);
  };

  const handleCreateBulkSets = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    setSubmittingBulk(true);

    const validSets = bulkSets.filter(s => s.name.trim() !== '');
    if (validSets.length === 0) {
      setBulkError('Please enter a Toolset Name for at least one row.');
      setSubmittingBulk(false);
      return;
    }

    const names = validSets.map(s => s.name.trim().toLowerCase());
    const hasLocalDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
    if (hasLocalDuplicates) {
      setBulkError('Duplicate Toolset Names detected in your batch. Each name must be unique.');
      setSubmittingBulk(false);
      return;
    }

    try {
      const payload = {
        machineId: selectedBulkMachine || null,
        sets: validSets.map(s => ({
          name: s.name.trim(),
          description: s.description.trim() || null,
          dieIds: s.dieIds || []
        }))
      };

      await api.post('/sets/bulk', payload);
      addToast('success', 'Toolsets Registered', `Successfully batch-created ${validSets.length} toolsets.`);
      
      setBulkSets([{ name: '', description: '', dieIds: [] }]);
      setSelectedBulkMachine('');
      setShowBulkModal(false);
      fetchData(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to batch-create toolsets.';
      setBulkError(msg);
      addToast('error', 'Batch Creation Error', msg);
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Compile severity-classified Attention Queue arrays from preview data
  const unassignedSets = stats.previews.unassignedSets;
  const emptySets = stats.previews.emptySets;
  const unassignedDies = stats.previews.unassignedDies;
  const machinesWithoutSets = stats.previews.machinesWithoutSets;

  // High-contrast classified alerts count
  const attentionItemsCount = stats.machinesWithoutSets + stats.unassignedSets + stats.emptySets + stats.unassignedDies;

  const filteredMachines = machines
    .filter((machine) => {
      if (machineFilter === 'unassigned') return !machine.sets?.length;
      return true;
    })
    .filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Pagination bounds checking
  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMachines = filteredMachines.slice(indexOfFirstItem, indexOfLastItem);

  // Reset pagination page when search queries or filters alter list length
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, machineFilter]);

  const DashboardSkeleton = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <Skeleton width={300} height="2.5rem" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width={450} height="1rem" />
        </div>
      </div>
      <div className="metric-strip">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="metric-tile">
            <Skeleton variant="rect" width={40} height={40} />
            <div style={{ flex: 1 }}>
              <Skeleton width="40%" height="1.5rem" style={{ marginBottom: '0.25rem' }} />
              <Skeleton width="70%" height="0.75rem" />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid" style={{ gap: '1rem' }}>
        <div className="ops-panel" style={{ padding: '1rem' }}>
          <Skeleton width={200} height="1.5rem" style={{ marginBottom: '1rem' }} />
          <Skeleton variant="rect" height={300} />
        </div>
        <div className="ops-panel" style={{ padding: '1rem' }}>
          <Skeleton width={150} height="1.5rem" style={{ marginBottom: '1rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="2.5rem" />)}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && machines.length === 0) return <DashboardSkeleton />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipment Dashboard</h1>
          <p className="page-subtitle">Real-time overview of your facility's production assets</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canModify && (
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowBulkModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Workflow size={18} /> Bulk Add Sets
            </button>
          )}
          {isAdmin && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={18} /> Add Machine
            </button>
          )}
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-tile">
          <div className="icon-wrapper icon-blue" style={{ padding: '0.55rem', borderRadius: '8px' }}>
            <Cpu size={20} />
          </div>
          <div>
            <strong>{stats.machines}</strong>
            <span>Total machines</span>
          </div>
        </div>
        <div className="metric-tile">
          <div className="icon-wrapper icon-green" style={{ padding: '0.55rem', borderRadius: '8px' }}>
            <Package size={20} />
          </div>
          <div>
            <strong>{stats.sets}</strong>
            <span>Total sets</span>
          </div>
        </div>
        <div className="metric-tile">
          <div className="icon-wrapper icon-purple" style={{ padding: '0.55rem', borderRadius: '8px' }}>
            <Disc size={20} />
          </div>
          <div>
            <strong>{stats.dies}</strong>
            <span>Total dies</span>
          </div>
        </div>
        <div className="metric-tile">
          <div className="icon-wrapper icon-red" style={{ padding: '0.55rem', borderRadius: '8px' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <strong>{attentionItemsCount}</strong>
            <span>Items needing attention</span>
          </div>
        </div>
      </div>

      {/* Dynamic utilization Gantt lanes & allocation timeline visualizer */}
      <div className="ops-panel" style={{ padding: '1.75rem', marginBottom: '2rem', background: 'var(--white)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2.5rem', flexWrap: 'wrap' }}>
          
          {/* Gantt Chart lanes */}
          <ErrorBoundary
            fallbackTitle="Utilization Telemetry Error"
            fallbackMessage="The active machine Gantt lane rendering pipeline encountered an exception. Real-time stream payloads may contain malformed data."
          >
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={18} style={{ color: 'var(--primary)' }} /> Live Equipment Gantt Utilization
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time tooling layouts across active production assets</p>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Real-Time Stream Active</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {timelineData.utilization && timelineData.utilization.length > 0 ? (
                timelineData.utilization.map((m: any) => {
                  const hasSets = m.sets && m.sets.length > 0;
                  return (
                    <div key={m.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      background: 'rgba(2, 6, 23, 0.25)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      padding: '0.75rem 1rem',
                      gap: '1.5rem'
                    }}>
                      <div style={{ minWidth: '140px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{m.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <MapPin size={10} /> {m.location || 'Zone A'}
                        </div>
                      </div>

                      {/* Timeline Lane */}
                      <div style={{ flex: 1, display: 'flex', gap: '0.5rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '6px', height: '2rem', padding: '0.25rem', alignItems: 'center', position: 'relative' }}>
                        {hasSets ? (
                          m.sets.map((s: any) => (
                            <div 
                              key={s.id} 
                              onClick={() => navigate(`/sets/${s.id}`)}
                              style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, var(--primary) 0%, hsl(217, 100%, 50%) 100%)', 
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '0 0.5rem', 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)'
                              }}
                              className="gantt-capsule"
                              title={`Toolset Name: ${s.name} | Dies Mounted: ${s.dies?.length || 0}`}
                            >
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                              <span className="badge badge-neutral" style={{ fontSize: '0.625rem', background: 'rgba(255, 255, 255, 0.2)', color: '#fff', border: 'none', padding: '0.1rem 0.3rem' }}>
                                {s.dies?.length || 0} D
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%', display: 'inline-block' }}></span>
                            LANE OFFLINE &mdash; No toolset mounted
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No machine utilization logs loaded.</div>
              )}
            </div>
            </div>
          </ErrorBoundary>

          {/* Vertical Recent Allocation tracker */}
          <ErrorBoundary
            fallbackTitle="Allocation Activity Feed Error"
            fallbackMessage="The vertical tooling allocation event logs failed to render. Re-establishing secure EventSource stream context..."
          >
            <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Workflow size={18} style={{ color: 'var(--primary)' }} /> Tooling Allocation History
            </h3>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              maxHeight: '320px', 
              overflowY: 'auto', 
              paddingRight: '0.5rem',
              position: 'relative'
            }}>
              {timelineData.history && timelineData.history.length > 0 ? (
                timelineData.history.map((log: any, idx: number) => {
                  const isDie = log.action === 'ASSIGN_DIE';
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '0.85rem', position: 'relative' }}>
                      {/* Timeline track connector line */}
                      {idx < timelineData.history.length - 1 && (
                        <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '-16px', width: '2px', background: 'var(--border)' }}></div>
                      )}
                      
                      <div className={`icon-wrapper ${isDie ? 'icon-purple' : 'icon-blue'}`} style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        flexShrink: 0, 
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isDie ? 'D' : 'S'}
                      </div>
                      
                      <div style={{ flex: 1, background: 'rgba(2, 6, 23, 0.14)', borderRadius: '8px', border: '1px solid var(--border)', padding: '0.5rem 0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{log.action.replace('_', ' ')}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.25' }}>{log.details}</p>
                        <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>By {log.actorName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>No recent tooling allocation events found.</div>
              )}
            </div>
            </div>
          </ErrorBoundary>

        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Left Side: Operations Center */}
        <div className="ops-panel" style={{ padding: '1.5rem' }}>
          <div className="ops-toolbar" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Machine Operations</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Scan active assets and drill into assigned tooling</p>
            </div>
            <SegmentedControl
              value={machineFilter}
              onChange={setMachineFilter}
              options={[
                { label: 'All', value: 'all', count: machines.length },
                { label: 'Needs set', value: 'unassigned', count: machinesWithoutSets.length },
              ]}
            />
          </div>

          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search machines by name or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div className="table-container" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Location</th>
                  <th>Sets</th>
                  <th>Dies</th>
                  <th>Capacity Loadout</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentMachines.map((machine) => {
                  const setNum = machine.sets?.length || 0;
                  const percent = Math.min(100, Math.round((setNum / 2) * 100)); // Sample capacity standard: 2 sets max per machine
                  const capColor = setNum > 0 ? 'var(--success)' : 'var(--danger)';

                  return (
                    <tr key={machine.id} className="hover-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 700 }}>
                          <Cpu size={16} style={{ color: setNum > 0 ? 'var(--primary)' : 'var(--danger)' }} />
                          {machine.name}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                          <MapPin size={13} /> {machine.location || 'Unknown Location'}
                        </span>
                      </td>
                      <td><span className="badge badge-neutral">{setNum}</span></td>
                      <td>
                        <span className="badge badge-neutral" style={{ background: 'rgba(167, 139, 250, 0.14)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.22)' }}>
                          {machine.sets?.reduce((sum, s) => sum + (s.dies?.length || 0), 0) || 0}
                        </span>
                      </td>
                      
                      {/* OEE-Style capacity Loadout spark bars */}
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: capColor, borderRadius: '99px', transition: 'width 0.4s ease' }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: setNum > 0 ? 'var(--text-main)' : 'var(--danger)' }}>
                            {setNum > 0 ? `${percent}%` : 'Offline'}
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions">
                          <button 
                            className="btn-icon" 
                            onClick={() => navigate(`/machines/${machine.id}`)}
                            title="View Details"
                          >
                            <ExternalLink size={14} />
                          </button>
                          {isAdmin && (
                            <button 
                              className="btn-icon" 
                              onClick={() => navigate(`/machines/${machine.id}`)}
                              title="Configure"
                            >
                              <Settings size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {currentMachines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state" style={{ border: 'none' }}>
                      {searchQuery ? `No machines matching "${searchQuery}"` : 'No machines registered yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Scale-Safe Table Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredMachines.length} total)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.35rem 0.75rem', height: '2rem', fontSize: '0.75rem' }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button 
                  className="btn btn-secondary" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ padding: '0.35rem 0.75rem', height: '2rem', fontSize: '0.75rem' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Severity-Triage Attention Queue */}
        <div className="ops-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
            <div className="icon-wrapper icon-red" style={{ padding: '0.45rem', borderRadius: '8px' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Attention Queue</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Items requiring operational resolution</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Triage Tier 1: CRITICAL BLOCKERS (Machines without sets - Red Pulse) */}
            {machinesWithoutSets.slice(0, 3).map((machine) => (
              <button 
                key={machine.id} 
                type="button" 
                className="btn btn-secondary attention-item" 
                onClick={() => navigate(`/machines/${machine.id}`)} 
                style={{ justifyContent: 'flex-start', width: '100%', borderColor: 'hsl(354, 70%, 90%)' }}
              >
                <div className="attention-dot dot-red"></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'hsl(354, 70%, 45%)' }}>CRITICAL BLOCKER</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}><Cpu size={12} style={{ display: 'inline', marginRight: '4px' }} /> {machine.name} needs a tooling set</span>
                </div>
              </button>
            ))}

            {/* Triage Tier 2: WARNINGS (Sets is unassigned or empty - Amber Pulse) */}
            {unassignedSets.slice(0, 3).map((set) => (
              <button 
                key={set.id} 
                type="button" 
                className="btn btn-secondary attention-item" 
                onClick={() => navigate(`/sets/${set.id}`)} 
                style={{ justifyContent: 'flex-start', width: '100%', borderColor: 'hsl(38, 92%, 88%)' }}
              >
                <div className="attention-dot dot-amber"></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'hsl(38, 92%, 35%)' }}>IDLE ASSET WARNING</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}><Package size={12} style={{ display: 'inline', marginRight: '4px' }} /> Toolset {set.name} is unassigned</span>
                </div>
              </button>
            ))}

            {emptySets.slice(0, 2).map((set) => (
              <button 
                key={set.id} 
                type="button" 
                className="btn btn-secondary attention-item" 
                onClick={() => navigate(`/sets/${set.id}`)} 
                style={{ justifyContent: 'flex-start', width: '100%', borderColor: 'hsl(38, 92%, 88%)' }}
              >
                <div className="attention-dot dot-amber"></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'hsl(38, 92%, 35%)' }}>EMPTY TOOLSET</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}><Package size={12} style={{ display: 'inline', marginRight: '4px' }} /> {set.name} contains no dies</span>
                </div>
              </button>
            ))}

            {/* Triage Tier 3: OPTIMIZATIONS (Dies needing sets - Static Blue Dot) */}
            {unassignedDies.slice(0, 2).map((die) => (
              <button 
                key={die.id} 
                type="button" 
                className="btn btn-secondary attention-item" 
                onClick={() => navigate('/dies')} 
                style={{ justifyContent: 'flex-start', width: '100%', borderColor: 'hsl(226, 60%, 90%)' }}
              >
                <div className="attention-dot dot-blue"></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--primary)' }}>INVENTORY OPTIMIZATION</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}><Disc size={12} style={{ display: 'inline', marginRight: '4px' }} /> Die {die.dieId} needs a toolset</span>
                </div>
              </button>
            ))}

            {/* Scale-Safe Queue Summary Pill */}
            {attentionItemsCount > 10 && (
              <div style={{
                textAlign: 'center', 
                padding: '0.75rem', 
                background: 'hsl(220, 20%, 95%)', 
                border: '1px solid var(--border)', 
                borderRadius: '10px', 
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)'
              }}>
                + {attentionItemsCount - 10} more attention items in queue
              </div>
            )}

            {attentionItemsCount === 0 && (
              <div className="empty-state" style={{ padding: '2.5rem 1rem', borderRadius: '12px' }}>
                All tracked inventory is actively assigned.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ops-panel" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Inventory Shortcuts</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Open master lists and exploratory views</p>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="card" onClick={() => navigate('/sets')} style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--white)' }}>
            <div className="icon-wrapper icon-green" style={{ background: '#ecfdf5' }}>
              <Package size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>All Sets</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Review and manage toolsets</p>
            </div>
          </div>
          <div className="card" onClick={() => navigate('/dies')} style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--white)' }}>
            <div className="icon-wrapper icon-blue" style={{ background: '#eff6ff' }}>
              <Disc size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>All Dies</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Master inventory of individual dies</p>
            </div>
          </div>
          <div className="card" onClick={() => navigate('/search')} style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--white)' }}>
            <div className="icon-wrapper icon-blue" style={{ background: '#f3f4f6', color: 'var(--primary)' }}>
              <Search size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Advanced Search</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Find anything in the facility</p>
            </div>
          </div>
          {isAdmin && (
            <div className="card" onClick={() => navigate('/topology')} style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--white)' }}>
              <div className="icon-wrapper icon-purple" style={{ background: '#f5f3ff' }}>
                <Workflow size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Fleet Topology</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Explore assignments in 3D</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <ActivityFeed />
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Register New Machine</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateMachine} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Machine Name</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Machine #303"
                  value={newMachine.name}
                  onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label className="label">Location</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Floor C - Zone 2"
                  value={newMachine.location}
                  onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Machine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '100%', padding: '2.5rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Workflow size={22} style={{ color: 'var(--primary)' }} /> Bulk Create & Assign Toolsets
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Batch define new toolsets and map them immediately onto an active machine slot.
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {bulkError && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2', fontWeight: 500 }}>
                {bulkError}
              </div>
            )}

            <form onSubmit={handleCreateBulkSets} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Target Machine Selection */}
              <div className="input-group" style={{ maxWidth: '400px' }}>
                <label className="label">Mount onto Target Machine (Optional)</label>
                <select 
                  className="input"
                  value={selectedBulkMachine}
                  onChange={(e) => setSelectedBulkMachine(e.target.value)}
                  style={{ height: '3rem' }}
                >
                  <option value="">-- Keep Unassigned / Offline --</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.location || 'Floor A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Rows Grid */}
              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'none' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Toolset Name *</th>
                      <th style={{ width: '35%' }}>Description</th>
                      <th style={{ width: '20%' }}>Dies Mount (Ctrl+Click)</th>
                      <th style={{ width: '5%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkSets.map((row, idx) => {
                      const isDuplicate = row.name.trim() !== '' && bulkSets.some((s, i) => i !== idx && s.name.trim().toLowerCase() === row.name.trim().toLowerCase());
                      return (
                        <tr key={idx} style={{ background: 'transparent' }}>
                          <td style={{ verticalAlign: 'top' }}>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type="text"
                                className="input"
                                placeholder="e.g. Set Gamma"
                                value={row.name}
                                onChange={(e) => handleBulkRowChange(idx, 'name', e.target.value)}
                                style={{ 
                                  height: '2.75rem', 
                                  borderColor: isDuplicate ? 'var(--danger)' : undefined,
                                  boxShadow: isDuplicate ? '0 0 6px rgba(239, 68, 68, 0.2)' : undefined
                                }}
                                required
                              />
                              {isDuplicate && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--danger)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                                  Name repeated in batch
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'top' }}>
                            <input 
                              type="text"
                              className="input"
                              placeholder="Describe standard sizing..."
                              value={row.description}
                              onChange={(e) => handleBulkRowChange(idx, 'description', e.target.value)}
                              style={{ height: '2.75rem' }}
                            />
                          </td>
                          <td style={{ verticalAlign: 'top' }}>
                            <select
                              multiple
                              className="input"
                              value={row.dieIds}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                handleBulkRowChange(idx, 'dieIds', selected);
                              }}
                              style={{ height: '2.75rem', fontSize: '0.75rem', padding: '0.25rem' }}
                            >
                              {unassignedDiesList.map((die) => (
                                <option key={die.id} value={die.id}>
                                  {die.dieId} ({die.size})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn btn-ghost" 
                              onClick={() => handleRemoveBulkRow(idx)}
                              style={{ padding: '0.35rem', color: 'var(--danger)' }}
                              title="Remove Row"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Row Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleAddBulkRow}
                  style={{ padding: '0.5rem 1rem', height: '2.5rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowBulkModal(false)} 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingBulk}
                  style={{ flex: 1 }}
                >
                  {submittingBulk ? 'Batch Creating...' : `Confirm & Deploy Batch (${bulkSets.filter(s => s.name.trim() !== '').length} Sets)`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style>{`
        .hover-row:hover {
          background-color: hsl(222, 25%, 13%) !important;
        }
        .row-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .hover-row:hover .row-actions {
          opacity: 1;
        }
        .btn-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--white);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          color: var(--primary);
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .attention-item {
          position: relative;
          padding-left: 2.25rem !important;
          transition: transform 0.2s;
        }
        .attention-item:hover {
          transform: translateX(4px);
        }
        .attention-dot {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0px hsla(354, 70%, 54%, 0.45); }
          70% { box-shadow: 0 0 0 6px hsla(354, 70%, 54%, 0); }
          100% { box-shadow: 0 0 0 0px hsla(354, 70%, 54%, 0); }
        }
        @keyframes pulse-amber {
          0% { box-shadow: 0 0 0 0px hsla(38, 92%, 50%, 0.45); }
          70% { box-shadow: 0 0 0 6px hsla(38, 92%, 50%, 0); }
          100% { box-shadow: 0 0 0 0px hsla(38, 92%, 50%, 0); }
        }

        .dot-red { 
          background: var(--danger); 
          animation: pulse-red 2s infinite; 
        }
        .dot-amber { 
          background: var(--warning); 
          animation: pulse-amber 2s infinite; 
        }
        .dot-blue { 
          background: var(--primary); 
          box-shadow: 0 0 0 4px var(--primary-light); 
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
