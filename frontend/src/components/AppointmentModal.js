import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

export default function AppointmentModal({ appointment, defaultDate, onClose, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    patient_id: appointment?.patient_id || '',
    appointment_date: appointment?.appointment_date || defaultDate || new Date().toISOString().split('T')[0],
    appointment_time: appointment?.appointment_time || '',
    duration_minutes: appointment?.duration_minutes || 30,
    status: appointment?.status || 'scheduled',
    notes: appointment?.notes || '',
  });
  const [slots, setSlots] = useState([]);
  const [patientSearch, setPatientSearch] = useState(appointment?.name || '');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(appointment ? { id: appointment.patient_id, name: appointment.name } : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (form.appointment_date) {
      api.get(`/appointments/slots/${form.appointment_date}`).then(r => setSlots(r.data)).catch(() => {});
    }
  }, [form.appointment_date]);

  useEffect(() => {
    if (patientSearch.length < 1) { setPatients([]); return; }
    const ti = setTimeout(async () => {
      const res = await api.get(`/patients?q=${patientSearch}`);
      setPatients(res.data.slice(0, 6));
    }, 300);
    return () => clearTimeout(ti);
  }, [patientSearch]);

  const save = async () => {
    if (!selectedPatient) { setError('请选择病人'); return; }
    if (!form.appointment_time) { setError('请选择时间'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, patient_id: selectedPatient.id };
      if (appointment?.id) await api.put(`/appointments/${appointment.id}`, payload);
      else await api.post('/appointments', payload);
      onSaved();
    } catch (e) { setError(e.response?.data?.error || '保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">📅 {appointment ? '编辑预约' : '新建预约'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}

        {/* Patient search */}
        <div className="form-group">
          <label className="form-label">病人 *</label>
          {!selectedPatient ? (
            <>
              <input className="form-input" value={patientSearch} onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }} placeholder="搜索病人姓名或电话..." autoFocus />
              {patients.length > 0 && (
                <div style={{ border:'1px solid #ddd', borderRadius:8, overflow:'hidden', marginTop:4 }}>
                  {patients.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); setPatients([]); }} style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontWeight:500 }}>{p.name}</span>
                      <span style={{ color:'#888', fontSize:11 }}>{p.age}岁 · {p.phone}</span>
                      {p.allergies?.length > 0 && <span className="badge badge-red" style={{ marginLeft:'auto' }}>⚠ 过敏</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0f4ff', padding:'8px 12px', borderRadius:8 }}>
              <span style={{ fontSize:14, fontWeight:500, flex:1 }}>{selectedPatient.name}</span>
              <button style={{ background:'none', border:'none', cursor:'pointer', color:'#888' }} onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}>✕</button>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">预约日期 *</label>
            <input className="form-input" type="date" value={form.appointment_date} onChange={e => setForm({...form, appointment_date: e.target.value, appointment_time: ''})} />
          </div>
          <div className="form-group">
            <label className="form-label">时长</label>
            <select className="form-select" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: Number(e.target.value)})}>
              <option value={15}>15分钟</option>
              <option value={30}>30分钟</option>
              <option value={45}>45分钟</option>
              <option value={60}>60分钟</option>
            </select>
          </div>
        </div>

        {/* Time slots */}
        <div className="form-group">
          <label className="form-label">预约时间 *</label>
          {slots.length === 0 ? (
            <div style={{ fontSize:12, color:'#888', padding:'8px 0' }}>该日期无可用时间段（休息日）</div>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {slots.map(s => (
                <button key={s.id} onClick={() => setForm({...form, appointment_time: s.start_time})}
                  disabled={s.booked && form.appointment_time !== s.start_time}
                  style={{ padding:'6px 12px', borderRadius:8, border:'1px solid', fontSize:12, cursor: s.booked && form.appointment_time !== s.start_time ? 'not-allowed' : 'pointer',
                    background: form.appointment_time === s.start_time ? '#1f3864' : s.booked ? '#f5f5f5' : '#fff',
                    color: form.appointment_time === s.start_time ? '#fff' : s.booked ? '#bbb' : '#333',
                    borderColor: form.appointment_time === s.start_time ? '#1f3864' : s.booked ? '#eee' : '#ddd',
                    textDecoration: s.booked && form.appointment_time !== s.start_time ? 'line-through' : 'none',
                  }}>
                  {s.start_time}
                </button>
              ))}
            </div>
          )}
        </div>

        {appointment && (
          <div className="form-group">
            <label className="form-label">状态</label>
            <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="scheduled">已预约</option>
              <option value="done">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">备注</label>
          <input className="form-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="例：复诊、特殊需求等" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存预约'}</button>
        </div>
      </div>
    </div>
  );
}
