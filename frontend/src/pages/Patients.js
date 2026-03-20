import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import PatientModal from '../components/PatientModal';

const COLORS = ['av-blue','av-teal','av-coral','av-purple','av-amber','av-green'];
function initials(name) { if (!name) return '?'; const c=[...name]; return /[\u4e00-\u9fff]/.test(c[0])?c.slice(0,2).join(''):c[0].toUpperCase(); }

export default function Patients({ onSelect }) {
  const { t } = useLang();
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([api.get(`/patients${q?`?q=${q}`:''}`), api.get('/stats')]);
    setPatients(pRes.data); setStats(sRes.data);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditPatient(null); setShowModal(true); };
  const openEdit = (e, p) => { e.stopPropagation(); setEditPatient(p); setShowModal(true); };
  const onSaved = () => { setShowModal(false); load(); };
  const deletePatient = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(t('deleteConfirm'))) return;
    await api.delete(`/patients/${id}`); load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">{t('patientList')}</div><div className="page-sub">{t('totalPatients')} {stats.total||0}</div></div>
        <button className="btn btn-primary" onClick={openNew}>{t('newPatient')}</button>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-num">{stats.total||0}</div><div className="stat-label">{t('totalPatients')}</div></div>
        <div className="stat-card"><div className="stat-num">{stats.withAllergy||0}</div><div className="stat-label">{t('withAllergy')}</div></div>
        <div className="stat-card"><div className="stat-num">{stats.todayTotal||0}</div><div className="stat-label">{t('todayVisits')}</div></div>
        <div className="stat-card"><div className="stat-num">{stats.todayDone||0}</div><div className="stat-label">{t('todayDone')}</div></div>
      </div>
      <div className="search-bar" style={{ marginBottom:16 }}>
        <span>🔍</span>
        <input placeholder={t('searchPatientPlaceholder')} value={q} onChange={e => setQ(e.target.value)} />
        {q && <button style={{ background:'none',border:'none',cursor:'pointer',color:'#888' }} onClick={() => setQ('')}>✕</button>}
      </div>
      {patients.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">{q ? t('noSearchResult') : t('noPatients')}</div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {patients.map((p, i) => (
            <div key={p.id} className="patient-card" onClick={() => onSelect(p)}>
              <div className={`avatar ${COLORS[i%COLORS.length]}`}>{initials(p.name)}</div>
              <div className="patient-info">
                <div className="patient-name">{p.name} <span style={{fontWeight:400,color:'#888',fontSize:12}}>{p.age}{t('years')} · {p.gender}</span></div>
                <div className="patient-sub">{p.name_original} · {p.phone}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                {p.allergies?.length>0 ? <span className="badge badge-red">⚠ {t('hasAllergy')} {p.allergies.length}</span> : <span className="badge badge-green">{t('noAllergy')}</span>}
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={e => openEdit(e, p)}>{t('edit')}</button>
                  <button className="btn btn-danger btn-sm" onClick={e => deletePatient(e, p.id)}>{t('delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && <PatientModal patient={editPatient} onClose={() => setShowModal(false)} onSaved={onSaved} />}
    </div>
  );
}
