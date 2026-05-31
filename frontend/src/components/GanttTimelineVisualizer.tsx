import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, MapPin, Workflow } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface GanttTimelineVisualizerProps {
  timelineData: {
    utilization: any[];
    history: any[];
  };
}

export const GanttTimelineVisualizer: React.FC<GanttTimelineVisualizerProps> = ({ timelineData }) => {
  const navigate = useNavigate();

  return (
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
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Real-time tooling layouts across active production assets
                </p>
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
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.name}
                              </span>
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
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {log.action.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
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
  );
};
