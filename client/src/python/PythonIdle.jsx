import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './python.css';
import { explainError } from './errorExplain';
import { SAMPLES, CHEATS } from './samples';

// ==================== 截图用的小工具 ====================
// 上半部分画代码，下半部分画运行结果，全部用 canvas 手画，不需要额外的库
const SHOT_W = 1100;
const SHOT_LINE_H = 22;
const SHOT_PAD = 22;
const SHOT_GUTTER = 54;
const CODE_FONT = '15px "Cascadia Code", "JetBrains Mono", Consolas, Menlo, "Courier New", monospace';
const UI_FONT = 'bold 15px system-ui, -apple-system, "Microsoft YaHei", sans-serif';

const OUT_COLOR = {
  out: '#eaf2ff',
  err: '#ff9d9d',
  tip: '#ffd479',
  state: '#a5d8ff',
  echo: '#c0eb75',
};

// 一行太长就折成几行，保证截图里不丢内容
function wrapText(ctx, text, maxW) {
  if (text === '') return [''];
  const rows = [];
  let cur = '';
  for (const ch of Array.from(text)) {
    if (cur && ctx.measureText(cur + ch).width > maxW) {
      rows.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  rows.push(cur);
  return rows;
}

// 把一行里带不同颜色的几段排成若干条「看得见的行」（必要时折行）
function wrapParts(ctx, parts, maxW) {
  const visual = [];
  let curParts = [];
  let curW = 0;
  const flush = () => { visual.push(curParts); curParts = []; curW = 0; };

  parts.forEach((p) => {
    let rest = String(p.text || '');
    while (rest.length) {
      const avail = maxW - curW;
      let take = 0;
      let w = 0;
      for (const ch of Array.from(rest)) {
        const cw = ctx.measureText(ch).width;
        if (w + cw > avail && take > 0) break;
        w += cw;
        take += ch.length;
      }
      if (take === 0) { // 一个字符都放不下（几乎不会发生），先换行再试
        flush();
        continue;
      }
      curParts.push({ text: rest.slice(0, take), color: p.color });
      curW += w;
      rest = rest.slice(take);
      if (rest.length) flush();
    }
  });
  if (curParts.length) flush();
  return visual.length ? visual : [[]];
}

// 把 out 里攒的输出整理成「一行 = 几段带颜色的文字」
function rowsFromOut(outList) {
  const rows = [];
  let cur = [];
  const flushRow = () => { if (cur.length) rows.push(cur); cur = []; };

  outList.forEach((l) => {
    let text = '';
    let color = OUT_COLOR[l.kind] || OUT_COLOR.out;
    if (l.kind === 'error') {
      const e = l.error || {};
      text = String(e.traceback || e.message || '');
      color = OUT_COLOR.err;
    } else {
      text = String(l.text || '');
    }
    const chunks = text.split('\n');
    chunks.forEach((chunk, i) => {
      if (chunk) cur.push({ text: chunk, color });
      if (i < chunks.length - 1) flushRow();
    });
  });
  flushRow();
  return rows;
}

function drawShot({ code, outList, fileName, errLine }) {
  const measureCvs = document.createElement('canvas');
  const mctx = measureCvs.getContext('2d');
  mctx.font = CODE_FONT;

  const codeAvail = SHOT_W - SHOT_PAD * 2 - SHOT_GUTTER;
  const outAvail = SHOT_W - SHOT_PAD * 2 - 20;

  // ---- 先排好所有要画的内容，才能知道画布要多高 ----
  const codeBlocks = String(code).replace(/\t/g, '    ').split('\n').map((text, idx) => ({
    no: idx + 1,
    rows: wrapText(mctx, text, codeAvail),
  }));
  const codeRowCount = codeBlocks.reduce((n, b) => n + b.rows.length, 0);

  let outRows = [];
  rowsFromOut(outList).forEach((r) => { outRows = outRows.concat(wrapParts(mctx, r, outAvail)); });
  if (outRows.length === 0) {
    outRows = [[{ text: '（还没有运行结果：先点左边「▶ 运行」试试吧）', color: '#8b98a5' }]];
  }

  const titleH = 64;
  const labelH = 34;
  const codeTop = titleH + SHOT_PAD + labelH;
  const codeH = Math.max(SHOT_LINE_H, codeRowCount * SHOT_LINE_H) + 14;
  const outTop = codeTop + codeH + SHOT_PAD;
  const outBodyTop = outTop + labelH;
  const outH = Math.max(SHOT_LINE_H, outRows.length * SHOT_LINE_H) + 16;
  const H = outBodyTop + outH + SHOT_PAD;

  // ---- 开画 ----
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cvs = document.createElement('canvas');
  cvs.width = SHOT_W * dpr;
  cvs.height = H * dpr;
  const ctx = cvs.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SHOT_W, H);

  // 顶部标题条
  const grad = ctx.createLinearGradient(0, 0, SHOT_W, titleH);
  grad.addColorStop(0, '#45B7D1');
  grad.addColorStop(1, '#37a3bd');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SHOT_W, titleH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🐍 Python 编程', SHOT_PAD, titleH / 2);
  ctx.font = '16px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(String(fileName || 'main.py'), SHOT_W - SHOT_PAD, titleH / 2);
  ctx.textAlign = 'left';

  // 代码区的标题
  ctx.font = UI_FONT;
  ctx.fillStyle = '#636e72';
  ctx.fillText('📝 代码', SHOT_PAD, codeTop - labelH / 2 - 2);

  // 代码区背景 + 行号栏
  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(0, codeTop, SHOT_W, codeH);
  ctx.fillStyle = '#f1f3f5';
  ctx.fillRect(0, codeTop, SHOT_PAD + SHOT_GUTTER - 10, codeH);
  ctx.strokeStyle = '#e9ecef';
  ctx.beginPath();
  ctx.moveTo(SHOT_PAD + SHOT_GUTTER - 10, codeTop);
  ctx.lineTo(SHOT_PAD + SHOT_GUTTER - 10, codeTop + codeH);
  ctx.stroke();

  ctx.font = CODE_FONT;
  let y = codeTop + 7;
  codeBlocks.forEach((b) => {
    b.rows.forEach((row, i) => {
      const cy = y + SHOT_LINE_H / 2;
      if (errLine && b.no === errLine) {
        ctx.fillStyle = 'rgba(255,107,107,0.12)';
        ctx.fillRect(0, cy - SHOT_LINE_H / 2, SHOT_W, SHOT_LINE_H);
      }
      if (i === 0) {
        ctx.fillStyle = '#b2bec3';
        ctx.textAlign = 'right';
        ctx.fillText(String(b.no), SHOT_PAD + SHOT_GUTTER - 18, cy);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#c8ced3';
        ctx.fillText('↳', SHOT_PAD + SHOT_GUTTER - 14, cy);
      }
      if (row) {
        ctx.fillStyle = '#2d3436';
        ctx.fillText(row, SHOT_PAD + SHOT_GUTTER, cy);
      }
      y += SHOT_LINE_H;
    });
  });

  // 运行结果区（深色，像真的终端）
  ctx.fillStyle = '#1b2027';
  ctx.fillRect(0, outTop, SHOT_W, H - outTop);
  ctx.fillStyle = '#131920';
  ctx.fillRect(0, outTop, SHOT_W, labelH);
  ctx.font = UI_FONT;
  ctx.fillStyle = '#dfe6eb';
  ctx.fillText('🖥️ 运行结果', SHOT_PAD, outTop + labelH / 2);

  ctx.font = CODE_FONT;
  outRows.forEach((parts, i) => {
    const cy = outBodyTop + 8 + i * SHOT_LINE_H + SHOT_LINE_H / 2;
    let x = SHOT_PAD + 10;
    parts.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, x, cy);
      x += ctx.measureText(p.text).width;
    });
  });

  return cvs;
}

