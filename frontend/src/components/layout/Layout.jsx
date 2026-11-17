import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Home, Users, UserPlus, BarChart2, FileText,
  Settings, LogOut, Menu, X, Shield, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/',          icon: Home,      label: 'Ana Sayfa',    exact: true },
  { to: '/patients',  icon: Users,     label: 'Hastalar' },
  { to: '/patients/new', icon: UserPlus, label: 'Yeni Hasta' },
  { to: '/stats',     icon: BarChart2, label: 'İstatistikler' },
  { to: '/templates', icon: FileText,  label: 'Şablonlar' },
  { to: '/settings',  icon: Settings,  label: 'Ayarlar' },
];

const adminItems = [
  { to: '/users', icon: Shield, label: 'Kullanıcılar' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ background: '#0d1117', display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 220 : 64,
        minWidth: sidebarOpen ? 220 : 64,
        background: '#0d1117',
        borderRight: '1px solid #21262d',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          height: 64, borderBottom: '1px solid #21262d',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 10,
          background: '#161b22',
        }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          {sidebarOpen && (
            <span style={{ color: '#2f81f7', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
              MedArchive Pro
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7d8590', cursor: 'pointer' }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? label : ''}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div style={{
                padding: '12px 18px 4px',
                fontSize: 10, fontWeight: 700,
                color: '#3d444d', textTransform: 'uppercase',
                letterSpacing: '0.8px'
              }}>
                {sidebarOpen ? 'Yönetim' : '—'}
              </div>
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to} to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title={!sidebarOpen ? label : ''}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info */}
        <div style={{ borderTop: '1px solid #21262d', padding: '12px 16px' }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#1f3558', color: '#2f81f7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {(user?.full_name || user?.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || user?.username}
                </div>
                <div style={{ fontSize: 11, color: '#7d8590' }}>{user?.role}</div>
              </div>
              <button onClick={handleLogout} title="Çıkış"
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7d8590', cursor: 'pointer' }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} title="Çıkış"
              style={{ background: 'none', border: 'none', color: '#7d8590', cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
