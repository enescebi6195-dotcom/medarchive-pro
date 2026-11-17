import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, deletePatient } from '../utils/api';
import toast from 'react-hot-toast';
import { Search, UserPlus, Trash2, Eye, Filter } from 'lucide-react';

const STATUS_OPTIONS = ['', 'Bekliyor', 'Tamamlandı', 'Hata', 'Link Yok'];
const TYPE_OPTIONS   = ['', 'MRI', 'CT', 'PET/CT', 'X-Ray', 'Ultrason', 'Mamografi', 'Diğer'];
const PRIORITY_OPT   = ['', 'Acil', 'Yüksek', 'Normal'];

function statusBadge(s) {
  if (s === 'Tamamlandı') return <span className="badge badge-green">{s}</span>;
  if (s === 'Bekliyor')   return <span className="badge badge-yellow">{s}</span>;
  if (s === 'Hata')       return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-blue">{s || '—'}</span>;
}

function priorityBadge(p) {
  if (p === 'Acil')   return <span style={{ color: '#f75959', fontWeight: 700, fontSize: 12 }}>🔴 Acil</span>;
  if (p === 'Yüksek') return <span style={{ color: '#f7a034', fontWeight: 600, fontSize: 12 }}>🟡 Yüksek</span>;
  return <span style={{ color: '#7d8590', fontSize: 12 }}>Normal</span>;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [filters, setFilters]   = useState({ q: '', status: '', study_type: '', priority: '' });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const data = await getPatients(params);
      setPatients(data.items || []);
      setTotal(data.total || 0);
    } catch { toast.error('Yüklenemedi'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`${name} silinsin mi?`)) return;
    try {
      await deletePatient(id);
      toast.success('Silindi');
      load();
    } catch { toast.error('Silinemedi'); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, flex: 1 }}>Hastalar</h1>
        <span style={{ color: '#7d8590', fontSize: 13 }}>{total} hasta</span>
        <button className="btn-secondary" onClick={() => setShowFilters(f => !f)} style={{ fontSize: 13 }}>
          <Filter size={14} /> Filtrele
        </button>
        <button className="btn-primary" onClick={() => navigate('/patients/new')}>
          <UserPlus size={16} /> Yeni Hasta
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7d8590' }} />
        <input className="input" style={{ paddingLeft: 36 }}
          placeholder="Ad, soyad, TC, ülke, bölge..."
          value={filters.q}
          onChange={e => { setFilters(f => ({ ...f, q: e.target.value })); setPage(1); }}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { key: 'status',     opts: STATUS_OPTIONS, label: 'Durum' },
            { key: 'study_type', opts: TYPE_OPTIONS,   label: 'Tetkik' },
            { key: 'priority',   opts: PRIORITY_OPT,  label: 'Öncelik' },
          ].map(({ key, opts, label }) => (
            <select key={key} className="input" style={{ width: 150 }}
              value={filters[key]}
              onChange={e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(1); }}>
              <option value="">{label} (Hepsi)</option>
              {opts.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <button className="btn-secondary" style={{ fontSize: 12 }}
            onClick={() => { setFilters({ q:'', status:'', study_type:'', priority:'' }); setPage(1); }}>
            Sıfırla
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>T.C./Pasaport</th>
              <th>Ülke</th>
              <th>Tetkik</th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th>Tarih</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#7d8590' }}>Yükleniyor...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#7d8590' }}>Hasta bulunamadı</td></tr>
            ) : patients.map(p => (
              <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                <td style={{ fontWeight: 600 }}>{p.name} {p.surname}</td>
                <td style={{ color: '#7d8590', fontSize: 13 }}>{p.id_no || '—'}</td>
                <td style={{ color: '#7d8590', fontSize: 13 }}>{p.country || '—'}</td>
                <td style={{ fontSize: 13 }}>{p.study_type || '—'}</td>
                <td>{priorityBadge(p.priority)}</td>
                <td>{statusBadge(p.status)}</td>
                <td style={{ color: '#7d8590', fontSize: 12 }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }}
                      onClick={() => navigate(`/patients/${p.id}`)}>
                      <Eye size={14} />
                    </button>
                    <button className="btn-danger" style={{ padding: '4px 8px' }}
                      onClick={e => handleDelete(e, p.id, `${p.name} ${p.surname}`)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p-1)}>‹</button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const pg = page <= 4 ? i+1 : page - 3 + i;
            if (pg < 1 || pg > pages) return null;
            return (
              <button key={pg}
                className={page === pg ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px' }}
                onClick={() => setPage(pg)}>
                {pg}
              </button>
            );
          })}
          <button className="btn-secondary" disabled={page === pages} onClick={() => setPage(p => p+1)}>›</button>
        </div>
      )}
    </div>
  );
}
