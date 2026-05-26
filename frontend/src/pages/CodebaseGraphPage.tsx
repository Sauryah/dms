import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Codebase3DGraph from '../components/Codebase3DGraph';
import type { CodeNode, CodeLink } from '../components/Codebase3DGraph';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Workflow, Search, RefreshCw, X, FileCode, Cpu, Layers, Info, ArrowLeft, Network, GitBranch } from 'lucide-react';

const CodebaseGraphPage: React.FC = () => {
  const [nodes, setNodes] = useState<CodeNode[]>([]);
  const [links, setLinks] = useState<CodeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const navigate = useNavigate();

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<CodeNode | null>(null);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await api.get('/dev/codebase-graph');
      
      // Clean links nodes
      const graphData = response.data;
      
      // Ensure each link points to target and source correctly
      const parsedLinks = (graphData.links || []).map((link: any) => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target,
        relation: link.relation,
      }));

      setNodes(graphData.nodes || []);
      setLinks(parsedLinks);
    } catch (error: any) {
      console.error('Failed to load codebase graph structure', error);
      setLoadError(error.response?.data?.error || 'Failed to load codebase graph.');
      setNodes([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    try {
      setIndexing(true);
      setLoadError('');
      const response = await api.post('/dev/codebase-graph/reindex');
      
      const graphData = response.data.graph;
      
      const parsedLinks = (graphData.links || []).map((link: any) => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target,
        relation: link.relation,
      }));

      setNodes(graphData.nodes || []);
      setLinks(parsedLinks);
      setSelectedNode(null);
      alert('Codebase re-indexed successfully in real-time!');
    } catch (error: any) {
      console.error('Failed to trigger codebase re-index', error);
      alert('Failed to re-index codebase: ' + (error.response?.data?.error || error.message));
    } finally {
      setIndexing(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Compute local stats
  const fileNodes = nodes.filter(n => !(n.label.endsWith('()') || n.label.includes('(')));
  const funcNodes = nodes.filter(n => (n.label.endsWith('()') || n.label.includes('(')));

  return (
    <div className="codebase-studio">
      <div 
        className="codebase-viewport"
      >
        <div className="codebase-topbar">
          <div className="codebase-title-group">
            <button className="studio-icon-button" onClick={() => navigate('/')} title="Back to dashboard">
              <ArrowLeft size={18} />
            </button>
            <div className="studio-mark">
              <Workflow size={18} />
            </div>
            <div>
              <h1>3D Codebase Explorer</h1>
              <p>Live dependency map of files, modules, and declarations</p>
            </div>
          </div>

          <div className="codebase-actions">
            <div className="studio-stat studio-stat-amber">
              <Layers size={14} />
              <span>{fileNodes.length}</span>
              <small>files</small>
            </div>
            <div className="studio-stat studio-stat-violet">
              <Cpu size={14} />
              <span>{funcNodes.length}</span>
              <small>declarations</small>
            </div>
            <div className="studio-stat studio-stat-cyan">
              <GitBranch size={14} />
              <span>{links.length}</span>
              <small>links</small>
            </div>
            <button
              onClick={handleReindex}
              disabled={indexing || loading}
              className="studio-action-button"
            >
              <RefreshCw size={15} className={indexing ? 'spin-anim' : ''} />
              {indexing ? 'Indexing' : 'Re-index'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="studio-state">
            <RefreshCw size={34} className="spin-anim" />
            <div>
              <strong>Constructing codebase model</strong>
              <span>Loading graph topology and dependency coordinates...</span>
            </div>
          </div>
        ) : loadError ? (
          <div className="studio-state">
            <Network size={34} />
            <div>
              <strong>Codebase graph is unavailable</strong>
              <span>{loadError}</span>
            </div>
            <button className="studio-action-button" onClick={fetchGraph}>Try Again</button>
          </div>
        ) : nodes.length === 0 ? (
          <div className="studio-state">
            <Network size={34} />
            <div>
              <strong>No codebase nodes found</strong>
              <span>Run re-index to rebuild the graph data.</span>
            </div>
            <button className="studio-action-button" onClick={handleReindex} disabled={indexing}>
              <RefreshCw size={14} className={indexing ? 'spin-anim' : ''} />
              {indexing ? 'Re-indexing...' : 'Re-index Codebase'}
            </button>
          </div>
        ) : (
          <ErrorBoundary
            fallbackTitle="3D Codebase Explorer Issue"
            fallbackMessage="The 3D WebGL engine encountered a layout calculation error while generating the code module dependency tree."
          >
            <Codebase3DGraph
              nodes={nodes}
              links={links}
              highlightQuery={searchQuery}
              onNodeClick={(node) => setSelectedNode(node)}
            />
          </ErrorBoundary>
        )}

        {/* Search Bar overlay */}
        {!loading && (
          <div className="studio-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search file, function, module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} title="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Frosted Details Peek Drawer */}
        {selectedNode && (
          <div 
            className="studio-inspector"
          >
            {/* Header */}
            <div className="studio-inspector-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={16} />
                <span>Code Inspector</span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)} 
                className="studio-icon-button"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body content */}
            <div className="studio-inspector-body">
              
              <div>
                <h3>
                  {selectedNode.label}
                </h3>
                <span className={selectedNode.label.includes('(') ? 'studio-pill studio-pill-violet' : 'studio-pill studio-pill-amber'}>
                  {selectedNode.label.includes('(') ? 'FUNCTION / DECLARATION' : 'SOURCE MODULE'}
                </span>
              </div>

              {/* Filesystem coordinates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="studio-section-label">Structural Location</span>
                <div className="studio-info-block">
                  <div>
                    <span>File Path:</span>
                    <code>
                      {selectedNode.source_file}
                    </code>
                  </div>
                  {selectedNode.source_location && (
                    <div>
                      <span>Location:</span>
                      <strong>{selectedNode.source_location}</strong>
                    </div>
                  )}
                  {selectedNode.community !== undefined && (
                    <div>
                      <span>Logical cluster:</span>
                      <strong>Cluster #{selectedNode.community}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Connections/Relations explorer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="studio-section-label">Module Dependencies</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {/* Find incoming and outgoing edges */}
                  {links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).slice(0, 10).map((link, idx) => {
                    const isSource = link.source === selectedNode.id;
                    const connectedId = isSource ? link.target : link.source;
                    const connectedNode = nodes.find(n => n.id === connectedId);
                    
                    if (!connectedNode) return null;

                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedNode(connectedNode)}
                        className="studio-dependency"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                          {connectedNode.label.includes('(') ? (
                            <Cpu size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />
                          ) : (
                            <FileCode size={12} style={{ color: '#22d3ee', flexShrink: 0 }} />
                          )}
                          <span>
                            {connectedNode.label}
                          </span>
                        </div>
                        <small>
                          {isSource ? 'Outward' : 'Inward'}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {indexing && (
          <div className="studio-indexing">
            <RefreshCw size={36} className="spin-anim" />
            <div>
              <span>Indexing Project Codebase</span>
              <small>Graphify is parsing imports, files, structures, and module trees.</small>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .codebase-studio {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: #080b10;
          color: #f8fafc;
          overflow: hidden;
        }

        .codebase-viewport {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
            linear-gradient(0deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            #080b10;
          background-size: 64px 64px;
        }

        .codebase-topbar {
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

        .codebase-title-group,
        .codebase-actions,
        .studio-search,
        .studio-inspector,
        .studio-state,
        .studio-indexing {
          pointer-events: auto;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(9, 14, 22, 0.78);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);
        }

        .codebase-title-group {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
        }

        .codebase-title-group h1 {
          margin: 0;
          color: #f8fafc;
          font-size: 1rem;
          font-weight: 800;
        }

        .codebase-title-group p {
          margin: 1px 0 0;
          color: #94a3b8;
          font-size: 0.72rem;
        }

        .studio-mark,
        .studio-icon-button {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .studio-mark {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.26);
        }

        .studio-icon-button,
        .studio-action-button {
          border: 1px solid rgba(148, 163, 184, 0.22);
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.74);
          cursor: pointer;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }

        .studio-icon-button:hover,
        .studio-action-button:hover {
          transform: translateY(-1px);
          border-color: rgba(34, 211, 238, 0.55);
          background: rgba(20, 31, 46, 0.92);
        }

        .codebase-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 8px;
        }

        .studio-stat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 34px;
          padding: 0 10px;
          border-radius: 7px;
          font-size: 0.72rem;
          white-space: nowrap;
        }

        .studio-stat span {
          font-weight: 800;
          color: #f8fafc;
        }

        .studio-stat small {
          color: #94a3b8;
          font-size: 0.68rem;
        }

        .studio-stat-amber {
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.12);
        }

        .studio-stat-violet {
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.12);
        }

        .studio-stat-cyan {
          color: #22d3ee;
          background: rgba(6, 182, 212, 0.12);
        }

        .studio-action-button {
          min-height: 34px;
          border-radius: 7px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .studio-action-button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
          transform: none;
        }

        .studio-search {
          position: absolute;
          top: 92px;
          left: 20px;
          width: min(440px, calc(100vw - 40px));
          z-index: 18;
          border-radius: 8px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
        }

        .studio-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f8fafc;
          font-size: 0.82rem;
          font-family: Inter, system-ui;
        }

        .studio-search input::placeholder {
          color: #64748b;
        }

        .studio-search button {
          border: 0;
          outline: 0;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
        }

        .studio-inspector {
          position: absolute;
          top: 92px;
          right: 20px;
          bottom: 20px;
          width: min(390px, calc(100vw - 40px));
          z-index: 19;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .studio-inspector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          color: #fbbf24;
        }

        .studio-inspector-header span,
        .studio-section-label {
          color: #94a3b8;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .studio-inspector-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .studio-inspector-body h3 {
          color: #f8fafc;
          font-size: 1.05rem;
          line-height: 1.25;
          font-weight: 800;
          margin: 0 0 8px;
          word-break: break-word;
        }

        .studio-pill {
          display: inline-flex;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 0.66rem;
          font-weight: 800;
        }

        .studio-pill-violet {
          color: #ddd6fe;
          background: rgba(139, 92, 246, 0.18);
        }

        .studio-pill-amber {
          color: #fde68a;
          background: rgba(245, 158, 11, 0.16);
        }

        .studio-info-block {
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(2, 6, 23, 0.34);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.78rem;
        }

        .studio-info-block > div + div {
          border-top: 1px solid rgba(148, 163, 184, 0.14);
          padding-top: 10px;
        }

        .studio-info-block span {
          display: block;
          color: #94a3b8;
          font-size: 0.68rem;
          margin-bottom: 3px;
        }

        .studio-info-block code,
        .studio-info-block strong {
          color: #e2e8f0;
          font-size: 0.74rem;
          word-break: break-word;
        }

        .studio-dependency {
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.5);
          padding: 9px 10px;
          border-radius: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.74rem;
          gap: 10px;
        }

        .studio-dependency:hover {
          border-color: rgba(34, 211, 238, 0.5);
          background: rgba(8, 47, 73, 0.32);
        }

        .studio-dependency span {
          color: #e2e8f0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .studio-dependency small {
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.12);
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 0.64rem;
          flex-shrink: 0;
        }

        .studio-state,
        .studio-indexing {
          position: absolute;
          inset: 0;
          z-index: 12;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
          color: #e2e8f0;
          background: rgba(8, 11, 16, 0.82);
        }

        .studio-state > div,
        .studio-indexing > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 520px;
        }

        .studio-state strong,
        .studio-indexing span {
          color: #f8fafc;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .studio-state span,
        .studio-indexing small {
          color: #94a3b8;
          font-size: 0.78rem;
        }

        .studio-indexing {
          z-index: 30;
          background: rgba(8, 11, 16, 0.76);
          backdrop-filter: blur(8px);
        }

        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1.5s linear infinite;
        }

        @media (max-width: 880px) {
          .codebase-topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .codebase-actions {
            overflow-x: auto;
          }

          .studio-search {
            top: 150px;
          }

          .studio-inspector {
            top: auto;
            left: 20px;
            height: 42vh;
          }
        }
      `}</style>
    </div>
  );
};

export default CodebaseGraphPage;
