import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, updatePatient, saveReport, addLinks, deleteLink, getPatientFiles, getComments, addComment, getTemplates, startDownload, getDownloadStatus, uploadFile, openPatientFile } from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Upload, Send, Save, Edit2, RefreshCw, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';

const STUDY_TYPES = ['MRI','CT','PET/CT','X-Ray','Ultrason','Mamografi','Diğer'];

function StatusBadge({ status }) {
  const map = { 'Tamamlandı':'badge-green','Bekliyor':'badge-yellow','Hata':'badge-red' };
  return <span className={`badge ${map[status]||'badge-blue'}`}>{status||'—'}</span>;
}

function fileIcon(f) {
  if(f.is_dicom) return '🔬';
  if(f.is_pdf)   return '📄';
  if(f.is_image) return '🖼️';
  if(['zip','rar','7z'].includes(f.ext)) return '📦';
  return '📎';
}

// Klasör satırı — tıklanınca açılır/kapanır
function FolderRow({ folder, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const dicomLabel = folder.dicom_count > 0 ? ` · ${folder.dicom_count} DICOM` : '';
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'10px 16px', borderBottom:'1px solid #21262d',
          cursor:'pointer', userSelect:'none',
          background: open ? '#161b22' : 'transparent',
          transition:'background 0.1s'
        }}
      >
        <span style={{color:'#e3a11a', fontSize:18}}>
          {open ? '📂' : '📁'}
        </span>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:600}}>{folder.display_name}</div>
          <div style={{fontSize:11, color:'#7d8590'}}>
            {folder.file_count} dosya · {folder.total_size_mb} MB{dicomLabel}
          </div>
        </div>
        <span style={{color:'#7d8590', fontSize:12}}>
          {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </span>
      </div>
      {open && (
        <div style={{background:'#0d1117'}}>
          {folder.files.map((f, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'8px 16px 8px 36px',
              borderBottom:'1px solid #161b22',
              fontSize:12
            }}>
              <span style={{fontSize:16}}>{fileIcon(f)}</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500}}>{f.name}</div>
                <div style={{color:'#7d8590', fontSize:11}}>{f.size_mb} MB</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient]       = useState(null);
  const [tab, setTab]               = useState(0);
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [files, setFiles]           = useState([]);
  const [folders, setFolders]       = useState([]);
  const [folderName, setFolderName] = useState('');
  const [comments, setComments]     = useState([]);
  const [newComment, setNewComment] = useState('');
  const [templates, setTemplates]   = useState([]);
  const [report, setReport]         = useState('');
  const [newLinks, setNewLinks]     = useState('');
  const [dlJob, setDlJob]           = useState(null);
  const [dlMessages, setDlMessages] = useState([]);
  const [dlDone, setDlDone]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingLink, setDeletingLink] = useState(null);
  const fileInput = useRef();
  const pollRef   = useRef();

  useEffect(() => { loadPatient(); getTemplates().then(setTemplates).catch(()=>{}); }, [id]);
  useEffect(() => { if(tab===1) loadFiles(); if(tab===4) loadComments(); }, [tab]);

  const loadPatient = async () => {
    try {
      const p = await getPatient(id);
      setPatient(p); setReport(p.report||'');
      setEditForm({ name:p.name, surname:p.surname, id_no:p.id_no||'', birth_date:p.birth_date||'',
        gender:p.gender||'Belirtilmedi', country:p.country||'', city:p.city||'',
        phone:p.phone||'', email:p.email||'', study_type:p.study_type||'MRI',
        study_date:p.study_date||'', study_body:p.study_body||'', referring:p.referring||'',
        notes:p.notes||'', priority:p.priority||'Normal' });
    } catch { toast.error('Hasta yüklenemedi'); }
  };

  const loadFiles = async () => {
    try {
      const d = await getPatientFiles(id);
      setFiles(d.files||[]);
      setFolders(d.folders||[]);
      if(d.folder_name) setFolderName(d.folder_name);
    } catch { setFiles([]); setFolders([]); }
  };

  const loadComments = async () => {
    try { setComments(await getComments(id)); } catch { setComments([]); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try { const p = await updatePatient(id,editForm); setPatient(p); setEditing(false); toast.success('Kaydedildi'); }
    catch { toast.error('Hata'); }
    finally { setSaving(false); }
  };

  const handleSaveReport = async () => {
    setSaving(true);
    try { await saveReport(id,report); toast.success('Rapor kaydedildi'); }
    catch { toast.error('Hata'); }
    finally { setSaving(false); }
  };

  const handleAddLinks = async () => {
    const links = newLinks.split('\n').map(l=>l.trim()).filter(Boolean);
    if(!links.length){ toast.error('Link giriniz'); return; }
    try { await addLinks(id,links); await loadPatient(); setNewLinks(''); toast.success(`${links.length} link eklendi`); }
    catch { toast.error('Hata'); }
  };

  const handleDeleteLink = async (index) => {
    if(!window.confirm('Bu linki silmek istediğinize emin misiniz?')) return;
    setDeletingLink(index);
    try { await deleteLink(id, index); await loadPatient(); toast.success('Link silindi'); }
    catch { toast.error('Link silinemedi'); }
    finally { setDeletingLink(null); }
  };

  const handleDownload = async (linksToDownload) => {
    const links = linksToDownload||(patient?.links||[]);
    if(!links.length){ toast.error('İndirilecek link yok'); return; }
    try {
      setDlMessages([]); setDlDone(false); setDlJob(null);
      const { job_id } = await startDownload({ patient_id:parseInt(id), links });
      setDlJob(job_id); toast('İndirme başlatıldı',{icon:'⬇️'});
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const s = await getDownloadStatus(job_id);
          setDlMessages(s.messages||[]);
          if(s.status==='done'){
            clearInterval(pollRef.current);
            setDlDone(true);
            toast.success('İndirme tamamlandı!');
            loadFiles(); loadPatient();
          }
        } catch { clearInterval(pollRef.current); }
      }, 2000);
    } catch { toast.error('İndirme başlatılamadı'); }
  };

  const handleUpload = async (e) => {
    for(const f of Array.from(e.target.files)){
      try {
        const result = await uploadFile(id,f);
        toast.success(result.extracted ? `${f.name} açıldı (${result.count} dosya)` : `${f.name} yüklendi`);
      } catch { toast.error(`${f.name} yüklenemedi`); }
    }
    loadFiles(); e.target.value='';
  };

  const handleOpenPdf = async (file) => {
    try {
      const blob = await openPatientFile(id, file.path);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('PDF açılamadı');
    }
  };

  // RadiAnt: klasör adını protocol handler'a gönder
  // DICOM_handler_kur.bat'taki Python, bu ismi Docker volume içinde arayıp RadiAnt'a tam yol verir
  const handleOpenDicom = async () => {
    let fName = folderName;
    if(!fName) {
      try {
        const d = await getPatientFiles(id);
        fName = d.folder_name;
        if(d.files) setFiles(d.files);
        if(d.folders) setFolders(d.folders);
      } catch {}
    }
    if(!fName) { toast.error('Henüz dosya klasörü oluşturulmadı'); return; }

    // Protocol handler'a klasör adını gönder
    // Python scripti → Docker volume içinde klasörü bulur → RadiAntViewer.exe "C:\...\klasör" çalıştırır
    window.location.href = `medarchive://dicom/${encodeURIComponent(fName)}`;

    toast(
      `RadiAnt açılıyor...\n\nKlasör: ${fName}\n\nAçılmazsa veya görüntüler gelmezse DICOM_handler_kur.bat'ı yeniden çalıştırın.`,
      { duration: 8000, icon: '🖥️' }
    );
  };

  const handleComment = async () => {
    if(!newComment.trim()) return;
    try { const c = await addComment(id,newComment.trim()); setComments(cs=>[...cs,c]); setNewComment(''); }
    catch { toast.error('Not eklenemedi'); }
  };

  const applyTemplate = (t) => {
    if(report&&!window.confirm('Mevcut rapor silinecek. Devam?')) return;
    setReport(t.content);
  };

  if(!patient) return <div style={{padding:32,color:'#7d8590',textAlign:'center'}}>Yükleniyor...</div>;

  const TABS = ['ℹ️ Bilgiler','📁 Dosyalar','📄 Raporlar','📝 Görüş','💬 Notlar'];
  const pdfFiles = files.filter(f=>f.is_pdf);
  const totalFiles = files.length;

  return (
    <div style={{padding:'24px 32px',maxWidth:1000,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <button className="btn-secondary" style={{padding:'6px 10px'}} onClick={()=>navigate(-1)}><ArrowLeft size={16}/></button>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <h1 style={{fontSize:20,fontWeight:700,margin:0}}>{patient.name} {patient.surname}</h1>
            <StatusBadge status={patient.status}/>
            {patient.priority==='Acil' && <span className="badge badge-red">🔴 Acil</span>}
            {patient.priority==='Yüksek' && <span className="badge badge-yellow">🟡 Yüksek</span>}
          </div>
          <div style={{fontSize:12,color:'#7d8590',marginTop:4}}>
            {[patient.country,patient.study_type,patient.study_body,patient.study_date].filter(Boolean).join(' · ')}
          </div>
        </div>
        {editing
          ? <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}><Save size={14}/>{saving?'...':'Kaydet'}</button>
              <button className="btn-secondary" onClick={()=>setEditing(false)}>İptal</button>
            </div>
          : <button className="btn-secondary" onClick={()=>setEditing(true)}><Edit2 size={14}/> Düzenle</button>
        }
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid #30363d',marginBottom:20,overflowX:'auto'}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:'10px 16px',background:'none',border:'none',
            borderBottom:tab===i?'2px solid #2f81f7':'2px solid transparent',
            color:tab===i?'#2f81f7':'#7d8590',cursor:'pointer',fontSize:13,
            fontWeight:tab===i?600:400,whiteSpace:'nowrap',transition:'all 0.15s'
          }}>{t}</button>
        ))}
      </div>

      {/* Tab 0: Bilgiler */}
      {tab===0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {editing ? (
            <>
              <div className="card">
                <h3 style={{fontSize:12,color:'#2f81f7',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>Kişisel Bilgiler</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[['name','Ad'],['surname','Soyad'],['id_no','T.C./Pasaport'],['birth_date','Doğum','date'],['country','Ülke'],['city','Şehir'],['phone','Telefon'],['email','E-posta','email']].map(([k,l,t='text'])=>(
                    <div key={k}><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>{l}</label><input className="input" type={t} value={editForm[k]||''} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))}/></div>
                  ))}
                  <div><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Cinsiyet</label>
                    <select className="input" value={editForm.gender} onChange={e=>setEditForm(f=>({...f,gender:e.target.value}))}>
                      {['Belirtilmedi','Erkek','Kadın','Diğer'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Öncelik</label>
                    <select className="input" value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))}>
                      {['Normal','Yüksek','Acil'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 style={{fontSize:12,color:'#2f81f7',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>Tetkik Bilgileri</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Tetkik Türü</label>
                    <select className="input" value={editForm.study_type} onChange={e=>setEditForm(f=>({...f,study_type:e.target.value}))}>
                      {STUDY_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Tetkik Tarihi</label><input className="input" type="date" value={editForm.study_date} onChange={e=>setEditForm(f=>({...f,study_date:e.target.value}))}/></div>
                  <div><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Bölge</label><input className="input" value={editForm.study_body} onChange={e=>setEditForm(f=>({...f,study_body:e.target.value}))}/></div>
                  <div><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Refere Eden</label><input className="input" value={editForm.referring} onChange={e=>setEditForm(f=>({...f,referring:e.target.value}))}/></div>
                </div>
                <div style={{marginTop:10}}><label style={{fontSize:11,color:'#7d8590',display:'block',marginBottom:4}}>Klinik Notlar</label>
                  <textarea className="input" style={{minHeight:80}} value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}/>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card">
                <h3 style={{fontSize:12,color:'#2f81f7',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>Kişisel Bilgiler</h3>
                {[['Ad Soyad',`${patient.name} ${patient.surname}`],['T.C./Pasaport',patient.id_no],['Doğum Tarihi',patient.birth_date],['Cinsiyet',patient.gender],['Ülke',patient.country],['Şehir',patient.city],['Telefon',patient.phone],['E-posta',patient.email]].map(([l,v])=>
                  v?<div key={l} style={{display:'flex',padding:'6px 0',borderBottom:'1px solid #21262d'}}>
                    <span style={{color:'#7d8590',width:120,flexShrink:0,fontSize:13}}>{l}</span>
                    <span style={{fontSize:13}}>{v}</span>
                  </div>:null)}
              </div>
              <div className="card">
                <h3 style={{fontSize:12,color:'#2f81f7',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>Tetkik Bilgileri</h3>
                {[['Tetkik Türü',patient.study_type],['Tetkik Tarihi',patient.study_date],['Bölge',patient.study_body],['Refere Eden',patient.referring],['Öncelik',patient.priority],['Durum',patient.status]].map(([l,v])=>
                  <div key={l} style={{display:'flex',padding:'6px 0',borderBottom:'1px solid #21262d'}}>
                    <span style={{color:'#7d8590',width:120,flexShrink:0,fontSize:13}}>{l}</span>
                    <span style={{fontSize:13}}>{v||'—'}</span>
                  </div>)}
                {patient.notes&&<div style={{marginTop:12}}>
                  <div style={{color:'#7d8590',fontSize:12,marginBottom:6}}>Klinik Notlar</div>
                  <div style={{fontSize:13,whiteSpace:'pre-wrap'}}>{patient.notes}</div>
                </div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 1: Dosyalar */}
      {tab===1 && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Aksiyon butonları */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button className="btn-primary" style={{background:'#7c3aed'}} onClick={handleOpenDicom}>
              🖥️ DICOM Aç (RadiAnt)
            </button>
            <button className="btn-primary" onClick={()=>handleDownload()}>
              <Download size={14}/> Yeniden İndir
            </button>
            <button className="btn-secondary" onClick={()=>fileInput.current?.click()}>
              <Upload size={14}/> Dosya Yükle
            </button>
            <button className="btn-secondary" onClick={loadFiles}>
              <RefreshCw size={14}/> Yenile
            </button>
            <input ref={fileInput} type="file" multiple style={{display:'none'}} onChange={handleUpload}/>
          </div>

          {/* Yeni Link Ekle */}
          <div className="card">
            <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>🔗 Yeni Link Ekle & İndir</div>
            <div style={{display:'flex',gap:10}}>
              <textarea
                className="input"
                style={{flex:1,minHeight:80,resize:'none'}}
                value={newLinks}
                onChange={e=>setNewLinks(e.target.value)}
                placeholder={"https://we.tl/...\nhttps://drive.google.com/..."}
              />
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <button className="btn-secondary" style={{fontSize:12,whiteSpace:'nowrap'}} onClick={handleAddLinks}>💾 Kaydet</button>
                <button className="btn-primary" style={{fontSize:12,whiteSpace:'nowrap'}} onClick={async()=>{
                  const links=newLinks.split('\n').map(l=>l.trim()).filter(Boolean);
                  if(!links.length){toast.error('Link giriniz');return;}
                  await addLinks(id,links); await loadPatient(); setNewLinks(''); handleDownload(links);
                }}>⬇️ & İndir</button>
              </div>
            </div>
          </div>

          {/* Kayıtlı Linkler */}
          {(patient.links||[]).length > 0 && (
            <div className="card">
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>📎 Kayıtlı Linkler</div>
              {(patient.links||[]).map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #21262d'}}>
                  <a href={l} target="_blank" rel="noreferrer"
                    style={{color:'#2f81f7',fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {l.slice(0,80)}{l.length>80?'...':''}
                  </a>
                  <button
                    title="Linki sil"
                    onClick={()=>handleDeleteLink(i)}
                    disabled={deletingLink===i}
                    style={{background:'none',border:'none',cursor:'pointer',color:'#f75959',padding:'2px 6px',borderRadius:4,flexShrink:0,opacity:deletingLink===i?0.5:1}}
                  ><Trash2 size={14}/></button>
                </div>
              ))}
              <button className="btn-primary" style={{marginTop:10,fontSize:12}} onClick={()=>handleDownload()}>
                <Download size={12}/> Hepsini İndir
              </button>
            </div>
          )}

          {/* İndirme durumu */}
          {dlJob && (
            <div className="card">
              <div style={{fontWeight:600,marginBottom:8,fontSize:13}}>
                {dlDone ? '✅ İndirme Tamamlandı' : '⬇️ İndiriliyor...'}
              </div>
              <div style={{background:'#0d1117',borderRadius:6,padding:10,maxHeight:200,overflowY:'auto',fontFamily:'monospace',fontSize:12}}>
                {dlMessages.map((m,i)=>(
                  <div key={i} style={{
                    color: m.includes('✅') ? '#34c97a'
                         : m.includes('❌') || m.includes('⚠️') ? '#f75959'
                         : m.includes('WeTransfer') || m.includes('otomatik') ? '#f0a500'
                         : '#7d8590',
                    padding:'1px 0'
                  }}>{m}</div>
                ))}
                {!dlDone && <div style={{color:'#2f81f7',marginTop:4}}>▋</div>}
              </div>
              {dlDone && (
                <div style={{marginTop:8,fontSize:12,color:'#7d8590'}}>
                  💡 WeTransfer linkleri indirilemezse: linki tarayıcıda açıp manuel indirin, sonra "Dosya Yükle" ile ekleyin.
                </div>
              )}
            </div>
          )}

          {/* Dosya listesi — KLASÖR BAZLI */}
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{
              padding:'10px 16px', borderBottom:'1px solid #21262d',
              fontSize:12, color:'#7d8590',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <span>{totalFiles} dosya · {folders.length} klasör</span>
              {folderName && (
                <span style={{fontFamily:'monospace',fontSize:11,color:'#e3a11a'}}>
                  📂 {folderName}
                </span>
              )}
            </div>

            {folders.length === 0 ? (
              <div style={{padding:32,textAlign:'center',color:'#7d8590'}}>
                Henüz dosya yok. Link ekleyip indirin veya dosya yükleyin.
              </div>
            ) : (
              folders.map((folder, i) => (
                <FolderRow
                  key={i}
                  folder={folder}
                  defaultOpen={folders.length === 1}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Raporlar */}
      {tab===2 && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',gap:10}}>
            <button className="btn-secondary" onClick={()=>fileInput.current?.click()}>
              <Upload size={14}/> PDF Yükle
            </button>
            <input ref={fileInput} type="file" accept=".pdf" multiple style={{display:'none'}} onChange={handleUpload}/>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {pdfFiles.length === 0
              ? <div style={{padding:32,textAlign:'center',color:'#7d8590'}}>PDF bulunamadı. Dosyalar indirilince veya PDF yükleyince burada görünür.</div>
              : pdfFiles.map((f,i)=>(
                <div
                  key={i}
                  onClick={() => handleOpenPdf(f)}
                  title="PDF aç"
                  style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #21262d',cursor:'pointer'}}
                >
                  <span style={{fontSize:28}}>📄</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,color:'#58a6ff'}}>{f.name}</div>
                    <div style={{fontSize:12,color:'#7d8590'}}>{f.size_mb} MB</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 3: Görüş */}
      {tab===3 && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:13,color:'#7d8590'}}>Şablon:</span>
            <select className="input" style={{width:220}} onChange={e=>{
              const t=templates.find(x=>x.id===parseInt(e.target.value));
              if(t)applyTemplate(t); e.target.value='';
            }}>
              <option value="">— Şablon Seç —</option>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn-primary" onClick={handleSaveReport} disabled={saving}>
              <Save size={14}/>{saving?'Kaydediliyor...':'Raporu Kaydet'}
            </button>
            {patient.report_date && (
              <span style={{fontSize:11,color:'#7d8590'}}>
                Son: {new Date(patient.report_date).toLocaleString('tr-TR')}
              </span>
            )}
          </div>
          <textarea
            className="input"
            style={{width:'100%',minHeight:500,resize:'vertical',fontFamily:'monospace',fontSize:13,lineHeight:1.7}}
            value={report}
            onChange={e=>setReport(e.target.value)}
            placeholder={"Radyolojik Bulgular:\n\nSonuç ve Görüş:\n\nÖneriler:"}
          />
        </div>
      )}

      {/* Tab 4: Notlar */}
      {tab===4 && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:500,overflowY:'auto'}}>
            {comments.length === 0
              ? <div style={{padding:24,textAlign:'center',color:'#7d8590'}}>Henüz not yok</div>
              : comments.map(c=>(
                <div key={c.id} className="card" style={{padding:'12px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontWeight:600,fontSize:13,color:'#2f81f7'}}>{c.username||'Kullanıcı'}</span>
                    <span style={{fontSize:11,color:'#7d8590'}}>{new Date(c.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                  <p style={{fontSize:13,whiteSpace:'pre-wrap',margin:0}}>{c.text}</p>
                </div>
              ))}
          </div>
          <div style={{display:'flex',gap:10}}>
            <textarea
              className="input"
              style={{flex:1,minHeight:80,resize:'none'}}
              value={newComment}
              onChange={e=>setNewComment(e.target.value)}
              onKeyDown={e=>{if(e.ctrlKey&&e.key==='Enter')handleComment();}}
              placeholder="Not ekle... (Ctrl+Enter ile gönder)"
            />
            <button className="btn-primary" style={{alignSelf:'flex-end',padding:'10px 16px'}} onClick={handleComment}>
              <Send size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
