import React, { useState, useEffect } from 'react';
import api from '../api';
import { AnnouncementManager } from '../components/Announcements';
import ApiUsage from '../components/ApiUsage';

const TABS = ['诊所信息', 'API密钥', 'WhatsApp', '公告管理', 'API用量', '用户管理', '系统'];

export default function SuperAdmin() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = async (keys) => {
    setSaving(true); setMsg('');
    try {
      const payload = {};
      keys.forEach(k => { if (settings[k] !== undefined) payload[k] = settings[k]; });
      await api.put('/settings', payload);
      setMsg('✅ 保存成功！');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('❌ 保存失败：' + e.message);
    } finally { setSaving(false); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('确认停用此账号？')) return;
    await api.delete(`/users/${id}`);
    const r = await api.get('/users');
    setUsers(r.data);
  };

  const reactivate = async (id) => {
    const u = users.find(u => u.id === id);
    await api.put(`/users/${id}`, { ...u, active: true });
    const r = await api.get('/users');
    setUsers(r.data);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">🔐 超级管理员后台</div>
          <div className="page-sub">系统配置、用户管理、API 设置</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e8ecf0', paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, color: tab === i ? '#1f3864' : '#888',
            borderBottom: tab === i ? '2px solid #1f3864' : '2px solid transparent',
            fontWeight: tab === i ? 500 : 400, marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {msg && <div className={msg.startsWith('✅') ? 'success-msg' : 'error-msg'} style={{ marginBottom: 16 }}>{msg}</div>}

      {/* ── Tab 0: 诊所信息 ── */}
      {tab === 0 && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 16 }}>🏥 诊所基本信息</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#f8f9fa', borderRadius: 10 }}>
            <div style={{ fontSize: 48 }}>{settings.clinic_logo || '⚕️'}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{settings.clinic_name || '诊所名称'}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{settings.clinic_name_ru || ''}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">诊所 Logo（Emoji 表情）</label>
            <input className="form-input" value={settings.clinic_logo || ''} onChange={e => set('clinic_logo', e.target.value)} placeholder="例：⚕️ 🏥 🩺 💊" />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>输入一个 Emoji 表情作为 Logo，如 ⚕️ 🏥 🩺</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">诊所名称（中文）</label>
              <input className="form-input" value={settings.clinic_name || ''} onChange={e => set('clinic_name', e.target.value)} placeholder="例：阿斯塔纳诊所" />
            </div>
            <div className="form-group">
              <label className="form-label">诊所名称（俄文）</label>
              <input className="form-input" value={settings.clinic_name_ru || ''} onChange={e => set('clinic_name_ru', e.target.value)} placeholder="例：Астана Клиника" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">诊所地址</label>
            <input className="form-input" value={settings.clinic_address || ''} onChange={e => set('clinic_address', e.target.value)} placeholder="诊所详细地址" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">诊所电话</label>
              <input className="form-input" value={settings.clinic_phone || ''} onChange={e => set('clinic_phone', e.target.value)} placeholder="+7 701 234 5678" />
            </div>
            <div className="form-group">
              <label className="form-label">主题颜色</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={settings.primary_color || '#1f3864'} onChange={e => set('primary_color', e.target.value)} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <input className="form-input" value={settings.primary_color || '#1f3864'} onChange={e => set('primary_color', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => save(['clinic_name','clinic_name_ru','clinic_logo','clinic_address','clinic_phone','primary_color'])} disabled={saving}>
            {saving ? '保存中...' : '💾 保存诊所信息'}
          </button>
        </div>
      )}

      {/* ── Tab 1: API密钥 ── */}
      {tab === 1 && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 4 }}>🤖 OpenAI API Key</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>用于录音转文字（Whisper），充值后才能使用</div>
            <div className="form-group">
              <label className="form-label">OpenAI API Key</label>
              <input className="form-input" type="password" value={settings.openai_api_key || ''} onChange={e => set('openai_api_key', e.target.value)} placeholder="sk-proj-..." />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => save(['openai_api_key'])} disabled={saving}>💾 保存</button>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🔗 获取 Key</a>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 4 }}>🧠 Anthropic API Key</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>用于 AI 自动整理病历（Claude），必须配置</div>
            <div className="form-group">
              <label className="form-label">Anthropic API Key</label>
              <input className="form-input" type="password" value={settings.anthropic_api_key || ''} onChange={e => set('anthropic_api_key', e.target.value)} placeholder="sk-ant-..." />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => save(['anthropic_api_key'])} disabled={saving}>💾 保存</button>
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🔗 获取 Key</a>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: WhatsApp ── */}
      {tab === 2 && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 16 }}>📲 WhatsApp 配置</div>

          <div className="form-group">
            <label className="form-label">诊所 WhatsApp 号码（纯数字，含国际区号）</label>
            <input className="form-input" value={settings.clinic_whatsapp || ''} onChange={e => set('clinic_whatsapp', e.target.value)} placeholder="例：77001234567" />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>哈萨克斯坦格式：7 开头共11位，不加 + 号</div>
          </div>

          {settings.clinic_whatsapp && (
            <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32', marginBottom: 6 }}>📲 病人预约链接（复制发给病人）</div>
              <div style={{ fontSize: 12, color: '#333', wordBreak: 'break-all', marginBottom: 8, padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #ddd' }}>
                {`https://wa.me/${settings.clinic_whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent('您好！我想预约就诊，请问近期有哪些可用时间？')}`}
              </div>
              <button className="btn btn-success btn-sm" onClick={() => {
                navigator.clipboard.writeText(`https://wa.me/${settings.clinic_whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent('您好！我想预约就诊，请问近期有哪些可用时间？')}`);
                setMsg('✅ 链接已复制！');
                setTimeout(() => setMsg(''), 2000);
              }}>📋 复制链接</button>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => save(['clinic_whatsapp'])} disabled={saving}>
            {saving ? '保存中...' : '💾 保存 WhatsApp 配置'}
          </button>
        </div>
      )}

      {/* ── Tab 3: 公告管理 ── */}
      {tab === 3 && (
        <div className="card"><AnnouncementManager /></div>
      )}

      {/* ── Tab 4: API用量 ── */}
      {tab === 4 && (
        <ApiUsage />
      )}

      {/* ── Tab 5: 用户管理 ── */}
      {tab === 5 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowUserModal(true); }}>+ 新建用户</button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e8ecf0' }}>
                  {['姓名','用户名','角色','电话','状态','操作'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#888', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0', background: i%2===0?'#fff':'#fafafa' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.role==='superadmin'?'#fce4e4':u.role==='doctor'?'#e3f2fd':'#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: u.role==='superadmin'?'#c62828':u.role==='doctor'?'#1565c0':'#2e7d32' }}>
                          {u.name[0]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{u.username}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${u.role==='superadmin'?'badge-red':u.role==='doctor'?'badge-blue':'badge-green'}`}>
                        {u.role==='superadmin'?'超级管理员':u.role==='doctor'?'医生':'护士'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{u.phone || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${u.active?'badge-green':'badge-gray'}`}>{u.active?'正常':'已停用'}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {u.role !== 'superadmin' && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setShowUserModal(true); }}>编辑</button>
                            {u.active
                              ? <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>停用</button>
                              : <button className="btn btn-success btn-sm" onClick={() => reactivate(u.id)}>启用</button>
                            }
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 6: 系统 ── */}
      {tab === 6 && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 16 }}>⚙️ 系统设置</div>

          <div className="form-group">
            <label className="form-label">过期药品提前预警天数</label>
            <input className="form-input" type="number" min="1" max="90" value={settings.expiry_warning_days || '14'} onChange={e => set('expiry_warning_days', e.target.value)} style={{ width: 120 }} />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>药品有效期在此天数内将显示橙色警告（默认14天）</div>
          </div>

          <button className="btn btn-primary" onClick={() => save(['expiry_warning_days'])} disabled={saving} style={{ marginTop: 8 }}>
            {saving ? '保存中...' : '💾 保存'}
          </button>

          <div style={{ marginTop: 24, padding: '16px', background: '#f8f9fa', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 10 }}>系统信息</div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 2 }}>
              <div>超级管理员账号：<strong>admin</strong></div>
              <div>医生账号：<strong>doctor</strong></div>
              <div>前台护士账号：<strong>nurse</strong></div>
              <div style={{ marginTop: 8, color: '#aaa' }}>版本：v1.0.0 · 阿斯塔纳诊所管理系统</div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '12px 14px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#e65100', fontWeight: 500, marginBottom: 4 }}>⚠️ 修改超级管理员密码</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>如需修改 admin 密码，请在终端运行：</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#fff', padding: '8px 10px', borderRadius: 6, color: '#333' }}>
              node -e "const b=require('bcryptjs');console.log(b.hashSync('新密码',10))"
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowUserModal(false)}
          onSaved={async () => {
            setShowUserModal(false);
            const r = await api.get('/users');
            setUsers(r.data);
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    name: user?.name || '',
    phone: user?.phone || '',
    role: user?.role || 'doctor',
    active: user?.active !== 0,
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.name.trim()) { setError('请填写姓名'); return; }
    if (!user && !form.password.trim()) { setError('新用户必须设置密码'); return; }
    setSaving(true); setError('');
    try {
      if (user) {
        await api.put(`/users/${user.id}`, form);
      } else {
        await api.post('/users', form);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || '保存失败');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">{user ? '编辑用户' : '新建用户'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">姓名 *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例：张医生" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">用户名 *</label>
            <input className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="登录用户名" disabled={!!user} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">角色</label>
            <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="doctor">医生</option>
              <option value="nurse">前台护士</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">电话</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+7 701 234 5678" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{user ? '新密码（留空则不修改）' : '密码 *'}</label>
          <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={user ? '留空不修改密码' : '设置登录密码'} />
        </div>

        {user && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} />
              账号启用（取消勾选则停用该账号）
            </label>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
