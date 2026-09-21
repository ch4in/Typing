'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', 'coverage',
  '.cache', '.next', '.nuxt', '.output', '.vite', '.turbo', '__pycache__',
  '.idea', '.vscode', '.gradle', 'vendor', 'target', 'bin', 'obj', '.venv',
  'venv', 'env', '.pytest_cache', '.mypy_cache', '.tox', '.parcel-cache',
  '.vibe-backups',
]);
const IGNORE_FILES = new Set([
  '.DS_Store', 'thumbs.db', 'desktop.ini', 'package-lock.json',
  'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
]);
const TEXT_EXT = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'json', 'jsonc', 'html', 'htm', 'css',
  'scss', 'sass', 'less', 'vue', 'svelte', 'md', 'mdx', 'txt', 'yml', 'yaml',
  'toml', 'ini', 'env', 'sh', 'bat', 'cmd', 'ps1', 'py', 'rb', 'go', 'rs', 'java',
  'kt', 'swift', 'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'php', 'sql', 'graphql',
  'dockerfile', 'gitignore', 'gradle', 'xml', 'lua', 'r', 'dart', 'scala',
]);
const MAX_DEPTH = 12;
const MAX_NODES = 6000;
const MAX_READ = 512 * 1024;

function isTextFile(abs) {
  const ext = path.basename(abs).replace(/^\./, '').toLowerCase();
  const name = path.basename(abs);
  if (name === 'Dockerfile' || TEXT_EXT.has(ext) || TEXT_EXT.has(name.toLowerCase())) return true;
  if (ext === '') return true;
  try {
    const fd = fs.openSync(abs, 'r');
    const buf = Buffer.alloc(4096);
    const n = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    return !buf.slice(0, n).includes(0);
  } catch (e) {
    return false;
  }
}

function buildTree(rootDir, relDir, depth, counter) {
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  const nodes = [];
  const list = entries
    .filter((e) => !(e.isDirectory() && IGNORE_DIRS.has(e.name)) && !IGNORE_FILES.has(e.name))
    .sort((a, b) => {
      const da = a.isDirectory() ? 0 : 1;
      const db = b.isDirectory() ? 0 : 1;
      return da - db || a.name.localeCompare(b.name, 'zh');
    });

  for (const e of list) {
    if (counter.n >= MAX_NODES) return nodes;
    const rel = relDir ? relDir + '/' + e.name : e.name;
    if (e.isDirectory()) {
      const children = depth + 1 <= MAX_DEPTH
        ? buildTree(path.join(rootDir, e.name), rel, depth + 1, counter)
        : [];
      counter.n += 1;
      nodes.push({ name: e.name, path: rel, type: 'dir', children });
    } else {
      let size = 0;
      try {
        size = fs.statSync(path.join(rootDir, e.name)).size;
      } catch (err) { /* ignore */ }
      counter.n += 1;
      counter.files += 1;
      nodes.push({ name: e.name, path: rel, type: 'file', size });
    }
  }
  return nodes;
}

/**
 * 生成一套绑定在某个根目录上的文件操作工具。
 * 每个学生用自己的根目录，谁也看不到别人的文件。
 */
function makeWorkspace(rootFn) {
  /** 安全解析：禁止逃出作品区 */
  function safe(abs) {
    const r = path.resolve(rootFn());
    const target = path.resolve(abs);
    if (target !== r && !target.startsWith(r + path.sep)) {
      throw new Error('拒绝访问：目标路径不在作品区内');
    }
    return target;
  }

  function toAbs(rel) {
    let relPath = String(rel || '');
    relPath = relPath.replace(/\\/g, '/');
    if (relPath.startsWith('/') || /^[a-zA-Z]:/.test(relPath)) {
      throw new Error('请使用相对于作品区的路径');
    }
    if (relPath.split('/').indexOf('..') >= 0) {
      throw new Error('请使用相对于作品区的路径');
    }
    return safe(path.join(rootFn(), relPath));
  }

  function tree() {
    const r = path.resolve(rootFn());
    let children = [];
    let ok = true;
    let error = null;
    try {
      children = buildTree(r, '', 1, { n: 0, files: 0 });
    } catch (e) {
      ok = false;
      error = e.message;
    }
    return { root: r, children, ok, error };
  }

  function readFile(rel) {
    const abs = toAbs(rel);
    if (!fs.existsSync(abs)) {
      return { exists: false, path: rel };
    }
    if (!fs.statSync(abs).isFile()) {
      return { exists: false, path: rel, error: '不是文件' };
    }
    if (!isTextFile(abs)) {
      return { exists: true, path: rel, binary: true, error: '二进制文件，无法预览' };
    }
    const size = fs.statSync(abs).size;
    if (size > MAX_READ) {
      return {
        exists: true,
        path: rel,
        tooLarge: true,
        size,
        content: fs.readFileSync(abs, 'utf8').slice(0, MAX_READ),
        notice: '文件较大，仅加载前 512 KB',
      };
    }
    return { exists: true, path: rel, size, content: fs.readFileSync(abs, 'utf8') };
  }

  function backup(rel) {
    const abs = toAbs(rel);
    if (!fs.existsSync(abs)) return null;
    const backupDir = path.join(path.resolve(rootFn()), '.vibe-backups');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const target = path.join(backupDir, stamp, String(rel).replace(/\\/g, '/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(abs, target);
    return path.relative(path.resolve(rootFn()), target).replace(/\\/g, '/');
  }

  function writeFile(rel, content, doBackup) {
    const abs = toAbs(rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    let backupPath = null;
    if (doBackup !== false && fs.existsSync(abs)) {
      try {
        backupPath = backup(rel);
      } catch (e) { /* 备份失败不阻断写入 */ }
    }
    fs.writeFileSync(abs, content, 'utf8');
    return { path: rel, size: Buffer.byteLength(content, 'utf8'), backup: backupPath };
  }

  function existsFile(rel) {
    try {
      return fs.existsSync(toAbs(rel));
    } catch (e) {
      return false;
    }
  }

  return { tree, readFile, writeFile, existsFile, toAbs, root: rootFn, isTextFile };
}

// 默认：全体共用的作品区（教师端/旧用法）
const shared = makeWorkspace(() => config.workspaceRoot());

/** 某个学生专用的作品区（放在总作品区的 students/<id> 下面） */
function scoped(absRoot) {
  const dir = path.resolve(absRoot);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) { /* 目录建不了也不影响后面的读写尝试 */ }
  return makeWorkspace(() => dir);
}

module.exports = {
  tree: shared.tree,
  readFile: shared.readFile,
  writeFile: shared.writeFile,
  existsFile: shared.existsFile,
  toAbs: shared.toAbs,
  root: shared.root,
  isTextFile,
  scoped,
};
