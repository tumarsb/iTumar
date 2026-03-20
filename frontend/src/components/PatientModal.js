import React, { useState } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

export default function PatientModal({ patient, onClose, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name:patient?.name||'', name_original:patient?.name_original||'', age:patient?.age||'', gender:patient?.gender||'女', phone:patient?.phone||'', language:patient?.language||'ru', notes:patient?.notes||'', allergies:patient?.allergies||[], medical_history:patient?.medical_history||[] });
  const [allergyInput, setAllergyInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addTag = (field, input, setInput) => { const v=input.trim(); if(!v)return; if(!form[field].includes(v))setForm(f=>({...f,[field]:[...f[field],v]})); setInput(''); };
  const removeTag = (field, tag) => setForm(f => ({...f,[field]:f[field].filter(x=>x!==tag)}));

  const save = async () => {
    if (!form.name.trim()) { setError(t('name')); return; }
    setSaving(true); setError('');
    try { if(patient?.id)await api.put(`/patients/${patient.id}`,form); else await api.post('/patients',form); onSaved(); }
    catch(e) { setError(e.response?.data?.error||t('error')); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{patient ? t('editPatientTitle') : t('newPatientTitle')}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('nameZh')} *</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="阿丽娅·别科娃" /></div>
          <div className="form-group"><label className="form-label">{t('nameOriginal')}</label><input className="form-input" value={form.name_original} onChange={e=>setForm({...form,name_original:e.target.value})} placeholder="Алия Бекова" /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">{t('age')}</label><input className="form-input" type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} /></div>
          <div className="form-group"><label className="form-label">{t('gender')}</label><select className="form-select" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="女">{t('female')}</option><option value="男">{t('male')}</option></select></div>
          <div className="form-group"><label className="form-label">{t('language')}</label><select className="form-select" value={form.language} onChange={e=>setForm({...form,language:e.target.value})}><option value="ru">{t('langRu')}</option><option value="kk">{t('langKk')}</option><option value="zh">{t('langZh')}</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">{t('phone')}</label><input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+7 701 234 5678" /></div>
        <div className="form-group">
          <label className="form-label">{t('allergyHistory')} <span style={{color:'#c62828',fontSize:11}}>{t('allergyWarningNote')}</span></label>
          <div className="tag-list">{form.allergies.map(tag=><span key={tag} className="tag-item">{tag}<button className="tag-remove" onClick={()=>removeTag('allergies',tag)}>×</button></span>)}</div>
          <div className="tag-add-row"><input className="tag-add-input" value={allergyInput} onChange={e=>setAllergyInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag('allergies',allergyInput,setAllergyInput)} placeholder={t('allergyPlaceholder')} /><button className="btn btn-danger btn-sm" onClick={()=>addTag('allergies',allergyInput,setAllergyInput)}>{t('add')}</button></div>
        </div>
        <div className="form-group">
          <label className="form-label">{t('medicalHistory')}</label>
          <div className="tag-list">{form.medical_history.map(tag=><span key={tag} className="tag-item tag-green-item">{tag}<button className="tag-remove" style={{color:'#2e7d32'}} onClick={()=>removeTag('medical_history',tag)}>×</button></span>)}</div>
          <div className="tag-add-row"><input className="tag-add-input" value={historyInput} onChange={e=>setHistoryInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag('medical_history',historyInput,setHistoryInput)} placeholder={t('medicalHistoryPlaceholder')} /><button className="btn btn-success btn-sm" onClick={()=>addTag('medical_history',historyInput,setHistoryInput)}>{t('add')}</button></div>
        </div>
        <div className="form-group"><label className="form-label">{t('notes')}</label><textarea className="form-textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{minHeight:60}} /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?t('saving'):t('save')}</button>
        </div>
      </div>
    </div>
  );
}
