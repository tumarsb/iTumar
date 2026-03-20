import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

export default function PaymentModal({ payment, onClose, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    patient_id: payment?.patient_id || '',
    amount: payment?.amount || '',
    currency: payment?.currency || 'KZT',
    method: payment?.method || 'cash',
    status: payment?.status || 'paid',
    description: payment?.description || '',
    visit_date: payment?.visit_date || new Date().toISOString().split('T')[0],
  });
  const [patientSearch, setPatientSearch] = useState(payment?.name || '');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(payment ? { id: payment.patient_id, name: payment.name } : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    if (!form.amount || Number(form.amount) <= 0) { setError('请填写金额'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, patient_id: selectedPatient.id, amount: Number(form.amount) };
      if (payment?.id) await api.put(`/payments/${payment.id}`, payload);
      else await api.post('/payments', payload);
      onSaved();
    } catch (e) { setError(e.response?.data?.error || '保存失败'); }
    finally { setSaving(false); }
  };

  // Quick amount presets in KZT
  const presets = [2000, 3000, 5000, 8000, 10000, 15000];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">💰 {payment ? '编辑收费' : '新增收费'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}

        {/* Patient */}
        <div className="form-group">
          <label className="form-label">病人 *</label>
          {!selectedPatient ? (
            <>
              <input className="form-input" value={patientSearch} onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }} placeholder="搜索病人..." autoFocus />
              {patients.length > 0 && (
                <div style={{ border:'1px solid #ddd', borderRadius:8, overflow:'hidden', marginTop:4 }}>
                  {patients.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); setPatients([]); }} style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f0f0f0' }}>
                      <span style={{ fontWeight:500 }}>{p.name}</span> <span style={{ color:'#888', fontSize:11 }}>{p.phone}</span>
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

        {/* Amount */}
        <div className="form-group">
          <label className="form-label">金额（₸ 坚戈）*</label>
          <input className="form-input" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="输入金额" style={{ fontSize:18 }} />
          <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
            {presets.map(p => (
              <button key={p} onClick={() => setForm({...form, amount: p})} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #ddd', background: Number(form.amount)===p?'#1f3864':'#fff', color: Number(form.amount)===p?'#fff':'#555', fontSize:12, cursor:'pointer' }}>
                {p.toLocaleString()} ₸
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">付款方式</label>
            <select className="form-select" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
              <option value="cash">💵 现金</option>
              <option value="card">💳 刷卡</option>
              <option value="transfer">📱 转账</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">状态</label>
            <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="paid">✅ 已付款</option>
              <option value="pending">⏳ 待付款</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">就诊日期</label>
            <input className="form-input" type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">说明（可选）</label>
          <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="例：初诊、复诊、检查费等" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
