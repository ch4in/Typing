'use strict';

// AI 编程（Vibe Coding）模块 —— Express 路由
// 挂载点：/api/vibe
const express = require('express');
const fs = require('fs');
const path = require('path');

const models = require('./vibe-lib/models');
const dashscope = require('./vibe-lib/dashscope');
const config = require('./vibe-lib/config');
const sessions = require('./vibe-lib/sessions');
const workspace = require('./vibe-lib/workspace');
const parse = require('./vibe-lib/parse');
const diff = require('./vibe-lib/diff');

// 只允许出现在文件/文件夹名里的字符
function slug(input, fallback) {
  const s = String(input || '')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .slice(0, 24);
  return s || fallback || '未命名作品';
}

// 路径安全：只留文件名里允许的字符，防止 ../ 之类跑出作品区
function uniquePath(rel, ws) {
  if (!ws.existsFile(rel)) return rel;
  const i = rel.lastIndexOf('.');
  if (i < 0) return rel + '-2';
  let n = 2;
  while (ws.existsFile(`${rel.slice(0, i)}-${n}${rel.slice(i)}`)) n += 1;
  return `${rel.slice(0, i)}-${n}${rel.slice(i)}`;
}

// 每个学生一个作品区：…/AI编程作品（下面再按会话名字分文件夹）
function studentWorkspace(studentId) {
  return workspace.scoped(config.worksRootFor(studentId));
}

// 会话默认标题：取用户第一句话的前几个字，太长就用省略号
const DEFAULT_SESSION_NAME = '新对话';
function titleFromText(text) {
  const one = String(text || '').replace(/\s+/g, ' ').trim();
  if (!one) return DEFAULT_SESSION_NAME;
  return one.length > 12 ? one.slice(0, 12) + '…' : one;
}

function extFor(language, fallback) {
  const map = {
    html: 'html', htm: 'html', javascript: 'js', js: 'js', jsx: 'jsx',
    ts: 'ts', tsx: 'tsx', typescript: 'ts', python: 'py', py: 'py',
    css: 'css', json: 'json', md: 'md', markdown: 'md', sql: 'sql',
    java: 'java', c: 'c', cpp: 'cpp', go: 'go', text: 'txt', txt: 'txt',
  };
  return map[String(language || '').toLowerCase()] || fallback || 'txt';
}

// 读配置（不回传明文密钥）
function settingsPayload() {
  const c = config.read();
  return {
    enabled: c.enabled !== false,
    model: c.model,
    mode: c.mode,
    temperature: c.temperature,
    maxTokens: c.maxTokens,
    workspace: config.workspaceRoot(),
    saveTarget: c.saveTarget || 'server',
    worksFolder: c.worksFolder || 'AI编程作品',
    systemPrompt: c.systemPrompt,
    kidPrompt: c.kidPrompt,
    hasKey: !!c.apiKey,
    keyMasked: c.apiKey ? 'sk-…' + String(c.apiKey).slice(-4) : '',
  };
}

// 写配置（学生端与教师后台共用）
function saveSettings(req, res) {
  const allow = ['apiKey', 'model', 'mode', 'temperature', 'maxTokens', 'workspace', 'systemPrompt', 'kidPrompt', 'saveTarget', 'worksFolder', 'enabled'];
  const patch = {};
  for (const k of allow) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
  }
  // 开关只认布尔值
  if (patch.enabled !== undefined) patch.enabled = patch.enabled === true || patch.enabled === 'true';
  // API Key 清洗 + 校验：去掉空格，拒绝中文/全角字符（粘贴时容易带上说明文字）
  if (typeof patch.apiKey === 'string') {
    const key = patch.apiKey.replace(/\s+/g, '');
    if (!key) {
      delete patch.apiKey;
    } else if (!/^[\x21-\x7e]+$/.test(key)) {
      return res.status(400).json({
        error: 'API Key 里有中文或全角字符，请重新复制。正确样子是纯英文，以 sk- 开头，例如 sk-abcdef123456',
      });
    } else {
      patch.apiKey = key;
    }
  }
  if (patch.model && !models.exists(patch.model)) {
    return res.status(400).json({ error: '未知的模型：' + patch.model });
  }
  if (patch.workspace != null) {
    const w = String(patch.workspace).trim();
    if (!w) return res.status(400).json({ error: '作品保存位置不能为空' });
    patch.workspace = w;
  }
  const merged = config.write(patch);
  if (merged.workspace) {
    try { fs.mkdirSync(merged.workspace, { recursive: true }); } catch (e) { /* 忽略 */ }
  }
  return res.json({ success: true, hasKey: !!merged.apiKey, workspace: config.workspaceRoot() });
}

