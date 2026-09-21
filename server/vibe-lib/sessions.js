'use strict';

// AI 编程会话存储。
// 每条会话都带 owner（登录学生的 id），学生只能看到、改到属于自己的那些对话。
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config');

const FILE = path.join(DATA_DIR, 'vibe-sessions.json');
const LEGACY_BACKUP = path.join(DATA_DIR, 'vibe-sessions.legacy-backup.json');
// 老会话（没有归属人的）统一挂到这个虚拟人名下：谁都看不到，但文件留着可以找回来
const LEGACY_OWNER = '__legacy__';
const MAX_HISTORY = 200;

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');
}

// owner 可能是数字也可能是字符串，统一按字符串比
function sameOwner(a, b) {
  return String(a == null ? '' : a) === String(b == null ? '' : b);
}

// 旧数据迁移：老会话没有 owner，先备份原文件，再标成归档（学生列表里不再出现）
function migrate(list) {
  let migrated = 0;
  for (const s of list) {
    if (!s.owner) {
      s.owner = LEGACY_OWNER;
      s.legacy = true;
      migrated += 1;
    }
  }
  if (!migrated) return false;
  try {
    fs.copyFileSync(FILE, LEGACY_BACKUP);
  } catch (e) { /* 备份失败也继续迁移 */ }
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('[vibe] 旧会话归档失败:', e.message);
    return false;
  }
  console.log(`[vibe] 已归档 ${migrated} 条没有归属的旧会话（备份在 ${LEGACY_BACKUP}）`);
  return true;
}

function load() {
  ensure();
  let list;
  try {
    list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return [];
  }
  if (!Array.isArray(list)) return [];
  try {
    migrate(list);
  } catch (e) {
    console.error('[vibe] 会话迁移出错:', e.message);
  }
  return list;
}

function save(list) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
}

function publicShape(s) {
  return {
    id: s.id,
    name: s.name,
    model: s.model,
    owner: s.owner,
    legacy: !!s.legacy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: (s.messages || []).length,
    tokens: s.tokens || 0,
  };
}

/** 某个学生的会话列表（按最近更新排序） */
function list(owner) {
  return load()
    .filter((s) => sameOwner(s.owner, owner))
    .map(publicShape)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/** 全部会话（教师后台用） */
function listAll() {
  return load()
    .map(publicShape)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function create(model, owner) {
  const all = load();
  const now = new Date().toISOString();
  const s = {
    id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: '新对话',
    model: model || '',
    owner: String(owner == null ? '' : owner),
    createdAt: now,
    updatedAt: now,
    tokens: 0,
    messages: [],
  };
  all.push(s);
  save(all);
  return s;
}

/** 取会话；owner 传了就必须是他的，别人拿到 id 也读不到 */
function get(id, owner) {
  const s = load().find((x) => x.id === id) || null;
  if (!s) return null;
  if (owner != null && !sameOwner(s.owner, owner)) return null;
  return s;
}

function update(id, patch, owner) {
  const all = load();
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) return null;
  if (owner != null && !sameOwner(all[i].owner, owner)) return null;
  const before = all[i];
  const after = { ...before, ...patch };
  if (patch.messages) after.messages = patch.messages.slice(-MAX_HISTORY);
  after.updatedAt = new Date().toISOString();
  all[i] = after;
  save(all);
  return after;
}

function remove(id, owner) {
  const all = load();
  const target = all.find((s) => s.id === id);
  if (!target) return false;
  if (owner != null && !sameOwner(target.owner, owner)) return false;
  save(all.filter((s) => s.id !== id));
  return true;
}

function clearMessages(id, owner) {
  return update(id, { messages: [], tokens: 0, name: '新对话' }, owner);
}

/** 启动时主动跑一次旧数据归档（顺便返回归档条数） */
function migrateLegacy() {
  try {
    return load().filter((s) => s.legacy).length;
  } catch (e) {
    console.error('[vibe] 旧会话归档失败:', e.message);
    return 0;
  }
}

module.exports = { list, listAll, create, get, update, remove, clearMessages, migrateLegacy, LEGACY_OWNER };
