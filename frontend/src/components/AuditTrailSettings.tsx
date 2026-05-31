import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { FileText, Download, Eye, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Skeleton from './Skeleton';

export const AuditTrailSettings: React.FC = () => {
  const { addToast } = useToast();
  
  // Audit Logs Pagination & Filter States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Filter values
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // SSE Status
  const [sseStatus, setSseStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  // Inspect Modal Log
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchAuditLogs = async () => {
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
      addToast('error', 'Fetch Failed', 'Failed to retrieve compliance audit logs.');
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

  // Trigger query search debounced
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAuditLogs();
    }, 300);
    return () => clearTimeout(handler);
  }, [logsPage, actorFilter, actionFilter, startDateFilter, endDateFilter, logSearch]);

  // Real-time EventSource connection for streaming audit log telemetry
  useEffect(() => {
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
          const envelope = JSON.parse(event.data);
          
          if (envelope && envelope.type === 'audit_log') {
            const logPayload = envelope.data;
            if (logPayload && logPayload.id) {
              setAuditLogs((prev) => {
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
          }
        } catch (err) {
          console.error('Failed parsing real-time SSE stream log payload:', err);
        }
      };

      eventSource.onerror = (err) => {
        setSseStatus('reconnecting');
        console.warn(`Real-time audit log stream disconnected or failed. Reconnecting in ${reconnectDelay / 1000}s...`, err);
        eventSource.close();
        
        timerId = window.setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
          connectSSE();
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
  }, [logsPage, actorFilter, actionFilter, logSearch]);

  const handleExportLogs = async () => {
    try {
      setExporting(true);
      const queryParams = new URLSearchParams();
      if (actorFilter) queryParams.append('actor', actorFilter);
      if (actionFilter) queryParams.append('action', actionFilter);
      if (startDateFilter) queryParams.append('startDate', startDateFilter);
      if (endDateFilter) queryParams.append('endDate', endDateFilter);
      if (logSearch) queryParams.append('search', logSearch);

      const response = await api.get(`/audit-logs/export?${queryParams.toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_log_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('success', 'Logs Exported', 'Compliance audit logs CSV exported successfully.');
    } catch (err) {
      console.error('Failed to export compliance logs', err);
      addToast('error', 'Export Failed', 'Could not compile or download the CSV logs sheet.');
    } finally {
      setExporting(false);
    }
  };

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE')) return { bg: 'var(--danger-light)', text: 'var(--danger)' };
    if (act.includes('CREATE')) return { bg: 'var(--primary-light)', text: 'var(--primary)' };
    if (act.includes('UPDATE')) return { bg: 'hsla(38, 92%, 50%, 0.15)', text: 'hsl(38, 92%, 60%)' };
    if (act.includes('IMPORT') || act.includes('EXPORT')) return { bg: 'var(--warning-light)', text: 'var(--warning)' };
    if (act.includes('LOGIN')) return { bg: 'var(--success-light)', text: 'var(--success)' };
    return { bg: 'hsl(222, 20%, 16%)', text: 'var(--text-muted)' };
  };

  return (
    <>
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
          <button className="btn btn-secondary" onClick={handleExportLogs} disabled={exporting || auditLogs.length === 0}>
            <Download size={16} /> {exporting ? 'Compiling CSV...' : 'Export Filtered Logs'}
          </button>
        </div>

        {/* Dynamic Telemetry Audit Logs Filter Toolbar */}
        <div style={{ 
          background: 'rgba(2, 6, 23, 0.35)', 
          border: '1px solid var(--border)', 
          padding: '1.25rem', 
          borderRadius: '12px', 
          marginBottom: '1.5rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Actor Name</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Filter actor..." 
              value={actorFilter} 
              onChange={(e) => handleActorChange(e.target.value)} 
              style={{ height: '2.5rem', fontSize: '0.875rem' }}
            />
          </div>
          
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Action Category</label>
            <select 
              className="input" 
              value={actionFilter} 
              onChange={(e) => handleActionChange(e.target.value)}
              style={{ height: '2.5rem', fontSize: '0.875rem' }}
            >
              <option value="">All Categories</option>
              <option value="LOGIN">LOGIN</option>
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
              <option value="EXPORT_AUDIT">EXPORT_AUDIT</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Start Date</label>
            <input 
              type="date" 
              className="input" 
              value={startDateFilter} 
              onChange={(e) => handleStartDateChange(e.target.value)}
              style={{ height: '2.5rem', fontSize: '0.875rem' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>End Date</label>
            <input 
              type="date" 
              className="input" 
              value={endDateFilter} 
              onChange={(e) => handleEndDateChange(e.target.value)}
              style={{ height: '2.5rem', fontSize: '0.875rem' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label className="label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Search Details</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Search..." 
                value={logSearch} 
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ height: '2.5rem', fontSize: '0.875rem', paddingLeft: '2rem' }}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Asset</th>
                <th>Audit Details</th>
                <th style={{ textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading && auditLogs.length === 0 ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td><Skeleton width="120px" height="1rem" /></td>
                    <td><Skeleton width="80px" height="1.25rem" /></td>
                    <td><Skeleton width="100px" height="1.25rem" /></td>
                    <td><Skeleton width="110px" height="1.25rem" /></td>
                    <td><Skeleton width="220px" height="1rem" /></td>
                    <td style={{ textAlign: 'right' }}><Skeleton width={24} height={24} /></td>
                  </tr>
                ))
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No audit log records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const colors = getActionColor(log.action);
                  return (
                    <tr key={log.id} className="hover-row">
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.actorName}</td>
                      <td>
                        <span className="badge" style={{ background: colors.bg, color: colors.text, fontWeight: 800, fontSize: '0.625rem', border: 'none' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{log.target || 'N/A'}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '0.4rem', color: 'var(--primary)' }}
                          onClick={() => setSelectedLog(log)}
                          title="Inspect Audit Event Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controller */}
        {logsTotalPages > 1 && (
          <div className="flex-between" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Showing Page <strong>{logsPage}</strong> of <strong>{logsTotalPages}</strong> &mdash; <strong>{logsTotalCount}</strong> Total Logs
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                disabled={logsPage === 1} 
                onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button 
                className="btn btn-secondary" 
                disabled={logsPage === logsTotalPages} 
                onClick={() => setLogsPage(prev => Math.min(prev + 1, logsTotalPages))}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

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
                      // Fallback
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
    </>
  );
};
