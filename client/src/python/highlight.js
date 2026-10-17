// 超轻量的 Python 语法高亮（不依赖任何第三方库）。
// 思路：一个字符一个字符往后扫，把代码切成一段段带类型的「小积木」，
// 再按行分好，交给编辑器的着色层上色。支持：
//   关键字 / 内置函数 / 字符串（含三引号、f/r/b/u 前缀、没写完的字符串）
//   注释 / 数字（整数、小数、十六进制…）/ def·class 后面的名字 / 函数调用 / 装饰器
// 配色参考 VS Code 浅色主题（通用编辑器风格）。

const KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const BUILTINS = new Set([
  'print', 'input', 'len', 'range', 'str', 'int', 'float', 'list', 'dict',
  'set', 'tuple', 'bool', 'type', 'sum', 'min', 'max', 'abs', 'round',
  'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'open', 'ord',
  'chr', 'bin', 'hex', 'oct', 'repr', 'format', 'isinstance', 'hasattr',
  'getattr', 'setattr', 'super', 'id', 'divmod', 'pow', 'any', 'all',
  'next', 'iter', 'vars', 'dir', 'help', 'exit', 'quit',
  'Exception', 'ValueError', 'TypeError', 'NameError', 'IndexError',
  'KeyError', 'ZeroDivisionError', 'ImportError', 'SyntaxError', 'RuntimeError',
  // 小朋友常用的模块名，涂个色更好看（被当成变量名涂了也无伤大雅）
  'random', 'math', 'time', 'turtle',
]);

// 每种小积木的颜色（编辑器里的 CSS 类名同款配色，截图 canvas 也用这份）
export const TOK_COLOR = {
  kw: '#0000ff', // 关键字：蓝
  builtin: '#795e26', // 内置函数：土黄
  call: '#795e26', // 函数调用：土黄
  defname: '#795e26', // def 后面的函数名：土黄
  classname: '#267f99', // class 后面的类名：青
  string: '#a31515', // 字符串：砖红
  comment: '#008000', // 注释：绿
  number: '#098658', // 数字：青绿
  deco: '#795e26', // 装饰器：土黄
  plain: '#2b2350', // 普通文字：跟着编辑器底色走
};

// Python 允许中文等 Unicode 字符做变量名，名字字符放开到 \u0080-\uFFFF
const ID_START = /[A-Za-z_\u0080-\uFFFF]/;
const ID_CONT = /[A-Za-z0-9_\u0080-\uFFFF]/;

// 扫字符串：从 i 开始（可能带 f/r/b/u 前缀），返回结束位置（不含）
function scanString(src, i) {
  let j = i;
  const pm = /^[rRbBuUfF]{1,2}(?=['"])/.exec(src.slice(i, i + 3));
  if (pm) j += pm[0].length;
  const q = src[j];
  const triple = src.startsWith(q + q + q, j);
  j += triple ? 3 : 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; } // 跳过 \n、\" 这类转义
    if (triple) {
      if (src.startsWith(q + q + q, j)) { j += 3; break; }
    } else if (c === q) { j += 1; break; } else if (c === '\n') {
      break; // 引号没写完就换行了：先把这一行当字符串涂色（等会儿语法检查会红着提醒）
    }
    j += 1;
  }
  return j;
}

const NUM_RE = /^(0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*\.?[\d_]*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?)[jJ]?/;

// 把整段代码切成 [{ type, text }]，text 里可能含换行（三引号字符串、注释不会含）
export function tokenize(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  let nextName = null; // 'defname' | 'classname'：def/class 后面第一个名字要特殊涂色

  const push = (type, text) => {
    if (!text) return;
    const last = toks[toks.length - 1];
    if (last && last.type === type) last.text += text;
    else toks.push({ type, text });
  };

  while (i < n) {
    const ch = src[i];

    if (ch === '\n') { push('plain', '\n'); i += 1; nextName = null; continue; }

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      let j = i;
      while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r')) j += 1;
      push('plain', src.slice(i, j));
      i = j;
      continue;
    }

    if (ch === '#') {
      let j = i;
      while (j < n && src[j] !== '\n') j += 1;
      push('comment', src.slice(i, j));
      i = j;
      continue;
    }

    // 字符串：直接是引号，或者 f/r/b/u 前缀 + 引号
    if (ch === '"' || ch === "'" || ((ch === 'f' || ch === 'F' || ch === 'r' || ch === 'R' || ch === 'b' || ch === 'B' || ch === 'u' || ch === 'U') && /^[rRbBuUfF]{1,2}['"]/.test(src.slice(i, i + 3)))) {
      const j = scanString(src, i);
      push('string', src.slice(i, j));
      i = j;
      continue;
    }

    // 数字
    if ((ch >= '0' && ch <= '9') || (ch === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      const m = NUM_RE.exec(src.slice(i, i + 24));
      if (m) {
        push('number', m[0]);
        i += m[0].length;
        continue;
      }
    }

    // 装饰器 @xxx.yyy
    if (ch === '@' && ID_START.test(src[i + 1] || '')) {
      let j = i + 1;
      while (j < n && (ID_CONT.test(src[j]) || src[j] === '.')) j += 1;
      push('deco', src.slice(i, j));
      i = j;
      continue;
    }

    // 名字：关键字 / 内置函数 / def·class 的名字 / 函数调用 / 普通名字
    if (ID_START.test(ch)) {
      let j = i;
      while (j < n && ID_CONT.test(src[j])) j += 1;
      const word = src.slice(i, j);
      if (KEYWORDS.has(word)) {
        push('kw', word);
        if (word === 'def') nextName = 'defname';
        else if (word === 'class') nextName = 'classname';
      } else if (nextName) {
        push(nextName, word);
        nextName = null;
      } else if (BUILTINS.has(word)) {
        push('builtin', word);
      } else {
        // 名字后面直接跟 ( 的，当成函数调用涂色（比如自己定义的函数）
        let k = j;
        while (k < n && (src[k] === ' ' || src[k] === '\t')) k += 1;
        push(src[k] === '(' ? 'call' : 'plain', word);
      }
      i = j;
      continue;
    }

    // 其它（运算符、括号、逗号……）保持普通颜色
    push('plain', ch);
    i += 1;
  }
  return toks;
}

// 切成「一行 = 几段带颜色的小积木」，渲染层按行铺，行高才能跟行号对齐
export function tokenizeLines(src) {
  const lines = [[]];
  tokenize(src).forEach((t) => {
    const parts = t.text.split('\n');
    parts.forEach((p, idx) => {
      if (idx > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ type: t.type, text: p });
    });
  });
  return lines;
}
