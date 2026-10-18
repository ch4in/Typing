import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './python.css';
import { explainError } from './errorExplain';
import { SAMPLES, CHEATS } from './samples';
import { tokenizeLines, TOK_COLOR } from './highlight';

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

function drawShot({ code, outList, fileName, errLine, student }) {
  const measureCvs = document.createElement('canvas');
  const mctx = measureCvs.getContext('2d');
  mctx.font = CODE_FONT;

  // ---- 先量出内容真实需要的宽度：最宽的代码行 / 输出行决定画布宽度 ----
  // （以前固定 1100 宽，代码短时右边一大块空白，贴到 Word 里又特别大）
  const codeLines = tokenizeLines(String(code).replace(/\t/g, '    '));
  const partsW = (parts) => parts.reduce((n, p) => n + mctx.measureText(p.text).width, 0);
  let maxCodeW = 0;
  codeLines.forEach((parts) => { maxCodeW = Math.max(maxCodeW, partsW(parts)); });
  const outLogical = rowsFromOut(outList);
  let maxOutW = 0;
  outLogical.forEach((parts) => { maxOutW = Math.max(maxOutW, partsW(parts)); });

  // 宽度跟着内容走：最短 520（太短不好看），最长 1100（太长贴 Word 里还是大）
  // 标题条右上角要放「学校 班级 姓名 ｜ 文件名」，也得给它留够地方
  mctx.font = '16px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  const whoW = student
    ? mctx.measureText([student.schoolName, student.className, student.name].filter(Boolean).join(' ')).width
    : 0;
  mctx.font = 'bold 20px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  const logoW = mctx.measureText('🐍 Python 编程').width;
  mctx.font = '16px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  const titleNeedW = SHOT_PAD * 2 + logoW + 30 + whoW + (whoW ? 20 : 0) + mctx.measureText(String(fileName || 'main.py')).width;
  mctx.font = CODE_FONT;
  const W = Math.max(520, Math.min(SHOT_W, Math.ceil(Math.max(
    SHOT_PAD * 2 + SHOT_GUTTER + maxCodeW + 14,
    SHOT_PAD * 2 + 20 + maxOutW + 14,
    titleNeedW,
  ))));
  const codeAvail = W - SHOT_PAD * 2 - SHOT_GUTTER;
  const outAvail = W - SHOT_PAD * 2 - 20;

  // ---- 再按这个宽度排版，算出画布要多高 ----
  // 代码按语法切成小块上色，跟编辑器里看到的颜色一致
  const codeBlocks = codeLines.map((parts, idx) => ({
    no: idx + 1,
    rows: wrapParts(
      mctx,
      parts.map((p) => ({ text: p.text, color: TOK_COLOR[p.type] || TOK_COLOR.plain })),
      codeAvail,
    ),
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
  cvs.width = W * dpr;
  cvs.height = H * dpr;
  const ctx = cvs.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 顶部标题条
  const grad = ctx.createLinearGradient(0, 0, W, titleH);
  grad.addColorStop(0, '#45B7D1');
  grad.addColorStop(1, '#37a3bd');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, titleH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🐍 Python 编程', SHOT_PAD, titleH / 2);
  ctx.font = '16px system-ui, -apple-system, "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  // 右上角：学校 班级 姓名（在文件名的左边），方便老师收作业时一眼认出是谁的
  const who = student
    ? [student.schoolName, student.className, student.name].filter(Boolean).join(' ')
    : '';
  const titleRight = who ? `${who} ｜ ${fileName || 'main.py'}` : String(fileName || 'main.py');
  ctx.fillText(titleRight, W - SHOT_PAD, titleH / 2);
  ctx.textAlign = 'left';

  // 代码区的标题
  ctx.font = UI_FONT;
  ctx.fillStyle = '#636e72';
  ctx.fillText('📝 代码', SHOT_PAD, codeTop - labelH / 2 - 2);

  // 代码区背景 + 行号栏
  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(0, codeTop, W, codeH);
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
        ctx.fillRect(0, cy - SHOT_LINE_H / 2, W, SHOT_LINE_H);
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
      // 一行 = 几段带颜色的文字，一段一段接着画
      let x = SHOT_PAD + SHOT_GUTTER;
      row.forEach((p) => {
        if (!p.text) return;
        ctx.fillStyle = p.color || '#2d3436';
        ctx.fillText(p.text, x, cy);
        x += ctx.measureText(p.text).width;
      });
      y += SHOT_LINE_H;
    });
  });

  // 运行结果区（深色，像真的终端）
  ctx.fillStyle = '#1b2027';
  ctx.fillRect(0, outTop, W, H - outTop);
  ctx.fillStyle = '#131920';
  ctx.fillRect(0, outTop, W, labelH);
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

