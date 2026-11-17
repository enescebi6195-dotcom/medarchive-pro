import React, { useEffect, useState } from 'react';
import { getStats } from '../utils/api';

export default function StatsPage() {
  const [s, setS] = useState(null);
  useEffect(() => { getStats().then(setS).catch(() => {}); }, []);
  if (!s) return <div style={{ padding:32, color:'#7d8590' }}>Yükleniyor...</div>;
  return (
    <div style={{ padding:32 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:24 }}>İstatistikler</h1>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:28 }}>
        {[
          ['Toplam Hasta', s.total_patients, '#2f81f7'],
          ['Bugün', s.today, '#34c97a'],
          ['Bu Hafta', s.this_week, '#a78bfa'],
          ['Bu Ay', s.this_month, '#f7a034'],
          ['Tamamlanan', s.completed, '#34c97a'],
          ['Bekleyen', s.pending, '#f7a034'],
        ].map(([l,v,c]) => (
          <div key={l} className="card" style={{ minWidth:130 }}>
            <div style={{ fontSize:32, fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontSize:12, color:'#7d8590', marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card">
          <h3 style={{ fontWeight:600, marginBottom:16 }}>Tetkik Türü Dağılımı</h3>
          <table><thead><tr><th>Tür</th><th>Sayı</th><th>Oran</th></tr></thead>
          <tbody>{s.by_study_type.map(r => (
            <tr key={r.type}>
              <td>{r.type}</td><td>{r.count}</td>
              <td>{s.total_patients ? Math.round(r.count/s.total_patients*100)+'%' : '—'}</td>
            </tr>
          ))}</tbody></table>
        </div>
        <div className="card">
          <h3 style={{ fontWeight:600, marginBottom:16 }}>Ülke Dağılımı</h3>
          <table><thead><tr><th>Ülke</th><th>Sayı</th></tr></thead>
          <tbody>{s.by_country.map(r => (
            <tr key={r.country}><td>{r.country}</td><td>{r.count}</td></tr>
          ))}</tbody></table>
        </div>
        <div className="card">
          <h3 style={{ fontWeight:600, marginBottom:16 }}>Kullanıcı Bazlı</h3>
          <table><thead><tr><th>Kullanıcı</th><th>Hasta</th></tr></thead>
          <tbody>{s.by_user.map(r => (
            <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>
          ))}</tbody></table>
        </div>
        <div className="card">
          <h3 style={{ fontWeight:600, marginBottom:16 }}>Son Aktiviteler</h3>
          {s.recent_activity.slice(0,8).map((a,i) => (
            <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid #21262d', fontSize:12 }}>
              <span style={{ color:'#2f81f7' }}>{a.action}</span>
              <span style={{ color:'#7d8590', marginLeft:8 }}>{a.detail}</span>
              <div style={{ color:'#3d444d', fontSize:11 }}>{new Date(a.created_at).toLocaleString('tr-TR')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
