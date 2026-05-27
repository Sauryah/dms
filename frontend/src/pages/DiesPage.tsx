import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Disc, Plus, X, Edit2, Trash2, Search, Upload, FileSpreadsheet, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import SegmentedControl from '../components/SegmentedControl';
import Skeleton from '../components/Skeleton';

interface Die {
  id: string;
  dieId: string;
  size: string;
  casing: string;
  details: string;
  set?: any;
}

const DiesPage: React.FC = () => {
  const [dies, setDies] = useState<Die[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('dieId');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDie, setEditingDie] = useState<Die | null>(null);
  const [formData, setFormData] = useState({ dieId: '', size: '', casing: '', details: '' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Server-side Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Server-side Tab Counts
  const [assignedCount, setAssignedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [totalAllCount, setTotalAllCount] = useState(0);

  const { user } = useAuth();
  const { addToast } = useToast();

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await api.get('/dies/import-template', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'diemanager_dies_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('success', 'Template Downloaded', 'Spreadsheet layout saved to downloads.');
    } catch (err) {
      console.error('Failed to download import template', err);
      addToast('error', 'Download Failed', 'Could not retrieve Excel import template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const fetchDies = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const diesResponse = await api.get('/dies', {
        params: {
          page: currentPage,
          limit,
          search: searchQuery,
          status: statusFilter,
          sortBy: sortMode
        }
      });
      
      setDies(diesResponse.data.dies);
      setTotalCount(diesResponse.data.totalCount);
      setTotalPages(diesResponse.data.totalPages);

      const statsResponse = await api.get('/machines/stats');
      setTotalAllCount(statsResponse.data.dies);
      setUnassignedCount(statsResponse.data.unassignedDies);
      setAssignedCount(statsResponse.data.dies - statsResponse.data.unassignedDies);
    } catch (error) {
      console.error('Failed to fetch dies', error);
      addToast('error', 'Inventory Sync Failed', 'Could not retrieve die records.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger paginated load on parameter shifts
  useEffect(() => {
    fetchDies();
  }, [currentPage, statusFilter, sortMode]);

  // Debounced search input trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (currentPage === 1) {
        fetchDies();
      } else {
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Reset to page 1 when filter shifts
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (editingDie) {
        await api.put(`/dies/${editingDie.id}`, formData);
        addToast('success', 'Die Updated', `Specifications for "${formData.dieId}" have been saved.`);
      } else {
        await api.post('/dies', formData);
        addToast('success', 'Die Registered', `Die "${formData.dieId}" added to master inventory.`);
      }
      resetForm();
      fetchDies(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save die';
      setError(msg);
      addToast('error', 'Operation Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setError('');
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await api.post('/dies/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportStatus(response.data);
      setImportFile(null);
      addToast('info', 'Import Complete', `Processed ${response.data.successCount + response.data.skipCount + response.data.errorCount} records.`);
      fetchDies(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to import dies';
      setError(msg);
      addToast('error', 'Import Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (die: Die) => {
    if (window.confirm(`Are you sure you want to delete die "${die.dieId}"? This action is irreversible.`)) {
      try {
        await api.delete(`/dies/${die.id}`);
        addToast('success', 'Die Deleted', `Removed "${die.dieId}" from inventory.`);
        fetchDies(true);
      } catch (err: any) {
        addToast('error', 'Delete Failed', err.response?.data?.error || 'Failed to delete record.');
      }
    }
  };

  const openEditModal = (die: Die) => {
    setEditingDie(die);
    setFormData({ dieId: die.dieId, size: die.size, casing: die.casing, details: die.details || '' });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingDie(null);
    setFormData({ dieId: '', size: '', casing: '', details: '' });
    setShowModal(false);
    setError('');
  };

  const filteredDies = dies;

  const PageSkeleton = () => (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Dies' }]} />
      <div className="page-header">
        <div>
          <Skeleton width={250} height="2.5rem" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width={400} height="1rem" />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width={140} height="2.5rem" />
          <Skeleton width={110} height="2.5rem" />
        </div>
      </div>
      <div className="ops-toolbar">
        <Skeleton width={180} height="1.5rem" />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Skeleton width={280} height="2.5rem" />
          <Skeleton width={145} height="2.5rem" />
          <Skeleton width={300} height="2.5rem" />
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Die ID</th>
              <th>Size</th>
              <th>Casing</th>
              <th>Status</th>
              <th>Details</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Skeleton variant="circle" width={18} height={18} />
                    <Skeleton width="60%" height="1.25rem" />
                  </div>
                </td>
                <td><Skeleton width="40%" height="1.25rem" /></td>
                <td><Skeleton width="50%" height="1.25rem" /></td>
                <td><Skeleton width="60%" height="1.5rem" /></td>
                <td><Skeleton width="85%" height="1.25rem" /></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Skeleton width={20} height={20} />
                    <Skeleton width={20} height={20} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Skeleton Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <Skeleton width={250} height="1rem" />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Skeleton width={90} height="2rem" />
            <Skeleton width={90} height="2rem" />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && dies.length === 0) return <PageSkeleton />;

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Dies' }]} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Dies Inventory</h1>
          <p className="page-subtitle">Manage individual production dies and their specifications</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            title="Download reference Excel spreadsheet template for bulk import"
          >
            <Download size={18} /> {downloadingTemplate ? 'Downloading...' : 'Excel Template'}
          </button>
          {isAdmin && (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={18} /> Import Excel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} /> Register Die
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ops-toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>Master Inventory</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All', value: 'all', count: totalAllCount },
              { label: 'Assigned', value: 'assigned', count: assignedCount },
              { label: 'Unassigned', value: 'unassigned', count: unassignedCount },
            ]}
          />
          <select className="input" value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ width: '145px' }}>
            <option value="dieId">Sort: Die ID</option>
            <option value="size">Sort: Size</option>
            <option value="casing">Sort: Casing</option>
          </select>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search dies by ID, size..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Die ID</th>
              <th>Size</th>
              <th>Casing</th>
              <th>Status</th>
              <th>Details</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDies.map((die) => (
              <tr key={die.id} className="hover-row">
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="icon-wrapper icon-blue" style={{ padding: '0.4rem' }}>
                      <Disc size={14} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{die.dieId}</span>
                  </div>
                </td>
                <td><span className="badge badge-neutral">{die.size}</span></td>
                <td>{die.casing}</td>
                <td>
                  <span className={`badge ${die.set ? 'badge-primary' : 'badge-neutral'}`}>
                    {die.set ? die.set.name : 'Unassigned'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{die.details || '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="row-actions">
                    <button 
                      onClick={() => openEditModal(die)} 
                      className="btn-icon" 
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDelete(die)} 
                        className="btn-icon" 
                        style={{ color: 'var(--danger)' }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredDies.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state" style={{ border: 'none' }}>
                  {searchQuery ? `No dies matching "${searchQuery}"` : 'No dies registered in the inventory.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Scale-Safe Table Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.35rem 0.75rem', height: '2rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button 
                type="button"
                className="btn btn-secondary" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.35rem 0.75rem', height: '2rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>{editingDie ? 'Edit Die' : 'Register New Die'}</h2>
              <button onClick={resetForm} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="label">Die ID</label>
                <input type="text" className="input" placeholder="e.g. D-500" value={formData.dieId} onChange={(e) => setFormData({ ...formData, dieId: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="label">Size</label>
                  <input type="text" className="input" placeholder="e.g. 15mm" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="label">Casing</label>
                  <input type="text" className="input" placeholder="e.g. Steel" value={formData.casing} onChange={(e) => setFormData({ ...formData, casing: e.target.value })} required />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Details</label>
                <textarea className="input" placeholder="Optional details..." value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingDie ? 'Save Changes' : 'Register Die'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-wrapper icon-green">
                  <FileSpreadsheet size={20} />
                </div>
                <h2 className="section-title" style={{ margin: 0 }}>Import Dies from Excel</h2>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportStatus(null); }} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>

            {!importStatus ? (
              <>
                <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Instructions:</p>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Your Excel file must contain a header row with these exact columns:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <code style={{ fontSize: '0.75rem' }}>Die ID</code>
                    <code style={{ fontSize: '0.75rem' }}>Size</code>
                    <code style={{ fontSize: '0.75rem' }}>Casing</code>
                    <code style={{ fontSize: '0.75rem' }}>Details</code>
                    <code style={{ fontSize: '0.75rem' }}>Set Name</code>
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                    * Set Name is optional but must match an existing set exactly.
                  </p>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <button 
                      type="button" 
                      onClick={handleDownloadTemplate} 
                      disabled={downloadingTemplate}
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', height: '2rem', padding: '0 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={12} /> {downloadingTemplate ? 'Downloading...' : 'Download Sample Template'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="input-group">
                    <label className="label">Choose Excel File (.xlsx, .xls)</label>
                    <input 
                      type="file" 
                      className="input" 
                      accept=".xlsx, .xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      required 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)} style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!importFile || isSubmitting}>
                      {isSubmitting ? 'Importing...' : 'Upload and Import'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div className="icon-wrapper icon-green" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', borderRadius: '50%' }}>
                  <FileSpreadsheet size={32} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Import Completed!</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--success-light)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{importStatus.successCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Success</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>{importStatus.skipCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Skipped</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--danger-light)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{importStatus.errorCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Errors</div>
                  </div>
                </div>

                {/* Ingestion Warnings Audit Checklist */}
                {importStatus.warnings && importStatus.warnings.length > 0 && (
                  <div style={{ textAlign: 'left', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                      ⚠️ Ingestion Warnings ({importStatus.warnings.length})
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#b45309' }}>
                      {importStatus.warnings.map((warn: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', borderBottom: idx < importStatus.warnings.length - 1 ? '1px solid #fef3c7' : 'none', paddingBottom: idx < importStatus.warnings.length - 1 ? '0.35rem' : '0' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>Row {warn.row}:</span>
                          <span>
                            <strong>{warn.dieId !== 'Unknown' ? `Die "${warn.dieId}"` : 'Record'}</strong> - {warn.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setShowImportModal(false); setImportStatus(null); }}>Close</button>
              </div>
            )}
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
      `}</style>
    </div>
  );
};

export default DiesPage;
