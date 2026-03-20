import React, { useState, useRef } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import MedicinePicker from '../components/MedicinePicker';
import TemplatePicker from '../components/TemplatePicker';

export default function NewRecord({ patient, onBack, onSaved }) {
  const { t } = useLang();
  const [transcript, setTranscript] = useState('');
  const [form, setForm] = useState({ chief_complaint:'', history:'', examination:'', diagnosis:'', treatment:'' });
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [recLang, setRecLang] = useState(patient?.language==='kk'?'kk':patient?.language==='zh'?'zh':'ru');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef('audio/webm');

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(m=>MediaRecorder.isTypeSupported(m))||'';
      mimeRef.current = mime||'audio/webm';
      const mr = new MediaRecorder(stream, mime?{mimeType:mime}:{});
      chunksRef.current = [];
      mr.ondataavailable = e => { if(e.data.size>0)chunksRef.current.push(e.data); };
      mr.onstop = async () => { stream.getTracks().forEach(t=>t.stop()); const blob=new Blob(chunksRef.current,{type:mimeRef.current}); await transcribeAudio(blob); };
      mr.start(1000); mediaRef.current = mr; setRecording(true);
    } catch(e) { setError(t('micError') + '：' + e.message); }
  };

  const stopRecording = () => { if(mediaRef.current&&mediaRef.current.state!=='inactive')mediaRef.current.stop(); setRecording(false); };

  const transcribeAudio = async (blob) => {
    if(blob.size<1000){setError(t('transcribeError'));return;}
    setTranscribing(true);
    try {
      const fd = new FormData();
      const ext = mimeRef.current.includes('mp4')?'mp4':mimeRef.current.includes('ogg')?'ogg':'webm';
      fd.append('audio', blob, `recording.${ext}`); fd.append('language', recLang);
      const res = await api.post('/transcribe', fd, {headers:{'Content-Type':'multipart/form-data'}});
      setTranscript(prev => prev ? prev+'\n'+res.data.text : res.data.text);
    } catch(e) { setError(t('transcribeError')+'：'+(e.response?.data?.error||e.message)); }
    finally { setTranscribing(false); }
  };

  const organizeWithAI = async () => {
    if (!transcript.trim()) { setError(t('transcribeError')); return; }
    setOrganizing(true); setError('');
    try {
      const res = await api.post('/ai/organize', { transcript, patient });
      setForm({ chief_complaint:res.data.chief_complaint||'', history:res.data.history||'', examination:res.data.examination||'', diagnosis:res.data.diagnosis||'', treatment:res.data.treatment||'' });
      setAiDone(true);
    } catch(e) { setError(t('aiError')+'：'+(e.response?.data?.error||e.message)); }
    finally { setOrganizing(false); }
  };

  const save = async () => {
    if (!form.chief_complaint&&!form.diagnosis) { setError(t('recordError')); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/patients/${patient.id}/records`, {...form, raw_transcript:transcript, ai_generated:aiDone});
      setSuccess(t('recordSaved')); setTimeout(onSaved, 1200);
    } catch(e) { setError(e.response?.data?.error||e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>← {t('back')}</button>
      <div className="page-header" style={{ marginBottom:16 }}>
        <div><div className="page-title">{t('newRecordTitle')}</div><div className="page-sub">{patient?.name} · {patient?.age}{t('years')} · {patient?.gender}</div></div>
      </div>
      {patient?.allergies?.length>0&&(<div className="allergy-alert" style={{marginBottom:16}}><span className="allergy-alert-icon">⚠️</span><span className="allergy-alert-text">{t('allergyAlert')}：{patient.allergies.join('、')}</span></div>)}
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">✅ {success}</div>}

      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#1f3864', marginBottom:12 }}>{t('step1')}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <select className="form-select" value={recLang} onChange={e=>setRecLang(e.target.value)} disabled={recording} style={{ width:110, padding:'7px 10px', fontSize:13 }}>
            <option value="ru">{t('langRu')}</option>
            <option value="kk">{t('langKk')}</option>
            <option value="zh">{t('langZh')}</option>
          </select>
          {!recording ? <button className="btn btn-purple" onClick={startRecording} disabled={transcribing}>{t('startRecording')}</button>
            : <button className="btn btn-danger" onClick={stopRecording}>{t('stopRecording')}</button>}
          {recording && <div className="rec-indicator"><div className="rec-dot"></div>{t('recording')}</div>}
          {transcribing && <div style={{fontSize:13,color:'#888'}}>{t('recognizing')}</div>}
          <div style={{flex:1}}></div>
          <button className="btn btn-primary" onClick={organizeWithAI} disabled={organizing||!transcript.trim()}>{organizing?t('aiOrganizing'):t('aiOrganize')}</button>
        </div>
        <textarea className="form-textarea" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder={t('transcriptPlaceholder')} style={{minHeight:120}} />
        <div style={{fontSize:11,color:'#aaa',marginTop:5}}>{t('recordingTip')}</div>
      </div>

      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <div style={{fontSize:13,fontWeight:600,color:'#1f3864'}}>{t('step2')}</div>
          {aiDone && <span className="badge badge-purple">{t('aiDone')}</span>}
        </div>
        <div className="form-group"><label className="form-label">{t('mainComplaint')} *</label><input className="form-input" value={form.chief_complaint} onChange={e=>setForm({...form,chief_complaint:e.target.value})} placeholder={t('complaintPlaceholder')} /></div>
        <div className="form-group"><label className="form-label">{t('currentIllness')}</label><textarea className="form-textarea" value={form.history} onChange={e=>setForm({...form,history:e.target.value})} placeholder={t('historyPlaceholder')} style={{minHeight:80}} /></div>
        <div className="form-group"><label className="form-label">{t('examination')}</label><textarea className="form-textarea" value={form.examination} onChange={e=>setForm({...form,examination:e.target.value})} placeholder={t('examinationPlaceholder')} style={{minHeight:70}} /></div>
        <div className="form-group"><label className="form-label">{t('diagnosis')} *</label><input className="form-input" value={form.diagnosis} onChange={e=>setForm({...form,diagnosis:e.target.value})} placeholder={t('diagnosisPlaceholder')} /></div>
        <div className="form-group">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
            <label className="form-label" style={{margin:0}}>{t('treatment')}</label>
            <button className="btn btn-purple btn-sm" type="button" onClick={()=>setShowPicker(true)}>{t('selectFromPharmacy')}</button>
          </div>
          <textarea className="form-textarea" value={form.treatment} onChange={e=>setForm({...form,treatment:e.target.value})} placeholder={t('treatmentPlaceholder')} style={{minHeight:90}} />
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <button className="btn btn-ghost" onClick={onBack}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?t('saving'):t('saveRecord')}</button>
        </div>
      </div>
      {showTemplate && <TemplatePicker onSelect={text => setForm(f => ({...f, treatment: f.treatment ? f.treatment+'\n'+text : text}))} onClose={() => setShowTemplate(false)} />}
      {showPicker && <MedicinePicker onSelect={text=>setForm(f=>({...f,treatment:f.treatment?f.treatment+'\n'+text:text}))} onClose={()=>setShowPicker(false)} />}
    </div>
  );
}
