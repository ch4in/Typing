/* eslint-disable no-restricted-globals */
// 在浏览器里跑真正的 Python（Pyodide = WebAssembly 版的 Python 3.12）。
// 特意放在 Web Worker 里：学生写了个停不下来的 while 循环，页面也不会卡死，
// 点一下「⏹ 停止」就能把它掐掉（主线程直接 terminate 这个 worker）。

// 按顺序试这些来源，第一个 '/pyodide/' 是本项目自带的，完全不用联网。
const SOURCES = [
  '/pyodide/',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  'https://fastly.jsdelivr.net/pyodide/v0.26.4/full/',
  'https://unpkg.com/pyodide@0.26.4/',
  'https://cdn.bootcdn.net/ajax/libs/pyodide/0.26.4/',
];

// 在 Python 里先准备好的小工具：
//  1) _py_input：让 input() 变成「等浏览器输入框」的版本（worker 里没有弹窗）
//  2) _make_ns：每次运行都换一个全新的名字空间，跟 IDLE 里重新运行一样，变量不会残留
//  3) _plan：看看这份代码要怎么跑（普通 / 顶层 await / 先把答案都收齐）
//  4) _safe：跑代码，出错时把「英文原始报错 + 行号」整理成 JSON 交回给页面
const PRELUDE = `
import ast, json, re, traceback, sys, io, host

# Pyodide 自带的 batch 输出会把每行末尾的换行符吃掉（print 就全挤在一行了），
# 这里换成自己的「写手」：Python 输出什么样的文本（含换行）就原样交给页面。
class _LineWriter(io.TextIOBase):
    def __init__(self, kind):
        self.kind = kind

    def write(self, s):
        t = str(s)
        if t:
            host.pyOut(self.kind, t)
        return len(t)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        pass

    def writable(self):
        return True

    def readable(self):
        return False

    def seekable(self):
        return False

    def isatty(self):
        return False

sys.stdout = _LineWriter('out')
sys.stderr = _LineWriter('err')

async def _py_input(prompt=''):
    if prompt:
        print(prompt, end='', flush=True)
    import host
    r = host.pyInput()
    if hasattr(r, '__await__'):
        return await r
    return r

def _make_ns():
    return {'__name__': '__main__', '_py_input': _py_input}

def _plan(code):
    if 'input' not in code:
        return json.dumps({'mode': 'plain', 'src': code})
    src = re.sub(r'\\binput\\s*\\(', 'await _py_input(', code)
    try:
        compile(src, '<exec>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        return json.dumps({'mode': 'await', 'src': src})
    except SyntaxError:
        return json.dumps({'mode': 'batch', 'src': code})

def _frames(e):
    frs = traceback.extract_tb(e.__traceback__) or []
    mine = [f for f in frs if f.filename in ('<exec>', '<string>')]
    return mine or frs

def _err_json(e):
    frs = _frames(e)
    lineno = getattr(e, 'lineno', None)
    offset = getattr(e, 'offset', None)
    if lineno is None and frs:
        lineno = frs[-1].lineno
    parts = ['Traceback (most recent call last):\\n']
    parts += traceback.format_list(frs)
    parts += traceback.format_exception_only(type(e), e)
    return json.dumps({
        'type': type(e).__name__,
        'message': str(e),
        'lineno': lineno,
        'offset': offset,
        'traceback': ''.join(parts),
    })

async def _safe(src, ns):
    try:
        obj = compile(src, '<exec>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        coro = eval(obj, ns)
        if coro is not None:
            await coro
        return None
    except SystemExit:
        return json.dumps({'stopped': 'exit'})
    except KeyboardInterrupt:
        return json.dumps({'stopped': 'ctrl-c'})
    except BaseException as e:
        return _err_json(e)
`;

let py = null;
let booting = null;
let pendingInput = null;
let pendingBatch = null;

function post(msg) {
  self.postMessage(msg);
}

// 加载 Python 运行环境（只要成功一次，后面运行就都是秒开）
async function boot() {
  if (py) return py;
  if (booting) return booting;
  booting = (async () => {
    let lastErr = null;
    for (let i = 0; i < SOURCES.length; i += 1) {
      try {
        post({ type: 'state', text: `正在准备 Python 运行环境…（第 ${i + 1}/${SOURCES.length} 个来源）` });
        self.importScripts(SOURCES[i] + 'pyodide.js');
        if (typeof loadPyodide !== 'function') throw new Error('脚本加载了但没生效');
        const p = await loadPyodide({ indexURL: SOURCES[i] });
        // 兜底：万一还有没被 _LineWriter 接住的输出（比如 C 语言层面直接写 fd），
        // 补一个换行，免得几行字挤在一起
        const fallback = (kind) => ({ batched: (s) => {
          const t = String(s == null ? '' : s);
          if (!t) return;
          post({ type: kind, text: /\n$/.test(t) ? t : `${t}\n` });
        } });
        p.setStdout(fallback('out'));
        p.setStderr(fallback('err'));
        // Python 里 import host 就能拿到这两个：
        //   pyOut(kind, text) 把 print 的内容原样发出来；pyInput() 问页面要一行输入
        p.registerJsModule('host', {
          pyOut: (kind, text) => post({ type: kind === 'err' ? 'err' : 'out', text: String(text) }),
          pyInput: () => new Promise((resolve) => {
            pendingInput = resolve;
            post({ type: 'input' });
          }),
        });
        await p.runPythonAsync(PRELUDE);
        py = p;
        return p;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('所有来源都连不上');
  })();
  return booting;
}

async function run(code) {
  try {
    const p = await boot();
    const ns = p.runPython('_make_ns()');
    p.globals.set('__src', code);
    const plan = JSON.parse(await p.runPythonAsync('_plan(__src)'));

    if (plan.mode === 'batch') {
      // 函数里面用了 input()，只能请学生先把答案都写好，一次性喂给程序
      post({ type: 'needBatch' });
      const lines = await new Promise((res) => { pendingBatch = res; });
      p.setStdin({ stdin: () => (lines.length ? lines.shift() : null) });
    }

    p.globals.set('__src', plan.src);
    p.globals.set('__ns', ns);
    const out = await p.runPythonAsync('_safe(__src, __ns)');
    if (plan.mode === 'batch') p.setStdin({ stdin: () => null });
    try { ns.destroy(); } catch (e) { /* 释放不了就算了 */ }

    if (typeof out !== 'string' || out.trim().charAt(0) !== '{') {
      post({ type: 'done' });
      return;
    }
    const info = JSON.parse(out);
    if (info.stopped) {
      post({ type: 'done', stopped: info.stopped });
      return;
    }
    post({ type: 'error', error: info });
  } catch (e) {
    const text = e && e.message ? e.message : String(e);
    post({ type: 'fatal', text });
  }
}

self.onmessage = (e) => {
  const m = e.data || {};
  if (m.type === 'run') {
    run(String(m.code || ''));
  } else if (m.type === 'input') {
    if (pendingInput) {
      const resolve = pendingInput;
      pendingInput = null;
      resolve(m.value == null ? '' : String(m.value));
    }
  } else if (m.type === 'batch') {
    if (pendingBatch) {
      const resolve = pendingBatch;
      pendingBatch = null;
      resolve(Array.isArray(m.lines) ? m.lines : String(m.lines || '').split('\n'));
    }
  }
};
