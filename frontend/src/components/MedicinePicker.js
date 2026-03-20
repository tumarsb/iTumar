import React, { useState, useEffect } from 'react';
import api from '../api';

export default function MedicinePicker({ onSelect, onClose }) {
  const [medicines, setMedicines] = useState([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    api.get('/medicines').then(res => setMedicines(res.data));
  }, []);

  const filtered = medicines.filter(m =>
    !q || m.name.includes(q) || (m.name_ru || '').toLowerCase().includes(q.toLowerCase()) || (m.category || '').includes(q)
  );

  const toggle = (m) => {
    setSelected(prev =>
      prev.find(s => s.id === m.id)
        ? prev.filter(s => s.id !== m.id)
        : [...prev, { ...m, dose: '', duration: '', instruction: '' }]
    );
  };

  const updateSel = (id, field, val) => {
    setSelected(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const confirm = () => {
    if (selected.length === 0) return;
    const text = selected.map(m => {
      const parts = [m.name];
      if (m.dose) parts.push(m.dose);
      if (m.instruction) parts.push(m.instruction);
      if (m.duration) parts.push(m.duration);
      return parts.join(' ');
    }).join('\n');
    onSelect(text);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title">💊 从药品库选择</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="search-bar" style={{ marginBottom: 12 }}>
          <span>🔍</span>
          <input placeholder="搜索药品名称、分类..." value={q} onChange={e => setQ(e.target.value)} autoFocus />
          {q && <button style={{ background:'none', border:'none', cursor:'pointer', color:'#888' }} onClick={() => setQ('')}>✕</button>}
        </div>

        {/* Medicine list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: 13 }}>没有找到匹配药品</div>
          ) : filtered.map(m => {
            const isSel = selected.find(s => s.id === m.id);
            return (
              <div key={m.id} onClick={() => !m.expired && toggle(m)}
                style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: m.expired ? 'not-allowed' : 'pointer',
                  border: `1px solid ${isSel ? '#1f3864' : '#e8ecf0'}`,
                  background: isSel ? '#f0f4ff' : m.expired ? '#fafafa' : '#fff',
                  opacity: m.expired ? 0.5 : 1,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSel ? '#1f3864' : '#ddd'}`,
                    background: isSel ? '#1f3864' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSel && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e' }}>{m.name}</span>
                      {m.name_ru && <span style={{ fontSize: 11, color: '#aaa' }}>{m.name_ru}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {m.specification} · 库存: {m.stock}{m.unit}
                      {m.expiry_date && <span style={{ marginLeft: 8, color: m.expired ? '#c62828' : m.expiring_soon ? '#e65100' : '#aaa' }}>
                        效期: {m.expiry_date}
                      </span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {m.category && <span className="badge badge-blue">{m.category}</span>}
                    {m.expired && <span className="badge badge-red">已过期</span>}
                    {!m.expired && m.expiring_soon && <span className="badge badge-orange">即将过期</span>}
                    {m.low_stock && !m.expired && <span className="badge badge-gray">库存不足</span>}
                  </div>
                </div>

                {/* Dose input for selected items */}
                {isSel && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e0e8ff', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
                    onClick={e => e.stopPropagation()}>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>剂量</div>
                      <input className="form-input" style={{ padding: '5px 8px', fontSize: 12 }}
                        value={isSel.dose} onChange={e => updateSel(m.id, 'dose', e.target.value)}
                        placeholder="例：0.4g" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>用法</div>
                      <select className="form-select" style={{ padding: '5px 8px', fontSize: 12 }}
                        value={isSel.instruction} onChange={e => updateSel(m.id, 'instruction', e.target.value)}>
                        <option value="">选择用法</option>
                        <option value="qd（每日1次）">qd 每日1次</option>
                        <option value="bid（每日2次）">bid 每日2次</option>
                        <option value="tid（每日3次）">tid 每日3次</option>
                        <option value="qid（每日4次）">qid 每日4次</option>
                        <option value="prn（按需）">prn 按需</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>疗程</div>
                      <input className="form-input" style={{ padding: '5px 8px', fontSize: 12 }}
                        value={isSel.duration} onChange={e => updateSel(m.id, 'duration', e.target.value)}
                        placeholder="例：× 5天" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected preview */}
        {selected.length > 0 && (
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1f3864', marginBottom: 6 }}>
              已选 {selected.length} 种药品：
            </div>
            {selected.map(m => (
              <div key={m.id} style={{ fontSize: 12, color: '#333', lineHeight: 1.8 }}>
                · {m.name}{m.dose ? ` ${m.dose}` : ''}{m.instruction ? ` ${m.instruction}` : ''}{m.duration ? ` ${m.duration}` : ''}
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: 0, paddingTop: 12 }}>
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={confirm} disabled={selected.length === 0}>
            插入处方 ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
