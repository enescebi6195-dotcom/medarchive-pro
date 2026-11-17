import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Bilgileri doldurun'); return; }
    setLoading(true);
    try {
      const data = await login(username, password);
      setAuth(data.user, data.access_token);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0d1117',
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 380,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏥</div>
          <h1 style={{ color: '#2f81f7', fontWeight: 700, fontSize: 22 }}>MedArchive Pro</h1>
          <p style={{ color: '#7d8590', fontSize: 13, marginTop: 4 }}>Hasta Görüntü Yönetim Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: '#7d8590', fontSize: 12, marginBottom: 6 }}>
              Kullanıcı Adı
            </label>
            <input
              className="input" value={username} autoFocus
              onChange={e => setUsername(e.target.value)}
              placeholder="Kullanıcı adınız"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#7d8590', fontSize: 12, marginBottom: 6 }}>
              Şifre
            </label>
            <input
              className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}
            style={{ marginTop: 8, justifyContent: 'center', padding: '10px' }}>
            {loading ? '⏳ Giriş yapılıyor...' : '🔑  Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#3d444d', fontSize: 11, marginTop: 24 }}>
        </p>
      </div>
    </div>
  );
}
