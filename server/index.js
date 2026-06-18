const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== 数据库初始化 ====================
const DB_PATH = path.join(__dirname, 'data.db');

let db;

// 封装 sql.js 使其 API 类似 better-sqlite3
function createDBWrapper(sqlDb) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          sqlDb.run(sql, params);
          return { lastInsertRowid: sqlDb.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] };
        },
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            cols.forEach((c, i) => obj[c] = vals[i]);
            stmt.free();
            return obj;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const results = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            cols.forEach((c, i) => obj[c] = vals[i]);
            results.push(obj);
          }
          stmt.free();
          return results;
        }
      };
    },
    exec(sql) {
      sqlDb.run(sql);
    }
  };
}

async function initDB() {
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }
  db = createDBWrapper(sqlDb);
  return sqlDb;
}

// 保存数据库到文件
function saveDB(sqlDb) {
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function start() {
  const sqlDb = await initDB();

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id),
      UNIQUE(school_id, name)
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );
    CREATE TABLE IF NOT EXISTS nav_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📚',
      color TEXT DEFAULT '#FF6B6B',
      link TEXT,
      is_local INTEGER DEFAULT 0,
      local_path TEXT,
      sort_order INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'chinese',
      difficulty TEXT DEFAULT 'easy',
      enabled INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      article_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      test_code TEXT NOT NULL,
      duration INTEGER DEFAULT 300,
      start_time TEXT,
      end_time TEXT,
      enabled INTEGER DEFAULT 1,
      FOREIGN KEY (article_id) REFERENCES articles(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      wpm REAL DEFAULT 0,
      accuracy REAL DEFAULT 0,
      correct_chars INTEGER DEFAULT 0,
      total_chars INTEGER DEFAULT 0,
      duration_seconds REAL DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (test_id) REFERENCES tests(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
    CREATE TABLE IF NOT EXISTS login_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
    CREATE TABLE IF NOT EXISTS practice_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      school_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      wpm REAL DEFAULT 0,
      accuracy REAL DEFAULT 0,
      correct_chars INTEGER DEFAULT 0,
      total_chars INTEGER DEFAULT 0,
      duration_seconds REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (article_id) REFERENCES articles(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
  `);

  // 初始化默认数据
  const cardCount = db.prepare('SELECT COUNT(*) as count FROM nav_cards').get();
  if (cardCount.count === 0) {
    const cards = [
      ['打字练习平台', '趣味打字练习，提升打字速度', '⌨️', '#FF6B6B', null, 1, '/typing', 0],
      ['百度', '搜索学习资料', '🔍', '#4ECDC4', 'https://www.baidu.com', 0, null, 1],
      ['百度翻译', '中英文翻译助手', '🌐', '#45B7D1', 'https://fanyi.baidu.com', 0, null, 2],
      ['新华字典', '在线查字典', '📖', '#96CEB4', 'https://zidian.cxwl.com', 0, null, 3],
      ['数学学习', '趣味数学练习', '🧮', '#FFEAA7', 'https://www.shuxuele.com', 0, null, 4],
      ['编程学习', 'Scratch趣味编程', '🤖', '#DDA0DD', 'https://scratch.mit.edu', 0, null, 5],
    ];
    const ins = db.prepare('INSERT INTO nav_cards (title, description, icon, color, link, is_local, local_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    cards.forEach(c => ins.run(...c));
  }

  const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get();
  if (articleCount.count === 0) {
    const articles = [
      ['春晓', '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', 'chinese', 'easy'],
      ['静夜思', '床前明月光，疑是地上霜。举头望明月，低头思故乡。', 'chinese', 'easy'],
      ['悯农', '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。', 'chinese', 'easy'],
      ['登鹳雀楼', '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', 'chinese', 'easy'],
      ['咏鹅', '鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。', 'chinese', 'easy'],
      ['The Sun', 'The sun is big and bright. It gives us light and heat. Plants need the sun to grow. We love the warm sunshine.', 'english', 'easy'],
      ['My School', 'I go to school every day. My school is big and beautiful. I have many friends at school. We study and play together.', 'english', 'easy'],
      ['Seasons', 'Spring is warm with flowers. Summer is hot with sunshine. Autumn is cool with leaves. Winter is cold with snow.', 'english', 'easy'],
    ];
    const ins = db.prepare('INSERT INTO articles (title, content, type, difficulty) VALUES (?, ?, ?, ?)');
    articles.forEach(a => ins.run(...a));
  }

  const schoolCount = db.prepare('SELECT COUNT(*) as count FROM schools').get();
  if (schoolCount.count === 0) {
    db.prepare("INSERT INTO schools (name) VALUES ('阳光小学')").run();
    db.prepare("INSERT INTO schools (name) VALUES ('实验小学')").run();
    db.prepare("INSERT INTO schools (name) VALUES ('育才小学')").run();

    const cls = [
      [1, '一年级(1)班'], [1, '一年级(2)班'], [1, '二年级(1)班'], [1, '三年级(1)班'],
      [2, '一年级(1)班'], [2, '二年级(1)班'],
      [3, '一年级(1)班'],
    ];
    const insCls = db.prepare('INSERT INTO classes (school_id, name) VALUES (?, ?)');
    cls.forEach(c => insCls.run(...c));

    const stu = [
      [1, 1, '张三'], [1, 1, '李四'], [1, 2, '王五'], [1, 3, '赵六'],
      [2, 5, '小明'], [3, 7, '小红'],
    ];
    const insStu = db.prepare('INSERT INTO students (school_id, class_id, name) VALUES (?, ?, ?)');
    stu.forEach(s => insStu.run(...s));
  }

  saveDB(sqlDb);

  // ==================== API 路由 ====================

  app.get('/api/schools', (req, res) => {
    const schools = db.prepare('SELECT * FROM schools ORDER BY id').all();
    saveDB(sqlDb);
    res.json(schools);
  });

  app.get('/api/classes/:schoolId', (req, res) => {
    const classes = db.prepare('SELECT * FROM classes WHERE school_id = ? ORDER BY id').all(Number(req.params.schoolId));
    saveDB(sqlDb);
    res.json(classes);
  });

  app.post('/api/login', (req, res) => {
    const { schoolId, classId, name } = req.body;
    if (!schoolId || !classId || !name) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    const student = db.prepare('SELECT * FROM students WHERE school_id = ? AND class_id = ? AND name = ?').get(Number(schoolId), Number(classId), name.trim());
    if (!student) {
      saveDB(sqlDb);
      return res.status(401).json({ error: '未找到该学生信息，请检查学校、班级和姓名是否正确' });
    }
    const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).substr(2);
    db.prepare('INSERT INTO login_sessions (student_id, token) VALUES (?, ?)').run(student.id, token);

    const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(Number(schoolId));
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(Number(classId));

    saveDB(sqlDb);
    res.json({
      token,
      student: {
        id: student.id,
        name: student.name,
        schoolId: student.school_id,
        classId: student.class_id,
        schoolName: school.name,
        className: cls.name
      }
    });
  });

  function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '请先登录' });
    const session = db.prepare('SELECT * FROM login_sessions WHERE token = ?').get(token);
    if (!session) return res.status(401).json({ error: '登录已过期，请重新登录' });
    req.studentId = session.student_id;
    req.session = session;
    next();
  }

  // 可选认证中间件：有 token 时解析，没有也放行
  function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const session = db.prepare('SELECT * FROM login_sessions WHERE token = ?').get(token);
      if (session) {
        req.studentId = session.student_id;
        req.session = session;
      }
    }
    next();
  }

  app.get('/api/user', authMiddleware, (req, res) => {
    const student = db.prepare(`
      SELECT s.*, sc.name as school_name, c.name as class_name 
      FROM students s 
      JOIN schools sc ON s.school_id = sc.id 
      JOIN classes c ON s.class_id = c.id 
      WHERE s.id = ?
    `).get(req.studentId);
    saveDB(sqlDb);
    res.json(student);
  });

  app.get('/api/cards', (req, res) => {
    const cards = db.prepare('SELECT * FROM nav_cards WHERE enabled = 1 ORDER BY sort_order').all();
    saveDB(sqlDb);
    res.json(cards);
  });

  app.get('/api/articles', optionalAuth, (req, res) => {
    const { type } = req.query;
    let articles;
    if (type) {
      articles = db.prepare('SELECT * FROM articles WHERE enabled = 1 AND type = ? ORDER BY id').all(type);
    } else {
      articles = db.prepare('SELECT * FROM articles WHERE enabled = 1 ORDER BY id').all();
    }
    // 如果已登录，附加该学生每篇文章的练习成绩
    if (req.studentId) {
      articles = articles.map(a => {
        const result = db.prepare(`
          SELECT wpm, accuracy FROM practice_results 
          WHERE article_id = ? AND student_id = ? 
          ORDER BY id DESC LIMIT 1
        `).get(a.id, req.studentId);
        return { ...a, my_wpm: result ? result.wpm : null, my_accuracy: result ? result.accuracy : null };
      });
    }
    saveDB(sqlDb);
    res.json(articles);
  });

  app.get('/api/articles/:id', (req, res) => {
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(Number(req.params.id));
    saveDB(sqlDb);
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json(article);
  });

  app.get('/api/tests/:classId', authMiddleware, (req, res) => {
    const tests = db.prepare(`
      SELECT t.*, a.title as article_title, a.content as article_content, a.type as article_type,
        (SELECT COUNT(*) FROM test_results tr WHERE tr.test_id = t.id AND tr.student_id = ? AND tr.completed = 1) as completed,
        (SELECT tr2.wpm FROM test_results tr2 WHERE tr2.test_id = t.id AND tr2.student_id = ? AND tr2.completed = 1 ORDER BY tr2.id DESC LIMIT 1) as my_wpm,
        (SELECT tr2.accuracy FROM test_results tr2 WHERE tr2.test_id = t.id AND tr2.student_id = ? AND tr2.completed = 1 ORDER BY tr2.id DESC LIMIT 1) as my_accuracy,
        (SELECT COUNT(*) FROM test_results tr3 WHERE tr3.test_id = t.id AND tr3.completed = 1) as total_completed
      FROM tests t 
      JOIN articles a ON t.article_id = a.id 
      WHERE t.class_id = ? AND t.enabled = 1
      ORDER BY t.id DESC
    `).all(req.studentId, req.studentId, req.studentId, Number(req.params.classId));

    // 计算每个已完成测试中该学生的排名
    tests.forEach(t => {
      if (t.completed) {
        const ranking = db.prepare(`
          SELECT student_id, MAX(wpm) as wpm, MAX(accuracy) as accuracy, MIN(duration_seconds) as duration_seconds, MAX(created_at) as created_at
          FROM test_results 
          WHERE test_id = ? AND completed = 1
          GROUP BY student_id
          ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
        `).all(t.id);
        const idx = ranking.findIndex(r => r.student_id === req.studentId);
        t.my_rank = idx >= 0 ? idx + 1 : null;
      } else {
        t.my_rank = null;
      }
    });

    saveDB(sqlDb);
    res.json(tests);
  });

  app.post('/api/tests/join', authMiddleware, (req, res) => {
    const { testId, testCode } = req.body;
    const test = db.prepare('SELECT * FROM tests WHERE id = ? AND enabled = 1').get(Number(testId));
    if (!test) { saveDB(sqlDb); return res.status(404).json({ error: '测试不存在' }); }
    if (test.test_code !== testCode) { saveDB(sqlDb); return res.status(403).json({ error: '测试码错误' }); }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.studentId);
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(student.class_id);
    saveDB(sqlDb);
    res.json({ success: true, test, studentName: student.name, className: cls.name });
  });

  app.post('/api/tests/submit', authMiddleware, (req, res) => {
    const { testId, wpm, accuracy, correctChars, totalChars, durationSeconds, completed } = req.body;
    // 正确率低于60%不记录
    if (accuracy < 60) {
      saveDB(sqlDb);
      return res.json({ success: true, ignored: true, reason: '正确率低于60%，不记录成绩' });
    }
    const student = db.prepare('SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(req.studentId);

    // 检查该学生在此测试中是否已有记录
    const existing = db.prepare('SELECT id, wpm FROM test_results WHERE test_id = ? AND student_id = ?').get(Number(testId), req.studentId);
    
    if (existing) {
      // 只有新成绩更好时才更新
      if (wpm > existing.wpm) {
        db.prepare(`
          UPDATE test_results SET wpm = ?, accuracy = ?, correct_chars = ?, total_chars = ?, duration_seconds = ?, completed = ?, created_at = datetime('now','localtime')
          WHERE id = ?
        `).run(wpm, accuracy, correctChars, totalChars, durationSeconds, completed ? 1 : 0, existing.id);
      }
    } else {
      db.prepare(`
        INSERT INTO test_results (test_id, student_id, student_name, class_name, wpm, accuracy, correct_chars, total_chars, duration_seconds, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(Number(testId), req.studentId, student.name, student.class_name, wpm, accuracy, correctChars, totalChars, durationSeconds, completed ? 1 : 0);
    }
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.get('/api/tests/:testId/ranking', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    const totalRow = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as total
      FROM test_results 
      WHERE test_id = ? AND completed = 1
    `).get(Number(req.params.testId));
    const total = totalRow ? totalRow.total : 0;

    const ranking = db.prepare(`
      SELECT tr.student_name, s.name as school_name, tr.class_name, MAX(tr.wpm) as wpm, MAX(tr.accuracy) as accuracy, MAX(tr.correct_chars) as correct_chars, MAX(tr.total_chars) as total_chars, MIN(tr.duration_seconds) as duration_seconds, MAX(tr.created_at) as created_at
      FROM test_results tr
      LEFT JOIN students st ON tr.student_id = st.id
      LEFT JOIN schools s ON st.school_id = s.id
      WHERE tr.test_id = ? AND tr.completed = 1
      GROUP BY tr.student_id
      ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
      LIMIT ? OFFSET ?
    `).all(Number(req.params.testId), pageSize, offset);
    saveDB(sqlDb);
    res.json({ data: ranking, total, page, pageSize });
  });

  app.get('/api/tests/:testId/my-result', authMiddleware, (req, res) => {
    const result = db.prepare(`
      SELECT * FROM test_results 
      WHERE test_id = ? AND student_id = ? AND completed = 1
      ORDER BY id DESC LIMIT 1
    `).get(Number(req.params.testId), req.studentId);

    if (result) {
      // 获取所有已完成学生的最高成绩排名，然后在 JS 中计算该学生的排名
      const allRanked = db.prepare(`
        SELECT tr.student_id, MAX(tr.wpm) as wpm, MAX(tr.accuracy) as accuracy, MIN(tr.duration_seconds) as duration_seconds, MAX(tr.created_at) as created_at
        FROM test_results tr
        WHERE tr.test_id = ? AND tr.completed = 1
        GROUP BY tr.student_id
        ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
      `).all(Number(req.params.testId));

      const idx = allRanked.findIndex(r => Number(r.student_id) === Number(result.student_id));
      result.rank = idx >= 0 ? idx + 1 : null;
    }

    saveDB(sqlDb);
    res.json(result || null);
  });

  // 获取测试详情（含 article_id、duration 等）
  app.get('/api/tests/:testId/detail', authMiddleware, (req, res) => {
    const test = db.prepare('SELECT id, title, article_id, duration, test_code FROM tests WHERE id = ?').get(Number(req.params.testId));
    saveDB(sqlDb);
    if (!test) return res.status(404).json({ error: '测试不存在' });
    res.json(test);
  });

  // 练习结果提交
  app.post('/api/practice/submit', authMiddleware, (req, res) => {
    const { articleId, wpm, accuracy, correctChars, totalChars, durationSeconds } = req.body;
    // 正确率低于60%不记录
    if (accuracy < 60) {
      saveDB(sqlDb);
      return res.json({ success: true, ignored: true, reason: '正确率低于60%，不记录成绩' });
    }
    const student = db.prepare('SELECT s.*, sc.name as school_name, c.name as class_name FROM students s JOIN schools sc ON s.school_id = sc.id JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(req.studentId);
    db.prepare(`
      INSERT INTO practice_results (article_id, student_id, student_name, school_name, class_name, wpm, accuracy, correct_chars, total_chars, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(articleId), req.studentId, student.name, student.school_name, student.class_name, wpm, accuracy, correctChars, totalChars, durationSeconds);
    saveDB(sqlDb);
    res.json({ success: true });
  });

  // 练习文章我的结果
  app.get('/api/articles/:articleId/my-result', authMiddleware, (req, res) => {
    const result = db.prepare(`
      SELECT * FROM practice_results 
      WHERE article_id = ? AND student_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(Number(req.params.articleId), req.studentId);

    if (result) {
      // 获取所有学生的最高成绩排名，然后在 JS 中计算该学生的排名
      const allRanked = db.prepare(`
        SELECT student_id, MAX(wpm) as wpm, MAX(accuracy) as accuracy, MIN(duration_seconds) as duration_seconds, MAX(created_at) as created_at
        FROM practice_results 
        WHERE article_id = ?
        GROUP BY student_id
        ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
      `).all(Number(req.params.articleId));

      const idx = allRanked.findIndex(r => Number(r.student_id) === Number(result.student_id));
      result.rank = idx >= 0 ? idx + 1 : null;
    }

    saveDB(sqlDb);
    res.json(result || null);
  });

  // 练习文章排名
  app.get('/api/articles/:articleId/ranking', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    const totalRow = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as total
      FROM practice_results 
      WHERE article_id = ?
    `).get(Number(req.params.articleId));
    const total = totalRow ? totalRow.total : 0;

    const ranking = db.prepare(`
      SELECT student_name, school_name, class_name, MAX(wpm) as wpm, MAX(accuracy) as accuracy, MIN(duration_seconds) as duration_seconds, MAX(created_at) as created_at
      FROM practice_results 
      WHERE article_id = ?
      GROUP BY student_id
      ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
      LIMIT ? OFFSET ?
    `).all(Number(req.params.articleId), pageSize, offset);
    saveDB(sqlDb);
    res.json({ data: ranking, total, page, pageSize });
  });

  // ==================== 管理员 API ====================

  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
      const token = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2);
      res.json({ token });
    } else {
      res.status(401).json({ error: '密码错误' });
    }
  });

  function adminMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    if (!token || !token.startsWith('admin_')) return res.status(401).json({ error: '请先登录管理员账号' });
    next();
  }

  app.get('/api/admin/cards', adminMiddleware, (req, res) => {
    const cards = db.prepare('SELECT * FROM nav_cards ORDER BY sort_order').all();
    saveDB(sqlDb);
    res.json(cards);
  });

  app.post('/api/admin/cards', adminMiddleware, (req, res) => {
    const { title, description, icon, color, link, is_local, local_path, sort_order } = req.body;
    const result = db.prepare('INSERT INTO nav_cards (title, description, icon, color, link, is_local, local_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      title, description || '', icon || '📚', color || '#FF6B6B', link || null, is_local ? 1 : 0, local_path || null, sort_order || 0
    );
    saveDB(sqlDb);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/cards/:id', adminMiddleware, (req, res) => {
    const { title, description, icon, color, link, is_local, local_path, sort_order, enabled } = req.body;
    db.prepare('UPDATE nav_cards SET title=?, description=?, icon=?, color=?, link=?, is_local=?, local_path=?, sort_order=?, enabled=? WHERE id=?').run(
      title, description, icon, color, link, is_local ? 1 : 0, local_path, sort_order, enabled ? 1 : 0, Number(req.params.id)
    );
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.delete('/api/admin/cards/:id', adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM nav_cards WHERE id = ?').run(Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.get('/api/admin/schools', adminMiddleware, (req, res) => {
    const schools = db.prepare('SELECT * FROM schools ORDER BY id').all();
    saveDB(sqlDb);
    res.json(schools);
  });

  app.post('/api/admin/schools', adminMiddleware, (req, res) => {
    const { name } = req.body;
    const result = db.prepare('INSERT INTO schools (name) VALUES (?)').run(name);
    saveDB(sqlDb);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/schools/:id', adminMiddleware, (req, res) => {
    const { name } = req.body;
    db.prepare('UPDATE schools SET name=? WHERE id=?').run(name, Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.delete('/api/admin/schools/:id', adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM schools WHERE id = ?').run(Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.get('/api/admin/classes', adminMiddleware, (req, res) => {
    const { school_id } = req.query;
    let classes;
    if (school_id) {
      classes = db.prepare('SELECT c.*, s.name as school_name FROM classes c JOIN schools s ON c.school_id = s.id WHERE c.school_id = ? ORDER BY c.id').all(Number(school_id));
    } else {
      classes = db.prepare('SELECT c.*, s.name as school_name FROM classes c JOIN schools s ON c.school_id = s.id ORDER BY s.id, c.id').all();
    }
    saveDB(sqlDb);
    res.json(classes);
  });

  app.get('/api/admin/classes/:schoolId', adminMiddleware, (req, res) => {
    const classes = db.prepare('SELECT c.*, s.name as school_name FROM classes c JOIN schools s ON c.school_id = s.id WHERE c.school_id = ? ORDER BY c.id').all(Number(req.params.schoolId));
    saveDB(sqlDb);
    res.json(classes);
  });

  app.post('/api/admin/classes', adminMiddleware, (req, res) => {
    const { school_id, name } = req.body;
    const result = db.prepare('INSERT INTO classes (school_id, name) VALUES (?, ?)').run(Number(school_id), name);
    saveDB(sqlDb);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/classes/:id', adminMiddleware, (req, res) => {
    const { school_id, name } = req.body;
    db.prepare('UPDATE classes SET school_id=?, name=? WHERE id=?').run(Number(school_id), name, Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.delete('/api/admin/classes/:id', adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM classes WHERE id = ?').run(Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.get('/api/admin/students', adminMiddleware, (req, res) => {
    const { school_id, class_id } = req.query;
    let students;
    if (class_id) {
      students = db.prepare('SELECT s.*, sc.name as school_name, c.name as class_name FROM students s JOIN schools sc ON s.school_id = sc.id JOIN classes c ON s.class_id = c.id WHERE s.class_id = ? ORDER BY s.id').all(Number(class_id));
    } else if (school_id) {
      students = db.prepare('SELECT s.*, sc.name as school_name, c.name as class_name FROM students s JOIN schools sc ON s.school_id = sc.id JOIN classes c ON s.class_id = c.id WHERE s.school_id = ? ORDER BY s.id').all(Number(school_id));
    } else {
      students = db.prepare('SELECT s.*, sc.name as school_name, c.name as class_name FROM students s JOIN schools sc ON s.school_id = sc.id JOIN classes c ON s.class_id = c.id ORDER BY s.id').all();
    }
    saveDB(sqlDb);
    res.json(students);
  });

  app.post('/api/admin/students', adminMiddleware, (req, res) => {
    const { school_id, class_id, name } = req.body;
    const result = db.prepare('INSERT INTO students (school_id, class_id, name) VALUES (?, ?, ?)').run(Number(school_id), Number(class_id), name.trim());
    saveDB(sqlDb);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/students/:id', adminMiddleware, (req, res) => {
    const { school_id, class_id, name } = req.body;
    db.prepare('UPDATE students SET school_id=?, class_id=?, name=? WHERE id=?').run(Number(school_id), Number(class_id), name.trim(), Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.delete('/api/admin/students/:id', adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM students WHERE id = ?').run(Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.get('/api/admin/articles', adminMiddleware, (req, res) => {
    const articles = db.prepare('SELECT * FROM articles ORDER BY id').all();
    saveDB(sqlDb);
    res.json(articles);
  });

  app.post('/api/admin/articles', adminMiddleware, (req, res) => {
    const { title, content, type, difficulty } = req.body;
    const result = db.prepare('INSERT INTO articles (title, content, type, difficulty) VALUES (?, ?, ?, ?)').run(title, content, type || 'chinese', difficulty || 'easy');
    saveDB(sqlDb);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/articles/:id', adminMiddleware, (req, res) => {
    const { title, content, type, difficulty, enabled } = req.body;
    db.prepare('UPDATE articles SET title=?, content=?, type=?, difficulty=?, enabled=? WHERE id=?').run(title, content, type, difficulty, enabled ? 1 : 0, Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.delete('/api/admin/articles/:id', adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM articles WHERE id = ?').run(Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.get('/api/admin/tests', adminMiddleware, (req, res) => {
    const tests = db.prepare(`
      SELECT t.*, a.title as article_title, c.name as class_name, s.name as school_name
      FROM tests t 
      JOIN articles a ON t.article_id = a.id 
      JOIN classes c ON t.class_id = c.id
      JOIN schools s ON c.school_id = s.id
      ORDER BY t.id DESC
    `).all();
    saveDB(sqlDb);
    res.json(tests);
  });

  app.post('/api/admin/tests', adminMiddleware, (req, res) => {
    const { title, article_id, class_id, test_code, duration } = req.body;
    const result = db.prepare('INSERT INTO tests (title, article_id, class_id, test_code, duration) VALUES (?, ?, ?, ?, ?)').run(
      title, Number(article_id), Number(class_id), test_code, duration || 300
    );
    saveDB(sqlDb);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/tests/:id', adminMiddleware, (req, res) => {
    const { title, article_id, class_id, test_code, duration, enabled } = req.body;
    db.prepare('UPDATE tests SET title=?, article_id=?, class_id=?, test_code=?, duration=?, enabled=? WHERE id=?').run(
      title, Number(article_id), Number(class_id), test_code, duration || 300, enabled ? 1 : 0, Number(req.params.id)
    );
    saveDB(sqlDb);
    res.json({ success: true });
  });

  app.delete('/api/admin/tests/:id', adminMiddleware, (req, res) => {
    const testId = Number(req.params.id);
    db.prepare('DELETE FROM test_results WHERE test_id = ?').run(testId);
    db.prepare('DELETE FROM tests WHERE id = ?').run(testId);
    saveDB(sqlDb);
    res.json({ success: true });
  });

  // 批量删除测试（含关联的测试结果）
  app.post('/api/admin/tests/batch-delete', adminMiddleware, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的测试ID列表' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM test_results WHERE test_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM tests WHERE id IN (${placeholders})`).run(...ids);
    saveDB(sqlDb);
    res.json({ success: true, deleted: ids.length });
  });

  // 测试结果汇总（同一学生最佳成绩）
  app.get('/api/admin/tests/:testId/results', adminMiddleware, (req, res) => {
    const results = db.prepare(`
      SELECT student_name, class_name, MAX(wpm) as wpm, MAX(accuracy) as accuracy, MAX(correct_chars) as correct_chars, MAX(total_chars) as total_chars, MIN(duration_seconds) as duration_seconds, MAX(created_at) as created_at, MAX(completed) as completed
      FROM test_results 
      WHERE test_id = ?
      GROUP BY student_id
      ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
    `).all(Number(req.params.testId));
    saveDB(sqlDb);
    res.json(results);
  });

  // 测试结果明细（所有记录）
  app.get('/api/admin/tests/:testId/results/detail', adminMiddleware, (req, res) => {
    const results = db.prepare(`
      SELECT * FROM test_results 
      WHERE test_id = ? 
      ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
    `).all(Number(req.params.testId));
    saveDB(sqlDb);
    res.json(results);
  });

  // 新增测试结果
  app.post('/api/admin/tests/:testId/results', adminMiddleware, (req, res) => {
    const { student_id, student_name, class_name, wpm, accuracy, correct_chars, total_chars, duration_seconds, completed } = req.body;
    if (!student_id || !student_name) {
      return res.status(400).json({ error: '学生姓名不能为空' });
    }
    db.prepare(`
      INSERT INTO test_results (test_id, student_id, student_name, class_name, wpm, accuracy, correct_chars, total_chars, duration_seconds, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(req.params.testId), Number(student_id), student_name, class_name || '', Number(wpm) || 0, Number(accuracy) || 0, Number(correct_chars) || 0, Number(total_chars) || 0, Number(duration_seconds) || 0, completed ? 1 : 0);
    saveDB(sqlDb);
    res.json({ success: true });
  });

  // 编辑测试结果
  app.put('/api/admin/tests/results/:id', adminMiddleware, (req, res) => {
    const { student_name, class_name, wpm, accuracy, correct_chars, total_chars, duration_seconds, completed } = req.body;
    db.prepare(`
      UPDATE test_results SET student_name = ?, class_name = ?, wpm = ?, accuracy = ?, correct_chars = ?, total_chars = ?, duration_seconds = ?, completed = ?
      WHERE id = ?
    `).run(student_name, class_name || '', Number(wpm) || 0, Number(accuracy) || 0, Number(correct_chars) || 0, Number(total_chars) || 0, Number(duration_seconds) || 0, completed ? 1 : 0, Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  // 删除测试结果
  app.delete('/api/admin/tests/results/:id', adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM test_results WHERE id = ?').run(Number(req.params.id));
    saveDB(sqlDb);
    res.json({ success: true });
  });

  // 批量删除练习数据
  app.post('/api/admin/practices/results/batch-delete', adminMiddleware, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的练习数据ID列表' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM practice_results WHERE id IN (${placeholders})`).run(...ids);
    saveDB(sqlDb);
    res.json({ success: true, deleted: ids.length });
  });

  // 练习文章结果管理 - 全部数据（不分文章）
  app.get('/api/admin/practices/results', adminMiddleware, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;
    const articleId = req.query.articleId ? Number(req.query.articleId) : null;
    
    let total, results;
    if (articleId) {
      total = db.prepare('SELECT COUNT(*) as count FROM practice_results WHERE article_id = ?').get(articleId);
      results = db.prepare(`
        SELECT pr.*, a.title as article_title
        FROM practice_results pr
        LEFT JOIN articles a ON a.id = pr.article_id
        WHERE pr.article_id = ?
        ORDER BY pr.created_at DESC
        LIMIT ? OFFSET ?
      `).all(articleId, pageSize, offset);
    } else {
      total = db.prepare('SELECT COUNT(*) as count FROM practice_results').get();
      results = db.prepare(`
        SELECT pr.*, a.title as article_title
        FROM practice_results pr
        LEFT JOIN articles a ON a.id = pr.article_id
        ORDER BY pr.created_at DESC
        LIMIT ? OFFSET ?
      `).all(pageSize, offset);
    }
    
    saveDB(sqlDb);
    res.json({ data: results, total: total.count, page, pageSize });
  });

  // 练习文章结果管理 - 按文章查看
  app.get('/api/admin/articles/:articleId/results', adminMiddleware, (req, res) => {
    const results = db.prepare(`
      SELECT * FROM practice_results 
      WHERE article_id = ? 
      ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
    `).all(Number(req.params.articleId));
    saveDB(sqlDb);
    res.json(results);
  });

  app.get('/api/admin/tests/:testId/results/export', adminMiddleware, (req, res) => {
    const results = db.prepare(`
      SELECT student_name, class_name, MAX(wpm) as wpm, MAX(accuracy) as accuracy, MAX(correct_chars) as correct_chars, MAX(total_chars) as total_chars, MIN(duration_seconds) as duration_seconds, MAX(created_at) as created_at, MAX(completed) as completed
      FROM test_results 
      WHERE test_id = ?
      GROUP BY student_id
      ORDER BY wpm DESC, accuracy DESC, duration_seconds ASC, created_at ASC
    `).all(Number(req.params.testId));
    // 生成CSV
    const BOM = '\uFEFF';
    let csv = BOM + '排名,学生姓名,班级,速度(字/分),正确率(%),正确字数,总输入字数,用时(秒),完成状态,提交时间\n';
    results.forEach((r, i) => {
      csv += `${i + 1},${r.student_name},${r.class_name},${r.wpm},${r.accuracy}%,${r.correct_chars},${r.total_chars},${r.duration_seconds},${r.completed ? '已完成' : '未完成'},${r.created_at}\n`;
    });
    const test = db.prepare('SELECT title FROM tests WHERE id = ?').get(Number(req.params.testId));
    const filename = encodeURIComponent((test?.title || '测试结果') + '.csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    saveDB(sqlDb);
  });

  app.post('/api/admin/classes/batch', adminMiddleware, (req, res) => {
    const { school_id, names } = req.body;
    const insert = db.prepare('INSERT INTO classes (school_id, name) VALUES (?, ?)');
    const nameList = names.split('\n').map(n => n.trim()).filter(n => n);
    let count = 0;
    for (const name of nameList) {
      insert.run(Number(school_id), name);
      count++;
    }
    saveDB(sqlDb);
    res.json({ count });
  });

  app.post('/api/admin/students/batch', adminMiddleware, (req, res) => {
    const { school_id, class_id, names } = req.body;
    const insert = db.prepare('INSERT INTO students (school_id, class_id, name) VALUES (?, ?, ?)');
    const nameList = names.split('\n').map(n => n.trim()).filter(n => n);
    let count = 0;
    for (const name of nameList) {
      insert.run(Number(school_id), Number(class_id), name);
      count++;
    }
    saveDB(sqlDb);
    res.json({ count });
  });

  // 托管前端构建产物（生产模式）
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback：所有非 API 请求返回 index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 服务器运行在 http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
