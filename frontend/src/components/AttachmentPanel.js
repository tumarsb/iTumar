import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function AttachmentPanel({ patientId, recordId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(null);
  const [analyses, setAnalyses] = useState({});
  const [showAnalysis, setShowAnalysis] = useState(null);
  const fileRef = useRef(null);

  const load = () => api.get(`/patients/${patientId}/attachments`).then(r => setAttachments(r.data));

  useEffect(() => { if (patientId) load(); }, [patientId]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { alert('只支持图片（JPG/PNG）和 PDF'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('patient_id', patientId);
      if (recordId) fd.append('record_id', recordId);
      fd.append('description', description || file.name);
      await api.post('/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDescription(''); if (fileRef.current) fileRef.current.value = ''; load();
    } catch(e) { alert('上传失败：' + (e.response?.data?.error || e.message)); }
    finally { setUploading(false); }
  };

  const analyzeWithAI = async (att) => {
    if (!att.file_type?.startsWith('image/')) { alert('AI分析目前只支持图片格式'); return; }
    setAnalyzing(att.id);
    try {
      const res = await api.post(`/attachments/${att.id}/analyze`);
      setAnalyses(prev => ({ ...prev, [att.id]: res.data.analysis }));
      setShowAnalysis(att.id);
    } catch(e) { alert('AI分析失败：' + (e.response?.data?.error || e.message)); }
    finally { setAnalyzing(null); }
  };

  const deleteAtt = async (id) => {
    if (!window.confirm('确认删除？')) return;
    await api.delete(`/attachments/${id}`); load();
  };

  const fmtSize = (b) => !b ? '' : b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB';
  const isImg = (t) => t?.startsWith('image/');

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:600, color:'#1f3864', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
        🔬 化验单 / 检查报告
        <span style={{ fontSize:11, fontWeight:400, color:'#aaa' }}>({attachments.length}个文件)</span>
        <span style={{ fontSize:11, color:'#4527a0', background:'#ede7f6', padding:'1px 8px', borderRadius:20 }}>🤖 AI解读</span>
      </div>

      <div style={{ border:'2px dashed #ddd', borderRadius:10, padding:14, marginBottom:12, textAlign:'center', background:'#fafafa', cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={upload} style={{ display:'none' }} />
        <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
        <div style={{ fontSize:13, color:'#555', fontWeight:500 }}>{uploading ? '⏳ 上传中...' : '点击上传化验单（图片/PDF）'}</div>
        <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>上传后可用 AI 自动解读</div>
        <div style={{ marginTop:8 }} onClick={e => e.stopPropagation()}>
          <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="备注（可选，例：血常规 2026-03-16）" style={{ maxWidth:280, fontSize:12, padding:'5px 10px' }} />
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {attachments.map(att => (
          <div key={att.id}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8f9fa', borderRadius:10, border:'1px solid #eee' }}>
              {isImg(att.file_type)
                ? <img src={`/api/attachments/${att.filename}`} alt="" style={{ width:44, height:44, objectFit:'cover', borderRadius:6, border:'1px solid #ddd', cursor:'pointer', flexShrink:0 }} onClick={() => window.open(`/api/attachments/${att.filename}`, '_blank')} />
                : <div style={{ width:44, height:44, background:'#e3f2fd', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📄</div>
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.description?.replace('\n[AI分析已完成]','')||att.original_name}</div>
                <div style={{ fontSize:11, color:'#aaa', display:'flex', gap:8, marginTop:1 }}>
                  <span>{new Date(att.created_at).toLocaleDateString('zh-CN')}</span>
                  <span>{fmtSize(att.file_size)}</span>
                  {att.description?.includes('[AI分析已完成]') && <span style={{ color:'#4527a0' }}>🤖 已分析</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {isImg(att.file_type) && (
                  <button className="btn btn-purple btn-sm" onClick={() => analyses[att.id] ? setShowAnalysis(showAnalysis===att.id?null:att.id) : analyzeWithAI(att)} disabled={analyzing===att.id}>
                    {analyzing===att.id ? '🤖 分析中...' : analyses[att.id] ? (showAnalysis===att.id?'收起':'🤖 查看') : '🤖 AI解读'}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/api/attachments/${att.filename}`, '_blank')}>查看</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteAtt(att.id)}>删除</button>
              </div>
            </div>
            {showAnalysis===att.id && analyses[att.id] && (
              <div style={{ margin:'0 0 4px 0', background:'#ede7f6', border:'1px solid #d1c4e9', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#4527a0' }}>🤖 AI 化验单解读</span>
                  <span style={{ fontSize:11, color:'#7e57c2', marginLeft:'auto' }}>仅供医生参考</span>
                </div>
                <div style={{ fontSize:13, color:'#333', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{analyses[att.id]}</div>
              </div>
            )}
          </div>
        ))}
        {attachments.length === 0 && <div style={{ textAlign:'center', padding:'8px 0', fontSize:12, color:'#bbb' }}>暂无附件</div>}
      </div>
    </div>
  );
}
