import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Fleet3DGraph from '../components/Fleet3DGraph';
import type { GraphNode, GraphLink } from '../components/Fleet3DGraph';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ArrowLeft, Network, Search, X, Cpu, Package, Disc, MapPin, ChevronRight, Info, Sliders } from 'lucide-react';

const FleetGraphPage: React.FC = () => {
  const [machines, setMachines] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [stats, setStats] = useState({ machines: 0, sets: 0, dies: 0 });
  const [loading, setLoading] = useState(true);

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedSetDies, setSelectedSetDies] = useState<any[]>([]);
  const [loadingDies, setLoadingDies] = useState(false);
  const navigate = useNavigate();

  // Physics Sandbox States
  const [repulsion, setRepulsion] = useState(4000);
  const [springStrength, setSpringStrength] = useState(0.015);
  const [gravity, setGravity] = useState(0.008);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machinesRes, setsRes, statsRes] = await Promise.all([
        api.get('/machines'),
        api.get('/sets'),
        api.get('/machines/stats'),
      ]);
      setMachines(machinesRes.data);
      setSets(setsRes.data);
      setStats({
        machines: statsRes.data.machines,
        sets: statsRes.data.sets,
        dies: statsRes.data.dies,
      });
    } catch (error) {
      console.error('Failed to fetch fleet data for 3D graph', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Assemble Graph Data from Flat Lists (Pruned of 50,000+ Dies for 60 FPS Fluidity)
  const getGraphData = () => {
    const nodesList: GraphNode[] = [];
    const linksList: GraphLink[] = [];

    // 1. Add Machine nodes
    machines.forEach((m) => {
      nodesList.push({
        id: m.id,
        name: m.name,
        type: 'machine',
        val: m.location || 'Unknown Location',
      });
    });

    // 2. Add Set nodes & links
    sets.forEach((s) => {
      nodesList.push({
        id: s.id,
        name: s.name,
        type: 'set',
        val: s.description || '',
      });

      // Link Machine -> Set
      if (s.machineId) {
        linksList.push({
          source: s.machineId,
          target: s.id,
        });
      }
    });

    return { nodes: nodesList, links: linksList };
  };

  const handleNodeClick = async (node: GraphNode) => {
    setSelectedNode(node);
    if (node.type === 'set') {
      try {
        setLoadingDies(true);
        setSelectedSetDies([]);
        const res = await api.get(`/sets/${node.id}`);
        setSelectedSetDies(res.data.dies || []);
      } catch (error) {
        console.error('Failed to fetch dies for set', error);
      } finally {
        setLoadingDies(false);
      }
    }
  };

  // Helper selectors for the Peek Drawer details
  const getSelectedNodeDetails = () => {
    if (!selectedNode) return null;

    if (selectedNode.type === 'machine') {
      const machine = machines.find((m) => m.id === selectedNode.id);
      const machineSets = sets.filter((s) => s.machineId === selectedNode.id);
      return {
        item: machine,
        childSets: machineSets,
      };
    }

    if (selectedNode.type === 'set') {
      const set = sets.find((s) => s.id === selectedNode.id);
      const parentMachine = machines.find((m) => m.id === set?.machineId);
      return {
        item: set,
        parentMachine,
        childDies: selectedSetDies,
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="fleet-studio fleet-loading" style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#071018', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center' }}>
        <Network size={34} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong>Loading fleet topology</strong>
          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Preparing the 3D machine and set layout...</span>
        </div>
      </div>
    );
  }

  const { nodes, links } = getGraphData();
  const details = getSelectedNodeDetails();
  const childSets = selectedNode?.type === 'machine' && details ? (details as any).childSets || [] : [];
  const childDies = selectedNode?.type === 'set' && details ? (details as any).childDies || [] : [];

  return (
    <div className="fleet-studio">
      <div className="fleet-topbar">
        <div className="fleet-title-group">
          <button className="fleet-icon-button" onClick={() => navigate('/')} title="Back to dashboard">
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div className="fleet-mark">
              <Network size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1>Fleet Topology</h1>
              <p>Full-screen 3D map of machines and sets</p>
            </div>
          </div>
        </div>

        <div className="fleet-actions">
          <div className="fleet-stat fleet-stat-blue">
            <Cpu size={14} />
            <span>{stats.machines}</span>
            <small>machines</small>
          </div>
          <div className="fleet-stat fleet-stat-green">
            <Package size={14} />
            <span>{stats.sets}</span>
            <small>sets</small>
          </div>
          <div className="fleet-stat fleet-stat-violet">
            <Disc size={14} />
            <span>{stats.dies}</span>
            <small>dies</small>
          </div>
        </div>
      </div>

      {/* Main 3D canvas viewport container */}
      <div className="fleet-viewport">
        <ErrorBoundary
          fallbackTitle="3D Fleet Visualizer Issue"
          fallbackMessage="The 3D WebGL engine encountered a context exception while plotting the machine and set connections."
        >
          <Fleet3DGraph
            nodes={nodes}
            links={links}
            highlightQuery={searchQuery}
            onNodeClick={handleNodeClick}
            repulsion={repulsion}
            springStrength={springStrength}
            gravity={gravity}
          />
        </ErrorBoundary>

        {/* Dynamic Spotlight Search Bar overlayed inside the viewport */}
        <div className="fleet-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search machine, set, die..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Physics Sandbox Control Panel */}
        {!loading && (
          <div className="fleet-physics-sandbox">
            <div className="sandbox-header">
              <Sliders size={13} />
              <span>Physics Control Room</span>
            </div>
            
            <div className="sandbox-body">
              <div className="sandbox-control-group">
                <div className="control-label">
                  <span>Node Repulsion</span>
                  <code>{repulsion}</code>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="200"
                  value={repulsion}
                  onChange={(e) => setRepulsion(Number(e.target.value))}
                />
              </div>

              <div className="sandbox-control-group">
                <div className="control-label">
                  <span>Spring Tension</span>
                  <code>{springStrength.toFixed(3)}</code>
                </div>
                <input
                  type="range"
                  min="0.002"
                  max="0.05"
                  step="0.001"
                  value={springStrength}
                  onChange={(e) => setSpringStrength(Number(e.target.value))}
                />
              </div>

              <div className="sandbox-control-group">
                <div className="control-label">
                  <span>Gravity Pull</span>
                  <code>{gravity.toFixed(3)}</code>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.03"
                  step="0.001"
                  value={gravity}
                  onChange={(e) => setGravity(Number(e.target.value))}
                />
              </div>

              <button
                onClick={() => {
                  setRepulsion(4000);
                  setSpringStrength(0.015);
                  setGravity(0.008);
                }}
                className="sandbox-reset-button"
              >
                Reset Physics Defaults
              </button>
            </div>
          </div>
        )}

        {/* Frosted glass details Peek Drawer overlay */}
        {selectedNode && details && (
          <div className="fleet-inspector">
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={16} style={{ color: selectedNode.type === 'machine' ? '#2563eb' : selectedNode.type === 'set' ? '#10b981' : '#8b5cf6' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  {selectedNode.type} Details Peek
                </span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)} 
                className="btn btn-ghost" 
                style={{ width: '24px', height: '24px', padding: 0, borderRadius: '50%', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Drawer Body Scroll Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Node Card Overview */}
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
                  {selectedNode.name}
                </h3>
                <span style={{ fontSize: '0.675rem', fontWeight: 600, background: selectedNode.type === 'machine' ? '#eff6ff' : selectedNode.type === 'set' ? '#ecfdf5' : '#f5f3ff', color: selectedNode.type === 'machine' ? '#2563eb' : selectedNode.type === 'set' ? '#10b981' : '#8b5cf6', padding: '0.15rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                  ID: {selectedNode.id.substring(0, 8)}...
                </span>
              </div>

              {/* Attributes Section */}
              {selectedNode.type === 'machine' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Attributes</span>
                  <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{details.item?.location || 'Unassigned'}</span>
                  </div>
                </div>
              )}

              {selectedNode.type === 'set' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Attributes</span>
                  <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Description:</span>
                      <p style={{ margin: '2px 0 0 0', color: 'var(--text-main)', fontSize: '0.75rem' }}>{details.item?.description || 'No description provided'}</p>
                    </div>
                    {details.parentMachine && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Cpu size={12} style={{ color: '#2563eb' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Machine:</span>
                        <span style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>{details.parentMachine.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* Hierarchy Relations List */}
              {selectedNode.type === 'machine' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned Sets ({childSets.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {childSets.map((s: any) => (
                      <div 
                        key={s.id}
                        onClick={() => setSelectedNode({ id: s.id, name: s.name, type: 'set', val: s.description })}
                        style={{ background: 'white', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', transition: 'all 0.2s' }}
                        className="hover-glow"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={12} style={{ color: '#10b981' }} />
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{s.name}</span>
                        </div>
                        <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                    {childSets.length === 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                        No sets assigned to this machine.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.type === 'set' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned Dies ({loadingDies ? 'Loading...' : childDies.length})
                  </span>
                  {loadingDies ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Fetching child dies...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {childDies.map((d: any) => (
                        <div 
                          key={d.id}
                          onClick={() => setSelectedNode({ id: d.id, name: d.dieId, type: 'die', val: `Size: ${d.size}` })}
                          style={{ background: 'white', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', transition: 'all 0.2s' }}
                          className="hover-glow"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Disc size={12} style={{ color: '#8b5cf6' }} />
                            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{d.dieId}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({d.size})</span>
                          </div>
                          <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      ))}
                      {childDies.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          No dies assigned to this set.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  let path = `/machines`;
                  if (selectedNode.type === 'machine') path = `/machines/${selectedNode.id}`;
                  else if (selectedNode.type === 'set') path = `/sets/${selectedNode.id}`;
                  else if (selectedNode.type === 'die') path = `/dies`; // go to dies page
                  navigate(path);
                }}
                className="btn btn-primary" 
                style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                Manage Attribute Page
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Slide Animation Keyframe Styles Injection */}
      <style>{`
        .fleet-studio {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: #071018;
          color: #f8fafc;
          overflow: hidden;
        }

        .fleet-studio::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
            linear-gradient(0deg, rgba(148, 163, 184, 0.045) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(circle at center, black 30%, transparent 82%);
        }

        .fleet-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
        }

        .fleet-loading > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fleet-loading strong {
          font-size: 0.95rem;
          font-weight: 800;
        }

        .fleet-loading span {
          color: #94a3b8;
          font-size: 0.78rem;
        }

        .fleet-topbar {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          pointer-events: none;
        }

        .fleet-title-group,
        .fleet-actions,
        .fleet-search,
        .fleet-inspector {
          pointer-events: auto;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(8, 16, 24, 0.78);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.3);
        }

        .fleet-title-group {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
        }

        .fleet-title-group h1 {
          margin: 0;
          color: #f8fafc;
          font-size: 1rem;
          font-weight: 800;
          line-height: 1.15;
        }

        .fleet-title-group p {
          margin: 2px 0 0;
          color: #94a3b8;
          font-size: 0.72rem;
        }

        .fleet-icon-button,
        .fleet-mark {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .fleet-icon-button {
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(15, 23, 42, 0.72);
          color: #e2e8f0;
          cursor: pointer;
        }

        .fleet-icon-button:hover {
          border-color: rgba(34, 211, 238, 0.55);
          background: rgba(20, 31, 46, 0.94);
        }

        .fleet-mark {
          color: #22d3ee;
          background: rgba(34, 211, 238, 0.14);
          border: 1px solid rgba(34, 211, 238, 0.28);
        }

        .fleet-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 8px;
        }

        .fleet-stat {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border-radius: 7px;
          white-space: nowrap;
          font-size: 0.72rem;
        }

        .fleet-stat span {
          color: #f8fafc;
          font-weight: 800;
        }

        .fleet-stat small {
          color: #94a3b8;
          font-size: 0.68rem;
        }

        .fleet-stat-blue {
          color: #60a5fa;
          background: rgba(37, 99, 235, 0.16);
        }

        .fleet-stat-green {
          color: #34d399;
          background: rgba(16, 185, 129, 0.14);
        }

        .fleet-stat-violet {
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.15);
        }

        .fleet-viewport {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .fleet-search {
          position: absolute;
          top: 92px;
          left: 20px;
          z-index: 18;
          width: min(420px, calc(100vw - 40px));
          border-radius: 8px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
        }

        .fleet-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f8fafc;
          font-size: 0.82rem;
          font-family: Inter, system-ui;
        }

        .fleet-search input::placeholder {
          color: #64748b;
        }

        .fleet-search button {
          border: 0;
          outline: 0;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
        }

        .fleet-inspector {
          position: absolute;
          top: 92px;
          right: 20px;
          bottom: 20px;
          width: min(380px, calc(100vw - 40px));
          z-index: 19;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.94);
          color: var(--text-main);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .hover-glow:hover {
          border-color: var(--primary) !important;
          background: rgba(6, 182, 212, 0.04) !important;
        }

        .fleet-physics-sandbox {
          position: absolute;
          top: 156px;
          left: 20px;
          z-index: 18;
          width: min(290px, calc(100vw - 40px));
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(8, 16, 24, 0.82);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.3);
          padding: 12px 14px;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: Inter, system-ui;
        }

        .sandbox-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fbbf24;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
          padding-bottom: 6px;
        }

        .sandbox-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sandbox-control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .control-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: #94a3b8;
        }

        .control-label code {
          background: rgba(34, 211, 238, 0.14);
          color: #22d3ee;
          padding: 1px 4px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-family: monospace;
        }

        .sandbox-control-group input[type="range"] {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: #1e293b;
          accent-color: #22d3ee;
          cursor: pointer;
        }

        .sandbox-reset-button {
          margin-top: 4px;
          width: 100%;
          min-height: 28px;
          border-radius: 5px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.72);
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.16s, border-color 0.16s;
        }

        .sandbox-reset-button:hover {
          border-color: rgba(34, 211, 238, 0.5);
          background: rgba(20, 31, 46, 0.94);
        }

        @media (max-width: 860px) {
          .fleet-topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .fleet-actions {
            overflow-x: auto;
          }

          .fleet-search {
            top: 150px;
          }

          .fleet-physics-sandbox {
            top: 216px;
            width: calc(100vw - 40px);
          }

          .fleet-inspector {
            top: auto;
            left: 20px;
            height: 42vh;
          }
        }
      `}</style>
    </div>
  );
};

export default FleetGraphPage;
