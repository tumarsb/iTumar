import React, { useState, useEffect } from 'react';
import api from '../api';

// Display active announcements (used in Queue/Dashboard pages)
export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => {});
  }, []);

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const typeBg = (t) => t==='warning'?'#fff8e1':t==='danger'?'#fce4e4':t==='success'?'#e8f5e9':'#e3f2fd';
  const typeColor = (t) => t==='warning'?'#e65100':t==='danger'?'#c62828':t==='success'?'#2e7d32':'#1565c0';
  const typeIcon = (t) => t==='warning'?'⚠️':t==='danger'?'🚨':t==='success'?'✅':'📢';

  return (
    <div style={{ marginBottom:16 }}>
      {visible.map(a => (
        <div key={a.id} style={{ background:typeBg(a.type), border:`1px solid`, borderColor:typeColor(a.type)+'40', borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', alignItems:'flex-start', gap:10 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>{typeIcon(a.type)}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:typeColor(a.type) }}>{a.title}</div>
            {a.content && <div style={{ fontSize:12, color:typeColor(a.type), opacity:0.8, marginTop:2, lineHeight:1.5 }}>{a.content}</div>}
          </div>
          <button onClick={() => setDismissed(d => [...d, a.id])} style={{ background:'none', border:'none', cursor:'pointer', color:typeColor(a.type), opacity:0.5, fontSize:16, padding:0, flexShrink:0 }}>×</button>
        </div>
      ))}
    </div>
  );
}

// Manage announcements (used in SuperAdmin)
export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title:'', content:'', type:'info', expires_at:'' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/announcements/all').then(r => setAnnouncements(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditItem(null); setForm({ title:'', content:'', type:'info', expires_at:'' }); setShowForm(true); };
  const openEdit = (a) => { setEditItem(a); setForm({ title:a.title, content:a.content, type:a.type, expires_at:a.expires_at||'' }); setShowForm(true); };

  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      if (editItem) await api.put(`/announcements/${editItem.id}`, { ...form, is_active: editItem.is_active });
      else await api.post('/announcements', form);
      setShowForm(false); load();
    } catch(e) { alert(e.response?.data?.error||'保存失败'); }
    finally { setSaving(false); }
  };

  const toggle = async (a) => {
    await api.put(`/announcements/${a.id}`, { ...a, is_active: a.is_active ? 0 : 1 });
    load();
  };

  const del = async (id) => {
    if (!window.confirm('确认删除？')) return;
    await api.delete(`/announcements/${id}`); load();
  };

  const typeBg = (t) => t==='warning'?'#fff8e1':t==='danger'?'#fce4e4':t==='success'?'#e8f5e9':'#e3f2fd';
  const typeColor = (t) => t==='warning'?'#e65100':t==='danger'?'#c62828':t==='success'?'#2e7d32':'#1565c0';

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#1f3864' }}>📢 诊所公告管理</div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ 新建公告</button>
      </div>

      {showForm && (
        <div style={{ background:'#f0f4ff', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
          <div className="form-group">
            <label className="form-label">公告标题 *</label>
            <input className="form-input" value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="例：明日休诊通知" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">公告内容</label>
            <textarea className="form-textarea" value={form.content} onChange={e => setForm({...form,content:e.target.value})} placeholder="详细说明..." style={{minHeight:70}} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">类型</label>
              <select className="form-select" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                <option value="info">📢 普通通知（蓝色）</option>
                <option value="warning">⚠️ 注意事项（橙色）</option>
                <option value="danger">🚨 紧急通知（红色）</option>
                <option value="success">✅ 好消息（绿色）</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">过期日期（可选）</label>
              <input className="form-input" type="date" value={form.expires_at} onChange={e => setForm({...form,expires_at:e.target.value})} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving||!form.title}>{saving?'保存中...':'保存公告'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px', color:'#aaa', fontSize:13 }}>暂无公告</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {announcements.map(a => (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: a.is_active?typeBg(a.type):'#f5f5f5', borderRadius:10, border:'1px solid', borderColor: a.is_active?typeColor(a.type)+'30':'#eee', opacity: a.is_active?1:0.6 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color: a.is_active?typeColor(a.type):'#888' }}>{a.title}</div>
                {a.content && <div style={{ fontSize:11, color:'#888', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.content}</div>}
                <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>
                  {new Date(a.created_at).toLocaleDateString('zh-CN')}
                  {a.expires_at && ` · 到期：${a.expires_at}`}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button className={`btn btn-sm ${a.is_active?'badge-green':'badge-gray'}`} style={{ background: a.is_active?'#e8f5e9':'#f5f5f5', color: a.is_active?'#2e7d32':'#888', border:'1px solid', borderColor: a.is_active?'#c8e6c9':'#ddd', padding:'4px 10px', borderRadius:8, cursor:'pointer', fontSize:12 }} onClick={() => toggle(a)}>
                  {a.is_active ? '显示中' : '已隐藏'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>编辑</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(a.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
