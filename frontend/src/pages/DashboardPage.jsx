import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getPatients } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Users, Clock, CheckCircle, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: color + '22', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ color: '#7d8590', fontSize: 12 }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: '#7d8590', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats]     = useState(null);
  const [recent, setRecent]   = useState([]);
  const [pending, setPending] = useState([]);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getPatients({ page: 1, per_page: 8 }).then(d => setRecent(d.items || [])).catch(() => {});
    getPatients({ status: 'Bekliyor', per_page: 5 }).then(d => setPending(d.items || [])).catch(() => {});
  }, []);

  const statusBadge = (s) => {
    if (s === 'Tamamlandı') return <span className="badge badge-green">{s}</span>;
    if (s === 'Bekliyor')   return <span className="badge badge-yellow">{s}</span>;
    if (s === 'Hata')       return <span className="badge badge-red">{s}</span>;
    return <span className="badge badge-blue">{s}</span>;
  };

  return (
    <div style={{ padding: 32 }}>
      {/* Hoşgeldin */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3' }}>
          Hoş geldiniz, {user?.full_name || user?.username} 👋
        </h1>
        <p style={{ color: '#7d8590', marginTop: 4 }}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat kartları */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard icon={Users}         label="Toplam Hasta"    value={stats?.total_patients} color="#2f81f7" />
        <StatCard icon={TrendingUp}    label="Bu Ay"           value={stats?.this_month}     color="#a78bfa" />
        <StatCard icon={Clock}         label="Bekleyen"        value={stats?.pending}        color="#f7a034" />
        <StatCard icon={CheckCircle}   label="Tamamlanan"      value={stats?.completed}      color="#34c97a" />
        <StatCard icon={Activity}      label="Bugün Eklenen"   value={stats?.today}          color="#2f81f7" sub={`Bu hafta: ${stats?.this_week ?? 0}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Son hastalar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 600, fontSize: 14 }}>Son Eklenen Hastalar</h2>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => navigate('/patients')}>Tümünü Gör</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th><th>Tetkik</th><th>Ülke</th><th>Durum</th><th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(p => (
                <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                  <td style={{ fontWeight: 500 }}>{p.name} {p.surname}</td>
                  <td style={{ color: '#7d8590' }}>{p.study_type}</td>
                  <td style={{ color: '#7d8590' }}>{p.country || '—'}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td style={{ color: '#7d8590', fontSize: 12 }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : '—'}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7d8590', padding: 24 }}>Henüz hasta yok</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sağ panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bekleyen */}
          <div className="card">
            <h2 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="#f7a034" /> İndirme Bekleyen
            </h2>
            {pending.length === 0
              ? <p style={{ color: '#7d8590', fontSize: 13 }}>Bekleyen hasta yok ✓</p>
              : pending.map(p => (
                <div key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  style={{ padding: '8px 0', borderBottom: '1px solid #21262d', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name} {p.surname}</div>
                  <div style={{ fontSize: 11, color: '#7d8590' }}>{p.study_type} · {p.country}</div>
                </div>
              ))
            }
          </div>

          {/* Tetkik dağılımı */}
          {stats?.by_study_type?.length > 0 && (
            <div className="card">
              <h2 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Tetkik Dağılımı</h2>
              {stats.by_study_type.slice(0,6).map(item => {
                const pct = stats.total_patients ? Math.round(item.count / stats.total_patients * 100) : 0;
                return (
                  <div key={item.type} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{item.type || 'Diğer'}</span>
                      <span style={{ fontSize: 12, color: '#7d8590' }}>{item.count}</span>
                    </div>
                    <div style={{ height: 4, background: '#21262d', borderRadius: 2 }}>
                      <div style={{ height: 4, background: '#2f81f7', borderRadius: 2, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
