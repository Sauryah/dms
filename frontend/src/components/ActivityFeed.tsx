import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Cpu, Package, Disc, Plus, Edit2, Trash2, Link, FileSpreadsheet, Activity, User, Monitor, Globe, Key } from 'lucide-react';

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const ActivityFeed: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.get('/audit-logs/export', { responseType: 'blob' });
      // Create blob link and download it
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_log_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit logs', error);
      alert('Failed to export audit logs. Please verify your connection and permissions.');
    } finally {
      setExporting(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/audit-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Poll for updates every 10 seconds to keep floor activity fresh
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getFriendlyUserAgent = (ua: string | undefined) => {
    if (!ua) return 'Floor Terminal';
    let os = 'Unknown OS';
    let browser = 'Browser';
    
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'MacOS';
    else if (ua.includes('iPad') || ua.includes('iPhone')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';
    
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return `${browser} on ${os}`;
  };

  const getActionIcon = (action: string) => {
    const iconSize = 16;
    if (action.includes('LOGIN')) {
      return {
        element: <Key size={iconSize} />,
        colorClass: 'icon-green',
        bg: 'var(--success-light)',
      };
    }
    if (action.includes('CREATE')) {
      return {
        element: <Plus size={iconSize} />,
        colorClass: 'icon-green',
        bg: 'var(--success-light)',
      };
    }
    if (action.includes('UPDATE')) {
      return {
        element: <Edit2 size={iconSize} />,
        colorClass: 'icon-blue',
        bg: 'var(--primary-light)',
      };
    }
    if (action.includes('DELETE')) {
      return {
        element: <Trash2 size={iconSize} />,
        colorClass: 'icon-red',
        bg: 'var(--danger-light)',
      };
    }
    if (action.includes('ASSIGN')) {
      return {
        element: <Link size={iconSize} />,
        colorClass: 'icon-purple',
        bg: '#f3e8ff', // soft purple
      };
    }
    if (action.includes('IMPORT')) {
      return {
        element: <FileSpreadsheet size={iconSize} />,
        colorClass: 'icon-green',
        bg: 'var(--success-light)',
      };
    }
    return {
      element: <Activity size={iconSize} />,
      colorClass: 'icon-blue',
      bg: 'var(--primary-light)',
    };
  };

  const getTargetIcon = (action: string) => {
    const size = 12;
    if (action.includes('MACHINE')) return <Cpu size={size} style={{ marginRight: '4px' }} />;
    if (action.includes('SET')) return <Package size={size} style={{ marginRight: '4px' }} />;
    if (action.includes('DIE')) return <Disc size={size} style={{ marginRight: '4px' }} />;
    return null;
  };

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + d.toLocaleDateString();
  };

  if (loading && logs.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading activity logs...</div>;
  }

  return (
    <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-wrapper icon-blue" style={{ width: '36px', height: '36px' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Live Shop Floor Activity</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Real-time audit log of equipment movements and events</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleExport} 
            disabled={exporting}
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FileSpreadsheet size={12} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button 
            onClick={fetchLogs} 
            className="btn btn-ghost" 
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'auto' }}
          >
            Refresh Feed
          </button>
        </div>
      </div>

      <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }}>
        {logs.map((log) => {
          const config = getActionIcon(log.action);
          return (
            <div 
              key={log.id} 
              style={{ 
                display: 'flex', 
                gap: '1rem', 
                padding: '1rem', 
                background: 'var(--white)', 
                borderRadius: '12px', 
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  background: config.bg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                className={config.colorClass}
              >
                {config.element}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <User size={12} style={{ color: 'var(--text-muted)' }} />
                    <span>{log.actorName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({log.action})</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatLogDate(log.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: '0 0 0.6rem 0', lineHeight: 1.4 }}>
                  {log.details}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#1f2937' }}>
                    {getTargetIcon(log.action)}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Target: {log.target}
                    </span>
                  </div>
                  {log.ipAddress && (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                      <Globe size={10} style={{ marginRight: '4px' }} />
                      <span>{log.ipAddress}</span>
                    </div>
                  )}
                  {log.userAgent && (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                      <Monitor size={10} style={{ marginRight: '4px' }} />
                      <span>{getFriendlyUserAgent(log.userAgent)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="empty-state" style={{ padding: '2rem 1rem', background: 'transparent', border: 'none' }}>
            No shop floor activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