const DRAFT_KEY = 'py-idle-draft';
const HELLO = '# 在这里写你的 Python 程序\n# 写完按 Ctrl + 回车，或者点上面的「▶ 运行」\nprint("你好，Python！")\n';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (d && typeof d.code === 'string') return d;
  } catch (e) { /* 没有草稿就用默认的 */ }
  return { code: HELLO, name: 'main.py' };
}

// 报错卡片：左边 Python 原始报错（原样），右边中文解释
function ErrorCard({ err, code }) {
  const cn = explainError(err, code);
  const tb = String((err && err.traceback) || err && err.message || '');
  return (
    <div className="py-err">
      <div className="py-err-col">
        <pre className="py-err-pre">{tb}</pre>
      </div>
      <div className="py-err-col cn">
        <div className="py-err-cap">🇨🇳 中文解释</div>
        <div className="py-err-title">🐞 {cn.title}</div>
        {cn.lineno > 0 && (
          <div className="py-err-where">
            📍 出错位置：第 {cn.lineno} 行{cn.srcLine ? `　${cn.srcLine}` : ''}
          </div>
        )}
        <div className="py-err-row"><b>🤔 为什么</b><span>{cn.why}</span></div>
        <div className="py-err-row"><b>🛠 怎么改</b><span>{cn.fix}</span></div>
        {cn.extra && <div className="py-err-row"><b>👀 提醒</b><span>{cn.extra}</span></div>}
        {cn.sample && <pre className="py-err-sample">{cn.sample}</pre>}
      </div>
    </div>
  );
}

