import { createClient } from '@libsql/client';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = createClient({ url: `file:${path.join(__dirname, 'clinic.db')}` });

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'doctor',
      name TEXT NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_original TEXT,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      language TEXT DEFAULT 'ru',
      allergies TEXT DEFAULT '[]',
      medical_history TEXT DEFAULT '[]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      chief_complaint TEXT,
      history TEXT,
      examination TEXT,
      diagnosis TEXT,
      treatment TEXT,
      raw_transcript TEXT,
      ai_generated INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      queue_date TEXT NOT NULL,
      queue_number INTEGER NOT NULL,
      status TEXT DEFAULT 'waiting',
      notes TEXT,
      started_at DATETIME,
      finished_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ru TEXT,
      category TEXT,
      specification TEXT,
      unit TEXT DEFAULT '片',
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 10,
      expiry_date TEXT,
      manufacturer TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );




    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      endpoint TEXT,
      tokens_used INTEGER DEFAULT 0,
      duration_seconds REAL DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS prescription_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      content TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      record_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      wa_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      record_id INTEGER,
      appointment_id INTEGER,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'KZT',
      method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'paid',
      description TEXT,
      visit_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Default super admin
  const adminRes = await db.execute({ sql: "SELECT id FROM users WHERE username='admin'", args: [] });
  if (adminRes.rows.length === 0) {
    await db.execute({ sql: 'INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', args: ['admin', bcrypt.hashSync('admin123',10), 'superadmin', '超级管理员'] });
    await db.execute({ sql: 'INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', args: ['doctor', bcrypt.hashSync('doctor123',10), 'doctor', '主治医生'] });
    await db.execute({ sql: 'INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', args: ['nurse', bcrypt.hashSync('nurse123',10), 'nurse', '前台护士'] });

    // Default settings
    const defaults = [
      ['clinic_name', '阿斯塔纳诊所'],
      ['clinic_name_ru', 'Астана Клиника'],
      ['clinic_address', '阿斯塔纳市'],
      ['clinic_phone', ''],
      ['clinic_whatsapp', ''],
      ['clinic_logo', '⚕️'],
      ['openai_api_key', ''],
      ['anthropic_api_key', ''],
      ['expiry_warning_days', '14'],
      ['primary_color', '#1f3864'],
    ];
    for (const [k, v] of defaults) {
      await db.execute({ sql: 'INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)', args: [k, v] });
    }

    // Sample patients
    const p1 = await db.execute({ sql: `INSERT INTO patients (name,name_original,age,gender,phone,language,allergies,medical_history) VALUES (?,?,?,?,?,?,?,?)`, args: ['阿丽娅·别科娃','Алия Бекова',34,'女','+77012345678','kk',JSON.stringify(['青霉素','阿司匹林']),JSON.stringify(['过敏性鼻炎'])] });
    const p2 = await db.execute({ sql: `INSERT INTO patients (name,name_original,age,gender,phone,language,allergies,medical_history) VALUES (?,?,?,?,?,?,?,?)`, args: ['努尔兰·赛特卡利','Нурлан Сейткали',52,'男','+77773456789','ru',JSON.stringify(['磺胺类']),JSON.stringify(['2型糖尿病','高血压'])] });
    await db.execute({ sql: `INSERT INTO patients (name,name_original,age,gender,phone,language,allergies,medical_history) VALUES (?,?,?,?,?,?,?,?)`, args: ['莱拉·阿赫梅托娃','Лейла Ахметова',28,'女','+77024567890','kk',JSON.stringify([]),JSON.stringify(['孕24周'])] });
    await db.execute({ sql: `INSERT INTO records (patient_id,chief_complaint,diagnosis,treatment,ai_generated,visit_date) VALUES (?,?,?,?,?,?)`, args: [p1.lastInsertRowid,'头痛发热3天','急性上呼吸道感染','布洛芬0.4g tid × 5天',1,'2026-03-10 09:30:00'] });
    await db.execute({ sql: `INSERT INTO records (patient_id,chief_complaint,diagnosis,treatment,ai_generated,visit_date) VALUES (?,?,?,?,?,?)`, args: [p2.lastInsertRowid,'血糖控制不佳','2型糖尿病控制不稳','调整二甲双胍至1g bid',1,'2026-03-12 10:15:00'] });

    const meds = [
      ['布洛芬片','Ибупрофен','解热镇痛','0.4g×100片','片',200,20,'2027-06-30','拜耳'],
      ['阿莫西林胶囊','Амоксициллин','抗生素','0.5g×24粒','粒',96,24,'2026-12-31','哈药集团'],
      ['二甲双胍片','Метформин','降糖药','0.5g×60片','片',120,30,'2026-08-20','正大天晴'],
      ['氨氯地平片','Амлодипин','降压药','5mg×30片','片',90,30,'2026-11-30','辉瑞'],
      ['头孢克洛胶囊','Цефаклор','抗生素','0.25g×24粒','粒',48,24,'2026-03-25','礼来'],
    ];
    for (const m of meds) {
      await db.execute({ sql: `INSERT INTO medicines (name,name_ru,category,specification,unit,stock,min_stock,expiry_date,manufacturer) VALUES (?,?,?,?,?,?,?,?,?)`, args: m });
    }
    // Default prescription templates
    const tmplCheck = await db.execute('SELECT COUNT(*) as c FROM prescription_templates');
    if (Number(tmplCheck.rows[0].c) === 0) {
      const templates = [
        ['感冒标准处方', '感冒/上呼吸道', '布洛芬片 0.4g tid × 3天\n阿莫西林胶囊 0.5g tid × 5天\n嘱多休息、多饮水，体温超过39°C及时就诊'],
        ['高血压复诊处方', '慢性病', '氨氯地平片 5mg qd（长期）\n嘱低盐低脂饮食，每日监测血压，4周后复查'],
        ['糖尿病复诊处方', '慢性病', '二甲双胍片 0.5g bid（餐后）\n嘱控制饮食，适当运动，监测空腹血糖，4周后复查HbA1c'],
        ['腰背痛处方', '疼痛', '双氯芬酸钠 75mg qd × 5天\n扶他林乳胶剂 外用 tid\n嘱注意休息，避免重体力劳动'],
        ['产前检查医嘱', '产科', '叶酸片 0.4mg qd（继续）\n碳酸钙D3片 600mg qd\n嘱均衡饮食，适当散步，4周后复查'],
        ['儿童发热处方', '儿科', '布洛芬混悬液 按体重给药（5-10mg/kg）tid\n嘱多饮水，物理降温，体温超过39°C及时复诊'],
      ];
      for (const [name, category, content] of templates) {
        await db.execute({ sql: 'INSERT INTO prescription_templates (name,category,content) VALUES (?,?,?)', args: [name, category, content] });
      }
    }
    // Default time slots (Mon-Sat, 9:00-18:00, 30min slots)
    const slotCheck = await db.execute('SELECT COUNT(*) as c FROM time_slots');
    if (Number(slotCheck.rows[0].c) === 0) {
      for (let day = 1; day <= 6; day++) {
        const times = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];
        for (const t of times) {
          const [h,m] = t.split(':').map(Number);
          const endH = m === 30 ? h+1 : h;
          const endM = m === 30 ? '00' : '30';
          const end = `${String(endH).padStart(2,'0')}:${endM}`;
          await db.execute({sql:'INSERT INTO time_slots (day_of_week,start_time,end_time) VALUES (?,?,?)',args:[day,t,end]});
        }
      }
    }
    console.log('✅ 初始数据已创建');
  }
  console.log('✅ 数据库初始化完成');
}

export default db;
