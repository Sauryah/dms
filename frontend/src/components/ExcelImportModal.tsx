import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { FileSpreadsheet, X, Download } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { addToast } = useToast();
  
  // Internal Spreadsheet Processing States
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<any | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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

  const handleImportPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setError('');
    setIsSubmitting(true);

    try {
      // 1. Fetch all existing Sets to map names on the frontend
      const setsResponse = await api.get('/sets');
      const setMap = new Map<string, string>();
      if (Array.isArray(setsResponse.data)) {
        for (const s of setsResponse.data) {
          setMap.set(s.name.trim(), s.id);
        }
      }

      // 2. Read and parse file using the background Web Worker
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result;
          if (!buffer) {
            throw new Error('Could not read file binary buffer');
          }

          const existingSetNames = Array.from(setMap.keys());

          // Spawn Web Worker from components directory (relative to workers/)
          const worker = new Worker(
            new URL('../workers/excelParser.worker.ts', import.meta.url),
            { type: 'module' }
          );

          worker.postMessage({
            fileBuffer: buffer,
            existingSetNames
          });

          worker.onmessage = (e) => {
            const { success, parsedRows, error: workerError } = e.data;
            worker.terminate();

            if (success) {
              setPreviewRows(parsedRows);
              setIsPreviewMode(true);
              addToast('info', 'File Parsed in Background', `Successfully parsed ${parsedRows.length} rows for review.`);
            } else {
              setError(workerError || 'Background parsing failed.');
              addToast('error', 'Parsing Failed', workerError || 'Background parsing failed.');
            }
            setIsSubmitting(false);
          };

          worker.onerror = (err) => {
            console.error('Web worker error:', err);
            worker.terminate();
            setError('Background worker error occurred.');
            addToast('error', 'Worker Failure', 'The background parser encountered an unexpected error.');
            setIsSubmitting(false);
          };
        } catch (err: any) {
          console.error('Error starting spreadsheet worker', err);
          setError(err.message || 'Error processing spreadsheet file');
          addToast('error', 'Parsing Failed', err.message || 'Error processing spreadsheet file');
          setIsSubmitting(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read the file.');
        addToast('error', 'Reading Failed', 'Could not open the selected spreadsheet.');
        setIsSubmitting(false);
      };

      reader.readAsArrayBuffer(importFile);
    } catch (err: any) {
      console.error('Failed to pre-fetch sets metadata from server', err);
      setError('Failed to pre-fetch sets metadata from server');
      addToast('error', 'Ingest Blocked', 'Could not load active sets lists to validate references.');
      setIsSubmitting(false);
    }
  };

  const handlePreviewCellChange = (rowIndex: number, field: string, val: string) => {
    if (!previewRows) return;
    const updated = [...previewRows];
    const row = { ...updated[rowIndex] };
    row[field] = val;

    // Recalculate cell-level errors
    const errors = { ...row.errors };
    if (field === 'dieId') {
      errors.dieId = !val.trim() 
        ? 'Die ID is required' 
        : (!/^[a-zA-Z0-9-_\s]+$/.test(val) ? 'Die ID must only contain letters, numbers, spaces, hyphens, or underscores' : null);
    } else if (field === 'size') {
      errors.size = !val.trim() ? 'Size is required' : null;
    } else if (field === 'casing') {
      errors.casing = !val.trim() 
        ? 'Casing is required' 
        : (val.trim().length < 2 ? 'Casing must be at least 2 characters' : null);
    }
    row.errors = errors;
    updated[rowIndex] = row;
    setPreviewRows(updated);
  };

  const handleImportConfirm = async () => {
    if (!previewRows) return;

    const hasErrors = previewRows.some(r => Object.values(r.errors).some(e => e !== null));
    if (hasErrors) {
      addToast('error', 'Validation Error', 'Please resolve all validation errors highlighted in red before importing.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/dies/import-confirm', { rows: previewRows });
      setImportStatus(response.data);
      setPreviewRows(null);
      setIsPreviewMode(false);
      setImportFile(null);
      addToast('success', 'Import Complete', 'Successfully processed bulk tooling ingest.');
      onImportSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to commit import';
      setError(msg);
      addToast('error', 'Import Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewRows(null);
    setIsPreviewMode(false);
    setImportFile(null);
    setError('');
  };

  const handleClose = () => {
    handleCancelPreview();
    setImportStatus(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: isPreviewMode ? '1000px' : '540px', width: '100%', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="icon-wrapper icon-green">
              <FileSpreadsheet size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>
              {isPreviewMode ? 'Review & Validate Ingest Data' : 'Import Dies from Excel'}
            </h2>
          </div>
          <button onClick={handleClose} className="btn btn-ghost" style={{ padding: '0.25rem' }}><X size={20} /></button>
        </div>

        {!importStatus ? (
          isPreviewMode && previewRows ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Review the parsed spreadsheet records below. Cell edits are validated on-the-fly. Highlighted fields must be corrected before submitting the bulk ingest.
                </p>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(0, 84%, 60%, 0.2)' }}>
                  {error}
                </div>
              )}

              <ErrorBoundary
                fallbackTitle="Spreadsheet Preview Exception"
                fallbackMessage="An unexpected exception occurred while rendering the local Excel validation grid. Check column formats and values."
              >
                <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Row</th>
                        <th>Die ID *</th>
                        <th>Size *</th>
                        <th>Casing *</th>
                        <th>Details</th>
                        <th>Set Name</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => {
                        const hasErrors = Object.values(row.errors).some(e => e !== null);
                        const hasWarnings = Object.values(row.warnings).some(w => w !== null);

                        return (
                          <tr key={idx} style={{ background: hasErrors ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                              {row.key + 2}
                            </td>
                            
                            {/* Die ID cell */}
                            <td style={{ verticalAlign: 'middle' }}>
                              <input 
                                type="text" 
                                className="input" 
                                value={row.dieId} 
                                onChange={(e) => handlePreviewCellChange(idx, 'dieId', e.target.value)}
                                style={{ 
                                  background: row.errors.dieId ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                  borderColor: row.errors.dieId ? 'var(--danger)' : 'transparent',
                                  height: '2.25rem',
                                  fontSize: '0.8125rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px'
                                }}
                                title={row.errors.dieId || undefined}
                              />
                              {row.errors.dieId && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--danger)', display: 'block', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>{row.errors.dieId}</span>
                              )}
                            </td>

                            {/* Size cell */}
                            <td style={{ verticalAlign: 'middle' }}>
                              <input 
                                type="text" 
                                className="input" 
                                value={row.size} 
                                onChange={(e) => handlePreviewCellChange(idx, 'size', e.target.value)}
                                style={{ 
                                  background: row.errors.size ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                  borderColor: row.errors.size ? 'var(--danger)' : 'transparent',
                                  height: '2.25rem',
                                  fontSize: '0.8125rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px'
                                }}
                                title={row.errors.size || undefined}
                              />
                              {row.errors.size && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--danger)', display: 'block', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>{row.errors.size}</span>
                              )}
                            </td>

                            {/* Casing cell */}
                            <td style={{ verticalAlign: 'middle' }}>
                              <input 
                                type="text" 
                                className="input" 
                                value={row.casing} 
                                onChange={(e) => handlePreviewCellChange(idx, 'casing', e.target.value)}
                                style={{ 
                                  background: row.errors.casing ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                  borderColor: row.errors.casing ? 'var(--danger)' : 'transparent',
                                  height: '2.25rem',
                                  fontSize: '0.8125rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px'
                                }}
                                title={row.errors.casing || undefined}
                              />
                              {row.errors.casing && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--danger)', display: 'block', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>{row.errors.casing}</span>
                              )}
                            </td>

                            {/* Details cell */}
                            <td style={{ verticalAlign: 'middle' }}>
                              <input 
                                type="text" 
                                className="input" 
                                value={row.details || ''} 
                                onChange={(e) => handlePreviewCellChange(idx, 'details', e.target.value)}
                                style={{ 
                                  background: 'transparent',
                                  borderColor: 'transparent',
                                  height: '2.25rem',
                                  fontSize: '0.8125rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px'
                                }}
                              />
                            </td>

                            {/* Set Name cell */}
                            <td style={{ verticalAlign: 'middle' }}>
                              <input 
                                type="text" 
                                className="input" 
                                value={row.setName || ''} 
                                onChange={(e) => handlePreviewCellChange(idx, 'setName', e.target.value)}
                                style={{ 
                                  background: row.warnings.setName ? 'rgba(245, 158, 11, 0.06)' : 'transparent',
                                  borderColor: row.warnings.setName ? 'var(--warning)' : 'transparent',
                                  height: '2.25rem',
                                  fontSize: '0.8125rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px'
                                }}
                                title={row.warnings.setName || undefined}
                              />
                              {row.warnings.setName && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', display: 'block', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>{row.warnings.setName}</span>
                              )}
                            </td>

                            {/* Status badge cell */}
                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                              {hasErrors ? (
                                <span className="badge badge-danger" style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem', border: '1px solid hsla(0, 84%, 60%, 0.2)' }}>Error</span>
                              ) : hasWarnings ? (
                                <span className="badge" style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem', background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid hsla(270, 70%, 60%, 0.2)' }}>Warning</span>
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem', border: '1px solid hsla(142, 70%, 45%, 0.2)' }}>Valid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ErrorBoundary>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCancelPreview} style={{ minWidth: '120px' }}>
                  Cancel Review
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleImportConfirm} 
                  disabled={isSubmitting || previewRows.some(r => Object.values(r.errors).some(e => e !== null))}
                  style={{ minWidth: '180px' }}
                >
                  {isSubmitting ? 'Importing Tooling...' : 'Confirm and Import'}
                </button>
              </div>
            </>
          ) : (
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
                <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid hsla(0, 84%, 60%, 0.2)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleImportPreview} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                  <button type="button" className="btn btn-secondary" onClick={handleClose} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!importFile || isSubmitting}>
                    {isSubmitting ? 'Parsing Spreadsheet...' : 'Upload and Preview'}
                  </button>
                </div>
              </form>
            </>
          )
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

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};
