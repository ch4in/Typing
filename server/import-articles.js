/**
 * 从 db_viewer.html 导入文章到本系统后台
 *
 * 用法：
 *   node import-articles.js                       # 自动查找 ../db_viewer.html
 *   node import-articles.js <db_viewer.html路径>   # 指定文件
 *
 * 逻辑：
 *   1. 解析 db_viewer.html 里的 `const DATA = [...]`，取出 typingPage_article 表
 *   2. 字段映射：
 *        title    -> title
 *        content  -> content
 *        type     -> En => english ; Cn => chinese
 *        isVisible-> enabled (1 启用 / 0 禁用)
 *        difficulty -> 源数据没有，按篇幅自动推断（英文按词数，中文按字数）
 *   3. 按标题去重：已存在同标题的文章会跳过，重复执行不会产生重复数据
 *   4. 若后端正在运行（localhost:3001 可访问）优先走后端 API 导入（即时生效）；
 *      若后端未启动，则直接写入 data.db（此时请务必先停止后端，否则修改会被覆盖）
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const VIEWER = process.argv[2] || path.join(__dirname, '..', 'db_viewer.html');
const DB_PATH = path.join(__dirname, 'data.db');
const API = 'http://localhost:3001';
const ADMIN_PWD = 'admin123';

/** 按篇幅推断难度：英文按词数，中文按字数 */
function guessDifficulty(content, type) {
  if (type === 'english') {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    if (words <= 60) return 'easy';
    if (words <= 120) return 'medium';
    return 'hard';
  }
  const chars = content.replace(/\s/g, '').length;
  if (chars <= 400) return 'easy';
  if (chars <= 800) return 'medium';
  return 'hard';
}

/** 解析 db_viewer.html，返回文章数组 */
function extractArticles() {
  if (!fs.existsSync(VIEWER)) throw new Error('找不到文件：' + VIEWER);
  const raw = fs.readFileSync(VIEWER, 'utf8');
  const start = raw.indexOf('const DATA = ');
  if (start < 0) throw new Error('未在文件中找到 "const DATA = "');
  const endMarker = raw.indexOf('\nconst ', start + 10);
  let jsonStr = raw.slice(start + 'const DATA = '.length, endMarker < 0 ? undefined : endMarker).trim();
  jsonStr = jsonStr.replace(/;\s*$/, '');

  const DATA = JSON.parse(jsonStr);
  const table = DATA.find(d => d.name === 'typingPage_article');
  if (!table) throw new Error('DATA 中没有找到 typingPage_article 表');

  return table.rows.map(r => {
    const [id, title, content, type, isVisible] = r;
    const t = String(type || '').toLowerCase();
    return {
      sourceId: Number(id),
      title: String(title == null ? '' : title).trim(),
      content: String(content == null ? '' : content),
      type: t === 'en' ? 'english' : 'chinese',
      difficulty: guessDifficulty(String(content || ''), t === 'en' ? 'english' : 'chinese'),
      enabled: Number(isVisible) ? 1 : 0,
    };
  }).filter(a => a.title && a.content);
}

// ---------------- 方式一：通过后端 API 导入 ----------------
function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(API + urlPath, { method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(d); } catch (_) { /* 非 JSON */ }
        if (res.statusCode >= 400) {
          return reject(new Error(method + ' ' + urlPath + ' -> HTTP ' + res.statusCode + ' ' + d.slice(0, 200)));
        }
        resolve(j);
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function pingServer() {
  return new Promise(resolve => {
    const req = http.get(API + '/api/cards', { timeout: 2000 }, res => { res.resume(); resolve(true); });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

async function importViaApi(articles) {
  const login = await request('POST', '/api/admin/login', { password: ADMIN_PWD });
  const token = login && login.token;
  if (!token) throw new Error('管理员登录失败，请确认后端 /api/admin/login 可用');

  const existing = (await request('GET', '/api/admin/articles', null, token)) || [];
  const titles = new Set(existing.map(a => a.title));

  let added = 0, skipped = 0;
  for (const a of articles) {
    if (titles.has(a.title)) {
      skipped++;
      console.log('  [跳过] 已存在：' + a.title);
      continue;
    }
    const r = await request('POST', '/api/admin/articles', {
      title: a.title, content: a.content, type: a.type, difficulty: a.difficulty,
    }, token);
    // 源数据里不可见的文章，导入后置为「禁用」
    if (!a.enabled && r && r.id) {
      await request('PUT', '/api/admin/articles/' + r.id, {
        title: a.title, content: a.content, type: a.type, difficulty: a.difficulty, enabled: 0,
      }, token);
    }
    titles.add(a.title);
    added++;
    console.log('  [新增] ' + (a.enabled ? '启用' : '禁用') + ' | ' + a.type + '/' + a.difficulty + ' | ' + a.title);
  }
  return { added, skipped, mode: 'API（后端在线）' };
}

// ---------------- 方式二：直接写入 data.db ----------------
async function importDirect(articles) {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const sqlDb = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'chinese',
      difficulty TEXT DEFAULT 'easy',
      enabled INTEGER DEFAULT 1
    );
  `);

  const titles = new Set();
  const stmt = sqlDb.prepare('SELECT title FROM articles');
  while (stmt.step()) titles.add(stmt.get()[0]);
  stmt.free();

  let added = 0, skipped = 0;
  for (const a of articles) {
    if (titles.has(a.title)) {
      skipped++;
      console.log('  [跳过] 已存在：' + a.title);
      continue;
    }
    sqlDb.run('INSERT INTO articles (title, content, type, difficulty, enabled) VALUES (?, ?, ?, ?, ?)',
      [a.title, a.content, a.type, a.difficulty, a.enabled]);
    titles.add(a.title);
    added++;
    console.log('  [新增] ' + (a.enabled ? '启用' : '禁用') + ' | ' + a.type + '/' + a.difficulty + ' | ' + a.title);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(sqlDb.export()));
  return { added, skipped, mode: '直连数据库（' + DB_PATH + '）' };
}

// ---------------- 入口 ----------------
(async () => {
  try {
    const articles = extractArticles();
    console.log('从 db_viewer.html 解析到 ' + articles.length + ' 篇文章：');
    console.log('');

    const up = await pingServer();
    const result = up ? await importViaApi(articles) : await importDirect(articles);

    console.log('');
    console.log('导入完成（方式：' + result.mode + '）：新增 ' + result.added + ' 篇，跳过 ' + result.skipped + ' 篇。');
    if (!up) console.log('提示：直接写库模式需要后端处于停止状态，请确认后再启动后端。');
  } catch (e) {
    console.error('导入失败：' + e.message);
    process.exit(1);
  }
})();
