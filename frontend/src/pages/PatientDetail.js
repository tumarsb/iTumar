import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import { WaSendRecord, WaReminder } from '../components/WhatsApp';
import AttachmentPanel from '../components/AttachmentPanel';

export default function PatientDetail({ patient, onBack, onNewRecord }) {
  const { t } = useLang();
  const [p, setP] = useState(patient);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    Promise.all([api.get(`/patients/${patient.id}`), api.get(`/patients/${patient.id}/records`)])
      .then(([pRes, rRes]) => { setP({...pRes.data, allergies:pRes.data.allergies||[], medical_history:pRes.data.medical_history||[]}); setRecords(rRes.data); })
      .finally(() => setLoading(false));
  }, [patient]);

  const deleteRecord = async (id) => {
    if (!window.confirm(t('deleteRecordConfirm'))) return;
    await api.delete(`/records/${id}`);
    const res = await api.get(`/patients/${p.id}/records`); setRecords(res.data);
  };

  const printRecord = (r) => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${p.name}</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;}h1{font-size:20px;text-align:center;border-bottom:2px solid #1f3864;padding-bottom:10px;}.field{margin:12px 0;}.label{font-weight:600;color:#1f3864;font-size:13px;}.value{margin-top:4px;font-size:14px;line-height:1.6;}.footer{margin-top:40px;border-top:1px solid #ddd;padding-top:16px;display:flex;justify-content:space-between;font-size:13px;}</style></head><body>
      <h1>${p.name} - ${t('visitRecords')}</h1>
      <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px;color:#666;"><span>${p.name}（${p.name_original||''}）</span><span>${p.age}${t('years')} · ${p.gender}</span><span>${new Date(r.visit_date).toLocaleDateString('zh-CN')}</span></div>
      ${p.allergies?.length?`<div style="background:#fce4e4;border:1px solid #f5c6c6;padding:8px 12px;border-radius:6px;color:#c62828;margin-bottom:16px;">⚠ ${t('allergyHistory')}：${p.allergies.join('、')}</div>`:''}
      <div class="field"><div class="label">${t('mainComplaint')}</div><div class="value">${r.chief_complaint||'-'}</div></div>
      <div class="field"><div class="label">${t('currentIllness')}</div><div class="value">${r.history||'-'}</div></div>
      ${r.examination?`<div class="field"><div class="label">${t('examination')}</div><div class="value">${r.examination}</div></div>`:''}
      <div class="field"><div class="label">${t('diagnosis')}</div><div class="value">${r.diagnosis||'-'}</div></div>
      <div class="field"><div class="label">${t('treatment')}</div><div class="value">${r.treatment||'-'}</div></div>
      <div class="footer"><span>${t('doctor')}：_____________</span><span>${new Date().toLocaleDateString('zh-CN')}</span></div>
      </body></html>`);
    win.document.close(); win.print();
  };

  if (loading) return <div className="page"><div className="loading">{t('loading')}</div></div>;

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>← {t('backToList')}</button>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
          <div className="avatar av-blue" style={{ width:52, height:52, fontSize:16 }}>{p.name?.slice(0,2)}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:600 }}>{p.name} <span style={{fontSize:13,color:'#888',fontWeight:400}}>{p.age}{t('years')} · {p.gender}</span></div>
            <div style={{ fontSize:13, color:'#888', marginTop:2 }}>{p.name_original} · {p.phone}</div>
            <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
              <span className="badge badge-gray">{p.language==='kk'?t('langKk'):p.language==='ru'?t('langRu'):t('langZh')}</span>
              {p.medical_history?.map((m,i)=><span key={i} className="badge badge-blue">{m}</span>)}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <WaReminder patientId={p.id} patientName={p.name} />
            <button className="btn btn-primary" onClick={() => onNewRecord(p)}>{t('addNewRecord')}</button>
          </div>
        </div>
        {p.allergies?.length > 0 && (
          <div className="allergy-alert" style={{ marginTop:14 }}>
            <span className="allergy-alert-icon">⚠️</span>
            <span className="allergy-alert-text">{t('allergyAlert')}：{p.allergies.join('、')}</span>
          </div>
        )}
      </div>

      <div style={{ fontSize:14, fontWeight:600, color:'#1a1a2e', marginBottom:12 }}>{t('visitRecords')} ({records.length})</div>
      {records.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">{t('noRecords')}</div></div>
      ) : records.map(r => (
        <div key={r.id} className="card card-sm" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'#888' }}>{new Date(r.visit_date).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}</span>
              {r.ai_generated ? <span className="badge badge-purple">{t('aiGenerated')}</span> : <span className="badge badge-gray">{t('manualEntry')}</span>}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => printRecord(r)}>{t('printRecord')}</button>
              <WaSendRecord recordId={r.id} patientPhone={p.phone} />
              <button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r.id)}>{t('delete')}</button>
            </div>
          </div>
          {r.chief_complaint && <div className="record-field"><div className="record-field-label">{t('mainComplaint')}</div><div className="record-field-value">{r.chief_complaint}</div></div>}
          {r.history && <div className="record-field"><div className="record-field-label">{t('currentIllness')}</div><div className="record-field-value">{r.history}</div></div>}
          {r.examination && <div className="record-field"><div className="record-field-label">{t('examination')}</div><div className="record-field-value">{r.examination}</div></div>}
          {r.diagnosis && <div className="record-field"><div className="record-field-label">{t('diagnosis')}</div><div className="record-field-value">{r.diagnosis}</div></div>}
          {r.treatment && <div className="record-field"><div className="record-field-label">{t('treatment')}</div><div className="record-field-value">{r.treatment}</div></div>}
        </div>
      ))}
      {/* Attachments section */}
      <div className="card" style={{ marginTop:16 }}>
        <AttachmentPanel patientId={p.id} />
      </div>
    </div>
  );
}
