import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Cpu, Package, Disc, MapPin } from 'lucide-react';
import Skeleton from '../components/Skeleton';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !minSize && !maxSize) return;

    setLoading(true);
    try {
      let url = `/search?q=${encodeURIComponent(query)}`;
      if (minSize) url += `&minSize=${minSize}`;
      if (maxSize) url += `&maxSize=${maxSize}`;
      
      const response = await api.get(url);
      setResults(response.data);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Universal Search</h1>
          <p className="page-subtitle">Find machines, sets, or dies across the entire facility</p>
        </div>
      </div>
      
      <form onSubmit={handleSearch} style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search for machines, sets, or dies..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '3rem', height: '3.5rem', fontSize: '1rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '140px', height: '3.5rem' }} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--white)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Disc size={16} /> Die Size Range (mm):
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="number" 
              step="0.01"
              className="input" 
              placeholder="Min" 
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              style={{ width: '100px', height: '2.5rem' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input 
              type="number" 
              step="0.01"
              className="input" 
              placeholder="Max" 
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              style={{ width: '100px', height: '2.5rem' }}
            />
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', height: '2.5rem', fontSize: '0.75rem' }}
            onClick={() => {
              setQuery('');
              setMinSize('');
              setMaxSize('');
              setResults(null);
            }}
          >
            Clear All
          </button>
        </div>
      </form>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Machine Section Skeleton */}
          <div>
            <h2 className="section-title flex-between">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={20} style={{ color: 'var(--text-muted)' }} /> Machines
              </span>
              <Skeleton width={32} height={20} />
            </h2>
            <div className="grid">
              {[1, 2].map((i) => (
                <div key={i} className="card" style={{ cursor: 'default' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <Skeleton width="50%" height="1.25rem" />
                    <Skeleton variant="circle" width={28} height={28} />
                  </div>
                  <Skeleton width="40%" height="0.875rem" />
                </div>
              ))}
            </div>
          </div>

          {/* Sets Section Skeleton */}
          <div>
            <h2 className="section-title flex-between">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} style={{ color: 'var(--text-muted)' }} /> Sets
              </span>
              <Skeleton width={32} height={20} />
            </h2>
            <div className="grid">
              {[1, 2].map((i) => (
                <div key={i} className="card" style={{ cursor: 'default' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <Skeleton width="60%" height="1.25rem" />
                    <Skeleton variant="circle" width={28} height={28} />
                  </div>
                  <Skeleton width="80%" height="0.875rem" style={{ marginBottom: '1rem' }} />
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                    <Skeleton width="50%" height="0.75rem" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dies Section Skeleton */}
          <div>
            <h2 className="section-title flex-between">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Disc size={20} style={{ color: 'var(--text-muted)' }} /> Dies
              </span>
              <Skeleton width={32} height={20} />
            </h2>
            <div className="grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ cursor: 'default' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <Skeleton width="40%" height="1.25rem" />
                    <Skeleton variant="circle" width={28} height={28} />
                  </div>
                  <Skeleton width="75%" height="0.875rem" />
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                    <Skeleton width="60%" height="0.75rem" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {results.machines.length > 0 && (
            <div>
              <h2 className="section-title flex-between">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={20} /> Machines
                </span>
                <span className="badge badge-neutral">{results.machines.length}</span>
              </h2>
              <div className="grid">
                {results.machines.map((m: any) => (
                  <div key={m.id} className="card" onClick={() => navigate(`/machines/${m.id}`)}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{m.name}</h3>
                      <div className="icon-wrapper icon-blue" style={{ padding: '0.5rem' }}>
                        <Cpu size={16} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> {m.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.sets.length > 0 && (
            <div>
              <h2 className="section-title flex-between">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} /> Sets
                </span>
                <span className="badge badge-neutral">{results.sets.length}</span>
              </h2>
              <div className="grid">
                {results.sets.map((s: any) => (
                  <div key={s.id} className="card" onClick={() => navigate(`/sets/${s.id}`)}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{s.name}</h3>
                      <div className="icon-wrapper icon-green" style={{ padding: '0.5rem' }}>
                        <Package size={16} />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{s.description}</p>
                    {s.machine && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <Cpu size={12} style={{ marginRight: '0.25rem' }} />
                        Assigned to: {s.machine.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.dies.length > 0 && (
            <div>
              <h2 className="section-title flex-between">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Disc size={20} /> Dies
                </span>
                <span className="badge badge-neutral">{results.dies.length}</span>
              </h2>
              <div className="grid">
                {results.dies.map((d: any) => (
                  <div key={d.id} className="card" style={{ cursor: 'default' }}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{d.size}</h3>
                      <div className="icon-wrapper icon-blue" style={{ padding: '0.5rem', background: 'var(--bg-main)' }}>
                        <Disc size={16} />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Die ID: {d.dieId} | Casing: {d.casing}</p>
                    
                    {d.set && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem' }}>
                          <div style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Package size={12} /> Set: {d.set.name}
                          </div>
                          {d.set.machine && (
                            <div style={{ color: 'var(--primary)', paddingLeft: '1rem', marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Cpu size={10} /> Machine: {d.set.machine.name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.machines.length === 0 && results.sets.length === 0 && results.dies.length === 0 && (
            <div className="empty-state">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
