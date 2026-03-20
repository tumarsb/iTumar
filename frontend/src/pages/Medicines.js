import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useLang } from '../LangContext';
import MedicineModal from '../components/MedicineModal';

export default function Medicines() {
  const { t } = useLang();
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState({ expired: [], expiring: [], low_stock: [] });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editMed, setEditMed] = useState(null);

  const load = useCallback(async () => {
    const [mRes, aRes] = await Promise.all([
      api.get(`/medicines${q ? `?q=${q}` : ''}`),
      api.get('/medicines/alerts')
    ]);
    setMedicines(mRes.data);
    setAlerts(aRes.data);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditMed(null); setShowModal(true); };
  const openEdit = (m) => { setEditMed(m); setShowModal(true); };

  const adjustStock = async (id, delta) => {
    await api.patch(`/medicines/${id}/stock`, { delta });
    load();
  };

  const deleteMed = async (id) => {
    if (!window.confirm(t('deleteMedicineConfirm'))) return;
    await api.delete(`/medicines/${id}`);
    load();
  };

  const filtered = medicines.filter(m => {
    if (filter === 'expired') return m.expired;
    if (filter === 'expiring') return m.expiring_soon;
    if (filter === 'low') return m.low_stock;
    return true;
  });

  const alertCount = alerts.expired?.length + alerts.expiring?.length + alerts.low_stock?.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">药品管理</div>
          <div className="page-sub">共 {medicines.length} 种药品{alertCount > 0 ? `，${alertCount} 条警告` : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ 添加药品</button>
      </div>

      {/* Alert banners */}
      {alerts.expired?.length > 0 && (
        <div style={{ background:'#fce4e4', border:'1px solid #f5c6c6', borderRadius:10, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🚨</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#c62828' }}>已过期药品 ({alerts.expired.length} 种)</div>
            <div style={{ fontSize:12, color:'#c62828', marginTop:2 }}>{alerts.expired.map(m => m.name).join('、')}</div>
          </div>
        </div>
      )}
      {alerts.expiring?.length > 0 && (
        <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#e65100' }}>14天内14天内过期 ({alerts.expiring.length} 种)</div>
            <div style={{ fontSize:12, color:'#e65100', marginTop:2 }}>{alerts.expiring.map(m => `${m.name}（${m.expiry_date}）`).join('、')}</div>
          </div>
        </div>
      )}
      {alerts.low_stock?.length > 0 && (
        <div style={{ background:'#e3f2fd', border:'1px solid #90caf9', borderRadius:10, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>📦</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1565c0' }}>库存不足 ({alerts.low_stock.length} 种)</div>
            <div style={{ fontSize:12, color:'#1565c0', marginTop:2 }}>{alerts.low_stock.map(m => `${m.name}（剩余${m.stock}${m.unit}）`).join('、')}</div>
          </div>
        </div>
      )}

      {/* Filter tabs + search */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        <div className="search-bar" style={{ flex:1, minWidth:200 }}>
          <span>🔍</span>
          <input placeholder="搜索药品名称、分类..." value={q} onChange={e => setQ(e.target.value)} />
          {q && <button style={{ background:'none',border:'none',cursor:'pointer',color:'#888' }} onClick={() => setQ('')}>✕</button>}
        </div>
        {[
          { key:'all', label:`全部 (${medicines.length})` },
          { key:'expired', label:`已过期 (${alerts.expired?.length || 0})`, color:'#c62828' },
          { key:'expiring', label:`14天内过期 (${alerts.expiring?.length || 0})`, color:'#e65100' },
          { key:'low', label:`库存不足 (${alerts.low_stock?.length || 0})`, color:'#1565c0' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:'7px 14px', borderRadius:8, border:'1px solid', fontSize:13, cursor:'pointer',
              borderColor: filter === f.key ? '#1f3864' : '#ddd',
              background: filter === f.key ? '#1f3864' : '#fff',
              color: filter === f.key ? '#fff' : (f.color || '#555') }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Medicine table */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">💊</div><div className="empty-state-text">{t('noMedicines')}</div></div>
      ) : (
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8ecf0', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fa', borderBottom:'1px solid #e8ecf0' }}>
                {['药品名称','规格/单位','分类','库存','有效期','状态','操作'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', fontSize:12, fontWeight:600, color:'#888', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} style={{ borderBottom:'1px solid #f0f0f0', background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a2e' }}>{m.name}</div>
                    {m.name_ru && <div style={{ fontSize:11, color:'#aaa' }}>{m.name_ru}</div>}
                    {m.manufacturer && <div style={{ fontSize:11, color:'#bbb' }}>{m.manufacturer}</div>}
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#555' }}>
                    <div>{m.specification || '-'}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>单位: {m.unit}</div>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {m.category && <span className="badge badge-blue">{m.category}</span>}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <button onClick={() => adjustStock(m.id, -1)} style={{ width:24, height:24, borderRadius:6, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                      <span style={{ fontSize:14, fontWeight:600, color: m.low_stock ? '#c62828' : '#1a1a2e', minWidth:32, textAlign:'center' }}>{m.stock}</span>
                      <button onClick={() => adjustStock(m.id, 1)} style={{ width:24, height:24, borderRadius:6, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                      <span style={{ fontSize:11, color:'#aaa' }}>{m.unit}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>警戒线: {m.min_stock}{m.unit}</div>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color: m.expired ? '#c62828' : m.expiring_soon ? '#e65100' : '#555', fontWeight: (m.expired || m.expiring_soon) ? 500 : 400 }}>
                    {m.expiry_date || '-'}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {m.expired && <span className="badge badge-red">已过期</span>}
                    {!m.expired && m.expiring_soon && <span className="badge badge-orange">即将过期</span>}
                    {!m.expired && !m.expiring_soon && m.low_stock && <span className="badge badge-blue">库存不足</span>}
                    {!m.expired && !m.expiring_soon && !m.low_stock && <span className="badge badge-green">正常</span>}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>编辑</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteMed(m.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <MedicineModal medicine={editMed} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
