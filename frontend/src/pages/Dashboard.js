import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

export default function Dashboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="loading">{t('loadingStats')}</div></div>;
  if (!data) return <div className="page"><div className="error-msg">{t('loadFailed')}</div></div>;

  const fmt = (n) => Number(n||0).toLocaleString();
  const fmtKzt = (n) => Number(n||0).toLocaleString() + ' ₸';
  const maxV = Math.max(...data.monthlyVisits.map(m=>m.count), 1);
  const maxR = Math.max(...data.monthlyRevenue.map(m=>m.total), 1);
  const mLabel = (m) => m.split('-')[1] + t('monthLabel');
  const revGrowth = data.revenueLast>0 ? ((data.revenueThis-data.revenueLast)/data.revenueLast*100).toFixed(1) : null;
  const patGrowth = data.newPatientsLastMonth>0 ? ((data.newPatientsThisMonth-data.newPatientsLastMonth)/data.newPatientsLastMonth*100).toFixed(1) : null;

  const sendFollowUp = async (id) => {
    setSending(id);
    try {
      const res = await api.post('/followup/wa-link', { patient_id: id });
      if (!res.data.phone) { alert(t('noPhoneError')); return; }
      window.open(res.data.link, '_blank');
    } catch { alert(t('error')); }
    finally { setSending(null); }
  };

  const exportData = async (type) => {
    const res = await api.get(type==='patients'?'/export/patients':`/export/payments?month=${new Date().toISOString().slice(0,7)}`);
    const d = res.data;
    const headers = type==='patients'
      ? ['ID',t('name'),t('nameOriginal'),t('age'),t('gender'),t('phone'),t('language'),t('allergyHistory'),t('medicalHistory'),t('notes')]
      : ['ID',t('name'),`${t('amountKzt').replace(' *','')}`,t('paymentMethod'),t('paymentStatus'),t('paymentDesc'),t('visitDate')];
    const rows = type==='patients'
      ? d.map(p=>[p.id,p.name,p.name_original||'',p.age||'',p.gender||'',p.phone||'',p.language||'',p.allergies||'',p.medical_history||'',p.notes||''])
      : d.map(p=>[p.id,p.name,p.amount,p.method,p.status,p.description||'',p.visit_date||'']);
    const BOM='\uFEFF';
    const csv=BOM+[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=(type==='patients'?t('exportPatients'):t('exportPayments')).replace('📥 ','')+'.csv';
    a.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">📊 {t('dashboard')}</div><div className="page-sub">{t('clinicOverview')}</div></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportData('patients')}>{t('exportPatients')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportData('payments')}>{t('exportPayments')}</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        <div className="stat-card"><div className="stat-num" style={{color:'#1565c0'}}>{data.todayVisits}</div><div className="stat-label">{t('todayVisits')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:'#2e7d32',fontSize:18}}>{fmtKzt(data.todayRevenue)}</div><div className="stat-label">{t('todayIncome')}</div></div>
        <div className="stat-card"><div className="stat-num">{data.totalPatients}</div><div className="stat-label">{t('totalPatientsCount')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:data.pendingTotal>0?'#e65100':'#888',fontSize:18}}>{fmtKzt(data.pendingTotal)}</div><div className="stat-label">{t('pendingAmount')} ({data.pendingCount})</div></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, color:'#1f3864', marginBottom:14 }}>📈 {t('monthlyVisits')}</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
            {data.monthlyVisits.map((m,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ fontSize:11, color:'#888' }}>{m.count||''}</div>
                <div style={{ width:'100%', background:i===5?'#1f3864':'#b0c4de', borderRadius:'4px 4px 0 0', height:`${Math.max(m.count/maxV*100,4)}%`, minHeight:4 }}></div>
                <div style={{ fontSize:10, color:'#aaa' }}>{mLabel(m.month)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:12, color:'#888', display:'flex', justifyContent:'space-between' }}>
            <span>{t('thisMonth')}：<strong style={{color:'#1f3864'}}>{data.monthlyVisits[5]?.count||0}</strong></span>
            <span>{t('lastMonthNew').replace('在','')}：{data.monthlyVisits[4]?.count||0}</span>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, color:'#1f3864', marginBottom:14 }}>
            💰 {t('monthlyRevenue')}
            {revGrowth!==null && <span style={{ marginLeft:8, fontSize:11, color:Number(revGrowth)>=0?'#2e7d32':'#c62828', background:Number(revGrowth)>=0?'#e8f5e9':'#fce4e4', padding:'1px 8px', borderRadius:20 }}>{Number(revGrowth)>=0?'↑':'↓'} {Math.abs(Number(revGrowth))}%</span>}
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
            {data.monthlyRevenue.map((m,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ fontSize:10, color:'#888' }}>{m.total>0?(m.total/1000).toFixed(0)+'k':''}</div>
                <div style={{ width:'100%', background:i===5?'#2e7d32':'#a5d6a7', borderRadius:'4px 4px 0 0', height:`${Math.max(m.total/maxR*100,4)}%`, minHeight:4 }}></div>
                <div style={{ fontSize:10, color:'#aaa' }}>{mLabel(m.month)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:12, color:'#888', display:'flex', justifyContent:'space-between' }}>
            <span>{t('thisMonth')}：<strong style={{color:'#2e7d32'}}>{fmtKzt(data.revenueThis)}</strong></span>
            <span>{fmtKzt(data.revenueLast)}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, color:'#1f3864', marginBottom:14 }}>🔍 {t('topDiagnoses')}</div>
          {data.topDiagnoses.length===0
            ? <div style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:'20px 0' }}>{t('noChartData')}</div>
            : data.topDiagnoses.map((d,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:12, color:'#aaa', width:18, textAlign:'right', flexShrink:0 }}>{i+1}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>{d.diagnosis}</div>
                  <div style={{ height:4, background:'#eee', borderRadius:2 }}><div style={{ height:'100%', background:i===0?'#1f3864':i<3?'#378add':'#b0c4de', width:`${d.count/data.topDiagnoses[0].count*100}%`, borderRadius:2 }}></div></div>
                </div>
                <span style={{ fontSize:12, fontWeight:500, color:'#555', flexShrink:0 }}>{d.count}{t('times')}</span>
              </div>
            ))
          }
        </div>

        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, color:'#1f3864', marginBottom:14 }}>
            👥 {t('newPatients')}
            {patGrowth!==null && <span style={{ marginLeft:8, fontSize:11, color:Number(patGrowth)>=0?'#2e7d32':'#c62828', background:Number(patGrowth)>=0?'#e8f5e9':'#fce4e4', padding:'1px 8px', borderRadius:20 }}>{Number(patGrowth)>=0?'↑':'↓'} {Math.abs(Number(patGrowth))}%</span>}
          </div>
          <div style={{ display:'flex', gap:16, marginBottom:16 }}>
            <div style={{ flex:1, background:'#e3f2fd', borderRadius:10, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:400, color:'#1565c0' }}>{data.newPatientsThisMonth}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{t('thisMonthNew')}</div>
            </div>
            <div style={{ flex:1, background:'#f5f5f5', borderRadius:10, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:400, color:'#888' }}>{data.newPatientsLastMonth}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{t('lastMonthNew')}</div>
            </div>
          </div>
          <div style={{ background:'#f8f9fa', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#555' }}>
            {t('totalPatientsCount')}：<strong>{fmt(data.totalPatients)}</strong>
          </div>
        </div>
      </div>

      {data.followUpNeeded?.length>0 && (
        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, color:'#1f3864', marginBottom:4 }}>
            ⏰ {t('followUpTitle')}
            <span style={{ fontSize:11, fontWeight:400, color:'#888', marginLeft:8 }}>{t('followUpSub')}</span>
          </div>
          <div style={{ fontSize:12, color:'#e65100', background:'#fff8e1', borderRadius:8, padding:'8px 12px', marginBottom:12 }}>
            ⚠️ {data.followUpNeeded.length} {t('followUpAlert')}
          </div>
          {data.followUpNeeded.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f8f9fa', borderRadius:8, border:'1px solid #eee', marginBottom:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{p.name}</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2, display:'flex', gap:8 }}>
                  <span>{p.medical_history?.join('、')}</span>
                  {p.last_visit ? <span>· {t('lastVisitDate')}：{p.last_visit}</span> : <span style={{color:'#c62828'}}>· {t('neverVisited')}</span>}
                </div>
              </div>
              <button className="btn btn-success btn-sm" onClick={() => sendFollowUp(p.id)} disabled={sending===p.id} style={{whiteSpace:'nowrap'}}>
                {sending===p.id?'...':t('sendFollowUp')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
