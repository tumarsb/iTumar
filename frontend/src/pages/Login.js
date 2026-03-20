import React, { useState } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import TumarBranding from '../components/TumarBranding';

export default function Login({ onLogin, branding = {} }) {
  const { t, lang, changeLang } = useLang();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (e) {
      setError(e.response?.data?.error || t('loginError'));
    } finally { setLoading(false); }
  };

  const langs = [{ code:'zh', label:'中文' }, { code:'kk', label:'Қаз' }, { code:'ru', label:'Рус' }];

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f6f9' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', width:380, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16, gap:4 }}>
          {langs.map(l => (
            <button key={l.code} onClick={() => changeLang(l.code)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid', fontSize:12, cursor:'pointer', fontWeight:lang===l.code?600:400, background:lang===l.code?'#1f3864':'transparent', color:lang===l.code?'#fff':'#888', borderColor:lang===l.code?'#1f3864':'#ddd' }}>
              {l.label}
            </button>
          ))}
        </div>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>{branding.clinic_logo || '⚕️'}</div>
          <h1 style={{ fontSize:22, fontWeight:600, color:'#1f3864' }}>{branding.clinic_name || t('loginTitle')}</h1>
          {branding.clinic_name_ru && <p style={{ fontSize:13, color:'#888', marginTop:4 }}>{branding.clinic_name_ru}</p>}
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">{t('username')}</label>
            <input className="form-input" value={form.username} onChange={e => setForm({...form, username:e.target.value})} placeholder={t('username')} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder={t('password')} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'11px', marginTop:8 }}>
            {loading ? t('loggingIn') : t('loginBtn')}
          </button>
        </form>
        <div style={{ marginTop:20, padding:'12px', background:'#f9fafb', borderRadius:8, fontSize:12, color:'#888' }}>
          <strong>{t('defaultAccounts')}：</strong><br/>
          admin / admin123 · doctor / doctor123 · nurse / nurse123
        </div>
        <TumarBranding />
      </div>
    </div>
  );
}
