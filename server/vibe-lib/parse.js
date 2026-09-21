'use strict';

const path = require('path');

// 从模型回复中解析出「带文件名」的代码块
const FENCE = /```([^\n`]*)\n?([\s\S]*?)```/g;
// 首行/次行标记：// src/a.ts   # File: src/a.py   /* File: x */   <!-- File: x -->
const MARKER = /^\s*(?:\/\/|#|\/\*+|<!--)\s*(?:file\s*[:：]\s*)?([A-Za-z0-9_./\-]+\.[A-Za-z0-9]+)\s*(?:\*\/|-->)?\s*$/i;

function looksLikePath(token) {
  if (!token) return false;
  if (token.includes('/') || token.includes('\\')) return true;
  return /^[A-Za-z0-9_.\-]+\.[A-Za-z0-9]{1,8}$/.test(token);
}

function cleanPath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

/** 从代码块信息串里找路径：html:index.html  /  index.html  /  html index.html */
function pathFromInfo(info) {
  const raw = String(info || '').trim();
  if (!raw) return null;
  const tokens = raw.split(/\s+/);
  for (const t of tokens) {
    if (/^path\s*[:=]/i.test(t)) {
      return cleanPath(t.split(/[:=]/)[1] || '');
    }
    if (t.includes(':')) {
      const maybe = t.split(':')[1];
      if (looksLikePath(maybe)) return cleanPath(maybe);
    }
    if (looksLikePath(t)) return cleanPath(t);
  }
  if (looksLikePath(raw)) return cleanPath(raw);
  return null;
}

/** 从代码正文开头找 File: 标记，并把它从正文里剔除 */
function pathFromBody(code) {
  const lines = code.split('\n');
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const m = lines[i].match(MARKER);
    if (m && looksLikePath(m[1])) {
      const rest = lines.slice();
      rest.splice(i, 1);
      while (rest.length && rest[0].trim() === '') rest.shift();
      return { path: cleanPath(m[1]), code: rest.join('\n') };
    }
  }
  return null;
}

/**
 * 解析助手回复里的所有代码块，返回可落盘的文件变更。
 * 返回 [{ path, language, content, isNew }]
 */
function extractChanges(text, opts) {
  const root = opts && opts.root;
  const existsFn = opts && opts.existsFile;
  const out = [];
  const seen = new Set();

  let m;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(String(text || ''))) !== null) {
    const info = (m[1] || '').trim();
    let code = m[2] || '';
    let language = '';
    let p = pathFromInfo(info);

    if (p) {
      const first = info.split(/\s+/)[0].split(':')[0];
      language = /^[A-Za-z0-9+#\-]{1,12}$/.test(first) ? first : '';
    } else {
      const fromBody = pathFromBody(code);
      if (fromBody) {
        p = fromBody.path;
        code = fromBody.code;
      }
    }
    if (!p) continue;

    p = p.replace(/[*`"']/g, '');

    const key = p;
    const item = {
      path: p,
      language,
      content: code.replace(/\s+$/, '') + '\n',
      isNew: existsFn ? !existsFn(p) : true,
    };
    if (seen.has(key)) {
      out[out.findIndex((x) => x.path === key)] = item;
    } else {
      seen.add(key);
      out.push(item);
    }
  }
  if (root) {
    for (const it of out) {
      try {
        it.abs = path.resolve(root, it.path);
      } catch (e) { /* ignore */ }
    }
  }
  return out;
}

module.exports = { extractChanges, pathFromInfo, pathFromBody, looksLikePath, cleanPath };
