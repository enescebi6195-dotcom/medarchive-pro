import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function UsersPage() {
  const [users, setUsers]   = useState([]);
  const [modal, setModal]   = useState(null); // null | 'add' | {user}
  const [form, setForm]     = useState({ username:'', full_name:'', email:'', password:'', role:'doctor', specialty:'' });
  const { user: me } = useAuthStore();

  useEffect(() => { getUsers().then(setUsers).catch(()=>{}); }, []);

  const openAdd = () => { setForm({ username:'', full_name:'', email:'', password:'', role:'doctor', specialty:'' }); setModal('add'); };
  const openEdit= (u) => { setForm({ username:u.username, full_name:u.full_name||'', email:u.email||'', password:'', role:u.role, specialty:u.specialty||'' }); setModal(u); };

  const save = async () => {
    try {
      if (modal === 'add') {
        const u = await createUser(form);
        setUsers(us => [...us, u]);
        toast.success('Kullanıcı eklendi');
      } else {
        const u = await updateUser(modal.id, { full_name:form.full_name, email:form.email, role:form.role, specialty:form.specialty });
        setUsers(us => us.map(x => x.id===u.id ? u : x));
        toast.success('Güncellendi');
      }
      setModal(null);
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const del = async (id, name) => {
    if (id === me?.id) { toast.error('Kendinizi silemezsiniz'); return; }
    if (!window.confirm(`${name} silinsin mi?`)) return;
    try { await deleteUser(id); setUsers(us=>us.filter(u=>u.id!==id)); toast.success('Silindi'); }
    catch { toast.error('Silinemedi'); }
  };

  const roleBadge = (r) => {
    if (r==='admin') return <span className="badge badge-red">Admin</span>;
    if (r==='doctor') return <span className="badge badge-blue">Doktor</span>;
    return <span className="badge badge-yellow">{r}</span>;
  };

  return (
    <div style={{ padding:32 }}>
      <div style={{ display:'flex', alignItems:'center', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, flex:1 }}>Kullanıcı Yönetimi</h1>
        <button className="btn-primary" onClick={openAdd}><UserPlus size={16}/> Kullanıcı Ekle</button>
      </div>
      <div className="card" style={{ padding:0 }}>
        <table>
          <thead><tr><th>Ad Soyad</th><th>Kullanıcı Adı</th><th>E-posta</th><th>Rol</th><th>Uzmanlık</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight:500 }}>{u.full_name||'—'}</td>
                <td style={{ color:'#7d8590' }}>{u.username}</td>
                <td style={{ color:'#7d8590', fontSize:13 }}>{u.email||'—'}</td>
                <td>{roleBadge(u.role)}</td>
                <td style={{ color:'#7d8590', fontSize:13 }}>{u.specialty||'—'}</td>
                <td>{u.is_active ? <span className="badge badge-green">Aktif</span> : <span className="badge badge-red">Pasif</span>}</td>
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn-secondary" style={{ padding:'4px 8px' }} onClick={()=>openEdit(u)}><Edit size={14}/></button>
                    {u.id !== me?.id && <button className="btn-danger" style={{ padding:'4px 8px' }} onClick={()=>del(u.id, u.full_name||u.username)}><Trash2 size={14}/></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" style={{ maxWidth:400, padding:28 }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontWeight:700, marginBottom:20 }}>{modal==='add' ? 'Kullanıcı Ekle' : 'Düzenle'}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {modal==='add' && <>
                <div><label style={{ fontSize:12, color:'#7d8590', display:'block', marginBottom:6 }}>Kullanıcı Adı *</label>
                  <input className="input" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} /></div>
                <div><label style={{ fontSize:12, color:'#7d8590', display:'block', marginBottom:6 }}>Şifre *</label>
                  <input className="input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
              </>}
              {[['full_name','Ad Soyad'],['email','E-posta']].map(([k,l]) => (
                <div key={k}><label style={{ fontSize:12, color:'#7d8590', display:'block', marginBottom:6 }}>{l}</label>
                  <input className="input" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
              ))}
              <div><label style={{ fontSize:12, color:'#7d8590', display:'block', marginBottom:6 }}>Rol</label>
                <select className="input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  {['admin','doctor','viewer'].map(r=><option key={r}>{r}</option>)}
                </select></div>
              <div><label style={{ fontSize:12, color:'#7d8590', display:'block', marginBottom:6 }}>Uzmanlık</label>
                <input className="input" value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))} placeholder="Radyoloji, Kardiyoloji..." /></div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={save}>Kaydet</button>
                <button className="btn-secondary" onClick={()=>setModal(null)}>İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
