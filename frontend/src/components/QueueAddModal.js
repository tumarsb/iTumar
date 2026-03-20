import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

export default function QueueAddModal({ onClose, onAdded }) {
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (q.length < 1) { setPatients([]); return; }
    const ti = setTimeout(async () => { const res = await api.get(`/patients?q=${q}`); setPatients(res.data.slice(0, 8)); }, 300);
    return () => clearTimeout(ti);
  }, [q]);

  const add = async () => {
    if (!selected) return;
    setAdding(true);
    try { await api.post('/queue', { patient_id: selected.id, notes }); onAdded(); }
    catch (e) { alert(e.response?.data?.error || t('error')); }
    finally { setAdding(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">{t('addToQueue')}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">{t('search')}</label>
          <input className="form-input" value={q} onChange={e => { setQ(e.target.value); setSelected(null); }} placeholder={t('searchPatient')} autoFocus />
        </div>
        {patients.length > 0 && !selected && (
          <div style={{ border:'1px solid #ddd', borderRadius:8, overflow:'hidden', marginBottom:14 }}>
            {patients.map(p => (
              <div key={p.id} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:12 }} onClick={() => { setSelected(p); setQ(p.name); setPatients([]); }}>
                <div><div style={{ fontSize:13, fontWeight:500 }}>{p.name} <span style={{color:'#888',fontWeight:400}}>{p.age}{t('years')}</span></div><div style={{ fontSize:12, color:'#888' }}>{p.name_original}</div></div>
                {p.allergies?.length > 0 && <span className="badge badge-red" style={{marginLeft:'auto'}}>{t('allergyWarning')}</span>}
              </div>
            ))}
          </div>
        )}
        {selected && (
          <div style={{ background:'#f0f4ff', borderRadius:8, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:500 }}>{selected.name}</div><div style={{ fontSize:12, color:'#888' }}>{selected.age}{t('years')} · {selected.gender}</div></div>
            {selected.allergies?.length > 0 && <span className="badge badge-red">{t('allergyWarning')} {selected.allergies.length}</span>}
            <button style={{ background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:18 }} onClick={() => { setSelected(null); setQ(''); }}>×</button>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">{t('queueNotes')}</label>
          <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('queueNotesPlaceholder')} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={add} disabled={!selected || adding}>{adding ? t('saving') : t('addToQueueBtn')}</button>
        </div>
      </div>
    </div>
  );
}
