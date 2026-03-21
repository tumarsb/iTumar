import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db, { initDB } from './db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const upload = multer({ dest: uploadsDir });
app.use(cors({ origin: ['http://localhost:3000','http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'clinic_secret_2026';

function auth(req,res,next){
  const t=req.headers.authorization?.split(' ')[1];
  if(!t)return res.status(401).json({error:'No token'});
  try{req.user=jwt.verify(t,JWT_SECRET);next();}
  catch{res.status(401).json({error:'Invalid token'});}
}
function doctorOnly(req,res,next){if(req.user.role!=='doctor'&&req.user.role!=='superadmin')return res.status(403).json({error:'Doctor only'});next();}
function superOnly(req,res,next){if(req.user.role!=='superadmin')return res.status(403).json({error:'Superadmin only'});next();}
function cleanup(...paths){paths.forEach(p=>{if(p)try{fs.unlinkSync(p);}catch{}});}

async function getSetting(key){
  const r=await db.execute({sql:'SELECT value FROM settings WHERE key=?',args:[key]});
  return r.rows[0]?.value||'';
}

// ── Auth ──────────────────────────────────────────────────────────
app.post('/api/login',async(req,res)=>{
  try{
    const{username,password}=req.body;
    const r=await db.execute({sql:'SELECT * FROM users WHERE username=? AND active=1',args:[username]});
    const u=r.rows[0];
    if(!u||!bcrypt.compareSync(password,u.password))return res.status(401).json({error:'用户名或密码错误'});
    const token=jwt.sign({id:u.id,role:u.role,name:u.name},JWT_SECRET,{expiresIn:'7d'});
    res.json({token,user:{id:u.id,name:u.name,role:u.role}});
  }catch(e){res.status(500).json({error:e.message});}
});

// ── Settings (public read for branding) ──────────────────────────
app.get('/api/settings/public',async(req,res)=>{
  try{
    const keys=['clinic_name','clinic_name_ru','clinic_logo','primary_color','clinic_address','clinic_phone'];
    const result={};
    for(const k of keys)result[k]=await getSetting(k);
    res.json(result);
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/settings',auth,superOnly,async(req,res)=>{
  try{
    const r=await db.execute('SELECT key,value FROM settings ORDER BY key');
    const obj={};r.rows.forEach(row=>obj[row.key]=row.value);
    res.json(obj);
  }catch(e){res.status(500).json({error:e.message});}
});

app.put('/api/settings',auth,superOnly,async(req,res)=>{
  try{
    for(const[k,v]of Object.entries(req.body)){
      await db.execute({sql:'INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)',args:[k,v]});
    }
    res.json({ok:true});
  }catch(e){res.status(500).json({error:e.message});}
});

// ── Users (superadmin only) ───────────────────────────────────────
app.get('/api/users',auth,superOnly,async(req,res)=>{
  try{
    const r=await db.execute('SELECT id,username,role,name,phone,active,created_at FROM users ORDER BY role,name');
    res.json(r.rows);
  }catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/users',auth,superOnly,async(req,res)=>{
  try{
    const{username,password,role,name,phone}=req.body;
    if(!username||!password||!role||!name)return res.status(400).json({error:'请填写所有必填项'});
    if(role==='superadmin')return res.status(400).json({error:'不能创建超级管理员账号'});
    const r=await db.execute({sql:'INSERT INTO users (username,password,role,name,phone) VALUES (?,?,?,?,?)',args:[username,bcrypt.hashSync(password,10),role,name,phone||'']});
    res.json({id:Number(r.lastInsertRowid)});
  }catch(e){
    if(e.message.includes('UNIQUE'))return res.status(400).json({error:'用户名已存在'});
    res.status(500).json({error:e.message});
  }
});

app.put('/api/users/:id',auth,superOnly,async(req,res)=>{
  try{
    const{name,phone,role,active,password}=req.body;
    const existing=await db.execute({sql:'SELECT role FROM users WHERE id=?',args:[req.params.id]});
    if(existing.rows[0]?.role==='superadmin'&&req.user.id!=req.params.id)return res.status(403).json({error:'不能修改超级管理员'});
    if(password){
      await db.execute({sql:'UPDATE users SET name=?,phone=?,role=?,active=?,password=? WHERE id=?',args:[name,phone||'',role,active?1:0,bcrypt.hashSync(password,10),req.params.id]});
    }else{
      await db.execute({sql:'UPDATE users SET name=?,phone=?,role=?,active=? WHERE id=?',args:[name,phone||'',role,active?1:0,req.params.id]});
    }
    res.json({ok:true});
  }catch(e){res.status(500).json({error:e.message});}
});

app.delete('/api/users/:id',auth,superOnly,async(req,res)=>{
  try{
    const r=await db.execute({sql:'SELECT role FROM users WHERE id=?',args:[req.params.id]});
    if(r.rows[0]?.role==='superadmin')return res.status(403).json({error:'不能删除超级管理员'});
    await db.execute({sql:'UPDATE users SET active=0 WHERE id=?',args:[req.params.id]});
    res.json({ok:true});
  }catch(e){res.status(500).json({error:e.message});}
});

// ── Patients ──────────────────────────────────────────────────────
app.get('/api/patients',auth,async(req,res)=>{try{const{q}=req.query;const r=q?await db.execute({sql:`SELECT * FROM patients WHERE name LIKE ? OR name_original LIKE ? OR phone LIKE ? ORDER BY updated_at DESC`,args:[`%${q}%`,`%${q}%`,`%${q}%`]}):await db.execute('SELECT * FROM patients ORDER BY updated_at DESC');res.json(r.rows.map(p=>({...p,allergies:JSON.parse(p.allergies||'[]'),medical_history:JSON.parse(p.medical_history||'[]')})));}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/patients/:id',auth,async(req,res)=>{try{const r=await db.execute({sql:'SELECT * FROM patients WHERE id=?',args:[req.params.id]});const p=r.rows[0];if(!p)return res.status(404).json({error:'Not found'});res.json({...p,allergies:JSON.parse(p.allergies||'[]'),medical_history:JSON.parse(p.medical_history||'[]')});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/patients',auth,doctorOnly,async(req,res)=>{try{const{name,name_original,age,gender,phone,language,allergies,medical_history,notes}=req.body;const r=await db.execute({sql:`INSERT INTO patients (name,name_original,age,gender,phone,language,allergies,medical_history,notes) VALUES (?,?,?,?,?,?,?,?,?)`,args:[name,name_original,age,gender,phone,language||'ru',JSON.stringify(allergies||[]),JSON.stringify(medical_history||[]),notes]});res.json({id:Number(r.lastInsertRowid)});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/patients/:id',auth,doctorOnly,async(req,res)=>{try{const{name,name_original,age,gender,phone,language,allergies,medical_history,notes}=req.body;await db.execute({sql:`UPDATE patients SET name=?,name_original=?,age=?,gender=?,phone=?,language=?,allergies=?,medical_history=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[name,name_original,age,gender,phone,language,JSON.stringify(allergies||[]),JSON.stringify(medical_history||[]),notes,req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/patients/:id',auth,doctorOnly,async(req,res)=>{try{await db.execute({sql:'DELETE FROM patients WHERE id=?',args:[req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// ── Records ───────────────────────────────────────────────────────
app.get('/api/patients/:id/records',auth,async(req,res)=>{try{const r=await db.execute({sql:'SELECT * FROM records WHERE patient_id=? ORDER BY visit_date DESC',args:[req.params.id]});res.json(r.rows);}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/patients/:id/records',auth,doctorOnly,async(req,res)=>{try{const{chief_complaint,history,examination,diagnosis,treatment,raw_transcript,ai_generated}=req.body;const r=await db.execute({sql:`INSERT INTO records (patient_id,doctor_id,chief_complaint,history,examination,diagnosis,treatment,raw_transcript,ai_generated) VALUES (?,?,?,?,?,?,?,?,?)`,args:[req.params.id,req.user.id,chief_complaint,history,examination,diagnosis,treatment,raw_transcript,ai_generated?1:0]});res.json({id:Number(r.lastInsertRowid)});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/records/:id',auth,doctorOnly,async(req,res)=>{try{await db.execute({sql:'DELETE FROM records WHERE id=?',args:[req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// ── Queue ─────────────────────────────────────────────────────────
app.get('/api/queue/today',auth,async(req,res)=>{try{const today=new Date().toISOString().split('T')[0];const r=await db.execute({sql:`SELECT q.*,p.name,p.name_original,p.age,p.gender,p.allergies,p.medical_history,p.language FROM queue q JOIN patients p ON q.patient_id=p.id WHERE q.queue_date=? ORDER BY q.queue_number ASC`,args:[today]});res.json(r.rows.map(q=>({...q,allergies:JSON.parse(q.allergies||'[]'),medical_history:JSON.parse(q.medical_history||'[]')})));}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/queue',auth,async(req,res)=>{try{const today=new Date().toISOString().split('T')[0];const last=await db.execute({sql:'SELECT MAX(queue_number) as max FROM queue WHERE queue_date=?',args:[today]});const num=(Number(last.rows[0].max)||0)+1;const r=await db.execute({sql:'INSERT INTO queue (patient_id,queue_date,queue_number,notes) VALUES (?,?,?,?)',args:[req.body.patient_id,today,num,req.body.notes||'']});res.json({id:Number(r.lastInsertRowid),queue_number:num});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/queue/:id/status',auth,async(req,res)=>{try{const{status}=req.body;if(status==='in_progress')await db.execute({sql:'UPDATE queue SET status=?,started_at=CURRENT_TIMESTAMP WHERE id=?',args:[status,req.params.id]});else if(status==='done')await db.execute({sql:'UPDATE queue SET status=?,finished_at=CURRENT_TIMESTAMP WHERE id=?',args:[status,req.params.id]});else await db.execute({sql:'UPDATE queue SET status=? WHERE id=?',args:[status,req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/queue/:id',auth,async(req,res)=>{try{await db.execute({sql:'DELETE FROM queue WHERE id=?',args:[req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// ── Medicines ─────────────────────────────────────────────────────
app.get('/api/medicines/alerts',auth,async(req,res)=>{try{const today=new Date().toISOString().split('T')[0];const days=Number(await getSetting('expiry_warning_days'))||14;const warn=new Date();warn.setDate(warn.getDate()+days);const warnDate=warn.toISOString().split('T')[0];const[expired,expiring,lowStock]=await Promise.all([db.execute({sql:`SELECT * FROM medicines WHERE expiry_date < ?`,args:[today]}),db.execute({sql:`SELECT * FROM medicines WHERE expiry_date >= ? AND expiry_date <= ?`,args:[today,warnDate]}),db.execute(`SELECT * FROM medicines WHERE stock <= min_stock`)]);res.json({expired:expired.rows,expiring:expiring.rows,low_stock:lowStock.rows});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/medicines',auth,async(req,res)=>{try{const{q}=req.query;const result=q?await db.execute({sql:`SELECT * FROM medicines WHERE name LIKE ? OR name_ru LIKE ? OR category LIKE ? ORDER BY name ASC`,args:[`%${q}%`,`%${q}%`,`%${q}%`]}):await db.execute('SELECT * FROM medicines ORDER BY name ASC');const today=new Date().toISOString().split('T')[0];const days=Number(await getSetting('expiry_warning_days'))||14;const warn=new Date();warn.setDate(warn.getDate()+days);const warnDate=warn.toISOString().split('T')[0];res.json(result.rows.map(m=>({...m,stock:Number(m.stock),min_stock:Number(m.min_stock),expired:m.expiry_date&&m.expiry_date<today,expiring_soon:m.expiry_date&&m.expiry_date>=today&&m.expiry_date<=warnDate,low_stock:Number(m.stock)<=Number(m.min_stock)})));}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/medicines',auth,doctorOnly,async(req,res)=>{try{const{name,name_ru,category,specification,unit,stock,min_stock,expiry_date,manufacturer,notes}=req.body;const r=await db.execute({sql:`INSERT INTO medicines (name,name_ru,category,specification,unit,stock,min_stock,expiry_date,manufacturer,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,args:[name,name_ru,category,specification,unit||'片',stock||0,min_stock||10,expiry_date,manufacturer,notes]});res.json({id:Number(r.lastInsertRowid)});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/medicines/:id',auth,doctorOnly,async(req,res)=>{try{const{name,name_ru,category,specification,unit,stock,min_stock,expiry_date,manufacturer,notes}=req.body;await db.execute({sql:`UPDATE medicines SET name=?,name_ru=?,category=?,specification=?,unit=?,stock=?,min_stock=?,expiry_date=?,manufacturer=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[name,name_ru,category,specification,unit,stock,min_stock,expiry_date,manufacturer,notes,req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.patch('/api/medicines/:id/stock',auth,doctorOnly,async(req,res)=>{try{await db.execute({sql:`UPDATE medicines SET stock=MAX(0,stock+?),updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[req.body.delta,req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/medicines/:id',auth,doctorOnly,async(req,res)=>{try{await db.execute({sql:'DELETE FROM medicines WHERE id=?',args:[req.params.id]});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// ── AI Transcribe ─────────────────────────────────────────────────
app.post('/api/transcribe',auth,doctorOnly,upload.single('audio'),async(req,res)=>{
  let renamedPath=null;
  const apiKey=process.env.OPENAI_API_KEY||await getSetting('openai_api_key');
  if(!apiKey)return res.status(400).json({error:'OpenAI API Key 未配置，请在超级管理员后台设置'});
  try{
    const{default:OpenAI}=await import('openai');
    const openai=new OpenAI({apiKey});
    const mime=req.file.mimetype||'audio/webm';
    const ext=mime.includes('mp4')?'.mp4':mime.includes('ogg')?'.ogg':'.webm';
    renamedPath=req.file.path+ext;
    fs.renameSync(req.file.path,renamedPath);
    const transcription=await openai.audio.transcriptions.create({file:fs.createReadStream(renamedPath),model:'whisper-1',language:req.body.language||'ru'});
    cleanup(renamedPath);
    res.json({text:transcription.text});
  }catch(e){cleanup(renamedPath,req.file?.path);res.status(500).json({error:e.message});}
});

// ── AI Organize ───────────────────────────────────────────────────
app.post('/api/ai/organize',auth,doctorOnly,async(req,res)=>{
  const apiKey=process.env.ANTHROPIC_API_KEY||await getSetting('anthropic_api_key');
  if(!apiKey)return res.status(400).json({error:'Anthropic API Key 未配置，请在超级管理员后台设置'});
  const{transcript,patient}=req.body;
  try{
    const Anthropic=(await import('@anthropic-ai/sdk')).default;
    const client=new Anthropic({apiKey});
    const prompt=`你是一名专业的医疗记录整理助手。请将以下医患对话内容整理成标准病历格式。\n\n病人信息：${patient?.name||''}，${patient?.age||''}岁，${patient?.gender||''}\n已知过敏史：${(patient?.allergies||[]).join('、')||'无'}\n既往病史：${(patient?.medical_history||[]).join('、')||'无'}\n\n对话内容：\n${transcript}\n\n请用中文输出，严格按照以下JSON格式返回，不要有其他内容：\n{"chief_complaint":"主诉","history":"现病史","examination":"体格检查（没有则返回空字符串）","diagnosis":"初步诊断","treatment":"处理方案"}`;
    const message=await client.messages.create({model:'claude-sonnet-4-20250514',max_tokens:1024,messages:[{role:'user',content:prompt}]});
    const clean=message.content[0].text.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(clean));
  }catch(e){res.status(500).json({error:e.message});}
});

// ── Stats ─────────────────────────────────────────────────────────
app.get('/api/stats',auth,async(req,res)=>{try{const today=new Date().toISOString().split('T')[0];const[total,todayTotal,todayDone,withAllergy,totalRecords,totalMeds]=await Promise.all([db.execute('SELECT COUNT(*) as c FROM patients'),db.execute({sql:'SELECT COUNT(*) as c FROM queue WHERE queue_date=?',args:[today]}),db.execute({sql:"SELECT COUNT(*) as c FROM queue WHERE queue_date=? AND status='done'",args:[today]}),db.execute("SELECT COUNT(*) as c FROM patients WHERE allergies!='[]'"),db.execute('SELECT COUNT(*) as c FROM records'),db.execute('SELECT COUNT(*) as c FROM medicines')]);res.json({total:Number(total.rows[0].c),todayTotal:Number(todayTotal.rows[0].c),todayDone:Number(todayDone.rows[0].c),withAllergy:Number(withAllergy.rows[0].c),totalRecords:Number(totalRecords.rows[0].c),totalMeds:Number(totalMeds.rows[0].c)});}catch(e){res.status(500).json({error:e.message});}});

// ── WhatsApp ──────────────────────────────────────────────────────
app.get('/api/whatsapp/clinic-number',auth,async(req,res)=>{res.json({number:process.env.CLINIC_WHATSAPP||await getSetting('clinic_whatsapp')||''});});
app.get('/api/whatsapp/record-link/:recordId',auth,async(req,res)=>{try{const rRes=await db.execute({sql:'SELECT * FROM records WHERE id=?',args:[req.params.recordId]});const r=rRes.rows[0];if(!r)return res.status(404).json({error:'Not found'});const pRes=await db.execute({sql:'SELECT * FROM patients WHERE id=?',args:[r.patient_id]});const p=pRes.rows[0];const clinicName=await getSetting('clinic_name');const date=new Date(r.visit_date).toLocaleDateString('zh-CN');const text=[`🏥 ${clinicName} 就诊记录`,`━━━━━━━━━━━━━━`,`👤 姓名：${p.name}`,`📅 就诊日期：${date}`,r.chief_complaint?`📋 主诉：${r.chief_complaint}`:'',r.diagnosis?`🔍 诊断：${r.diagnosis}`:'',r.treatment?`💊 处方：${r.treatment}`:'',`━━━━━━━━━━━━━━`,`如有疑问请联系诊所`].filter(Boolean).join('\n');const phone=(p.phone||'').replace(/\D/g,'');res.json({link:`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,text,phone});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/whatsapp/reminder',auth,async(req,res)=>{try{const{patient_id,days,custom_message}=req.body;const pRes=await db.execute({sql:'SELECT * FROM patients WHERE id=?',args:[patient_id]});const p=pRes.rows[0];if(!p)return res.status(404).json({error:'Not found'});const clinicName=await getSetting('clinic_name');const d=new Date();d.setDate(d.getDate()+(days||7));const dateStr=d.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});const text=custom_message||[`🏥 ${clinicName} 复诊提醒`,`━━━━━━━━━━━━━━`,`您好，${p.name}！`,``,`提醒您于 ${dateStr} 前来复诊。`,``,`如需更改时间，请回复此消息或致电诊所。`,`━━━━━━━━━━━━━━`].join('\n');const phone=(p.phone||'').replace(/\D/g,'');res.json({link:`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,text,phone});}catch(e){res.status(500).json({error:e.message});}});





// ── API Usage Stats ───────────────────────────────────────────────
app.get('/api/admin/api-usage', auth, superOnly, async (req, res) => {
  try {
    const { month } = req.query;
    const target = month || new Date().toISOString().slice(0,7);

    const [summary, byService, byDay, total] = await Promise.all([
      db.execute({ sql: `SELECT service, COUNT(*) as calls, SUM(cost_usd) as total_cost FROM api_usage WHERE created_at LIKE ? GROUP BY service ORDER BY total_cost DESC`, args: [target+'%'] }),
      db.execute({ sql: `SELECT service, COUNT(*) as calls, ROUND(SUM(cost_usd),4) as cost FROM api_usage WHERE created_at LIKE ? GROUP BY service`, args: [target+'%'] }),
      db.execute({ sql: `SELECT DATE(created_at) as day, COUNT(*) as calls, ROUND(SUM(cost_usd),4) as cost FROM api_usage WHERE created_at LIKE ? GROUP BY DATE(created_at) ORDER BY day ASC`, args: [target+'%'] }),
      db.execute({ sql: `SELECT COUNT(*) as calls, ROUND(SUM(cost_usd),4) as cost FROM api_usage WHERE created_at LIKE ?`, args: [target+'%'] }),
    ]);

    const allTime = await db.execute(`SELECT COUNT(*) as calls, ROUND(SUM(cost_usd),4) as cost FROM api_usage`);

    res.json({
      month: target,
      summary: summary.rows,
      byService: byService.rows,
      byDay: byDay.rows,
      monthTotal: { calls: Number(total.rows[0].calls), cost: Number(total.rows[0].cost) },
      allTime: { calls: Number(allTime.rows[0].calls), cost: Number(allTime.rows[0].cost) },
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Stats Dashboard ───────────────────────────────────────────────
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0,7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth()-1)).toISOString().slice(0,7);

    // Monthly visits for last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      months.push(d.toISOString().slice(0,7));
    }
    const monthlyVisits = await Promise.all(months.map(m =>
      db.execute({ sql: "SELECT COUNT(*) as c FROM queue WHERE queue_date LIKE ? AND status='done'", args: [m+'%'] })
    ));
    const monthlyRevenue = await Promise.all(months.map(m =>
      db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE visit_date LIKE ? AND status='paid'", args: [m+'%'] })
    ));

    // Top diagnoses
    const topDiagnoses = await db.execute("SELECT diagnosis, COUNT(*) as count FROM records WHERE diagnosis IS NOT NULL AND diagnosis != '' GROUP BY diagnosis ORDER BY count DESC LIMIT 10");

    // Patient stats
    const totalPatients = await db.execute('SELECT COUNT(*) as c FROM patients');
    const newPatientsThisMonth = await db.execute({ sql: "SELECT COUNT(*) as c FROM patients WHERE created_at LIKE ?", args: [thisMonth+'%'] });
    const newPatientsLastMonth = await db.execute({ sql: "SELECT COUNT(*) as c FROM patients WHERE created_at LIKE ?", args: [lastMonth+'%'] });

    // Revenue comparison
    const revenueThis = await db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE visit_date LIKE ? AND status='paid'", args: [thisMonth+'%'] });
    const revenueLast = await db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE visit_date LIKE ? AND status='paid'", args: [lastMonth+'%'] });

    // Follow-up needed (no visit in 30+ days, has chronic disease)
    const followUpNeeded = await db.execute(`
      SELECT p.id, p.name, p.phone, p.medical_history, MAX(q.queue_date) as last_visit
      FROM patients p
      LEFT JOIN queue q ON p.patient_id = q.patient_id OR p.id = q.patient_id
      WHERE p.medical_history != '[]'
      GROUP BY p.id
      HAVING last_visit IS NULL OR last_visit < date('now', '-30 days')
      ORDER BY last_visit ASC LIMIT 20
    `);

    // Today stats
    const todayVisits = await db.execute({ sql: "SELECT COUNT(*) as c FROM queue WHERE queue_date=? AND status='done'", args: [today] });
    const todayRevenue = await db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE visit_date=? AND status='paid'", args: [today] });
    const pendingPayments = await db.execute("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as t FROM payments WHERE status='pending'");

    res.json({
      monthlyVisits: months.map((m, i) => ({ month: m, count: Number(monthlyVisits[i].rows[0].c) })),
      monthlyRevenue: months.map((m, i) => ({ month: m, total: Number(monthlyRevenue[i].rows[0].total) })),
      topDiagnoses: topDiagnoses.rows,
      totalPatients: Number(totalPatients.rows[0].c),
      newPatientsThisMonth: Number(newPatientsThisMonth.rows[0].c),
      newPatientsLastMonth: Number(newPatientsLastMonth.rows[0].c),
      revenueThis: Number(revenueThis.rows[0].t),
      revenueLast: Number(revenueLast.rows[0].t),
      followUpNeeded: followUpNeeded.rows.map(p => ({ ...p, medical_history: JSON.parse(p.medical_history||'[]') })),
      todayVisits: Number(todayVisits.rows[0].c),
      todayRevenue: Number(todayRevenue.rows[0].t),
      pendingCount: Number(pendingPayments.rows[0].c),
      pendingTotal: Number(pendingPayments.rows[0].t),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Export ────────────────────────────────────────────────────────
app.get('/api/export/patients', auth, doctorOnly, async (req, res) => {
  try {
    const patients = await db.execute('SELECT * FROM patients ORDER BY name');
    const rows = patients.rows.map(p => ({
      ...p,
      allergies: JSON.parse(p.allergies||'[]').join('、'),
      medical_history: JSON.parse(p.medical_history||'[]').join('、'),
    }));
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/export/payments', auth, doctorOnly, async (req, res) => {
  try {
    const { month } = req.query;
    const sql = month
      ? `SELECT pay.*,p.name FROM payments pay JOIN patients p ON pay.patient_id=p.id WHERE pay.visit_date LIKE ? ORDER BY pay.visit_date DESC`
      : `SELECT pay.*,p.name FROM payments pay JOIN patients p ON pay.patient_id=p.id ORDER BY pay.visit_date DESC`;
    const args = month ? [month+'%'] : [];
    const result = await db.execute({ sql, args });
    res.json(result.rows.map(r=>({...r,amount:Number(r.amount)})));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Announcements ─────────────────────────────────────────────────
app.get('/api/announcements', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const r = await db.execute({ sql: `SELECT * FROM announcements WHERE is_active=1 AND (expires_at IS NULL OR expires_at >= ?) ORDER BY created_at DESC`, args: [today] });
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/announcements/all', auth, superOnly, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/announcements', auth, superOnly, async (req, res) => {
  try {
    const { title, content, type, expires_at } = req.body;
    const r = await db.execute({ sql: 'INSERT INTO announcements (title,content,type,expires_at,created_by) VALUES (?,?,?,?,?)', args: [title, content, type||'info', expires_at||null, req.user.id] });
    res.json({ id: Number(r.lastInsertRowid) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/announcements/:id', auth, superOnly, async (req, res) => {
  try {
    const { title, content, type, is_active, expires_at } = req.body;
    await db.execute({ sql: 'UPDATE announcements SET title=?,content=?,type=?,is_active=?,expires_at=? WHERE id=?', args: [title, content, type, is_active?1:0, expires_at||null, req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/announcements/:id', auth, superOnly, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM announcements WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Follow-up WhatsApp ────────────────────────────────────────────
app.post('/api/followup/wa-link', auth, async (req, res) => {
  try {
    const { patient_id, custom_message } = req.body;
    const pRes = await db.execute({ sql: 'SELECT * FROM patients WHERE id=?', args: [patient_id] });
    const p = pRes.rows[0];
    if (!p) return res.status(404).json({ error: 'Not found' });
    const clinicName = await getSetting('clinic_name');
    const diseases = JSON.parse(p.medical_history||'[]').join('、');
    const text = custom_message || [
      `🏥 ${clinicName}`,
      `━━━━━━━━━━━━━━`,
      `您好，${p.name}！`,
      ``,
      `我们注意到您已有一段时间未来复诊。`,
      diseases ? `您有${diseases}等慢性病史，建议定期复查。` : `建议您近期来诊所做一次检查。`,
      ``,
      `请回复此消息预约就诊时间。`,
      `━━━━━━━━━━━━━━`,
    ].join('\n');
    const phone = (p.phone||'').replace(/\D/g,'');
    res.json({ link: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, phone, name: p.name });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Prescription Templates ────────────────────────────────────────
app.get('/api/templates', auth, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM prescription_templates ORDER BY usage_count DESC, name ASC');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/templates', auth, doctorOnly, async (req, res) => {
  try {
    const { name, category, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: '请填写模板名称和内容' });
    const r = await db.execute({ sql: 'INSERT INTO prescription_templates (name,category,content,created_by) VALUES (?,?,?,?)', args: [name, category||'', content, req.user.id] });
    res.json({ id: Number(r.lastInsertRowid) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/templates/:id', auth, doctorOnly, async (req, res) => {
  try {
    const { name, category, content } = req.body;
    await db.execute({ sql: 'UPDATE prescription_templates SET name=?,category=?,content=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', args: [name, category, content, req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/templates/:id/use', auth, async (req, res) => {
  try {
    await db.execute({ sql: 'UPDATE prescription_templates SET usage_count=usage_count+1 WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/templates/:id', auth, doctorOnly, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM prescription_templates WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Attachments ───────────────────────────────────────────────────
app.get('/api/patients/:id/attachments', auth, async (req, res) => {
  try {
    const r = await db.execute({ sql: 'SELECT * FROM attachments WHERE patient_id=? ORDER BY created_at DESC', args: [req.params.id] });
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/attachments', auth, doctorOnly, upload.single('file'), async (req, res) => {
  try {
    const { patient_id, record_id, description } = req.body;
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const r = await db.execute({ sql: 'INSERT INTO attachments (patient_id,record_id,filename,original_name,file_type,file_size,description) VALUES (?,?,?,?,?,?,?)', args: [patient_id, record_id||null, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, description||''] });
    res.json({ id: Number(r.lastInsertRowid), filename: req.file.filename });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/attachments/:filename', auth, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
});


// ── AI Analyze Lab Result ─────────────────────────────────────────
app.post('/api/attachments/:id/analyze', auth, doctorOnly, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || await getSetting('anthropic_api_key');
  if (!apiKey) return res.status(400).json({ error: 'Anthropic API Key 未配置' });
  try {
    const attRes = await db.execute({ sql: 'SELECT * FROM attachments WHERE id=?', args: [req.params.id] });
    const att = attRes.rows[0];
    if (!att) return res.status(404).json({ error: 'Not found' });

    const filePath = path.join(__dirname, 'uploads', att.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString('base64');
    const mediaType = att.file_type || 'image/jpeg';

    const prompt = `你是一名专业的医疗检验报告分析助手。请仔细阅读这份化验单/检查报告，用中文给出专业分析。

请按以下格式输出：

**📋 报告类型**
（说明这是什么类型的检查，例：血常规、尿常规、生化全套等）

**📊 主要指标分析**
（列出重要指标，标注正常/偏高/偏低，用✅❌⚠️标记）

**🔍 异常指标解读**
（详细解释异常指标的临床意义）

**💡 临床建议**
（给出诊疗参考建议，注意事项）

**⚠️ 注意**
（如有需要紧急处理的指标请特别标出）

请用简洁专业的语言，方便医生快速了解关键信息。`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    });

    const analysis = message.content[0].text;
    // Save analysis to attachment description
    await db.execute({ sql: 'UPDATE attachments SET description=? WHERE id=?', args: [att.description + '\n[AI分析已完成]', att.id] });
    res.json({ analysis });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/attachments/:id', auth, doctorOnly, async (req, res) => {
  try {
    const r = await db.execute({ sql: 'SELECT filename FROM attachments WHERE id=?', args: [req.params.id] });
    if (r.rows[0]) cleanup(path.join(__dirname, 'uploads', r.rows[0].filename));
    await db.execute({ sql: 'DELETE FROM attachments WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Appointments ──────────────────────────────────────────────────
app.get('/api/appointments', auth, async (req, res) => {
  try {
    const { date, month } = req.query;
    let result;
    if (date) {
      result = await db.execute({ sql: `SELECT a.*,p.name,p.name_original,p.phone,p.allergies FROM appointments a JOIN patients p ON a.patient_id=p.id WHERE a.appointment_date=? ORDER BY a.appointment_time ASC`, args: [date] });
    } else if (month) {
      result = await db.execute({ sql: `SELECT a.*,p.name,p.name_original,p.phone,p.allergies FROM appointments a JOIN patients p ON a.patient_id=p.id WHERE a.appointment_date LIKE ? ORDER BY a.appointment_date,a.appointment_time ASC`, args: [month+'%'] });
    } else {
      const today = new Date().toISOString().split('T')[0];
      result = await db.execute({ sql: `SELECT a.*,p.name,p.name_original,p.phone,p.allergies FROM appointments a JOIN patients p ON a.patient_id=p.id WHERE a.appointment_date >= ? ORDER BY a.appointment_date,a.appointment_time ASC LIMIT 50`, args: [today] });
    }
    res.json(result.rows.map(a=>({...a, allergies: JSON.parse(a.allergies||'[]')})));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', auth, async (req, res) => {
  try {
    const { patient_id, appointment_date, appointment_time, duration_minutes, notes } = req.body;
    // Check conflict
    const conflict = await db.execute({ sql: `SELECT id FROM appointments WHERE appointment_date=? AND appointment_time=? AND status!='cancelled'`, args: [appointment_date, appointment_time] });
    if (conflict.rows.length > 0) return res.status(400).json({ error: '该时间段已被预约' });
    const r = await db.execute({ sql: `INSERT INTO appointments (patient_id,doctor_id,appointment_date,appointment_time,duration_minutes,notes) VALUES (?,?,?,?,?,?)`, args: [patient_id, req.user.id, appointment_date, appointment_time, duration_minutes||30, notes||''] });
    res.json({ id: Number(r.lastInsertRowid) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', auth, async (req, res) => {
  try {
    const { appointment_date, appointment_time, duration_minutes, status, notes, wa_sent } = req.body;
    await db.execute({ sql: `UPDATE appointments SET appointment_date=?,appointment_time=?,duration_minutes=?,status=?,notes=?,wa_sent=? WHERE id=?`, args: [appointment_date, appointment_time, duration_minutes, status, notes, wa_sent?1:0, req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', auth, async (req, res) => {
  try {
    await db.execute({ sql: "UPDATE appointments SET status='cancelled' WHERE id=?", args: [req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/appointments/slots/:date', auth, async (req, res) => {
  try {
    const date = req.params.date;
    const dow = new Date(date).getDay();
    const slots = await db.execute({ sql: `SELECT * FROM time_slots WHERE day_of_week=? AND is_active=1 ORDER BY start_time`, args: [dow] });
    const booked = await db.execute({ sql: `SELECT appointment_time FROM appointments WHERE appointment_date=? AND status!='cancelled'`, args: [date] });
    const bookedTimes = booked.rows.map(b => b.appointment_time);
    res.json(slots.rows.map(s => ({ ...s, booked: bookedTimes.includes(s.start_time) })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// WhatsApp appointment notification
app.get('/api/appointments/:id/wa-link', auth, async (req, res) => {
  try {
    const aRes = await db.execute({ sql: `SELECT a.*,p.name,p.phone FROM appointments a JOIN patients p ON a.patient_id=p.id WHERE a.id=?`, args: [req.params.id] });
    const a = aRes.rows[0];
    if (!a) return res.status(404).json({ error: 'Not found' });
    const clinicName = await getSetting('clinic_name');
    const text = [`🏥 ${clinicName} 预约确认`,`━━━━━━━━━━━━━━`,`您好，${a.name}！`,``,`您的预约已确认：`,`📅 日期：${a.appointment_date}`,`⏰ 时间：${a.appointment_time}`,``,`请准时到诊，如需取消请提前告知。`,`━━━━━━━━━━━━━━`].join('\n');
    const phone = (a.phone||'').replace(/\D/g,'');
    res.json({ link: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, phone });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Payments ──────────────────────────────────────────────────────
app.get('/api/payments', auth, async (req, res) => {
  try {
    const { month, patient_id, status } = req.query;
    let sql = `SELECT pay.*,p.name,p.name_original FROM payments pay JOIN patients p ON pay.patient_id=p.id WHERE 1=1`;
    const args = [];
    if (month) { sql += ` AND pay.visit_date LIKE ?`; args.push(month+'%'); }
    if (patient_id) { sql += ` AND pay.patient_id=?`; args.push(patient_id); }
    if (status) { sql += ` AND pay.status=?`; args.push(status); }
    sql += ` ORDER BY pay.created_at DESC`;
    const result = await db.execute({ sql, args });
    res.json(result.rows.map(p=>({...p, amount: Number(p.amount)})));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payments', auth, doctorOnly, async (req, res) => {
  try {
    const { patient_id, record_id, appointment_id, amount, currency, method, status, description, visit_date } = req.body;
    const r = await db.execute({ sql: `INSERT INTO payments (patient_id,record_id,appointment_id,amount,currency,method,status,description,visit_date) VALUES (?,?,?,?,?,?,?,?,?)`, args: [patient_id, record_id||null, appointment_id||null, amount, currency||'KZT', method||'cash', status||'paid', description||'', visit_date||new Date().toISOString().split('T')[0]] });
    res.json({ id: Number(r.lastInsertRowid) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/payments/:id', auth, doctorOnly, async (req, res) => {
  try {
    const { amount, method, status, description } = req.body;
    await db.execute({ sql: `UPDATE payments SET amount=?,method=?,status=?,description=? WHERE id=?`, args: [amount, method, status, description, req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/payments/:id', auth, doctorOnly, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM payments WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/payments/stats', auth, async (req, res) => {
  try {
    const { month } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0,7);
    const targetMonth = month || thisMonth;
    const [monthTotal, monthCount, pendingTotal, todayTotal, methodStats] = await Promise.all([
      db.execute({ sql: `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE visit_date LIKE ? AND status='paid'`, args: [targetMonth+'%'] }),
      db.execute({ sql: `SELECT COUNT(*) as c FROM payments WHERE visit_date LIKE ? AND status='paid'`, args: [targetMonth+'%'] }),
      db.execute({ sql: `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='pending'`, args: [] }),
      db.execute({ sql: `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE visit_date=? AND status='paid'`, args: [today] }),
      db.execute({ sql: `SELECT method, SUM(amount) as total, COUNT(*) as count FROM payments WHERE visit_date LIKE ? AND status='paid' GROUP BY method`, args: [targetMonth+'%'] }),
    ]);
    res.json({
      monthTotal: Number(monthTotal.rows[0].total),
      monthCount: Number(monthCount.rows[0].c),
      pendingTotal: Number(pendingTotal.rows[0].total),
      todayTotal: Number(todayTotal.rows[0].total),
      methodStats: methodStats.rows,
      targetMonth,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT=process.env.PORT||3001;
initDB().then(()=>{app.listen(PORT,()=>console.log(`✅ 诊所服务器已启动 → http://localhost:${PORT}`));}).catch(e=>{console.error('❌ 启动失败:',e);process.exit(1);});

// Serve Frontend
import { createRequire } from 'module';
const __require = createRequire(import.meta.url);
const _publicDir = path.join(__dirname, 'public');
if (fs.existsSync(_publicDir)) {
  app.use(express.static(_publicDir));
  app.get('*', (_req, _res) => {
    _res.sendFile(path.join(_publicDir, 'index.html'));
  });
}
