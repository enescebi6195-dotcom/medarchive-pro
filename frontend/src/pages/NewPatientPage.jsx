import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient, startDownload } from '../utils/api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const STUDY_TYPES = ['MRI','CT','PET/CT','X-Ray','Ultrason','Mamografi','Diğer'];
const GENDERS = ['Belirtilmedi','Erkek','Kadın','Diğer'];

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#2f81f7', textTransform: 'uppercase', letterSpacing: '0.8px', paddingBottom: 8, borderBottom: '1px solid #21262d', marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#7d8590', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name:'', surname:'', id_no:'', birth_date:'', gender:'Belirtilmedi',
    country:'', city:'', phone:'', email:'',
    study_type:'MRI', study_date: new Date().toISOString().split('T')[0],
    study_body:'', referring:'', notes:'', links_text:'', priority:'Normal',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.surname) { toast.error('Ad ve Soyad zorunludur'); return; }
    setLoading(true);
    try {
      const links = form.links_text.split('\n').map(l=>l.trim()).filter(Boolean);
      const patient = await createPatient({ ...form, links, links_text: undefined });
      toast.success(`${patient.name} ${patient.surname} eklendi!`);
      if (links.length > 0 && window.confirm('Dosyalar hemen indirilsin mi?')) {
        await startDownload({ patient_id: patient.id, links });
        toast('İndirme başlatıldı', { icon: '⬇️' });
      }
      navigate(`/patients/${patient.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Kaydedilemedi');
    } finally { setLoading(false); }
  };

  const inputProps = (key, type='text') => ({
    className: 'input', type, value: form[key],
    onChange: e => set(key, e.target.value),
  });

  return (
    <div style={{ padding: 32, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Yeni Hasta Kaydı</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Sol */}
          <div>
            <Section title="Kişisel Bilgiler">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Ad *"><input {...inputProps('name')} placeholder="Ad" /></Field>
                <Field label="Soyad *"><input {...inputProps('surname')} placeholder="Soyad" /></Field>
                <Field label="T.C. / Pasaport No"><input {...inputProps('id_no')} placeholder="TC veya pasaport" /></Field>
                <Field label="Doğum Tarihi"><input {...inputProps('birth_date','date')} /></Field>
                <Field label="Cinsiyet">
                  <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Öncelik">
                  <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    {['Normal','Yüksek','Acil'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Ülke"><input {...inputProps('country')} placeholder="Ülke" /></Field>
                <Field label="Şehir"><input {...inputProps('city')} placeholder="Şehir" /></Field>
                <Field label="Telefon"><input {...inputProps('phone')} placeholder="+90..." /></Field>
                <Field label="E-posta"><input {...inputProps('email','email')} placeholder="email@..." /></Field>
              </div>
            </Section>

            <Section title="Tetkik Bilgileri">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Tetkik Türü">
                  <select className="input" value={form.study_type} onChange={e => set('study_type', e.target.value)}>
                    {STUDY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Tetkik Tarihi"><input {...inputProps('study_date','date')} /></Field>
                <Field label="Bölge"><input {...inputProps('study_body')} placeholder="Beyin, Karın..." /></Field>
                <Field label="Refere Eden"><input {...inputProps('referring')} placeholder="Doktor / Kurum" /></Field>
              </div>
            </Section>
          </div>

          {/* Sağ */}
          <div>
            <Section title="Görüntü Linkleri">
              <p style={{ fontSize: 12, color: '#7d8590', marginBottom: 8 }}>
                WeTransfer, Google Drive, Dropbox, OneDrive veya direkt link — her satıra bir tane
              </p>
              <textarea className="input" style={{ minHeight: 120 }}
                value={form.links_text}
                onChange={e => set('links_text', e.target.value)}
                placeholder={"https://we.tl/...\nhttps://drive.google.com/...\nhttps://wetransfer.com/..."}
              />
            </Section>

            <Section title="Klinik Notlar">
              <textarea className="input" style={{ minHeight: 100 }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Klinik bilgiler, şikayetler, ön tanı..."
              />
            </Section>

            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}>
              <Save size={18} />
              {loading ? 'Kaydediliyor...' : 'Hastayı Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
