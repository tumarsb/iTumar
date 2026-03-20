import React, { useState } from 'react';
import api from '../api';

export default function MedicineModal({ medicine, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: medicine?.name || '',
    name_ru: medicine?.name_ru || '',
    category: medicine?.category || '',
    specification: medicine?.specification || '',
    unit: medicine?.unit || '片',
    stock: medicine?.stock ?? 0,
    min_stock: medicine?.min_stock ?? 10,
    expiry_date: medicine?.expiry_date || '',
    manufacturer: medicine?.manufacturer || '',
    notes: medicine?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.name.trim()) { setError('请填写药品名称'); return; }
    setSaving(true); setError('');
    try {
      if (medicine?.id) await api.put(`/medicines/${medicine.id}`, form);
      else await api.post('/medicines', form);
      onSaved();
    } catch (e) { setError(e.response?.data?.error || '保存失败'); }
    finally { setSaving(false); }
  };

  const units = ['片', '粒', '支', '瓶', '盒', '袋', 'ml', 'g'];
  const categories = ['解热镇痛', '抗生素', '降糖药', '降压药', '维生素', '消炎镇痛', '补钙', '消化系统', '呼吸系统', '心血管', '其他'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div className="modal-title">{medicine ? '编辑药品' : '添加药品'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">药品名称（中文）*</label>
            <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例：布洛芬片" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">药品名称（俄文）</label>
            <input className="form-input" value={form.name_ru} onChange={e => setForm({...form, name_ru: e.target.value})} placeholder="例：Ибупрофен" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">分类</label>
            <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">选择分类</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">规格</label>
            <input className="form-input" value={form.specification} onChange={e => setForm({...form, specification: e.target.value})} placeholder="例：0.4g×100片" />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">单位</label>
            <select className="form-select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">当前库存</label>
            <input className="form-input" type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} />
          </div>
          <div className="form-group">
            <label className="form-label">库存警戒线</label>
            <input className="form-input" type="number" min="0" value={form.min_stock} onChange={e => setForm({...form, min_stock: Number(e.target.value)})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">有效期至 ⚠️</label>
            <input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">生产厂商</label>
            <input className="form-input" value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} placeholder="例：拜耳" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="储存条件、使用注意事项等..." style={{minHeight:60}} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