function createVibeRouter({ db }) {
  const router = express.Router();

  // 首次运行：补齐默认配置并创建作品区目录
  try {
    config.bootstrap();
  } catch (e) {
    console.error('vibe 初始化失败:', e);
  }

  // 老版本所有学生共用一份会话，这里把它们归档；之后每人只看得到自己的
  const archived = sessions.migrateLegacy();
  if (archived) {
    console.log(`🤖 已归档 ${archived} 条没有归属的旧 AI 对话（原文件备份为 data/vibe-sessions.legacy-backup.json）`);
  }

  // 学生端不用登录也能问：AI 编程现在开放吗？（教师后台的开关）
  router.get('/enabled', (req, res) => {
    res.json({ enabled: config.read().enabled !== false });
  });

  // ---- 登录鉴权（学生 token）----
  function requireLogin(req, res, next) {
    const raw = req.headers.authorization || '';
    const token = String(raw).replace(/^Bearer\s+/i, '') || req.query.token;
    if (!token) return res.status(401).json({ error: '请先在首页登录哦' });
    const session = db.prepare('SELECT * FROM login_sessions WHERE token = ?').get(token);
    if (!session) return res.status(401).json({ error: '登录已过期，请重新登录' });
    req.studentId = session.student_id;
    next();
  }

  router.use(requireLogin);

  // ==================== 配置 ====================
  router.get('/settings', (req, res) => {
    res.json(settingsPayload());
  });

  router.post('/settings', (req, res) => saveSettings(req, res));

  // ==================== 模型 ====================
  router.get('/models', (req, res) => {
    res.json(models.all());
  });

  // ==================== 会话（每人只看得到自己的）====================
  const NOT_MINE = '找不到这个对话啦，可能已经被删掉了';

  router.get('/sessions', (req, res) => {
    res.json(sessions.list(req.studentId));
  });

  router.post('/sessions', (req, res) => {
    const cfg = config.read();
    const s = sessions.create(req.body && req.body.model ? req.body.model : cfg.model, req.studentId);
    res.json({ id: s.id, name: s.name, model: s.model });
  });

  router.get('/sessions/:id', (req, res) => {
    const s = sessions.get(req.params.id, req.studentId);
    if (!s) return res.status(404).json({ error: NOT_MINE });
    res.json(s);
  });

  router.patch('/sessions/:id', (req, res) => {
    const { name, model } = req.body || {};
    const patch = {};
    if (name != null) patch.name = String(name).slice(0, 60);
    if (model != null) patch.model = model;
    const s = sessions.update(req.params.id, patch, req.studentId);
    if (!s) return res.status(404).json({ error: NOT_MINE });
    res.json({ success: true, name: s.name });
  });

  router.delete('/sessions/:id', (req, res) => {
    if (!sessions.remove(req.params.id, req.studentId)) {
      return res.status(404).json({ error: NOT_MINE });
    }
    res.json({ success: true });
  });

  router.post('/sessions/:id/clear', (req, res) => {
    if (!sessions.clearMessages(req.params.id, req.studentId)) {
      return res.status(404).json({ error: NOT_MINE });
    }
    res.json({ success: true });
  });

  // ==================== 对话（SSE 流式）====================
  router.post('/chat', async (req, res) => {
    if (config.read().enabled === false) {
      return res.status(403).json({ enabled: false, error: 'AI 编程现在是关闭状态，请等老师开放后再来玩哦' });
    }
    const { sessionId, content, context } = req.body || {};
    const session = sessions.get(sessionId, req.studentId);
    if (!session) return res.status(404).json({ error: '会话不存在，请新建一个对话' });

    const text = String(content || '').trim();
    if (!text) return res.status(400).json({ error: '说点什么吧～' });

    const cfg = config.read();
    if (!cfg.apiKey) {
      return res.status(400).json({ error: '还没有配置百炼 API Key，请老师到「教师管理后台 → 🤖 AI 编程」里填一下' });
    }

    const model = session.model || cfg.model;
    const history = (session.messages || []).slice(-20).map((m) => ({ role: m.role, content: m.content }));
    const messages = [
      { role: 'system', content: config.activePrompt() },
    ];
    if (context) messages.push({ role: 'user', content: '以下是我当前打开的文件内容，供你参考：\n' + context });
    messages.push(...history, { role: 'user', content: text });

    // 写入用户消息，并按首条提问自动命名会话（老师/学生手动改过名字就不再覆盖）
    const beforeMessages = session.messages || [];
    const isFirstAsk = beforeMessages.length === 0;
    const keepCustomName = !!session.name && session.name !== DEFAULT_SESSION_NAME;
    const msgs = [...beforeMessages, { role: 'user', content: text, ts: Date.now() }];
    if (isFirstAsk && !keepCustomName) {
      sessions.update(sessionId, { messages: msgs, name: titleFromText(text) }, req.studentId);
    } else {
      sessions.update(sessionId, { messages: msgs }, req.studentId);
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

    // 注意：不能用 req.on('close')！express.json() 把请求体读完后就会触发 'close'，
    // 那样 closed 会立刻变成 true，所有 res.write 都被跳过（客户端表现为「要切换对话才看到内容」）。
    // 这里监听响应/连接的关闭才是真正的「客户端断开」。
    let closed = false;
    const onClose = () => { closed = true; };
    res.on('close', onClose);
    if (req.socket) req.socket.on('close', onClose);

    const send = (obj) => {
      if (closed || res.writableEnded) return;
      try {
        res.write('data: ' + JSON.stringify(obj) + '\n\n');
      } catch (e) {
        closed = true;
      }
    };

    console.log(`[vibe chat] 开始请求 model=${model} session=${sessionId}`);
    try {
      const result = await dashscope.chatStream({
        model,
        messages,
        apiKey: cfg.apiKey,
        temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.7,
        maxTokens: cfg.maxTokens || 8192,
        enableThinking: cfg.enableThinking,
      }, {
        onDelta: (t) => send({ t: 'd', text: t }),
        onReasoning: (t) => send({ t: 'r', text: t }),
      });
      const u = result.usage || {};
      const tokens = u.total_tokens || ((u.prompt_tokens || 0) + (u.completion_tokens || 0)) || 0;

      const cur = sessions.get(sessionId, req.studentId) || { messages: [], tokens: 0 };
      sessions.update(sessionId, {
        messages: [
          ...(cur.messages || []),
          { role: 'assistant', content: result.content, reasoning: result.reasoning, model, ts: Date.now() },
        ],
        tokens: (cur.tokens || 0) + tokens,
      }, req.studentId);

      send({ t: 'done', tokens, usage: u });
    } catch (e) {
      console.error('[vibe chat] 出错:', e && e.message ? e.message : e);
      send({ t: 'e', message: e && e.message ? e.message : String(e) });
    } finally {
      try { if (!res.writableEnded) res.end(); } catch (e) { /* 已断开 */ }
    }
  });

  // ==================== 作品保存（小学生模式）====================
  // body: { name, language, content, sessionName }
  router.post('/work', (req, res) => {
    const { name, language, content, sessionName } = req.body || {};
    if (content == null) return res.status(400).json({ error: '没有内容可以保存' });

    const dir = slug(sessionName || name || '我的作品');
    let file = slug(name || '', '作品');
    if (!/\.[A-Za-z0-9]{1,8}$/.test(file)) file += '.' + extFor(language, 'txt');

    // 保存到自己的「AI编程作品/<会话名>/」里，和别的同学互不干扰
    const ws = studentWorkspace(req.studentId);
    const rel = uniquePath(`${dir}/${file}`, ws);
    try {
      const info = ws.writeFile(rel, content, false);
      res.json({ success: true, path: rel, size: info.size, root: ws.root() });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // 作品列表（只看得到自己的）：AI编程作品/<会话名>/<文件>
  router.get('/works', (req, res) => {
    const ws = studentWorkspace(req.studentId);
    const root = ws.root();
    const list = [];
    try {
      if (fs.existsSync(root)) {
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const files = fs.readdirSync(path.join(root, entry.name))
            .filter((f) => /\.(html?|js|css|py|cpp|cc|c|java|cs|txt|json)$/i.test(f))
            .map((f) => ({ name: f, path: `${entry.name}/${f}` }));
          list.push({ name: entry.name, files });
        }
      }
    } catch (e) { /* 忽略 */ }
    res.json({ root, items: list });
  });

  // 把作品下载到学生自己的电脑上（服务端保存的那份还留在服务器上）
  router.get('/works/download', (req, res) => {
    const ws = studentWorkspace(req.studentId);
    let abs;
    try {
      abs = ws.toAbs(req.query.path);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return res.status(404).json({ error: '找不到这个文件' });
    }
    const name = path.basename(abs);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.sendFile(abs);
  });

  // ==================== 专业模式：文件树 / 读写 / 写入（都在自己的作品区里）====================
  router.get('/tree', (req, res) => {
    res.json(studentWorkspace(req.studentId).tree());
  });

  router.get('/file', (req, res) => {
    try {
      res.json(studentWorkspace(req.studentId).readFile(req.query.path));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/file', (req, res) => {
    const { path: rel, content } = req.body || {};
    if (!rel) return res.status(400).json({ error: '缺少文件路径' });
    try {
      res.json(studentWorkspace(req.studentId).writeFile(rel, content || '', true));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // 从某条助手消息里解析出文件变更（含 diff）
  router.post('/extract', (req, res) => {
    const { sessionId, index } = req.body || {};
    const session = sessions.get(sessionId, req.studentId);
    if (!session) return res.status(404).json({ error: '会话不存在' });
    const msg = (session.messages || [])[index];
    if (!msg || msg.role !== 'assistant') return res.status(404).json({ error: '不是助手消息' });

    const ws = studentWorkspace(req.studentId);
    const changes = parse.extractChanges(msg.content, {
      root: ws.root(),
      existsFile: (p) => ws.existsFile(p),
    });

    const detail = changes.map((c) => {
      const old = ws.existsFile(c.path) ? ws.readFile(c.path).content || '' : '';
      const d = ws.existsFile(c.path)
        ? diff.diffLines(old, c.content)
        : { tooLarge: false, rows: c.content.split('\n').map((t, i) => ({ type: 'add', text: t, oldLine: null, newLine: i + 1 })), added: c.content.split('\n').length, removed: 0 };
      return {
        path: c.path,
        language: c.language,
        isNew: c.isNew,
        content: c.content,
        added: d.added,
        removed: d.removed,
        tooLarge: d.tooLarge,
        rows: d.rows,
      };
    });

    res.json({ changes: detail });
  });

  // 批量写入
  router.post('/apply', (req, res) => {
    const files = (req.body && req.body.files) || [];
    if (!files.length) return res.status(400).json({ error: '没有要写入的文件' });
    const ws = studentWorkspace(req.studentId);
    const result = [];
    for (const f of files) {
      if (!f.path) continue;
      try {
        result.push(ws.writeFile(f.path, f.content || '', true));
      } catch (e) {
        result.push({ path: f.path, error: e.message });
      }
    }
    res.json({ written: result });
  });

  return router;
}

/**
 * 教师后台用的 AI 编程设置接口：/api/admin/vibe
 * 用 admin_ 开头的 token 鉴权，学生看不到、也改不了。
 */
function createAdminVibeRouter({ db }) {
  const router = express.Router();

  router.use((req, res, next) => {
    const raw = req.headers.authorization || '';
    const token = String(raw).replace(/^Bearer\s+/i, '') || req.query.token;
    if (!token || !String(token).startsWith('admin_')) {
      return res.status(401).json({ error: '请先登录教师后台' });
    }
    next();
  });

  router.get('/settings', (req, res) => {
    res.json(settingsPayload());
  });

  router.post('/settings', (req, res) => saveSettings(req, res));

  router.get('/models', (req, res) => {
    res.json(models.all());
  });

  // ---------------- 查看学生的 AI 对话 ----------------
  // 把会话里的 owner（学生 id）翻译成「姓名 / 班级 / 学校」
  const studentMap = () => {
    const map = new Map();
    if (!db) return map;
    try {
      const rows = db.prepare(
        'SELECT s.id, s.name, s.school_id, s.class_id, c.name AS class_name, sc.name AS school_name '
        + 'FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN schools sc ON sc.id = s.school_id'
      ).all();
      for (const r of rows) map.set(String(r.id), r);
    } catch (e) { /* 学生表读不到就只显示编号 */ }
    return map;
  };

  const withStudent = (s, map) => {
    const stu = map.get(String(s.owner)) || null;
    return {
      ...s,
      studentName: stu ? stu.name : (s.legacy ? '（旧对话，没记名字）' : '（账号已删除）'),
      className: stu ? stu.class_name || '' : '',
      schoolName: stu ? stu.school_name || '' : '',
    };
  };

  // 列表：?class_id=&school_id=&student_id=&q=关键词
  router.get('/sessions', (req, res) => {
    const map = studentMap();
    const { class_id, school_id, student_id, q } = req.query;
    const kw = q ? String(q).trim().toLowerCase() : '';
    const items = [];
    for (const s of sessions.listAll()) {
      const stu = map.get(String(s.owner)) || null;
      if (class_id && (!stu || String(stu.class_id) !== String(class_id))) continue;
      if (school_id && (!stu || String(stu.school_id) !== String(school_id))) continue;
      if (student_id && String(s.owner) !== String(student_id)) continue;
      if (kw) {
        const hay = `${s.name || ''} ${stu ? stu.name : ''} ${stu ? stu.class_name || '' : ''}`.toLowerCase();
        if (!hay.includes(kw)) continue;
      }
      items.push(withStudent(s, map));
      if (items.length >= 500) break;   // 太多了页面会卡，最多给最近 500 条
    }
    res.json(items);
  });

  // 某一条对话的完整内容（含每一条消息）
  router.get('/sessions/:id', (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ error: '找不到这个对话' });
    res.json(withStudent(s, studentMap()));
  });

  return router;
}

/** 保证首页导航里存在「AI 编程」这张卡片 */
function ensureNavCard(db) {
  const exists = db.prepare("SELECT id FROM nav_cards WHERE local_path = '/vibe'").get();
  if (!exists) {
    const max = db.prepare('SELECT MAX(sort_order) AS m FROM nav_cards').get();
    db.prepare(
      'INSERT INTO nav_cards (title, description, icon, color, link, is_local, local_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'AI 编程伙伴',
      '和小助手聊天，做一个属于自己的网页小游戏',
      '\u{1F916}',
      '#7C5CFF',
      null,
      1,
      '/vibe',
      (max && max.m ? Number(max.m) : 0) + 1
    );
    return true;
  }
  return false;
}

module.exports = { createVibeRouter, createAdminVibeRouter, ensureNavCard };
