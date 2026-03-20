import React, { useState, useEffect } from 'react';
import api from '../api';
import { ClinicBookingLink } from '../components/WhatsApp';

export default function Settings() {
  const [waNumber, setWaNumber] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/whatsapp/clinic-number').then(res => setWaNumber(res.data.number || ''));
  }, []);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    alert('WhatsApp 号码已保存！\n\n请在 backend/.env 文件中更新：\nCLINIC_WHATSAPP=' + waNumber.replace(/\D/g,''));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">设置</div>
          <div className="page-sub">诊所配置与 WhatsApp 功能</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 14 }}>
          📲 WhatsApp 配置
        </div>

        <div className="form-group">
          <label className="form-label">诊所 WhatsApp 手机号（含国际区号）</label>
          <input
            className="form-input"
            value={waNumber}
            onChange={e => setWaNumber(e.target.value)}
            placeholder="例：77001234567（哈萨克斯坦 +7 开头）"
          />
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            只填数字，不要加 + 号。哈萨克斯坦号码格式：7 开头，共11位
          </div>
        </div>

        <button className="btn btn-primary" onClick={save}>
          {saved ? '✅ 已保存' : '保存'}
        </button>

        {saved && (
          <div className="success-msg" style={{ marginTop: 10 }}>
            保存成功！请同时在 backend/.env 文件里更新 CLINIC_WHATSAPP={waNumber.replace(/\D/g,'')}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 14 }}>
          🔗 病人预约链接
        </div>
        <ClinicBookingLink clinicWhatsApp={waNumber} />
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f3864', marginBottom: 14 }}>
          📖 WhatsApp 功能说明
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '📲', title: '发送病历给病人', desc: '在病人档案的就诊记录旁边，点「发病历」按钮，会自动打开 WhatsApp 并预填病历内容，你确认后点发送即可' },
            { icon: '⏰', title: '复诊提醒', desc: '在病人档案页面点「复诊提醒」按钮，选择复诊时间后，自动生成提醒消息并打开 WhatsApp 发送给病人' },
            { icon: '🔗', title: '预约链接', desc: '复制上方的预约链接，放到诊所名片、微信、或者打印出来贴在诊所门口，病人扫码后直接 WhatsApp 联系你预约' },
            { icon: '⚠️', title: '注意事项', desc: '病人手机号必须已填写且开通 WhatsApp，发送前请确认号码正确。点击发送按钮只是打开 WhatsApp，你还需要手动点发送确认' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid #f0f0f0' : 'none' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
