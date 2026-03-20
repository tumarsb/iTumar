import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

const SERVICE_LABELS = {
  openai_whisper: { label: '🎙 Whisper 录音转文字', color: '#1565c0', bg: '#e3f2fd' },
  anthropic_claude: { label: '🤖 Claude AI病历/化验', color: '#4527a0', bg: '#ede7f6' },
};

export default function ApiUsage() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(true);

  const load = async (m) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/api-usage?month=${m}`);
      setData(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(month); }, [month]);

  const prevMonth = () => { const d=new Date(month+'-01'); d.setMonth(d.getMonth()-1); setMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d=new Date(month+'-01'); d.setMonth(d.getMonth()+1); setMonth(d.toISOString().slice(0,7)); };

  const fmtUsd = (n) => '$' + Number(n||0).toFixed(4);
  const fmtKzt = (n) => (Number(n||0) * 480).toFixed(0) + ' ₸'; // approx rate

  const maxDayCost = data ? Math.max(...data.byDay.map(d=>d.cost), 0.001) : 1;

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:600, color:'#1f3864', marginBottom:4 }}>
        📊 {t('apiUsage')}
      </div>
      <div style={{ fontSize:12, color:'#888', marginBottom:16 }}>{t('apiUsageSub')}</div>

      {/* Month nav */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
        <div style={{ fontSize:14, fontWeight:500, flex:1, textAlign:'center' }}>{month}</div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date().toISOString().slice(0,7))}>本月</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'24px', color:'#aaa', fontSize:13 }}>加载中...</div>
      ) : !data ? (
        <div style={{ textAlign:'center', padding:'24px', color:'#aaa', fontSize:13 }}>{t('noApiData')}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            <div style={{ background:'#f8f9fa', borderRadius:10, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:500, color:'#1f3864' }}>{data.monthTotal.calls}</div>
              <div style={{ fontSize:11, color:'#888', marginTop:3 }}>本月 API 调用次数</div>
            </div>
            <div style={{ background:'#fce4e4', borderRadius:10, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:500, color:'#c62828' }}>{fmtUsd(data.monthTotal.cost)}</div>
              <div style={{ fontSize:11, color:'#888', marginTop:3 }}>本月 API 成本（美元）</div>
              <div style={{ fontSize:11, color:'#e65100', marginTop:2 }}>≈ {fmtKzt(data.monthTotal.cost)}</div>
            </div>
            <div style={{ background:'#e8f5e9', borderRadius:10, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:500, color:'#2e7d32' }}>{fmtUsd(data.allTime.cost)}</div>
              <div style={{ fontSize:11, color:'#888', marginTop:3 }}>累计总成本</div>
              <div style={{ fontSize:11, color:'#388e3c', marginTop:2 }}>{data.allTime.calls} 次调用</div>
            </div>
          </div>

          {/* By service */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:500, color:'#888', marginBottom:8 }}>按服务分类</div>
            {data.byService.length === 0 ? (
              <div style={{ fontSize:12, color:'#aaa', padding:'12px 0', textAlign:'center' }}>{t('noApiData')}</div>
            ) : data.byService.map(s => {
              const info = SERVICE_LABELS[s.service] || { label: s.service, color:'#555', bg:'#f5f5f5' };
              const pct = data.monthTotal.cost > 0 ? (s.cost / data.monthTotal.cost * 100).toFixed(0) : 0;
              return (
                <div key={s.service} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#fafafa', borderRadius:8, border:'1px solid #eee', marginBottom:6 }}>
                  <div style={{ fontSize:12, flex:1 }}>
                    <div style={{ fontWeight:500, color: info.color }}>{info.label}</div>
                    <div style={{ marginTop:4, height:4, background:'#eee', borderRadius:2 }}>
                      <div style={{ height:'100%', background:info.color, width:`${pct}%`, borderRadius:2, transition:'width 0.3s' }}></div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:info.color }}>{fmtUsd(s.cost)}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{s.calls} 次 · {pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Daily usage chart */}
          {data.byDay.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'#888', marginBottom:8 }}>每日用量</div>
              <div style={{ background:'#fafafa', borderRadius:8, padding:'12px', border:'1px solid #eee' }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80 }}>
                  {data.byDay.map((d, i) => (
                    <div key={i} title={`${d.day}: ${fmtUsd(d.cost)} (${d.calls}次)`}
                      style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
                      <div style={{ width:'100%', background:'#1f3864', borderRadius:'3px 3px 0 0', height:`${Math.max(d.cost/maxDayCost*100,4)}%`, minHeight:3, opacity:0.7 }}></div>
                      <div style={{ fontSize:9, color:'#aaa', transform:'rotate(-45deg)', transformOrigin:'top left', marginTop:8, whiteSpace:'nowrap' }}>
                        {d.day?.slice(5)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:28, fontSize:11, color:'#888', textAlign:'center' }}>
                  平均每天 {fmtUsd(data.monthTotal.cost / Math.max(data.byDay.length, 1))} · 最高 {fmtUsd(maxDayCost)}
                </div>
              </div>
            </div>
          )}

          {/* Cost estimate */}
          <div style={{ marginTop:16, background:'#fff8e1', borderRadius:8, padding:'12px 14px', border:'1px solid #ffe082' }}>
            <div style={{ fontSize:12, fontWeight:500, color:'#e65100', marginBottom:6 }}>💡 成本预测</div>
            <div style={{ fontSize:12, color:'#666', lineHeight:1.8 }}>
              本月成本：<strong>{fmtUsd(data.monthTotal.cost)}</strong> ≈ <strong>{fmtKzt(data.monthTotal.cost)}</strong><br/>
              按此速度全月预计：<strong>{fmtUsd(data.monthTotal.cost / Math.max(new Date().getDate(), 1) * 30)}</strong><br/>
              建议标准版定价 <strong>45,000 ₸/月</strong> 可覆盖成本并保持约 75% 毛利率
            </div>
          </div>
        </>
      )}
    </div>
  );
}
