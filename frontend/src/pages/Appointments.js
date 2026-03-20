import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import AppointmentModal from '../components/AppointmentModal';

export default function Appointments() {
  const { t, lang } = useLang();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;

  const load = useCallback(async () => {
    const res = await api.get(`/appointments?month=${monthStr}`);
    setAppointments(res.data);
  }, [monthStr]);

  useEffect(() => { load(); }, [load]);

  const DAY_KEYS = ['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat'];

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const getApptForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return appointments.filter(a => a.appointment_date === dateStr && a.status !== 'cancelled');
  };

  const today = new Date();
  const isToday = (day) => day && currentDate.getFullYear()===today.getFullYear() && currentDate.getMonth()===today.getMonth() && day===today.getDate();

  const openNew = (day) => {
    const d = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setSelectedDate(d); setEditAppt(null); setShowModal(true);
  };

  const cancelAppt = async (id) => {
    if (!window.confirm(t('cancelAppointment'))) return;
    await api.delete(`/appointments/${id}`); load();
  };

  const sendWa = async (id) => {
    const res = await api.get(`/appointments/${id}/wa-link`);
    if (!res.data.phone) { alert(t('noPhoneError')); return; }
    window.open(res.data.link, '_blank');
    await api.put(`/appointments/${id}`, { ...appointments.find(a=>a.id===id), wa_sent: true });
    load();
  };

  const monthLabel = currentDate.toLocaleDateString(
    lang==='ru'?'ru-RU':lang==='kk'?'kk-KZ':'zh-CN',
    { year:'numeric', month:'long' }
  );

  const statusColor = (s) => s==='done'?'#2e7d32':s==='cancelled'?'#aaa':'#1565c0';
  const statusBg = (s) => s==='done'?'#e8f5e9':s==='cancelled'?'#f5f5f5':'#e3f2fd';
  const statusLabel = (s) => s==='done'?t('done'):s==='cancelled'?t('cancelled'):t('scheduled');

  const upcoming = appointments.filter(a => a.appointment_date >= today.toISOString().split('T')[0] && a.status !== 'cancelled');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">📅 {t('appointments')}</div>
          <div className="page-sub">{t('thisMonth')} {appointments.filter(a=>a.status!=='cancelled').length} {t('appointmentsCount')}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedDate(today.toISOString().split('T')[0]); setEditAppt(null); setShowModal(true); }}>
          {t('newAppointment')}
        </button>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button className="btn btn-ghost" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
        <div style={{ fontSize:16, fontWeight:500, flex:1, textAlign:'center' }}>{monthLabel}</div>
        <button className="btn btn-ghost" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date())}>{t('today')}</button>
      </div>

      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8ecf0', overflow:'hidden', marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#f8f9fa', borderBottom:'1px solid #e8ecf0' }}>
          {DAY_KEYS.map((dk, i) => (
            <div key={i} style={{ padding:'10px 0', textAlign:'center', fontSize:12, fontWeight:500, color: i===0||i===6?'#e53935':'#888' }}>{t(dk)}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {getDaysInMonth().map((day, idx) => {
            const appts = getApptForDay(day);
            return (
              <div key={idx} onClick={() => day && openNew(day)}
                style={{ minHeight:90, padding:'6px 8px', borderRight:idx%7!==6?'1px solid #f0f0f0':'none', borderBottom:'1px solid #f0f0f0', cursor:day?'pointer':'default', background:isToday(day)?'#e8f0ff':day?'#fff':'#fafafa' }}>
                {day && (
                  <>
                    <div style={{ fontSize:13, fontWeight:isToday(day)?600:400, marginBottom:4 }}>
                      {isToday(day)
                        ? <span style={{ background:'#1f3864', color:'#fff', borderRadius:'50%', width:22, height:22, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{day}</span>
                        : day}
                    </div>
                    {appts.slice(0,3).map(a => (
                      <div key={a.id} onClick={e => { e.stopPropagation(); setEditAppt(a); setSelectedDate(a.appointment_date); setShowModal(true); }}
                        style={{ fontSize:10, padding:'2px 5px', borderRadius:4, marginBottom:2, background:statusBg(a.status), color:statusColor(a.status), overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', cursor:'pointer' }}>
                        {a.appointment_time} {a.name}
                      </div>
                    ))}
                    {appts.length>3 && <div style={{ fontSize:10, color:'#888' }}>+{appts.length-3}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a2e', marginBottom:10 }}>{t('upcomingAppointments')}</div>
      {upcoming.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-text">{t('noAppointments')}</div></div>
        : upcoming.slice(0,10).map(a => (
          <div key={a.id} style={{ background:'#fff', border:'1px solid #e8ecf0', borderRadius:10, padding:'12px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ textAlign:'center', minWidth:50 }}>
              <div style={{ fontSize:11, color:'#888' }}>{a.appointment_date.slice(5)}</div>
              <div style={{ fontSize:15, fontWeight:500, color:'#1f3864' }}>{a.appointment_time}</div>
            </div>
            <div style={{ width:1, height:36, background:'#e8ecf0' }}></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{a.name}</div>
              <div style={{ fontSize:12, color:'#888' }}>{a.name_original}{a.notes?` · ${a.notes}`:''}</div>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:statusBg(a.status), color:statusColor(a.status) }}>{statusLabel(a.status)}</span>
              {!a.wa_sent && <button className="btn btn-success btn-sm" onClick={() => sendWa(a.id)}>📲 WA</button>}
              {a.wa_sent && <span style={{ fontSize:11, color:'#2e7d32' }}>✓ WA</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditAppt(a); setSelectedDate(a.appointment_date); setShowModal(true); }}>{t('edit')}</button>
              <button className="btn btn-danger btn-sm" onClick={() => cancelAppt(a.id)}>{t('cancel')}</button>
            </div>
          </div>
        ))
      }

      {showModal && <AppointmentModal appointment={editAppt} defaultDate={selectedDate} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
