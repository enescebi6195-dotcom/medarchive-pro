import React, { useEffect, useState } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState({ name:'', content:'', specialty:'', is_shared:true });

  useEffect(() => { getTemplates().then(setTemplates).catch(()=>{}); }, []);

  const select = (t) => { setSelected(t); setForm({ name:t.name, content:t.content, specialty:t.specialty||'', is_shared:t.is_shared }); };
  const newTpl = () => { setSelected(null); setForm({ name:'', content:'Radyolojik Bulgular:\n\nSonuç ve Görüş:\n\nÖneriler:', specialty:'', is_shared:true }); };

  const save = async () => {
    if (!form.name) { toast.error('Ad boş olamaz'); return; }
    try {
      if (selected) {
        const u = await updateTemplate(selected.id, form);
        setTemplates(ts => ts.map(t => t.id===u.id ? u : t));
      } else {
        const n = await createTemplate(form);
        setTemplates(ts => [...ts, n]);
        setSelected(n);
      }
      toast.success('Kaydedildi');
    } catch { toast.error('Hata'); }
  };

  const del = async (id) => {
    if (!window.confirm('Silinsin mi?')) return;
    try { await deleteTemplate(id); setTemplates(ts=>ts.filter(t=>t.id!==id)); setSelected(null); setForm({name:'',content:'',specialty:'',is_shared:true}); toast.success('Silindi'); }
    catch { toast.error('Silinemedi'); }
  };

  return (
    <div style={{ padding:32, display:'flex', gap:20, height:'calc(100vh - 64px)' }}>
      <div style={{ width:240, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <h2 style={{ fontWeight:600 }}>Şablonlar</h2>
          <button className="btn-primary" style={{ padding:'6px 10px' }} onClick={newTpl}><Plus size={14}/></button>
        </div>
        <div className="card" style={{ padding:4 }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => select(t)} style={{
              padding:'10px 12px', borderRadius:6, cursor:'pointer',
              background: selected?.id===t.id ? '#1f3558' : 'transparent',
              color: selected?.id===t.id ? '#58a6ff' : '#e6edf3',
              borderLeft: selected?.id===t.id ? '3px solid #2f81f7' : '3px solid transparent',
            }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{t.name}</div>
              {t.specialty && <div style={{ fontSize:11, color:'#7d8590' }}>{t.specialty}</div>}
            </div>
          ))}
          {templates.length===0 && <p style={{ padding:12, color:'#7d8590', fontSize:13 }}>Şablon yok</p>}
        </div>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input className="input" style={{ flex:1 }} placeholder="Şablon adı" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <input className="input" style={{ width:160 }} placeholder="Uzmanlık" value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))} />
          <button className="btn-primary" onClick={save}><Save size={14}/> Kaydet</button>
          {selected && <button className="btn-danger" style={{ padding:'8px 10px' }} onClick={()=>del(selected.id)}><Trash2 size={14}/></button>}
        </div>
        <textarea className="input" style={{ flex:1, resize:'none', fontFamily:'monospace', fontSize:13, lineHeight:1.6 }}
          value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}
          placeholder="Şablon içeriğini buraya yazın..." />
      </div>
    </div>
  );
}