// 编辑器着色层：每种小积木对应一个 CSS 类
const tokCls = (t) => (t === 'plain' ? '' : `py-tok-${t}`);

// 渲染着色层里的一行；bad 行（语法错误行）整行铺红底，
// 并且从出错的列开始到行尾画红色波浪线（跟真编辑器一样）
function renderHlLine(spans, li, errLine, liveErr) {
  const no = li + 1;
  const isBad = errLine === no;
  let body;
  if (isBad && liveErr && liveErr.offset) {
    const start = Math.max(1, Number(liveErr.offset));
    const nodes = [];
    let col = 1;
    spans.forEach((s, si) => {
      const a = col;
      const b = col + s.text.length - 1;
      if (b < start) {
        nodes.push(<span key={si} className={tokCls(s.type)}>{s.text}</span>);
      } else if (a >= start) {
        nodes.push(<span key={si} className={`${tokCls(s.type)} py-tok-err`}>{s.text}</span>);
      } else {
        const cut = start - a;
        nodes.push(<span key={si} className={tokCls(s.type)}>{s.text.slice(0, cut)}</span>);
        nodes.push(<span key={`${si}e`} className={`${tokCls(s.type)} py-tok-err`}>{s.text.slice(cut)}</span>);
      }
      col = b + 1;
    });
    if (col <= start) {
      // 出错位置在行尾（比如冒号没写）：补个空格让波浪线看得见
      nodes.push(<span key="end" className="py-tok-err"> </span>);
    }
    body = nodes;
  } else {
    body = spans.map((s, si) => <span key={si} className={tokCls(s.type)}>{s.text}</span>);
  }
  return <div key={li} className={`py-hl-line${isBad ? ' bad' : ''}`}>{body}</div>;
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
  const [liveErr, setLiveErr] = useState(null); // 边写边查出来的语法错误（不运行也标红）
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
  const [clearAsk, setClearAsk] = useState(false); // 清空代码的二次确认状态

  const codeRef = useRef(code);
  codeRef.current = code;
  const workerRef = useRef(null);
  const bufRef = useRef([]);
  const flushTimer = useRef(null);
  const slowTimer = useRef(null);
  const outRef = useRef(null);
  const taRef = useRef(null);
  const gutterRef = useRef(null);
  const hlRef = useRef(null);
  const shotRef = useRef(null);
  const checkSeq = useRef(0); // 每发一次语法检查就 +1，防止旧结果盖掉新的
  const runningRef = useRef(false); // 正在运行/等输入时为 true，这段时间不查语法
  const statusRef = useRef('idle'); // 给定时器看的最新状态（定时器里的 status 是旧的）
  const stopTimer = useRef(null); // 30 秒还没跑完就自动停止（静默死循环）
  const runOutRef = useRef({ lines: 0, chars: 0 }); // 本次运行的输出量，用来发现死循环刷屏
  statusRef.current = status;

  // 输出一行行来，攒一小会儿再一起显示，免得刷得太快看不清
  const push = useCallback((line) => {
    // 顺手统计这次运行输出了多少：死循环刷屏时靠它发现并自动停下
    const r = runOutRef.current;
    r.lines += 1;
    r.chars += (line.text || '').length;
    bufRef.current.push(line);
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      const add = bufRef.current;
      bufRef.current = [];
      setOut((prev) => {
        const next = prev.concat(add);
        // 最多留 600 条：再多 React 每帧都要重画几千行，页面会被拖死
        return next.length > 600 ? next.slice(next.length - 600) : next;
      });
      // 输出洪峰（比如 while True: print(...)）：直接掐掉，别让页面被冲垮
      if (runningRef.current && (r.lines > 2000 || r.chars > 200000)) autoStop('flood');
    }, 80);
  }, []);

  // 程序自己停不下来（死循环）时替学生点「停止」，并说清楚为什么
  const autoStop = useCallback((why) => {
    if (!runningRef.current) return;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    clearTimeout(slowTimer.current);
    clearTimeout(stopTimer.current);
    bufRef.current = [];
    runningRef.current = false;
    setSlow(false);
    setWaitInput(false);
    setWaitBatch(false);
    setStatus('done');
    if (why === 'flood') {
      push({ kind: 'tip', text: '⏹ 程序一直在输出，已经帮你停下啦！\n' });
      push({ kind: 'tip', text: '🔍 这多半是「死循环」：检查一下 while / for 循环里的条件有没有变化（比如循环里忘了 i = i + 1）～\n' });
    } else {
      push({ kind: 'tip', text: '⏹ 程序跑了 30 秒还没结束，已经帮你停下啦！\n' });
      push({ kind: 'tip', text: '🔍 这多半是「死循环」：检查一下循环的条件是不是永远成立，循环里要记得改变条件哦～\n' });
    }
  }, [push]);

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
      clearTimeout(stopTimer.current);
      runningRef.current = false;
      setSlow(false);
      setWaitInput(false);
      setWaitBatch(false);
      setBootMsg('');
      setStatus('done');
      if (m.stopped === 'exit') push({ kind: 'tip', text: '🏁 程序结束了\n' });
    } else if (m.type === 'error') {
      clearTimeout(slowTimer.current);
      clearTimeout(stopTimer.current);
      runningRef.current = false;
      setSlow(false);
      setWaitInput(false);
      setWaitBatch(false);
      setBootMsg('');
      setStatus('error');
      setLiveErr(m.error || null);
      if (m.error && m.error.lineno) setErrLine(Number(m.error.lineno));
      push({ kind: 'error', error: m.error });
    } else if (m.type === 'fatal') {
      clearTimeout(slowTimer.current);
      clearTimeout(stopTimer.current);
      runningRef.current = false;
      setSlow(false);
      setWaitInput(false);
      setWaitBatch(false);
      setBootMsg('');
      setStatus('error');
      push({ kind: 'err', text: `\n😢 运行环境出问题了：${m.text}\n` });
      push({ kind: 'tip', text: '可以试试刷新页面再来一次；如果一直不行，请告诉老师 🙋\n' });
    } else if (m.type === 'checked') {
      // 边写边查的结果回来了：不是最新代码的结果直接扔掉
      if (m.seq !== checkSeq.current) return;
      setLiveErr(m.err || null);
      setErrLine(m.err && m.err.lineno ? Number(m.err.lineno) : null);
      // 只是后台查语法把环境启动了的话，状态栏恢复「等待运行」
      if (!runningRef.current) {
        setStatus((s) => (s === 'boot' ? 'idle' : s));
        setBootMsg('');
      }
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
    runOutRef.current = { lines: 0, chars: 0 };
    setOut([]);
    setErrLine(null);
    setLiveErr(null);
    setSlow(false);
    setWaitInput(false);
    setWaitBatch(false);
    setStatus('run');
    setBootMsg('');
    runningRef.current = true;
    clearTimeout(slowTimer.current);
    clearTimeout(stopTimer.current);
    // 跑太久就提醒一下：多半是 while 循环停不下来
    slowTimer.current = setTimeout(() => setSlow(true), 12000);
    // 30 秒还没结束（也没在等输入）就当死循环，自动停下来
    stopTimer.current = setTimeout(() => {
      if (statusRef.current === 'run') autoStop('silent');
    }, 30000);
    w.postMessage({ type: 'run', code: codeRef.current });
  }, [ensureWorker, autoStop]);

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    clearTimeout(slowTimer.current);
    clearTimeout(stopTimer.current);
    bufRef.current = [];
    runningRef.current = false;
    setSlow(false);
    setWaitInput(false);
    setWaitBatch(false);
    setStatus('idle');
    push({ kind: 'tip', text: '⏹ 已经停下啦（下次运行要重新准备环境，会慢一点点）\n' });
  }, [push]);

  useEffect(() => () => {
    if (workerRef.current) workerRef.current.terminate();
    clearTimeout(slowTimer.current);
    clearTimeout(stopTimer.current);
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

  // 边写边查语法：停笔 0.7 秒就把代码发给 worker 编译一下（只编译不运行），
  // 有错就把出错行标红 + 画波浪线，跟真编辑器一样。第一次检查会顺带把
  // Python 环境在后台预热好，这样学生点「▶ 运行」时就是秒开。
  useEffect(() => {
    const t = setTimeout(() => {
      if (runningRef.current) return;
      checkSeq.current += 1;
      ensureWorker().postMessage({ type: 'check', code: codeRef.current, seq: checkSeq.current });
    }, 700);
    return () => clearTimeout(t);
  }, [code, ensureWorker]);

  // 输出区自动滚到底
  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [out, waitInput, waitBatch]);

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    if (hlRef.current) hlRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
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
  // 着色层的「小积木」按行切好；代码没变就不重算，打字才不卡
  const hlLines = useMemo(() => tokenizeLines(code), [code]);
  // 语法错误的儿童友好版一句话提示（显示在编辑器底部）
  const liveHint = useMemo(() => (liveErr ? explainError(liveErr, codeRef.current) : null), [liveErr]);

  // 清空代码：点第一下只是「询问」（3 秒内有效），再点一下才真正删掉，防止手滑误删
  const clearCode = () => {
    if (!clearAsk) {
      setClearAsk(true);
      setTimeout(() => setClearAsk(false), 3000);
      return;
    }
    setClearAsk(false);
    setCode('');
    setErrLine(null);
    setLiveErr(null);
  };

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
      const cvs = drawShot({ code: codeRef.current, outList: out, fileName, errLine, student: user });
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

  // blob 转 dataURL（base64 直接嵌在字符串里，WPS/Word 不依赖浏览器环境就能读）
  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('图片编码失败'));
    r.readAsDataURL(blob);
  });

  // 老办法复制：选中图片再 execCommand('copy')。
  // 两个关键点（少一个 WPS 里贴出来就是空白）：
  // 1. 剪贴板 HTML 里的图片必须用 data: 开头的 base64 地址——blob: 地址只在
  //    浏览器里有效，WPS 拿到也读不出来；
  // 2. 复制前要等图片真正解码、真正画到屏幕外容器里——不然复制出去的位图是空白的。
  // 6 秒没反应就当失败，绝不能一直卡住（不然按钮点了像坏了一样）
  const copyImgLegacy = (dataUrl) => new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 6000);
    const img = document.createElement('img');
    img.src = dataUrl;
    // 贴进 Word/WPS 时按这个宽度显示：14cm 正好是 A4 默认页边距下的正文宽度，
    // 图片会跟着页面宽度走，不会一大张糊满整页
    img.style.width = '14cm';
    img.style.height = 'auto';
    img.onload = () => {
      (async () => {
        try {
          try { if (img.decode) await img.decode(); } catch (e) { /* 有的浏览器 decode 不了，继续 */ }
          // 再等两帧，确保图片真的渲染出来了，位图才不是空的
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const holder = document.createElement('div');
          holder.contentEditable = 'true';
          holder.style.cssText = 'position:fixed;left:-99999px;top:0;';
          holder.appendChild(img);
          document.body.appendChild(holder);
          holder.focus(); // 有些浏览器要先聚焦 contenteditable 才复制得出去
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(holder);
          sel.removeAllRanges();
          sel.addRange(range);
          const ok = document.execCommand('copy');
          sel.removeAllRanges();
          document.body.removeChild(holder);
          finish(ok);
        } catch (e) { finish(false); }
      })();
    };
    img.onerror = () => finish(false);
  });

  // 复制结果：直接把截图放到剪贴板，回到 Word 里 Ctrl+V 就能贴上去
  const copyShot = async () => {
    let url = '';
    try {
      const blob = await shotBlob();
      url = URL.createObjectURL(blob);
      const dataUrl = await blobToDataUrl(blob);
      // 先用老办法（WPS 兼容最好），不行了再试 Edge 的新剪贴板 API
      let ok = await copyImgLegacy(dataUrl);
      if (!ok && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        try {
          // 两种格式一起放：WPS/Word 读 HTML（图片内嵌 base64，宽度 14cm 适应页面），别的读 PNG
          await navigator.clipboard.write([new window.ClipboardItem({
            'image/png': blob,
            'text/html': new Blob([`<img src="${dataUrl}" style="width:14cm;height:auto">`], { type: 'text/html' }),
          })]);
          ok = true;
        } catch (e) { ok = false; }
      }
      console.log('[copyShot] 复制结果 =', ok);
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
            <button className={`py-btn${slow && status === 'run' ? ' danger pulse' : ''}`} onClick={stop} disabled={status === 'idle'}>⏹ 停止</button>
            <button className="py-btn" onClick={() => setShowSamples(true)}>📚 示例</button>
            <button className="py-btn" onClick={() => setShowCheat(true)}>❓ 小抄</button>
            <button className="py-btn" onClick={download}>⬇ 下载</button>
            <button
              className={`py-btn${clearAsk ? ' danger' : ''}`}
              onClick={clearCode}
              disabled={!code && !clearAsk}
              title="把编辑器里的代码全部删掉"
            >
              {clearAsk ? '❗ 再点一下确认清空' : '🗑 清空'}
            </button>
          </div>

          <div className="py-editor">
            <div className="py-gutter">
              <div className="py-gutter-inner" ref={gutterRef}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className={`py-ln${errLine === i + 1 ? ' bad' : ''}`}>{i + 1}</div>
                ))}
              </div>
            </div>
            <div className="py-editor-main">
              {/* 着色层：只负责显示颜色，摸不到（pointer-events 关掉），
                  打字、选中都还是落在上面透明的 textarea 里 */}
              <pre className="py-hl" aria-hidden="true">
                <div className="py-hl-inner" ref={hlRef}>
                  {hlLines.map((spans, li) => renderHlLine(spans, li, errLine, liveErr))}
                </div>
              </pre>
              <textarea
                ref={taRef}
                className="py-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={syncScroll}
                onKeyDown={onKeyDown}
                spellCheck={false}
                wrap="off"
                placeholder="在这里写 Python 代码…"
              />
            </div>
          </div>

          <div className="py-foot">
            {liveErr ? (
              <span className="py-foot-err" title={liveErr.message || ''}>
                🐞 第 {liveErr.lineno || '?'} 行{liveHint ? `：${liveHint.title}` : ' 好像写错了'}
                {liveHint && liveHint.fix ? `　👉 ${liveHint.fix}` : ''}
              </span>
            ) : (
              '⌨️ Ctrl + 回车 运行　·　Tab 缩进 4 格　·　写错的地方会自动标红'
            )}
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
            <button className="py-btn" onClick={() => { setOut([]); setErrLine(null); setLiveErr(null); }}>🗑 清空</button>
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
                {'\n'}⏳ 已经跑了 12 秒还没结束……是不是 while 循环忘了让条件变化（比如忘了 i = i + 1）？可以点「⏹ 停止」先停下来看看；到 30 秒还没结束我会自动帮你停下。
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
