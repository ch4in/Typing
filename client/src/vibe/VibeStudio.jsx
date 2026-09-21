import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './vibe.css';
import { BRAND } from '../brand';
import { vibeApi } from './api';
import MessageItem from './MessageItem';
import {
  PreviewOverlay, SaveWorkModal, WorksModal, DiffModal, Modal, TreeNode,
} from './Panels';

const IDEAS = [
  { emoji: '🎮', text: '做一个打地鼠小游戏，鼠标点地鼠得分' },
  { emoji: '🌊', text: '做一个海底世界动画，小鱼游来游去' },
  { emoji: '🎂', text: '给妈妈做一张会放动画图案的生日贺卡' },
  { emoji: '🐍', text: '做一个贪吃蛇游戏，用键盘方向键控制' },
  { emoji: '🎨', text: '做一个可以在上面画画的彩色画板' },
  { emoji: '🧮', text: '做一个加减法口算练习器，能算分' },
];

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
}

// Pyodide：在浏览器里跑真正的 Python（WebAssembly 版），不用装任何东西。
// 按顺序尝试这些下载源；第一个 '/pyodide/' 是本地内置目录，
// 没内置时会秒失败自动跳到下一个，内置了就完全离线可用。
const PYODIDE_SOURCES = [
  '/pyodide/',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  'https://fastly.jsdelivr.net/pyodide/v0.26.4/full/',
  'https://unpkg.com/pyodide@0.26.4/',
  'https://cdn.bootcdn.net/ajax/libs/pyodide/0.26.4/',
];

// 塞进 Python 里跑的“开胃菜”：
// 1) 把 input() 换成可以等待页面输入框的版本（沙箱里 window.prompt 会被浏览器拦掉）
// 2) 用 ast 把用到 input 的函数自动改成 async + await，这样猜数字这类交互程序才能一边跑一边问
const PY_PRELUDE = `import ast, json, js

async def _py_input(prompt=''):
    if prompt:
        print(prompt, end='', flush=True)
    return await js.__pyRunnerInput()

def _top_names(body):
    names = set()
    for stmt in body:
        for n in ast.walk(stmt):
            if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)):
                names.add(n.id)
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                names.add(n.name)
            elif isinstance(n, ast.alias):
                names.add((n.asname or n.name).split('.')[0])
            elif isinstance(n, ast.ExceptHandler) and n.name:
                names.add(n.name)
    return sorted(x for x in names if x.isidentifier())

def _transform(code):
    tree = ast.parse(code)
    need = set()
    changed = True
    while changed:
        changed = False
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name not in need:
                for n in ast.walk(node):
                    f = getattr(n, 'func', None)
                    if isinstance(n, ast.Call) and isinstance(f, ast.Name) and (f.id == 'input' or f.id in need):
                        need.add(node.name)
                        changed = True
                        break

    class _T(ast.NodeTransformer):
        def visit_Call(self, node):
            self.generic_visit(node)
            f = node.func
            if isinstance(f, ast.Name):
                if f.id == 'input':
                    f.id = '_py_input'
                    return ast.Await(value=node)
                if f.id in need:
                    return ast.Await(value=node)
            return node

        def visit_FunctionDef(self, node):
            self.generic_visit(node)
            if node.name in need:
                return ast.copy_location(ast.AsyncFunctionDef(
                    name=node.name, args=node.args, body=node.body,
                    decorator_list=node.decorator_list, returns=node.returns,
                    type_comment=node.type_comment), node)
            return node

    tree = _T().visit(tree)
    body = list(tree.body)
    names = _top_names(tree.body)
    if names:
        body = [ast.Global(names=names)] + body
    main = ast.AsyncFunctionDef(
        name='__main__',
        args=ast.arguments(posonlyargs=[], args=[], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]),
        body=body or [ast.Pass()],
        decorator_list=[], returns=None, type_comment=None)
    runner = ast.Expr(value=ast.Await(value=ast.Call(
        func=ast.Name(id='__main__', ctx=ast.Load()), args=[], keywords=[])))
    mod = ast.Module(body=[main, runner], type_ignores=[])
    ast.fix_missing_locations(mod)
    return ast.unparse(mod)

def _plan(code):
    if 'input' not in code:
        return json.dumps({'mode': 'plain'})
    try:
        src = _transform(code)
        compile(src, '<exec>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        return json.dumps({'mode': 'async', 'src': src})
    except Exception as e:
        return json.dumps({'mode': 'batch', 'why': str(e)})
`;

