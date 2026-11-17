import React, { useState } from 'react';
import { changePassword } from '../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [pw, setPw] = useState({ old_password:'', new_password:'', confirm:'' });

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) { toast.error('Şifreler eşleşmiyor'); return; }
    if (pw.new_password.length < 4) { toast.error('En az 4 karakter'); return; }
    try {
      await changePassword({ old_password: pw.old_password, new_password: pw.new_password });
      toast.success('Şifre değiştirildi');
      setPw({ old_password:'', new_password:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  return (
    <div style={{ padding:32, maxWidth:500 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:24 }}>Ayarlar</h1>
      <div className="card" style={{ marginBottom:20 }}>
        <h3 style={{ fontWeight:600, marginBottom:12 }}>Profil Bilgileri</h3>
        <div style={{ display:'grid', gap:8 }}>
          {[['Kullanıcı Adı', user?.username], ['Ad Soyad', user?.full_name], ['Rol', user?.role], ['Uzmanlık', user?.specialty]].map(([l,v]) => (
            <div key={l} style={{ display:'flex', gap:12 }}>
              <span style={{ color:'#7d8590', width:120, flexShrink:0, fontSize:13 }}>{l}</span>
              <span style={{ fontSize:13 }}>{v || '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 style={{ fontWeight:600, marginBottom:16 }}>Şifre Değiştir</h3>
        <form onSubmit={handlePwChange} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['old_password','Mevcut Şifre'],['new_password','Yeni Şifre'],['confirm','Yeni Şifre (Tekrar)']].map(([k,l]) => (
            <div key={k}>
              <label style={{ display:'block', fontSize:12, color:'#7d8590', marginBottom:6 }}>{l}</label>
              <input className="input" type="password" value={pw[k]} onChange={e=>setPw(p=>({...p,[k]:e.target.value}))} />
            </div>
          ))}
          <button className="btn-primary" type="submit" style={{ justifyContent:'center' }}>Şifreyi Güncelle</button>
        </form>
      </div>
    </div>
  );
}