export default function PythonIdle() {
  const navigate = useNavigate();
  const user = readUser();

  const [code, setCode] = useState(() => loadDraft().code);
  const [fileName, setFileName] = useState(() => loadDraft().name);

  const [out, setOut] = useState([]);
  const [status, setStatus] = useState('idle'); // idle / boot / run / wait / done / error
  const [errLine, setErrLine] = useState(null);
  const [waitInput, setWaitInput] = useState(false);
  const [waitBatch, setWaitBatch] = useState(false);
  const [inputText, setInputText] = useState('');
  const [batchText, setBatchText] = useState('');
  const [slow, setSlow] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [showCheat, setShowCheat] = useState(false);
  const [shotUrl, setShotUrl] = useState(null);
  const [shotTip, setShotTip] = useState('');
  const [copied, setCopied] = useState(false);
  const [bootMsg, setBootMsg] = useState('');

  const codeRef = useRef(code);
  codeRef.current = code;
  const workerRef = useRef(null);
  const bufRef = useRef([]);
  const flushTimer = useRef(null);
  const slowTimer = useRef(null);
  const outRef = useRef(null);
  const taRef = useRef(null);
  const gutterRef = useRef(null);
  const shotRef = useRef(null);

  // 输出一行行来，攒一小会儿再一起显示，免得刷得太快看不清
  const push = useCallback((line) => {
    bufRef.current.push(line);
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      const add = bufRef.current;
      bufRef.current = [];
      setOut((prev) => prev.concat(add));
    }, 80);
  }, []);

  const onMsg = useCallback((m) => {
    if (!m || !m.type) return;
    if (m.type === 'state') {
      // 准备环境的进度不占地方，放在「运行结果」标题右边那一小块状态里
      setStatus('boot');
      setBootMsg(m.text);
    } else if (m.type === 'out') {
      push({ kind: 'out', text: m.text });
    } else if (m.type === 'err') {
      push({ kind: 'err', text: m.text });
    } else if (m.type === 'input') {
      setWaitInput(true);
      setStatus('wait');
    } else if (m.type === 'needBatch') {
      setWaitBatch(true);
      setStatus('wait');
      push({ kind: 'tip', text: '⌨️ 这个程序里函数用到了 input，请先把答案按顺序每行写好，再点「▶ 把答案给程序」：\n' });
    } else if (m.type === 'done') {
      clearTimeout(slowTimer.current);
      setSlow(false);
      setWaitInput(false);
      setWaitBatch(false);
      setBootMsg('');
      setStatus('done');
      if (m.stopped === 'exit') push({ kind: 'tip', text: '🏁 程序结束了\n' });
    } else if (m.type === 'error') {
      clearTimeout(slowTimer.current);
      setSlow(false);
      setWaitInput(false);
      setWaitBatch(false);
      setBootMsg('');
      setStatus('error');
      if (m.error && m.error.lineno) setErrLine(Number(m.error.lineno));
      push({ kind: 'error', error: m.error });
    } else if (m.type === 'fatal') {
      clearTimeout(slowTimer.current);
      setSlow(false);
      setWaitInput(false);
      setWaitBatch(false);
      setBootMsg('');
      setStatus('error');
      push({ kind: 'err', text: `\n😢 运行环境出问题了：${m.text}\n` });
      push({ kind: 'tip', text: '可以试试刷新页面再来一次；如果一直不行，请告诉老师 🙋\n' });
    }
  }, [push]);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const w = new Worker(new URL('./pyRunner.worker.js', import.meta.url));
    w.onmessage = (e) => onMsg(e.data);
    w.onerror = (e) => {
      push({ kind: 'err', text: `\n😢 运行环境启动失败：${e.message || '未知错误'}\n` });
      setStatus('error');
    };
    workerRef.current = w;
    return w;
  }, [onMsg, push]);

  const run = useCallback(() => {
    const w = ensureWorker();
    bufRef.current = [];
    setOut([]);
    setErrLine(null);
    setSlow(false);
    setWaitInput(false);
    setWaitBatch(false);
    setStatus('run');
    setBootMsg('');
    clearTimeout(slowTimer.current);
    // 跑太久就提醒一下：多半是 while 循环停不下来
    slowTimer.current = setTimeout(() => setSlow(true), 12000);
    w.postMessage({ type: 'run', code: codeRef.current });
  }, [ensureWorker]);

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    clearTimeout(slowTimer.current);
    bufRef.current = [];
    setSlow(false);
    setWaitInput(false);
    setWaitBatch(false);
    setStatus('idle');
    push({ kind: 'tip', text: '⏹ 已经停下啦（下次运行要重新准备环境，会慢一点点）\n' });
  }, [push]);

  useEffect(() => () => {
    if (workerRef.current) workerRef.current.terminate();
    clearTimeout(slowTimer.current);
    clearTimeout(flushTimer.current);
    if (shotRef.current) URL.revokeObjectURL(shotRef.current);
  }, []);

  // 代码自动存草稿，刷新页面也不会丢
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ code, name: fileName }));
      } catch (e) { /* 存不了就算了 */ }
    }, 400);
    return () => clearTimeout(t);
  }, [code, fileName]);

  // 输出区自动滚到底
  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [out, waitInput, waitBatch]);

  const syncGutter = () => {
    const ta = taRef.current;
    const g = gutterRef.current;
    if (ta && g) g.style.transform = `translateY(${-ta.scrollTop}px)`;
  };

  const submitInput = () => {
    if (!workerRef.current) return;
    const v = inputText;
    push({ kind: 'echo', text: v + '\n' });
    setInputText('');
    setWaitInput(false);
    setStatus('run');
    workerRef.current.postMessage({ type: 'input', value: v });
  };

  const submitBatch = () => {
    if (!workerRef.current) return;
    const lines = batchText.split('\n');
    push({ kind: 'echo', text: lines.map((l) => l + '\n').join('') });
    setWaitBatch(false);
    setStatus('run');
    workerRef.current.postMessage({ type: 'batch', lines });
  };

  // 编辑器键盘：Ctrl+回车运行、Tab 缩进、回车自动跟着上一行缩进
  const onKeyDown = (e) => {
    const ta = e.target;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en, value: v } = ta;
      if (s === en) {
        const next = v.slice(0, s) + '    ' + v.slice(en);
        setCode(next);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
      } else {
        const from = v.lastIndexOf('\n', s - 1) + 1;
        const block = v.slice(from, en).replace(/^/gm, '    ');
        const next = v.slice(0, from) + block + v.slice(en);
        setCode(next);
      }
      return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      const { selectionStart: s, value: v } = ta;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const cur = v.slice(lineStart, s);
      const indent = (cur.match(/^[ \t]*/) || [''])[0];
      if (indent) {
        e.preventDefault();
        const add = /[:：]\s*(#.*)?$/.test(cur.trim()) ? '    ' : '';
        const insert = '\n' + indent + add;
        const next = v.slice(0, s) + insert + v.slice(ta.selectionEnd);
        setCode(next);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + insert.length; });
      }
    }
  };

  const lineCount = code.split('\n').length;

  const download = () => {
    let f = String(fileName || 'main.py').trim() || 'main.py';
    if (!/\.py$/i.test(f)) f += '.py';
    f = f.replace(/[\\/:*?"<>|]/g, '_');
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = f;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    push({ kind: 'tip', text: `⬇️ 已经把 ${f} 下载到你自己的电脑上了\n` });
  };

  // 把「代码 + 运行结果」画成一张图（ png 二进制数据）
  const shotBlob = () => new Promise((resolve, reject) => {
    try {
      const cvs = drawShot({ code: codeRef.current, outList: out, fileName, errLine });
      cvs.toBlob((b) => { if (b) resolve(b); else reject(new Error('图片生成失败')); }, 'image/png');
    } catch (e) {
      reject(e);
    }
  });

  // 截图：代码在上，运行结果在下，弹窗预览后可下载
  const takeShot = async () => {
    try {
      const blob = await shotBlob();
      if (shotRef.current) URL.revokeObjectURL(shotRef.current);
      const url = URL.createObjectURL(blob);
      shotRef.current = url;
      setShotTip('上面是你的代码，下面是运行结果。点「⬇ 下载图片」保存，或者在图片上右键选「图片另存为」。');
      setShotUrl(url);
    } catch (e) {
      push({ kind: 'err', text: `📷 截图没做成：${e.message}\n` });
    }
  };

  // 老浏览器的兜底：选中图片再 execCommand('copy')
  const copyImgLegacy = (url) => new Promise((resolve) => {
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => {
      let ok = false;
      try {
        const holder = document.createElement('div');
        holder.contentEditable = 'true';
        holder.style.cssText = 'position:fixed;left:-99999px;top:0;';
        holder.appendChild(img);
        document.body.appendChild(holder);
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(holder);
        sel.removeAllRanges();
        sel.addRange(range);
        ok = document.execCommand('copy');
        sel.removeAllRanges();
        document.body.removeChild(holder);
      } catch (e) { ok = false; }
      resolve(ok);
    };
    img.onerror = () => resolve(false);
  });

  // 复制结果：直接把截图放到剪贴板，回到 Word 里 Ctrl+V 就能贴上去
  const copyShot = async () => {
    let url = '';
    try {
      const blob = await shotBlob();
      url = URL.createObjectURL(blob);
      let ok = false;
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
          ok = true;
        } catch (e) { ok = false; }
      }
      if (!ok) ok = await copyImgLegacy(url);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        return;
      }
      // 实在不让自动复制，就把图显示出来，让学生手动右键复制
      if (shotRef.current) URL.revokeObjectURL(shotRef.current);
      shotRef.current = url;
      setShotTip('这台电脑不让自动复制图片。请在图片上点右键 →「复制图片」，然后到 Word 里粘贴；也可以点下面的按钮下载保存。');
      setShotUrl(url);
      url = '';
    } catch (e) {
      push({ kind: 'err', text: `📋 复制没成功：${e.message}\n` });
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const closeShot = () => {
    if (shotRef.current) URL.revokeObjectURL(shotRef.current);
    shotRef.current = null;
    setShotUrl(null);
  };

  const downloadShot = () => {
    if (!shotUrl) return;
    const base = String(fileName || 'main.py').trim().replace(/\.py$/i, '') || 'main';
    const a = document.createElement('a');
    a.href = shotUrl;
    a.download = `${base.replace(/[\\/:*?"<>|]/g, '_')}-运行截图.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const statusText = {
    idle: '等待运行',
    boot: '正在准备 Python 环境…',
    run: '运行中…',
    wait: '等你输入答案',
    done: '✅ 运行完了',
    error: '❌ 出错了',
  }[status] || '';

  return (
    <div className="py-root">
      <div className="py-top">
        <span className="py-logo">🐍</span>
        <b className="py-title">Python 编程</b>
        <span className="py-sub"></span>
        <span className="py-grow" />
        {user && <span className="py-user">{user.name}{user.className ? ` · ${user.className}` : ''}</span>}
        <button className="py-chip" onClick={() => navigate('/')}>← 返回首页</button>
      </div>

      <div className="py-body">
        {/* ==================== 左边：写代码 ==================== */}
        <section className="py-pane">
          <div className="py-pane-head">
            <span className="py-pane-title">📝 写代码</span>
            <input
              className="py-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              spellCheck={false}
              title="文件名"
            />
            <span className="py-grow" />
            <button className="py-btn primary" onClick={run} disabled={status === 'run' || status === 'boot'}>
              ▶ 运行
            </button>
            <button className="py-btn" onClick={stop} disabled={status === 'idle'}>⏹ 停止</button>
            <button className="py-btn" onClick={() => setShowSamples(true)}>📚 示例</button>
            <button className="py-btn" onClick={() => setShowCheat(true)}>❓ 小抄</button>
            <button className="py-btn" onClick={download}>⬇ 下载</button>
          </div>

          <div className="py-editor">
            <div className="py-gutter">
              <div className="py-gutter-inner" ref={gutterRef}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className={`py-ln${errLine === i + 1 ? ' bad' : ''}`}>{i + 1}</div>
                ))}
              </div>
            </div>
            <textarea
              ref={taRef}
              className="py-code"
              value={code}
              onChange={(e) => { setCode(e.target.value); setErrLine(null); }}
              onScroll={syncGutter}
              onKeyDown={onKeyDown}
              spellCheck={false}
              wrap="off"
              placeholder="在这里写 Python 代码…"
            />
          </div>

          <div className="py-foot">
            ⌨️ Ctrl + 回车 运行　·　Tab 缩进 4 格
          </div>
        </section>

        {/* ==================== 右边：运行结果 ==================== */}
        <section className="py-pane">
          <div className="py-pane-head">
            <span className="py-pane-title">🖥️ 运行结果</span>
            <span className={`py-status ${status}`}>{status === 'boot' && bootMsg ? bootMsg : statusText}</span>
            <span className="py-grow" />
            <button className={`py-btn${copied ? ' ok' : ''}`} onClick={copyShot} title="把代码和运行结果做成图片并复制，去 Word 里 Ctrl+V 就能贴">
              {copied ? '✅ 已复制' : '📋 复制结果'}
            </button>
            <button className="py-btn" onClick={takeShot} title="把代码和运行结果做成一张图片">📷 截图</button>
            <button className="py-btn" onClick={() => { setOut([]); setErrLine(null); }}>🗑 清空</button>
          </div>

          <div className="py-out" ref={outRef}>
            {out.length === 0 && status === 'idle' && (
              <span className="py-line tip">点左边的「▶ 运行」，程序的输出就会显示在这里 😊</span>
            )}
            {out.map((l, i) => (l.kind === 'error'
              ? <ErrorCard key={i} err={l.error} code={codeRef.current} />
              : <span key={i} className={`py-line ${l.kind}`}>{l.text}</span>))}
            {slow && status === 'run' && (
              <span className="py-line tip">
                {'\n'}⏳ 已经跑了 12 秒还没结束……是不是 while 循环忘了让条件变化（比如忘了 i = i + 1）？可以点「⏹ 停止」先停下来看看。
              </span>
            )}
          </div>

          {waitInput && (
            <div className="py-inbar">
              <span>⌨️ 程序在问你：</span>
              <input
                className="py-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitInput(); }}
                autoFocus
                placeholder="输入答案后按回车"
                spellCheck={false}
              />
              <button className="py-btn primary" onClick={submitInput}>确定</button>
            </div>
          )}

          {waitBatch && (
            <div className="py-batch">
              <p>这个程序要问好几个问题，请在下面<b>每行填一个答案</b>（顺序要和程序问的一样），然后点按钮：</p>
              <textarea
                className="py-batch-ta"
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'50\n25\n37'}
                spellCheck={false}
              />
              <button className="py-btn primary" onClick={submitBatch}>▶ 把答案给程序</button>
            </div>
          )}
        </section>
      </div>

      {/* ==================== 示例程序 ==================== */}
      {showSamples && (
        <div className="py-mask" onClick={() => setShowSamples(false)}>
          <div className="py-modal" onClick={(e) => e.stopPropagation()}>
            <div className="py-modal-head">
              <span>📚 选一个示例程序</span>
              <button className="py-x" onClick={() => setShowSamples(false)}>×</button>
            </div>
            <div className="py-samples">
              {SAMPLES.map((s) => (
                <button
                  key={s.name}
                  className="py-sample"
                  onClick={() => {
                    setCode(s.code);
                    setFileName(s.name);
                    setErrLine(null);
                    setOut([]);
                    setShowSamples(false);
                  }}
                >
                  <span className="py-sample-emoji">{s.emoji}</span>
                  <span className="py-sample-name">{s.name}</span>
                  <span className="py-sample-desc">{s.desc}</span>
                </button>
              ))}
            </div>
            <p className="py-modal-tip">点一下就会放进左边的编辑器里（原来的代码会被替换掉，可以先「⬇ 下载」保存一份）</p>
          </div>
        </div>
      )}

      {/* ==================== 截图预览 ==================== */}
      {shotUrl && (
        <div className="py-mask" onClick={closeShot}>
          <div className="py-modal" onClick={(e) => e.stopPropagation()}>
            <div className="py-modal-head">
              <span>📷 截图做好了</span>
              <button className="py-x" onClick={closeShot}>×</button>
            </div>
            <div className="py-shot-box">
              <img src={shotUrl} alt="代码和运行结果截图" />
            </div>
            <p className="py-modal-tip">{shotTip}</p>
            <div className="py-shot-btns">
              <button className="py-btn primary" onClick={downloadShot}>⬇ 下载图片</button>
              <button className="py-btn" onClick={closeShot}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 小抄 ==================== */}
      {showCheat && (
        <div className="py-mask" onClick={() => setShowCheat(false)}>
          <div className="py-modal" onClick={(e) => e.stopPropagation()}>
            <div className="py-modal-head">
              <span>❓ 常用语法小抄</span>
              <button className="py-x" onClick={() => setShowCheat(false)}>×</button>
            </div>
            <div className="py-cheats">
              {CHEATS.map((c) => (
                <div className="py-cheat" key={c.k}>
                  <code>{c.k}</code>
                  <span>{c.v}</span>
                </div>
              ))}
            </div>
            <p className="py-modal-tip">记不住的时候点「❓ 小抄」看一眼就好，写多了自然就记住啦 💪</p>
          </div>
        </div>
      )}
    </div>
  );
}