function extName(name) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

// Python 作品：自带一个黑窗口，print 的内容一行行显示，需要输入时下面会弹出输入框
function pythonRunnerHtml(code) {
  const src = JSON.stringify(String(code || '')).replace(/<\//g, '<\\/');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>Python 在线运行</title>
<style>
html,body{margin:0;height:100%}
body{display:flex;flex-direction:column;background:#1c1a2e;color:#e8e3ff;font-family:'Cascadia Code',Consolas,Menlo,monospace}
.bar{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 14px;background:#241f42;border-bottom:1px solid #332c55;font-size:13.5px}
.bar b{color:#fff;font-size:14px}
.grow{flex:1}
.st{color:#b9adf7}
#out{flex:1;margin:0;padding:14px 16px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.75}
.err{color:#ff9d9d}
.tip{color:#b9adf7}
.echo{color:#8be9a8}
#inbar{flex:0 0 auto;display:none;align-items:center;gap:10px;padding:10px 14px;background:#241f42;border-top:1px solid #332c55}
#inbar.on{display:flex}
#inbar span{color:#ffd79a;white-space:nowrap}
#inp{flex:1;background:#1c1a2e;border:1px solid #4a3f7a;border-radius:9px;color:#e8e3ff;padding:8px 11px;font:inherit;font-size:14px;outline:none}
#inp:focus{border-color:#6c5ce7}
button{background:#6c5ce7;color:#fff;border:0;border-radius:9px;padding:8px 15px;font:inherit;font-size:13.5px;cursor:pointer;white-space:nowrap}
button:hover{background:#7d6ef0}
#batch{flex:0 0 auto;display:none;flex-direction:column;gap:8px;padding:12px 14px;background:#241f42;border-top:1px solid #332c55}
#batch.on{display:flex}
#batch p{margin:0;font-size:13px;color:#b9adf7}
#ta{min-height:64px;background:#1c1a2e;border:1px solid #4a3f7a;border-radius:9px;color:#e8e3ff;padding:9px 11px;font:inherit;font-size:14px;line-height:1.6;resize:vertical;outline:none}
</style></head>
<body>
<div class="bar"><b>🐍 Python 在线运行</b><span class="grow"></span><span class="st" id="st">正在准备 Python…</span></div>
<pre id="out"></pre>
<div id="inbar"><span>⌨️ 输入：</span><input id="inp" autocomplete="off" spellcheck="false" placeholder="在这里输入，然后按回车"><button id="go">确定</button></div>
<div id="batch"><p>这个程序要问你问题（用了 input）。请在下面<strong>每行填一个答案</strong>，然后点「▶ 运行」：</p><textarea id="ta" spellcheck="false" placeholder="50&#10;25&#10;37"></textarea><button id="run">▶ 运行</button></div>
<script>
var CODE = ${src};
var PRELUDE = ${JSON.stringify(PY_PRELUDE)};
var SOURCES = ${JSON.stringify(PYODIDE_SOURCES)};
var OUT = document.getElementById('out');
var ST = document.getElementById('st');
var INBAR = document.getElementById('inbar');
var INP = document.getElementById('inp');
var BATCH = document.getElementById('batch');
var TA = document.getElementById('ta');
var pending = null;

function put(t, cls) {
  var s = document.createElement('span');
  if (cls) s.className = cls;
  s.textContent = t;
  OUT.appendChild(s);
  OUT.scrollTop = OUT.scrollHeight;
}
function state(t) { ST.textContent = t; }

// ---- 输入：程序问一句，页面下面弹输入框，回车交回去 ----
window.__pyRunnerInput = function () {
  return new Promise(function (resolve) {
    pending = resolve;
    INP.value = '';
    INBAR.classList.add('on');
    INP.focus();
    OUT.scrollTop = OUT.scrollHeight;
  });
};
function submitLine() {
  if (!pending) return;
  var v = INP.value;
  INP.value = '';
  put(v + '\\n', 'echo');
  INBAR.classList.remove('on');
  var done = pending;
  pending = null;
  done(v);
}
document.getElementById('go').onclick = submitLine;
INP.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitLine(); });

// ---- 兜底：万一上面那种改写法失败，就让小朋友先把答案都写好 ----
function waitBatch() {
  return new Promise(function (resolve) {
    BATCH.classList.add('on');
    document.getElementById('run').onclick = function () {
      BATCH.classList.remove('on');
      resolve(TA.value.split('\\n'));
    };
  });
}

function loadScript(url) {
  return new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = res;
    s.onerror = function () { rej(new Error('连不上 ' + url)); };
    document.head.appendChild(s);
  });
}
// 一个一个源试，哪个能用就用哪个（本地内置的最优先）
async function boot() {
  var lastErr = null;
  for (var i = 0; i < SOURCES.length; i++) {
    try {
      state('正在准备 Python 运行环境…（尝试第 ' + (i + 1) + '/' + SOURCES.length + ' 个来源）');
      await loadScript(SOURCES[i] + 'pyodide.js');
      if (typeof loadPyodide !== 'function') throw new Error('脚本加载了但没生效');
      return await loadPyodide({ indexURL: SOURCES[i] });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('所有来源都连不上');
}
async function main() {
  try {
    var py = await boot();
    py.setStdout({ batched: function (s) { put(s); } });
    py.setStderr({ batched: function (s) { put(s, 'err'); } });
    await py.runPythonAsync(PRELUDE);
    py.globals.set('__user_code', CODE);
    var plan = JSON.parse(await py.runPythonAsync('_plan(__user_code)'));
    state('运行中…');
    if (plan.mode === 'async') {
      await py.runPythonAsync(plan.src);
    } else if (plan.mode === 'batch') {
      put('⚠️ 这个程序的写法有点特别，改成一次性把答案都给它：\\n', 'tip');
      var lines = await waitBatch();
      py.setStdin({ stdin: function () { return lines.length ? lines.shift() : null; } });
      await py.runPythonAsync(CODE);
    } else {
      await py.runPythonAsync(CODE);
    }
    INBAR.classList.remove('on');
    state('✅ 运行完了');
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    if (/SystemExit/.test(msg)) {
      INBAR.classList.remove('on');
      state('🏁 程序结束了');
      return;
    }
    put('\\n😢 运行出错：' + msg + '\\n', 'err');
    if (/I\\/O error|EOF|end of file/i.test(msg)) {
      put('程序还想再要一次输入，但输入框里没有了。重新运行一次，多给它几行答案就好 🙂\\n', 'tip');
    }
    state('❌ 出错了');
  }
}
main();
</script>
</body></html>`;
}

// C++ / Java 这类没法在浏览器里直接跑的语言：给一个「怎么自己运行」的说明页
function unsupportedRunnerHtml(code, lang) {
  const tips = {
    cpp: ['在电脑上装好 Dev-C++（或 MinGW、Visual Studio）', '把代码存成 main.cpp，用编译器编译成 exe', '双击运行 exe，就能看到黑窗口里的结果啦'],
    c: ['和 C++ 一样，用 Dev-C++ 或 gcc 编译后运行', '记得文件后缀改成 .c'],
    java: ['先装好 JDK', '把代码存成 Main.java，在命令行里 javac Main.java，再 java Main'],
  }[lang] || ['把代码保存到自己电脑上，用对应的工具打开运行'];
  const list = tips.map((t, i) => `<li>${i + 1}. ${t}</li>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
body{margin:0;padding:22px;background:#fff8f0;font-family:'Microsoft YaHei',sans-serif;color:#3d3455}
h3{margin:0 0 10px}
ol{line-height:2;color:#5b5075}
pre{background:#241f42;color:#e8e3ff;padding:14px 16px;border-radius:12px;overflow:auto;font-size:13px;line-height:1.7}
</style></head><body>
<h3>⏳ 这个语言暂时不能在这里直接运行</h3>
<p>下面是这个作品的完整代码，你可以这样在自己电脑上跑起来：</p>
<ol>${list}</ol>
<pre>${String(code).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body></html>`;
}

function toPreviewHtml({ html, language, name }) {
  const code = String(html || '');
  if (/<!doctype\s+html|<html[\s>]/i.test(code)) return code;
  const lang = String(language || '').toLowerCase() || extName(name);
  if (lang === 'css') return `<!doctype html><meta charset="utf-8"><style>\n${code}\n</style>`;
  if (lang === 'js' || lang === 'javascript' || lang === 'jsx') {
    return `<!doctype html><meta charset="utf-8"><body>\n<script>\n${code}\n<\/script>\n</body>`;
  }
  if (lang === 'python' || lang === 'py') return pythonRunnerHtml(code);
  if (lang === 'cpp' || lang === 'c' || lang === 'java' || lang === 'cs') return unsupportedRunnerHtml(code, lang);
  return code;
}

export default function VibeStudio() {
  const navigate = useNavigate();
  const user = readUser();

  const [mode, setMode] = useState(() => localStorage.getItem('vibe-mode') || 'simple');
  const [sideTab, setSideTab] = useState('chat');

  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [renaming, setRenaming] = useState({ id: null, value: '' });
  const [preview, setPreview] = useState(null);
  const [saveTarget, setSaveTarget] = useState(null);
  const [works, setWorks] = useState(null);
  const [worksOpen, setWorksOpen] = useState(false);
  const [diff, setDiff] = useState({ open: false, loading: false, changes: [] });

  const [tree, setTree] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [fileView, setFileView] = useState(null);

  const endRef = useRef(null);
  const readerRef = useRef(null);
  const textRef = useRef(null);

  const tip = useCallback((t) => {
    setToast(t);
    setTimeout(() => setToast((cur) => (cur === t ? '' : cur)), 2600);
  }, []);

  // ==================== 初始化 ====================
  useEffect(() => {
    (async () => {
      try {
        const [st, ss] = await Promise.all([
          vibeApi.getSettings(), vibeApi.listSessions(),
        ]);
        setSettings(st);
        setSessions(ss);
        if (ss.length) await openSession(ss[0].id);
      } catch (e) {
        setError('加载失败：' + e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('vibe-mode', mode);
    if (mode === 'pro' && !tree) refreshTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // ==================== 会话 ====================
  async function openSession(id) {
    try {
      const s = await vibeApi.getSession(id);
      setCurrentId(id);
      setMessages(s.messages || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function newChat() {
    if (streaming) stop();
    try {
      const s = await vibeApi.createSession(settings ? settings.model : '');
      setCurrentId(s.id);
      setMessages([]);
      setError('');
      setSessions(await vibeApi.listSessions());
      setSideTab('chat');
    } catch (e) {
      tip('❌ ' + e.message);
    }
  }

  async function delSession(id, e) {
    e.stopPropagation();
    await vibeApi.deleteSession(id);
    const ss = await vibeApi.listSessions();
    setSessions(ss);
    if (id === currentId) {
      setCurrentId(ss.length ? ss[0].id : null);
      setMessages(ss.length ? (await vibeApi.getSession(ss[0].id)).messages || [] : []);
    }
  }

  // ---------- 会话重命名 ----------
  function startRename(s) {
    setRenaming({ id: s.id, value: s.name || '' });
  }

  function cancelRename() {
    setRenaming({ id: null, value: '' });
  }

  async function commitRename() {
    const { id, value } = renaming;
    const name = String(value || '').trim().slice(0, 30);
    cancelRename();
    if (!id || !name) return;
    const old = (sessions.find((s) => s.id === id) || {}).name;
    if (name === old) return;
    try {
      await vibeApi.renameSession(id, name);
      setSessions(await vibeApi.listSessions());
      tip('✏️ 名字改好啦');
    } catch (e) {
      tip('❌ ' + e.message);
    }
  }

  function refreshTree() {
    vibeApi.tree().then(setTree).catch((e) => tip('❌ ' + e.message));
  }

  async function openFile(path) {
    setActiveFile(path);
    try {
      const f = await vibeApi.readFile(path);
      setFileView({ path, content: f.exists ? (f.content || f.error || '') : '（文件不存在）' });
    } catch (e) {
      tip('❌ ' + e.message);
    }
  }

  // ==================== 对话 ====================
  function stop() {
    if (readerRef.current) {
      try { readerRef.current.cancel(); } catch (e) { /* ignore */ }
      readerRef.current = null;
    }
    setStreaming(false);
  }

  async function send(rawText) {
    const text = String(rawText != null ? rawText : input).trim();
    if (!text || streaming) return;
    if (!settings || !settings.hasKey) {
      setError('老师还没有配置 AI 的钥匙（API Key）呢～ 请老师到「教师管理后台 → 🤖 AI 编程」里填一下');
      return;
    }

    let sid = currentId;
    if (!sid) {
      const s = await vibeApi.createSession(settings.model);
      sid = s.id;
      setCurrentId(sid);
      setSessions(await vibeApi.listSessions());
    }

    setInput('');
    setError('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, ts: Date.now() },
      { role: 'assistant', content: '', ts: Date.now() },
    ]);
    setStreaming(true);

    try {
      const res = await vibeApi.chatRaw({ sessionId: sid, content: text });
      if (!res.ok) {
        let msg = '请求失败';
        try { const j = await res.json(); msg = j.error || msg; } catch (e) { /* ignore */ }
        throw new Error(msg);
      }
      if (!res.body) throw new Error('浏览器不支持流式读取');

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder('utf-8');
      let buf = '';

      const append = (piece) => {
        setMessages((prev) => {
          const next = prev.slice();
          const last = next[next.length - 1];
          if (!last || last.role !== 'assistant') return next;
          next[next.length - 1] = { ...last, content: (last.content || '') + piece };
          return next;
        });
      };

      const handleLine = (line) => {
        const t = line.trim();
        if (!t.startsWith('data:')) return;
        const raw = t.slice(5).trim();
        if (!raw || raw === '[DONE]') return;
        let evt;
        try { evt = JSON.parse(raw); } catch (e) { return; }
        if (evt.t === 'd') append(evt.text);
        else if (evt.t === 'e') setError('😢 ' + evt.message);
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buf.trim()) buf.split('\n').forEach(handleLine);
          break;
        }
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        lines.forEach(handleLine);
      }

      readerRef.current = null;
      setStreaming(false);
      setSessions(await vibeApi.listSessions());
      if (mode === 'pro') refreshTree();
    } catch (e) {
      readerRef.current = null;
      setStreaming(false);
      if (e.name !== 'AbortError') setError('😢 ' + e.message);
      setSessions(await vibeApi.listSessions().catch(() => sessions));
    }
  }

  // ==================== 保存作品 ====================
  async function doSave(name) {
    if (!saveTarget) return;
    try {
      const cur = sessions.find((s) => s.id === currentId);
      const r = await vibeApi.saveWork({
        name, language: saveTarget.language, content: saveTarget.content,
        sessionName: (cur && cur.name) || '我的作品',
      });
      tip('🎉 已保存到：' + r.path);
      setSaveTarget(null);
    } catch (e) {
      tip('❌ ' + e.message);
    }
  }

  async function openWorks() {
    try {
      const w = await vibeApi.works();
      setWorks(w.items);
      setWorksOpen(true);
    } catch (e) {
      tip('❌ ' + e.message);
    }
  }

  // ==================== 专业模式：写入项目 ====================
  async function openWrite(msgIndex) {
    if (!currentId) return;
    setDiff({ open: true, loading: true, changes: [] });
    try {
      const r = await vibeApi.extract(currentId, msgIndex);
      setDiff({ open: true, loading: false, changes: r.changes });
    } catch (e) {
      setDiff({ open: false, loading: false, changes: [] });
      tip('❌ ' + e.message);
    }
  }

  async function applyFiles(files) {
    try {
      await vibeApi.apply(files);
      tip(`✅ 已写入 ${files.length} 个文件`);
      setDiff({ open: false, loading: false, changes: [] });
      refreshTree();
    } catch (e) {
      tip('❌ ' + e.message);
    }
  }

  // ==================== 渲染 ====================
  const currentName = (sessions.find((s) => s.id === currentId) || {}).name || '新对话';
  const canWrite = mode === 'pro';

  return (
    <div className="v-root">
      {/* 顶栏 */}
      <div className="v-top">
        <div className="v-brand">
          <span className="v-brand-icon">🤖</span>
          <span>{BRAND.vibe}</span>
        </div>
        <span className="v-top-spacer" />
        {currentId && (
          <span className="v-crumb" title="点铅笔可以改名字">
            <span className="v-crumb-name">{currentName}</span>
            <button className="v-item-btn" onClick={() => startRename({ id: currentId, name: currentName })}>✏️</button>
          </span>
        )}
        <button className={`v-chip${mode === 'pro' ? ' on' : ''}`} onClick={() => setMode(mode === 'pro' ? 'simple' : 'pro')}>
          {mode === 'pro' ? '🧑‍💻 专业模式' : '🧒 简洁模式'}
        </button>
        {user && (
          <span className="v-user">
            <span className="v-user-ava">{user.name ? user.name[0] : '👋'}</span>
            {user.name}
          </span>
        )}
        <button className="v-chip" onClick={() => navigate('/')}>← 返回首页</button>
      </div>

      <div className="v-body">
        {/* 左侧栏 */}
        <div className={`v-side${mode === 'pro' ? ' wide' : ''}`}>
          <button className="v-new" onClick={newChat}>✨ 新建对话</button>

          {mode === 'pro' && (
            <div className="v-tabs">
              <button className={`v-tab${sideTab === 'chat' ? ' on' : ''}`} onClick={() => setSideTab('chat')}>💬 对话</button>
              <button className={`v-tab${sideTab === 'files' ? ' on' : ''}`} onClick={() => { setSideTab('files'); refreshTree(); }}>📁 文件</button>
            </div>
          )}

          {sideTab === 'chat' ? (
            <>
              <div className="v-side-label">最近的对话</div>
              <div className="v-list">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`v-item${s.id === currentId ? ' on' : ''}`}
                    onClick={() => openSession(s.id)}
                  >
                    <span>💬</span>
                    {renaming.id === s.id ? (
                      <input
                        className="v-item-rename"
                        value={renaming.value}
                        autoFocus
                        maxLength={30}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenaming((r) => ({ ...r, value: e.target.value }))}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                          if (e.key === 'Escape') cancelRename();
                        }}
                      />
                    ) : (
                      <>
                        <span
                          className="v-item-name"
                          title="双击可以改名字"
                          onDoubleClick={(e) => { e.stopPropagation(); startRename(s); }}
                        >
                          {s.name}
                        </span>
                        <button className="v-item-btn" title="改名字" onClick={(e) => { e.stopPropagation(); startRename(s); }}>✏️</button>
                        <button className="v-item-del" onClick={(e) => delSession(s.id, e)}>🗑️</button>
                      </>
                    )}
                  </div>
                ))}
                {sessions.length === 0 && <div style={{ color: '#b3aed0', fontSize: 13, padding: '8px 10px' }}>还没有对话，点上面的按钮开始吧</div>}
              </div>
            </>
          ) : (
            <>
              <div className="v-side-label">作品目录</div>
              <div className="v-tree">
                {(tree && tree.children || []).map((n) => (
                  <TreeNode key={n.path} node={n} depth={0} onOpen={openFile} active={activeFile} />
                ))}
                {(!tree || !tree.children || tree.children.length === 0) && (
                  <div style={{ color: '#b3aed0', fontSize: 13, padding: 8 }}>（空空的，让 AI 写点东西进来吧）</div>
                )}
              </div>
            </>
          )}

          <div className="v-side-foot">
            <button className="v-foot-btn" onClick={openWorks}>📦 我的作品</button>
          </div>
        </div>

        {/* 右侧主区 */}
        <div className="v-main">
          <div className="v-msgs">
            <div className="v-inner">
              {error && <div className="v-banner">{error}</div>}

              {messages.length === 0 ? (
                <div className="v-empty">
                  <div className="v-empty-emoji">🤖✨</div>
                  <h2>你好呀，{user ? user.name : '小同学'}！</h2>
                  <p>告诉我你想做什么，我来帮你把网页写出来，还能马上运行给你看 🎉</p>
                  <div className="v-ideas">
                    {IDEAS.map((i) => (
                      <button className="v-idea" key={i.text} onClick={() => send(i.text)}>
                        <b>{i.emoji}</b> {i.text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <MessageItem
                    key={m.ts ? `${i}-${m.ts}` : i}
                    msg={m}
                    index={i}
                    isStreaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
                    canWrite={canWrite}
                    onPreview={(f) => setPreview({ title: f.title, html: toPreviewHtml(f) })}
                    onSave={(f) => setSaveTarget(f)}
                    onWrite={openWrite}
                  />
                ))
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="v-input">
            <div className="v-inner" style={{ padding: 0 }}>
              <div className="v-composer">
                <textarea
                  ref={textRef}
                  rows={1}
                  value={input}
                  placeholder="跟小助手说说你想做什么…（按 Enter 发送，Shift + Enter 换行）"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                {streaming
                  ? <button className="v-send" onClick={stop} title="停下来">■</button>
                  : <button className="v-send" onClick={() => send()} disabled={!input.trim()} title="发送">↑</button>}
              </div>
              <div className="v-tip">{BRAND.name} · AI 由阿里云百炼提供 · 内容仅供参考，请老师和家长陪同使用</div>
            </div>
          </div>
        </div>
      </div>

      {preview && <PreviewOverlay title={preview.title} html={preview.html} onClose={() => setPreview(null)} />}
      {saveTarget && (
        <SaveWorkModal
          defaultName={saveTarget.name}
          onClose={() => setSaveTarget(null)}
          onConfirm={doSave}
        />
      )}
      {worksOpen && (
        <WorksModal
          items={works}
          root={settings ? settings.workspace : ''}
          onClose={() => setWorksOpen(false)}
          onPreview={(f) => { setWorksOpen(false); setPreview({ title: f.title, html: toPreviewHtml(f) }); }}
        />
      )}
      {diff.open && (
        <DiffModal
          changes={diff.changes}
          loading={diff.loading}
          onClose={() => setDiff({ open: false, loading: false, changes: [] })}
          onApply={applyFiles}
        />
      )}
      {fileView && (
        <Modal
          title={`📄 ${fileView.path}`}
          onClose={() => setFileView(null)}
          footer={
            <>
              <button className="v-btn" onClick={() => setFileView(null)}>关闭</button>
              <button
                className="v-btn primary"
                onClick={() => {
                  setInput((prev) => `${prev}${prev ? '\n' : ''}请帮我看看这个文件 ${fileView.path}：\n\`\`\`\n${fileView.content}\n\`\`\`\n`);
                  setFileView(null);
                  setSideTab('chat');
                }}
              >
                插入到对话
              </button>
            </>
          }
        >
          <pre className="v-code-body" style={{ background: '#fbfaff', color: '#2b2350', borderRadius: 12 }}>
            {fileView.content}
          </pre>
        </Modal>
      )}
      {toast && <div className="v-toast">{toast}</div>}
    </div>
  );
}
