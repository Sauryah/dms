import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, MapPin, ExternalLink, Plus, Lock } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { useToast } from '../context/ToastContext';

interface Machine {
  id: string;
  name: string;
  location: string;
  sets?: any[];
}

interface FacilityFloorplanMapProps {
  machines: Machine[];
  selectedMachineId: string | null;
  setSelectedMachineId: (id: string | null) => void;
  floorplanView: 'grid' | 'zone';
  setFloorplanView: (view: 'grid' | 'zone') => void;
  setSelectedBulkMachine: (id: string) => void;
  setShowBulkModal: (show: boolean) => void;
  canModify: boolean;
  locks?: Record<string, { operatorId: string; operatorName: string; expiresAt: string }>;
}

export const FacilityFloorplanMap: React.FC<FacilityFloorplanMapProps> = ({
  machines,
  selectedMachineId,
  setSelectedMachineId,
  floorplanView,
  setFloorplanView,
  setSelectedBulkMachine,
  setShowBulkModal,
  canModify,
  locks,
}) => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  return (
    <ErrorBoundary
      fallbackTitle="Floorplan Telemetry Error"
      fallbackMessage="The interactive Coordinate Floorplan Grid encountered a loading error."
    >
      {/* 📡 Facility Floorplan & Real-Time Telemetry Map */}
      <div className="ops-panel" style={{ padding: '1.75rem', marginBottom: '2rem', background: 'var(--white)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', position: 'relative' }}>
                <Cpu size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ 
                  position: 'absolute', 
                  top: '-2px', 
                  right: '-2px', 
                  width: '6px', 
                  height: '6px', 
                  background: 'var(--success)', 
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite' 
                }} />
              </span>
              Facility Floorplan & Real-Time Telemetry
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Interactive shop floor coordinate map of machines. Select any cell to read live telemetry.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn"
              style={{ 
                fontSize: '0.7rem', 
                padding: '0.35rem 0.75rem', 
                borderRadius: '6px',
                background: floorplanView === 'grid' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                border: floorplanView === 'grid' ? '1px solid var(--primary)' : '1px solid var(--border)'
              }}
              onClick={() => setFloorplanView('grid')}
            >
              Coordinate Grid
            </button>
            <button 
              className="btn"
              style={{ 
                fontSize: '0.7rem', 
                padding: '0.35rem 0.75rem', 
                borderRadius: '6px',
                background: floorplanView === 'zone' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                border: floorplanView === 'zone' ? '1px solid var(--primary)' : '1px solid var(--border)'
              }}
              onClick={() => setFloorplanView('zone')}
            >
              Zone Groups
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Map Grid */}
          <div style={{ 
            background: 'rgba(2, 6, 23, 0.4)', 
            border: '1px solid var(--border)', 
            borderRadius: '10px', 
            padding: '1.5rem',
            position: 'relative',
            minHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {/* Tech grid mesh background */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundImage: 'radial-gradient(hsla(210, 40%, 98%, 0.05) 1px, transparent 1px)', 
              backgroundSize: '16px 16px',
              pointerEvents: 'none',
              borderRadius: '10px'
            }} />

            {floorplanView === 'grid' ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gridAutoRows: '90px', 
                gap: '1rem',
                position: 'relative',
                zIndex: 1
              }}>
                {(() => {
                  const totalSlots = Math.max(12, Math.ceil(machines.length / 4) * 4);
                  const slots = Array.from({ length: totalSlots });
                  return slots.map((_, index) => {
                    const rowLabel = String.fromCharCode(65 + Math.floor(index / 4)); // A, B, C...
                    const colLabel = (index % 4) + 1; // 1, 2, 3, 4
                    const coordinate = `${rowLabel}${colLabel}`;
                    const machine = machines[index];

                    if (machine) {
                      // Calculate machine health/utilization status
                      const hasSets = machine.sets && machine.sets.length > 0;
                      const hasEmptySets = hasSets && (machine.sets || []).some((s: any) => !s.dies || s.dies.length === 0);
                      const isOperational = hasSets && !hasEmptySets;
                      const isSelected = machine.id === selectedMachineId;

                      let statusColor = 'hsl(217, 100%, 61%)'; // Cobalt Blue (standby / idle)
                      let statusText = 'Standby';
                      let glowShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                      let borderStyle = '1px solid var(--border)';

                      if (isOperational) {
                        statusColor = 'hsl(142, 70%, 45%)'; // Emerald Green
                        statusText = 'Operational';
                        glowShadow = '0 0 12px hsla(142, 70%, 45%, 0.25)';
                      } else if (!hasSets) {
                        statusColor = 'hsl(0, 84%, 60%)'; // Ruby Red (Offline / No sets)
                        statusText = 'No Sets Mounted';
                        glowShadow = '0 0 12px hsla(0, 84%, 60%, 0.25)';
                      } else if (hasEmptySets) {
                        statusColor = 'hsl(38, 92%, 50%)'; // Amber (Empty sets)
                        statusText = 'Degraded (Empty Toolsets)';
                        glowShadow = '0 0 12px hsla(38, 92%, 50%, 0.25)';
                      }

                      if (isSelected) {
                        borderStyle = `2px solid ${statusColor}`;
                        glowShadow = `0 0 20px ${statusColor}`;
                      }

                      const isMachineLocked = locks && locks[machine.id];
                      if (isMachineLocked) {
                        borderStyle = '1px dashed hsl(0, 84%, 60%)';
                        glowShadow = '0 0 12px hsla(0, 84%, 60%, 0.35)';
                      }

                      if (isSelected) {
                        borderStyle = isMachineLocked ? `2px dashed hsl(0, 84%, 60%)` : `2px solid ${statusColor}`;
                        glowShadow = isMachineLocked ? `0 0 20px hsla(0, 84%, 60%, 0.5)` : `0 0 20px ${statusColor}`;
                      }

                      return (
                        <div 
                          key={machine.id}
                          onClick={() => setSelectedMachineId(machine.id)}
                          style={{
                            background: isSelected ? 'rgba(2, 6, 23, 0.75)' : 'rgba(2, 6, 23, 0.35)',
                            border: borderStyle,
                            borderRadius: '8px',
                            padding: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: glowShadow,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          className="floorplan-cell"
                          title={`Machine: ${machine.name} | Status: ${statusText}${isMachineLocked ? ' (LOCKED by ' + isMachineLocked.operatorName + ')' : ''}`}
                        >
                          {/* Pulsing state indicator dot in top-right */}
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '8px',
                            height: '8px',
                            background: statusColor,
                            borderRadius: '50%',
                            boxShadow: `0 0 8px ${statusColor}`,
                            animation: isOperational ? 'pulse 2s infinite' : 'none'
                          }} />

                          {isMachineLocked && (
                            <div style={{
                              position: 'absolute',
                              top: '6px',
                              right: '20px',
                              color: 'hsl(0, 84%, 60%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }} title={`Locked by ${isMachineLocked.operatorName}`}>
                              <Lock size={12} style={{ animation: 'pulse 2s infinite' }} />
                            </div>
                          )}

                          {/* Coordinate label background watermark */}
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '2px',
                            fontSize: '1.75rem',
                            fontWeight: 900,
                            color: 'rgba(255, 255, 255, 0.02)',
                            userSelect: 'none',
                            pointerEvents: 'none'
                          }}>
                            {coordinate}
                          </div>

                          <div>
                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              BAY {coordinate}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                              {machine.name}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                            <span style={{ fontSize: '0.625rem', color: statusColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <span style={{ width: '4px', height: '4px', background: statusColor, borderRadius: '50%' }} />
                              {machine.sets?.length || 0} Sets Active
                            </span>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                              {machine.location ? machine.location.split('-')[1]?.trim() || machine.location : 'Zone A'}
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      // Render empty mesh cell
                      return (
                        <div 
                          key={`empty-${coordinate}`}
                          style={{
                            border: '1px dashed rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255, 255, 255, 0.08)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            userSelect: 'none'
                          }}
                        >
                          {coordinate}
                        </div>
                      );
                    }
                  });
                })()}
              </div>
            ) : (
              // Zone groups view (grouped by location name)
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem', 
                position: 'relative', 
                zIndex: 1,
                maxHeight: '340px',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {(() => {
                  // Group machines by location prefix
                  const zones: { [key: string]: Machine[] } = {};
                  machines.forEach(m => {
                    const zoneName = m.location ? m.location.split('-')[0].trim() : 'Unassigned Zone';
                    if (!zones[zoneName]) zones[zoneName] = [];
                    zones[zoneName].push(m);
                  });

                  if (Object.keys(zones).length === 0) {
                    return <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No zone groupings available.</div>;
                  }

                  return Object.entries(zones).map(([zoneName, zoneMachines]) => (
                    <div key={zoneName} style={{ background: 'rgba(2, 6, 23, 0.2)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📍 {zoneName} ({zoneMachines.length} Assets)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        {zoneMachines.map(m => {
                          const hasSets = m.sets && m.sets.length > 0;
                          const hasEmptySets = hasSets && (m.sets || []).some((s: any) => !s.dies || s.dies.length === 0);
                          const isOperational = hasSets && !hasEmptySets;
                          const isSelected = m.id === selectedMachineId;

                          let statusColor = 'hsl(217, 100%, 61%)';
                          if (isOperational) statusColor = 'hsl(142, 70%, 45%)';
                          else if (!hasSets) statusColor = 'hsl(0, 84%, 60%)';
                          else if (hasEmptySets) statusColor = 'hsl(38, 92%, 50%)';

                          const isMachineLocked = locks && locks[m.id];
                          let borderVal = isSelected ? `1.5px solid ${statusColor}` : '1px solid var(--border)';
                          let shadowVal = isSelected ? `0 0 12px ${statusColor}` : 'none';
                          if (isMachineLocked) {
                            borderVal = isSelected ? `1.5px dashed hsl(0, 84%, 60%)` : '1px dashed rgba(239, 68, 68, 0.4)';
                            shadowVal = isSelected ? `0 0 12px hsla(0, 84%, 60%, 0.4)` : 'none';
                          }

                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMachineId(m.id)}
                              style={{
                                background: isSelected ? 'rgba(2, 6, 23, 0.6)' : 'rgba(2, 6, 23, 0.25)',
                                border: borderVal,
                                padding: '0.5rem 0.65rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: shadowVal
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {m.name}
                                {isMachineLocked && <Lock size={10} style={{ color: 'hsl(0, 84%, 60%)' }} />}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.625rem' }}>
                                <span style={{ color: statusColor, fontWeight: 600 }}>{m.sets?.length || 0} Sets</span>
                                <span style={{ color: 'var(--text-muted)' }}>{m.location?.split('-')[1]?.trim() || ''}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Telemetry Sidebar Details */}
          <div style={{ 
            background: 'rgba(2, 6, 23, 0.25)', 
            border: '1px solid var(--border)', 
            borderRadius: '10px', 
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '340px'
          }}>
            {(() => {
              const selectedMachine = machines.find(m => m.id === selectedMachineId);
              if (!selectedMachine) {
                return (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: '2rem'
                  }}>
                    <Cpu size={32} style={{ color: 'var(--border)', marginBottom: '0.75rem' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SELECT NODE FOR TELEMETRY</span>
                    <span style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>Hover or click any active coordinate grid module to analyze layout metrics.</span>
                  </div>
                );
              }

              const hasSets = selectedMachine.sets && selectedMachine.sets.length > 0;
              const emptySets = selectedMachine.sets ? selectedMachine.sets.filter((s: any) => !s.dies || s.dies.length === 0) : [];
              const hasEmptySets = emptySets.length > 0;
              const isOperational = hasSets && !hasEmptySets;

              let statusText = 'Standby (Operational)';
              let statusClass = 'badge-blue';
              let statusDesc = 'All mounted toolsets are loaded with operational dies.';
              if (isOperational) {
                statusText = 'Operational';
                statusClass = 'badge-green';
                statusDesc = 'Active production flow running standard industrial processes.';
              } else if (!hasSets) {
                statusText = 'Offline (Critical)';
                statusClass = 'badge-red';
                statusDesc = 'Asset has zero toolsets mounted. Production queue halted.';
              } else if (hasEmptySets) {
                statusText = 'Degraded (Warning)';
                statusClass = 'badge-warning';
                statusDesc = `${emptySets.length} toolsets have zero dies assigned. Maintenance required.`;
              }

              return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedMachine.name}</h4>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <MapPin size={10} /> {selectedMachine.location || 'Unknown Lane'}
                        </div>
                      </div>
                      <span className={`badge ${statusClass}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Status Description Box */}
                    <div style={{ background: 'rgba(2, 6, 23, 0.4)', border: '1px solid var(--border)', padding: '0.65rem 0.75rem', borderRadius: '6px', marginBottom: '0.85rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.15rem' }}>
                        Telemetry Status
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-main)', lineHeight: '1.3' }}>
                        {statusDesc}
                      </p>
                    </div>

                    {/* Mount Info */}
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        <span>Toolset Allocation</span>
                        <span>{selectedMachine.sets?.length || 0} Mounted</span>
                      </div>

                      {hasSets ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {selectedMachine.sets?.map((s: any) => {
                            const dieCount = s.dies?.length || 0;
                            const isSetLocked = locks && locks[s.id];
                            
                            const handleSetClick = () => {
                              if (isSetLocked) {
                                addToast('error', 'Resource Locked', `Toolset is currently locked by ${isSetLocked.operatorName} for configuration.`);
                                return;
                              }
                              navigate(`/sets/${s.id}`);
                            };

                            return (
                              <div 
                                key={s.id} 
                                onClick={handleSetClick}
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  background: 'rgba(255, 255, 255, 0.02)', 
                                  border: isSetLocked ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid var(--border)', 
                                  padding: '0.4rem 0.5rem', 
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  transition: 'background 0.2s'
                                }}
                                className="telemetry-set-row"
                                title={isSetLocked ? `Locked by ${isSetLocked.operatorName}` : undefined}
                              >
                                <span style={{ fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {s.name}
                                  {isSetLocked && <Lock size={10} style={{ color: 'hsl(0, 84%, 60%)' }} />}
                                </span>
                                <span className={`badge ${dieCount > 0 ? 'badge-neutral' : 'badge-red'}`} style={{ fontSize: '0.6rem', border: 'none', padding: '0.05rem 0.35rem', flexShrink: 0 }}>
                                  {dieCount} Dies
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed hsla(0, 84%, 60%, 0.2)', borderRadius: '6px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--danger)', fontStyle: 'italic' }}>
                          ⚠️ Critical Warning: Production line halted. Mount a toolset immediately.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn" 
                      onClick={() => {
                        const isMachineLocked = locks && locks[selectedMachine.id];
                        if (isMachineLocked) {
                          addToast('error', 'Resource Locked', `Machine is currently locked by ${isMachineLocked.operatorName} for configuration.`);
                          return;
                        }
                        navigate(`/machines/${selectedMachine.id}`);
                      }}
                      style={{ 
                        flex: 1, 
                        fontSize: '0.7rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.3rem', 
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border)',
                        color: '#fff'
                      }}
                    >
                      Inspect Node <ExternalLink size={12} />
                    </button>
                    {canModify && (
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedBulkMachine(selectedMachine.id);
                          setShowBulkModal(true);
                        }}
                        style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        <Plus size={12} /> Toolset
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
