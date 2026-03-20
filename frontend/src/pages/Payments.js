import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import PaymentModal from '../components/PaymentModal';

export default function Payments() {
  const { t } = useLang();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);

  const load = useCallback(async () => {
    const statusQ = filter!=='all'?`&status=${filter}`:'';
    const [pRes, sRes] = await Promise.all([
      api.get(`/payments?month=${month}${statusQ}`),
      api.get(`/payments/stats?month=${month}`)
    ]);
    setPayments(pRes.data); setStats(sRes.data);
  }, [month, filter]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n) => Number(n||0).toLocaleString() + ' ₸';
  const methodLabel = (m) => m==='cash'?t('cash'):m==='card'?t('card'):m==='transfer'?t('transfer'):t('notes');
  const methodBadge = (m) => m==='cash'?'badge-green':m==='card'?'badge-blue':m==='transfer'?'badge-purple':'badge-gray';

  const del = async (id) => {
    if (!window.confirm(t('deletePaymentConfirm'))) return;
    await api.delete(`/payments/${id}`); load();
  };

  const prevMonth = () => { const d=new Date(month+'-01'); d.setMonth(d.getMonth()-1); setMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d=new Date(month+'-01'); d.setMonth(d.getMonth()+1); setMonth(d.toISOString().slice(0,7)); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">💰 {t('payments')}</div>
          <div className="page-sub">{month} · {payments.length} {t('apiCalls')}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditPayment(null); setShowModal(true); }}>{t('newPayment')}</button>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button className="btn btn-ghost" onClick={prevMonth}>‹</button>
        <div style={{ fontSize:15, fontWeight:500, flex:1, textAlign:'center' }}>{month}</div>
        <button className="btn btn-ghost" onClick={nextMonth}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date().toISOString().slice(0,7))}>{t('today')}</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:16 }}>
        <div className="stat-card"><div className="stat-num" style={{color:'#2e7d32',fontSize:18}}>{fmt(stats.monthTotal)}</div><div className="stat-label">{t('thisMonthIncome')}</div></div>
        <div className="stat-card"><div className="stat-num">{stats.monthCount||0}</div><div className="stat-label">{t('recordCount')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:'#1565c0',fontSize:18}}>{fmt(stats.todayTotal)}</div><div className="stat-label">{t('todayIncome')}</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:stats.pendingTotal>0?'#e65100':'#888',fontSize:18}}>{fmt(stats.pendingTotal)}</div><div className="stat-label">{t('pendingAmount')} ({stats.pendingCount||0})</div></div>
      </div>

      {stats.methodStats?.length>0 && (
        <div className="card" style={{ marginBottom:16, padding:'12px 16px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'#888', marginBottom:10 }}>{t('methodBreakdown')}</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {stats.methodStats.map(m => (
              <div key={m.method} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'#f8f9fa', borderRadius:8 }}>
                <span style={{ fontSize:13 }}>{methodLabel(m.method)}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{fmt(m.total)}</span>
                <span style={{ fontSize:11, color:'#aaa' }}>({m.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[['all',t('allPayments')],['paid',t('paidFilter')],['pending',t('pendingFilter')]].map(([k,v]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid', fontSize:13, cursor:'pointer', background:filter===k?'#1f3864':'#fff', color:filter===k?'#fff':'#555', borderColor:filter===k?'#1f3864':'#ddd' }}>{v}</button>
        ))}
      </div>

      {payments.length===0 ? (
        <div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-text">{t('noPayments')}</div></div>
      ) : (
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8ecf0', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fa', borderBottom:'1px solid #e8ecf0' }}>
                {[t('visitDate'),t('name'),`${t('amountKzt').replace(' *','')}`,t('paymentMethod'),t('paymentStatus'),t('paymentDesc'),t('actions')].map(h => (
                  <th key={h} style={{ padding:'10px 14px', fontSize:12, fontWeight:500, color:'#888', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p,i) => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f0f0f0', background:i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#888' }}>{p.visit_date}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{p.name_original}</div>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:14, fontWeight:500, color:p.status==='paid'?'#2e7d32':'#e65100', whiteSpace:'nowrap' }}>{Number(p.amount).toLocaleString()} ₸</td>
                  <td style={{ padding:'10px 14px' }}><span className={`badge ${methodBadge(p.method)}`}>{methodLabel(p.method)}</span></td>
                  <td style={{ padding:'10px 14px' }}><span className={`badge ${p.status==='paid'?'badge-green':'badge-orange'}`}>{p.status==='paid'?t('paidFilter'):t('pendingFilter')}</span></td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#555' }}>{p.description||'-'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditPayment(p); setShowModal(true); }}>{t('edit')}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>{t('delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'10px 16px', background:'#f8f9fa', borderTop:'1px solid #e8ecf0', display:'flex', justifyContent:'flex-end', gap:16 }}>
            <span style={{ fontSize:13, color:'#888' }}>{t('totalRow')}：</span>
            <span style={{ fontSize:14, fontWeight:500, color:'#2e7d32' }}>{fmt(payments.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount),0))}</span>
          </div>
        </div>
      )}

      {showModal && <PaymentModal payment={editPayment} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
