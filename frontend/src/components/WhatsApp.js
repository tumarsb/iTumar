import React, { useState } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

// Send medical record via WhatsApp
export function WaSendRecord({ recordId, patientPhone }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/whatsapp/record-link/${recordId}`);
      if (!res.data.phone) {
        alert(t('noPhoneError'));
        return;
      }
      window.open(res.data.link, '_blank');
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      alert('发送失败：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-success btn-sm"
      onClick={send}
      disabled={loading}
      title="通过 WhatsApp 发送病历给病人"
    >
      {done ? '✅ 已打开' : loading ? '...' : '📲 发病历'}
    </button>
  );
}

// Send follow-up reminder via WhatsApp
export function WaReminder({ patientId, patientName }) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const [days, setDays] = useState(7);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/reminder', {
        patient_id: patientId,
        days,
        message: custom || undefined
      });
      if (!res.data.phone) {
        alert(t('noPhoneError'));
        return;
      }
      window.open(res.data.link, '_blank');
      setShow(false);
    } catch (e) {
      alert('发送失败：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setShow(true)} title="发送复诊提醒">
        ⏰ 复诊提醒
      </button>

      {show && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">{t('reminderTitle')}</div>
              <button className="modal-close" onClick={() => setShow(false)}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
              将通过 WhatsApp 发送复诊提醒给 <strong>{patientName}</strong>
            </p>

            <div className="form-group">
              <label className="form-label">{t('reminderDays')}</label>
              <select className="form-select" value={days} onChange={e => setDays(Number(e.target.value))}>
                <option value={3}>{t('days3')}</option>
                <option value={7}>{t('days7')}</option>
                <option value={14}>{t('days14')}</option>
                <option value={30}>{t('days30')}</option>
                <option value={90}>{t('days90')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('customMessage')}</label>
              <textarea
                className="form-textarea"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="输入自定义提醒内容..."
                style={{ minHeight: 80 }}
              />
            </div>

            <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#555' }}>
              💡 点击「发送」后会打开 WhatsApp，内容已预填好，你确认后点发送即可
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShow(false)}>{t('cancel')}</button>
              <button className="btn btn-success" onClick={send} disabled={loading}>
                {loading ? '准备中...' : '📲 打开 WhatsApp 发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Clinic booking link generator
export function ClinicBookingLink({ clinicWhatsApp }) {
  const number = (clinicWhatsApp || '').replace(/\D/g, '');
  const text = `您好！我想预约就诊，请问近期有哪些可用时间？`;
  const link = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    alert('预约链接已复制！可以发给病人或放到诊所名片上');
  };

  return (
    <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#2e7d32', marginBottom: 8 }}>
        📲 诊所预约 WhatsApp 链接
      </div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
        把这个链接发给病人，病人点击后直接打开 WhatsApp 跟你预约
      </div>
      <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#333', wordBreak: 'break-all', marginBottom: 10, border: '1px solid #ddd' }}>
        {number ? link : '请先在 .env 文件中设置 CLINIC_WHATSAPP 号码'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {number && (
          <>
            <button className="btn btn-success btn-sm" onClick={copy}>📋 复制链接</button>
            <a href={link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🔗 测试链接</a>
          </>
        )}
      </div>
    </div>
  );
}
