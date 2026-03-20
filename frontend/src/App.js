import React, { useState, useEffect } from 'react';
import api from './api';
import { useLang, LangSwitcher } from './LangContext';
import Login from './pages/Login';
import Patients from './pages/Patients';
import Queue from './pages/Queue';
import PatientDetail from './pages/PatientDetail';
import NewRecord from './pages/NewRecord';
import Medicines from './pages/Medicines';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import Appointments from './pages/Appointments';
import Payments from './pages/Payments';
import Dashboard from './pages/Dashboard';
import TumarBranding from './components/TumarBranding';
import './App.css';

export default function App() {
  const { t } = useLang();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('queue');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [recordingFor, setRecordingFor] = useState(null);
  const [branding, setBranding] = useState({ clinic_name:'', clinic_logo:'⚕️' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    api.get('/settings/public').then(r => setBranding(r.data)).catch(() => {});
  }, []);

  const logout = () => { localStorage.clear(); setUser(null); };
  const navigate = (p, data=null) => {
    setPage(p);
    if (p === 'patient') setSelectedPatient(data);
    if (p === 'new-record') setRecordingFor(data);
  };

  if (!user) return <Login onLogin={u => { setUser(u); setPage('queue'); }} branding={branding} />;

  const navItems = [
    { id:'queue',        label: t('todayClinic'),           icon:'🏥', short:'坐诊', roles:['doctor','nurse','superadmin'] },
    { id:'appointments', label: t('appointments')||'预约日历', icon:'📅', short:'预约', roles:['doctor','nurse','superadmin'] },
    { id:'patients',     label: t('patientRecords'),         icon:'👥', short:'病人', roles:['doctor','superadmin'] },
    { id:'medicines',    label: t('medicineManager'),        icon:'💊', short:'药品', roles:['doctor','superadmin'] },
    { id:'payments',     label: t('payments')||'收费管理',   icon:'💰', short:'收费', roles:['doctor','superadmin'] },
    { id:'dashboard',    label: t('dashboard')||'数据统计',  icon:'📊', short:'统计', roles:['doctor','superadmin'] },
    { id:'settings',     label: t('whatsappSettings'),       icon:'📲', short:'WA', roles:['doctor','superadmin'] },
    { id:'superadmin',   label: t('superAdmin'),              icon:'🔐', short:'管理', roles:['superadmin'] },
  ];

  const roleLabel = user.role==='superadmin'?t('superadmin'):user.role==='doctor'?t('doctor'):t('nurse');

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">{branding.clinic_logo || '⚕'}</div>
          <div>
            <div className="brand-name">{branding.clinic_name || t('appName')}</div>
            <div className="brand-sub">{t('appName')}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.filter(n => n.roles.includes(user.role)).map(n => (
            <button key={n.id} className={`nav-btn ${page===n.id?'active':''}`} onClick={() => navigate(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label-full">{n.label}</span>
              <span className="nav-label-short" style={{display:'none'}}>{n.short||n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ paddingBottom:10 }}><LangSwitcher /></div>
          <div className="user-info">
            <div className="user-avatar">{user.name[0]}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>{t('logout')}</button>
          <TumarBranding dark={true} />
        </div>
      </aside>

      <main className="main-content">
        {page==='queue'        && <Queue user={user} onSelectPatient={p=>navigate('patient',p)} onNewRecord={p=>navigate('new-record',p)} />}
        {page==='appointments' && <Appointments />}
        {page==='patients'     && <Patients onSelect={p=>navigate('patient',p)} />}
        {page==='patient'      && <PatientDetail patient={selectedPatient} onBack={()=>navigate('patients')} onNewRecord={p=>navigate('new-record',p)} />}
        {page==='new-record'   && <NewRecord patient={recordingFor} onBack={()=>navigate('patient',recordingFor)} onSaved={()=>navigate('patient',recordingFor)} />}
        {page==='medicines'    && <Medicines />}
        {page==='payments'     && <Payments />}
        {page==='dashboard'    && <Dashboard />}
        {page==='settings'     && <Settings />}
        {page==='superadmin'   && <SuperAdmin />}
      </main>
    </div>
  );
}
