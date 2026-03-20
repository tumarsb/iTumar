import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import QueueAddModal from '../components/QueueAddModal';
import { AnnouncementBanner } from '../components/Announcements';

export default function Queue({ user, onSelectPatient, onNewRecord }) {
  const { t } = useLang();
  const [queue, setQueue] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    const [qRes, sRes] = await Promise.all([api.get('/queue/today'), api.get('/stats')]);
    setQueue(qRes.data); setStats(sRes.data);
  }, []);

  useEffect(() => { load(); const ti = setInterval(load, 15000); return () => clearInterval(ti); }, [load]);

  const setStatus = async (id, status) => { await api.put(`/queue/${id}/status`, { status }); load(); };
  const remove = async (id) => { if (!window.confirm(t('deleteConfirm'))) return; await api.delete(`/queue/${id}`); load(); };

  const waiting = queue.filter(q => q.status === 'waiting');
  const inProgress = queue.filter(q => q.status === 'in_progress');
  const done = queue.filter(q => q.status === 'done');
  const today = new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  return (
    <div className="page">
      <AnnouncementBanner />
      <div className="page-header">
        <div><div className="page-title">{t('todayQueue')}</div><div className="page-sub">{today}</div></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('addPatientToQueue')}</button>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-num">{queue.length}</div><div className="stat-label">{t('registered')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:'#1565c0'}}>{inProgress.length}</div><div className="stat-label">{t('inProgress')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:'#888'}}>{waiting.length}</div><div className="stat-label">{t('waiting')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:'#2e7d32'}}>{done.length}</div><div className="stat-label">{t('done')}</div></div>
      </div>
      {inProgress.map(q => <QueueCard key={q.id} q={q} user={user} t={t} onStatus={setStatus} onRecord={onNewRecord} onView={onSelectPatient} onRemove={remove} />)}
      {waiting.length > 0 && (<div><div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', margin:'16px 0 8px' }}>{t('waiting')}</div><div className="queue-list">{waiting.map(q => <QueueCard key={q.id} q={q} user={user} t={t} onStatus={setStatus} onRecord={onNewRecord} onView={onSelectPatient} onRemove={remove} />)}</div></div>)}
      {done.length > 0 && (<div><div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', margin:'16px 0 8px' }}>{t('done')} ({done.length})</div><div className="queue-list">{done.map(q => <QueueCard key={q.id} q={q} user={user} t={t} onStatus={setStatus} onRecord={onNewRecord} onView={onSelectPatient} onRemove={remove} />)}</div></div>)}
      {queue.length === 0 && (<div className="empty-state"><div className="empty-state-icon">🏥</div><div className="empty-state-text">{t('noQueue')}</div></div>)}
      {showAdd && <QueueAddModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function QueueCard({ q, user, t, onStatus, onRecord, onView, onRemove }) {
  const isProgress = q.status === 'in_progress';
  const isDone = q.status === 'done';
  return (
    <div className={`queue-card ${isProgress ? 'in-progress' : ''} ${isDone ? 'done' : ''}`}>
      <div className={`queue-num ${isDone ? 'qn-done' : isProgress ? 'qn-progress' : 'qn-waiting'}`}>{isDone ? '✓' : q.queue_number}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:500 }}>{q.name}</span>
          <span style={{ fontSize:12, color:'#888' }}>{q.age}{t('years')} · {q.gender}</span>
          {q.allergies?.length > 0 && <span className="badge badge-red">{t('allergyWarning')}</span>}
          {isProgress && <span className="badge badge-blue">{t('inProgress')}</span>}
        </div>
        <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{q.name_original}</div>
        {q.notes && <div style={{ fontSize:12, color:'#666', marginTop:2 }}>{q.notes}</div>}
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {user.role !== 'nurse' && !isDone && (
          <>
            {!isProgress && <button className="btn btn-primary btn-sm" onClick={() => onStatus(q.id, 'in_progress')}>{t('startVisit')}</button>}
            {isProgress && (<>
              <button className="btn btn-purple btn-sm" onClick={() => onRecord({ id:q.patient_id, name:q.name, name_original:q.name_original, age:q.age, gender:q.gender, allergies:q.allergies, medical_history:q.medical_history, language:q.language })}>{t('addRecord')}</button>
              <button className="btn btn-success btn-sm" onClick={() => onStatus(q.id, 'done')}>{t('finishVisit')}</button>
            </>)}
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => onView({ id:q.patient_id, name:q.name, name_original:q.name_original, age:q.age, gender:q.gender, allergies:q.allergies, medical_history:q.medical_history })}>{t('viewRecord')}</button>
        <button className="btn btn-danger btn-sm" onClick={() => onRemove(q.id)}>{t('removeFromQueue')}</button>
      </div>
    </div>
  );
}
