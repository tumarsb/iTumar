import React, { useState, useEffect } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

export default function TemplatePicker({ onSelect, onClose }) {
  const { t } = useLang();
  const [templates, setTemplates] = useState([]);
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name:'', category:'', content:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/templates').then(r => setTemplates(r.data)); }, []);

  const filtered = templates.filter(t => !q || t.name.includes(q) || (t.category||'').includes(q) || t.content.includes(q));

  const use = async (tmpl) => {
    await api.post(`/templates/${tmpl.id}/use`);
    onSelect(tmpl.content);
    onClose();
  };

  const saveNew = async () => {
    if (!newForm.name || !newForm.content) return;
    setSaving(true);
    try {
      await api.post('/templates', newForm);
      const r = await api.get('/templates');
      setTemplates(r.data);
      setShowNew(false);
      setNewForm({ name:'', category:'', content:'' });
    } catch(e) { alert(e.response?.data?.error||'保存失败'); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('确认删除此模板？')) return;
    await api.delete(`/templates/${id}`);
    setTemplates(ts => ts.filter(t => t.id !== id));
  };

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '85vh', display:'flex', flexDirection:'column' }}>
        <div className="modal-header">
          <div className="modal-title">📋 处方模板库</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <div className="search-bar" style={{ flex:1 }}>
            <span>🔍</span>
            <input placeholder="搜索模板名称或内容..." value={q} onChange={e => setQ(e.target.value)} autoFocus />
            {q && <button style={{ background:'none', border:'none', cursor:'pointer', color:'#888' }} onClick={() => setQ('')}>✕</button>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(!showNew)}>+ 新建模板</button>
        </div>

        {/* New template form */}
        {showNew && (
          <div style={{ background:'#f0f4ff', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#1f3864', marginBottom:10 }}>新建处方模板</div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom:8 }}>
                <label className="form-label">模板名称 *</label>
                <input className="form-input" value={newForm.name} onChange={e => setNewForm({...newForm, name:e.target.value})} placeholder="例：感冒标准处方" />
              </div>
              <div className="form-group" style={{ marginBottom:8 }}>
                <label className="form-label">分类</label>
                <input className="form-input" value={newForm.category} onChange={e => setNewForm({...newForm, category:e.target.value})} placeholder="例：感冒/慢性病/儿科" list="cat-list" />
                <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:8 }}>
              <label className="form-label">处方内容 *</label>
              <textarea className="form-textarea" value={newForm.content} onChange={e => setNewForm({...newForm, content:e.target.value})} placeholder="输入处方内容，每行一条..." style={{ minHeight:80 }} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveNew} disabled={saving||!newForm.name||!newForm.content}>{saving?'保存中...':'保存模板'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>取消</button>
            </div>
          </div>
        )}

        {/* Template list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">没有找到模板</div></div>
          ) : filtered.map(tmpl => (
            <div key={tmpl.id} onClick={() => use(tmpl)} style={{ padding:'12px 14px', borderRadius:10, border:'1px solid #e8ecf0', marginBottom:8, cursor:'pointer', background:'#fff', transition:'all 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#1f3864'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#e8ecf0'}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:500, color:'#1a1a2e', flex:1 }}>{tmpl.name}</span>
                {tmpl.category && <span className="badge badge-blue" style={{ fontSize:11 }}>{tmpl.category}</span>}
                {tmpl.usage_count > 0 && <span style={{ fontSize:11, color:'#aaa' }}>用了{tmpl.usage_count}次</span>}
                <button onClick={e => deleteTemplate(tmpl.id, e)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd', fontSize:16, padding:'0 2px' }}
                  onMouseEnter={e => e.currentTarget.style.color='#c62828'}
                  onMouseLeave={e => e.currentTarget.style.color='#ddd'}>×</button>
              </div>
              <div style={{ fontSize:12, color:'#666', lineHeight:1.6, whiteSpace:'pre-line', maxHeight:60, overflow:'hidden' }}>{tmpl.content}</div>
            </div>
          ))}
        </div>

        <div style={{ paddingTop:10, borderTop:'1px solid #eee', fontSize:11, color:'#aaa', textAlign:'center' }}>
          点击模板即可插入处方 · 使用次数越多排越靠前
        </div>
      </div>
    </div>
  );
}
