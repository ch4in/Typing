// 把 Python 的英文报错翻译成六年级小朋友看得懂的话。
// 英文原文照原样保留在旁边（老师、考试、真 IDLE 里看到的都是它），这里只负责「人话版」。

// 小朋友最常打错的名字，用来猜「你是不是想打这个？」
const COMMON = [
  'print', 'input', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set',
  'sum', 'max', 'min', 'abs', 'round', 'random', 'math', 'True', 'False', 'None',
  'if', 'else', 'elif', 'for', 'while', 'def', 'return', 'break', 'continue',
  'import', 'from', 'and', 'or', 'not', 'in', 'type', 'open', 'sorted', 'append',
];

function distance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

// 找出最像的写法：pirnt -> print，ture -> True
function guess(name, pool) {
  const lower = String(name || '').toLowerCase();
  let best = null;
  let bestD = 99;
  (pool || COMMON).forEach((w) => {
    const d = distance(lower, w.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  });
  return bestD <= 2 && best !== name ? best : null;
}

const CN_PUNCT = /[（）：；，“”‘’！？＝＋－]/;
const hasCnPunct = (s) => CN_PUNCT.test(String(s || ''));

function sample(x) {
  return x;
}

// 每条规则：test 命中就返回中文解释（title / why / fix / sample）
const RULES = [
  // ---------------- SyntaxError ----------------
  {
    test: (c) => c.type === 'SyntaxError' && /Missing parentheses in call to 'print'/.test(c.msg),
    make: () => ({
      title: 'print 少了括号',
      why: 'Python 3 里 print 是一个函数，后面的内容要用括号括起来。写成 print "你好" 是老版本 Python 2 的写法。',
      fix: '给 print 后面的内容加上括号：print("你好")',
      sample: sample('print("你好，Python！")'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /invalid character/.test(c.msg),
    make: (c) => ({
      title: '这里有电脑不认识的符号',
      why: '八成是用了中文标点（比如中文括号（）、中文引号“”、中文冒号：），Python 只认英文标点。',
      fix: '把这一行的中文标点换成英文的：( ) [ ] : , " \'',
      sample: sample('print("你好，Python！")   # 括号和引号都要用英文的'),
      extra: hasCnPunct(c.srcLine) ? '这一行里出现了中文标点，重点检查它们 👀' : '',
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /unterminated string literal|EOL while scanning/.test(c.msg),
    make: () => ({
      title: '引号没有成对',
      why: '文字（字符串）要用一对引号包起来，开头和结尾的引号必须都用同一种、并且都写全。',
      fix: '检查这一行：是不是只写了前面的引号，忘了写后面的？',
      sample: sample('print("你好，Python！")   # 前后的引号要成对'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /unexpected EOF while parsing/.test(c.msg),
    make: () => ({
      title: '括号（或引号）没有关上',
      why: 'Python 一路读到最后都没等到右括号，说明前面有个括号开了没关，或者引号没写全。',
      fix: '把这一行的括号数一数：( 和 ) 要一样多，[ 和 ] 要一样多。',
      sample: sample('print("1 + 1 =", (1 + 1))   # 开了几个括号，就要关几个'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /cannot assign to|can't assign to/.test(c.msg),
    make: () => ({
      title: '等号 = 用错地方了',
      why: '= 是「把右边的值存进左边的盒子」，所以左边必须是变量名。想比较两个数是否相等要用 ==。',
      fix: '判断相等用 ==，赋值用 =；if 后面写条件时特别容易写错。',
      sample: sample('a = 10\nif a == 10:          # 比较大小要用两个等号\n    print("a 是 10")'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /expected an indented block/.test(c.msg),
    make: (c) => ({
      title: '冒号后面的内容没有缩进',
      why: `以冒号 : 结尾的那一行（比如 ${(c.srcLine || '').trim() || 'if / for / while'}），下一行要往右空 4 个空格，Python 才知道这些代码是属于它的。`,
      fix: '在这一行的下一行开头敲 4 个空格（按 Tab 键会自动变成 4 个空格）。',
      sample: sample('if score >= 60:\n    print("及格")     # 前面空了 4 格'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /invalid decimal literal|leading zeros/.test(c.msg),
    make: () => ({
      title: '数字的写法不对',
      why: '数字里不能有多余的 0 开头（比如 05），也不能混进别的字符。',
      fix: '直接写 5 就好；如果它是门牌号、电话号码这类「不当数字算的」，就加引号变成文字。',
      sample: sample('num = 5              # 当成数字算\ncode = "05"          # 想保留前面的 0，就加引号变成文字'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /'return' outside function|'break' outside loop|'continue' not properly in loop/.test(c.msg),
    make: () => ({
      title: '这句话放错位置了',
      why: 'return 只能写在 def 定义的函数里面；break / continue 只能写在 for 或 while 循环里面。',
      fix: '把它挪进对应的函数或循环里，并且记得缩进。',
      sample: sample('def add(a, b):\n    return a + b       # return 写在函数里面\n\nprint(add(3, 4))'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && hasCnPunct(c.srcLine),
    make: () => ({
      title: '这一行混进了中文标点',
      why: '中文的（）：，“” 和英文的 ():,"" 长得像，但 Python 只认英文的。中文输入法下最容易打错。',
      fix: '把中文标点一个个换成英文标点（写代码时切成英文输入法）。',
      sample: sample('if score > 90:         # 大于号和冒号都要用英文符号\n    print("优秀")'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError' && /invalid syntax/.test(c.msg),
    make: (c) => ({
      title: '这一行写得不像 Python',
      why: 'Python 读不懂这一行，常见原因：括号没配对、冒号漏了、关键字拼错、或者不小心用了中文符号。',
      fix: `对着这一行慢慢看：${(c.srcLine || '').trim() || '（这一行）'} —— 括号成对吗？if/for/while 后面有冒号吗？`,
      sample: sample('for i in range(5):       # 结尾有冒号\n    print(i)              # 下一行缩进 4 格'),
    }),
  },
  {
    test: (c) => c.type === 'SyntaxError',
    make: (c) => ({
      title: '语法错误（写法不对）',
      why: 'Python 在读你写的代码时卡住了，说明某一行的写法不符合规则。',
      fix: `从这一行开始检查：${(c.srcLine || '').trim() || '（报错指的那一行）'}`,
    }),
  },

  // ---------------- 缩进 ----------------
  {
    test: (c) => c.type === 'IndentationError' && /expected an indented block/.test(c.msg),
    make: () => ({
      title: '这里必须缩进',
      why: 'if / for / while / def 这行以冒号结尾后，属于它的代码要往右空 4 格。',
      fix: '在下一行开头空 4 个空格（Tab 键就行）。',
      sample: sample('for i in range(3):\n    print(i)           # 缩进 4 格'),
    }),
  },
  {
    test: (c) => c.type === 'IndentationError' && /unexpected indent/.test(c.msg),
    make: () => ({
      title: '这里多缩进了',
      why: '这一行前面多了空格，但上一行并不需要它缩进（上一行结尾没有冒号）。',
      fix: '把这一行前面的空格删掉，让它和上一行对齐。',
    }),
  },
  {
    test: (c) => c.type === 'IndentationError' && /does not match|unindent/.test(c.msg),
    make: () => ({
      title: '缩进对不齐',
      why: '同一层的代码必须空一样多的格。有的行空 4 格、有的行空 2 格或 5 格，Python 就分不清谁跟谁一组。',
      fix: '把同一层的代码都对齐，统一用 4 个空格。',
    }),
  },
  {
    test: (c) => c.type === 'IndentationError',
    make: () => ({
      title: '缩进有问题',
      why: 'Python 靠每行开头空几格来判断代码块，空格多了、少了或对不齐都会报错。',
      fix: '检查这一行的空格数，和它同组的行要完全对齐。',
    }),
  },
  {
    test: (c) => c.type === 'TabError',
    make: () => ({
      title: 'Tab 和空格混在一起了',
      why: '有的行用 Tab 缩进，有的行用空格缩进，看起来一样，电脑却认为是两种东西。',
      fix: '全选代码删掉行首空格，统一用 Tab 键（会自动变成 4 个空格）重新缩进。',
    }),
  },

  // ---------------- NameError ----------------
  {
    test: (c) => c.type === 'NameError',
    make: (c) => {
      const m = /name '([^']+)' is not defined/.exec(c.msg);
      const name = m ? m[1] : '';
      const near = guess(name);
      const cnQuote = hasCnPunct(c.srcLine);
      const why = cnQuote
        ? '这一行用了中文引号，Python 会把里面的内容当成变量名，而不是文字。'
        : '你用了一个 Python 还不认识的名字：可能是拼错了、大小写写错了，或者忘了先给它赋值。';
      const fix = near
        ? `你是不是想写 ${near}？把 ${name} 改成 ${near} 试试（注意大小写要一模一样）。`
        : `用之前先给它一个值，比如 ${name || '名字'} = 0；变量名也要检查拼写和大小写。`;
      return {
        title: `名字「${name}」还没定义`,
        why,
        fix,
        sample: sample(near === 'input'
          ? 'name = input("你叫什么名字？")\nprint("你好，" + name)'
          : 'mingzi = "小明"        # 先给这个盒子一个值\nprint(mingzi)          # 再拿出来用'),
      };
    },
  },

  // ---------------- TypeError ----------------
  {
    test: (c) => c.type === 'TypeError' && /can only concatenate str/.test(c.msg),
    make: () => ({
      title: '文字和数字不能直接拼在一起',
      why: '"我今年" 是文字，12 是数字，Python 不知道该相加还是该连接。',
      fix: '把数字用 str() 变成文字再拼；或者干脆用逗号隔开，让 print 自己拼。',
      sample: sample('age = 12\nprint("我今年" + str(age) + "岁")   # 先把数字变成文字\nprint("我今年", age, "岁")            # 或者干脆用逗号隔开'),
    }),
  },
  {
    test: (c) => c.type === 'TypeError' && /unsupported operand type/.test(c.msg),
    make: () => ({
      title: '两种不一样的东西不能一起算',
      why: '最常见的是：input() 拿到的永远是文字（字符串），直接拿来加减乘除就会报这个错。',
      fix: '要当数字算就先转换：int(input(...)) 或 float(input(...))；要当文字拼就 str(数字)。',
      sample: sample('age = int(input("年龄："))   # 把输入的文字变成整数\nprint("明年你就", age + 1, "岁了")'),
    }),
  },
  {
    test: (c) => c.type === 'TypeError' && /not callable/.test(c.msg),
    make: () => ({
      title: '把不是函数的东西当成函数来用了',
      why: '比如给变量起了和函数一样的名字（写 list = [1,2] 之后，list() 就不能用了），或者漏写了运算符。',
      fix: '换个变量名，别用 print、list、input、str、sum 这些名字当变量；检查是不是漏了 * 或 +。',
      sample: sample('my_list = [1, 2, 3]   # 变量名别用 print、list、input 这些名字\nprint(my_list)'),
    }),
  },
  {
    test: (c) => c.type === 'TypeError' && /argument|takes/.test(c.msg),
    make: () => ({
      title: '函数括号里给的东西数量不对',
      why: '调用这个函数时，给的参数个数和它定义时要求的不一样（多了或少了）。',
      fix: '看看函数定义时括号里有几个名字，调用时就给几个。',
      sample: sample('def area(w, h):        # 定义时要 2 个参数\n    return w * h\n\nprint(area(3, 4))      # 调用时也给它 2 个'),
    }),
  },
  {
    test: (c) => c.type === 'TypeError' && /not subscriptable|is not iterable|object is not/.test(c.msg),
    make: () => ({
      title: '这个东西不能这样用',
      why: '比如对数字用 [0] 取第几个、对一个数字用 for 循环，都会报这个错。',
      fix: '先确认它是什么：print(type(变量))；只有列表、字符串、字典这类才能取下标或循环。',
    sample: sample('nums = [10, 20, 30]\nprint(nums[0])        # 列表可以用编号取第几个\nprint(type(nums))     # 不确定是什么就先看看类型'),
    }),
  },
  {
    test: (c) => c.type === 'TypeError',
    make: (c) => ({
      title: '类型用错了',
      why: '这行代码把两种不同类型的东西凑在一起用了（比如文字和数字）。',
      fix: `看看 ${(c.srcLine || '').trim() || '这一行'} 用到的变量都是什么类型，不确定的话先 print(type(变量)) 看看。`,
    }),
  },

  // ---------------- ValueError ----------------
  {
    test: (c) => c.type === 'ValueError' && /invalid literal for int/.test(c.msg),
    make: () => ({
      title: 'int() 里放的不是整数样子的文字',
      why: 'int() 只能把 "12" 这种纯整数的文字变成数字。如果输入的是 "12.5"、"abc" 或者什么都没输，就会报错。',
      fix: '可能有小数就用 float()；先把它打印出来看看究竟拿到了什么。',
      sample: sample('s = input("请输入数字：")\nprint("你输入的是：", s)   # 先看看是什么\nn = float(s)                        # 可能有小数用 float'),
    }),
  },
  {
    test: (c) => c.type === 'ValueError' && /could not convert/.test(c.msg),
    make: () => ({
      title: '转换数字失败',
      why: 'int() 或 float() 收到的内容不是数字的样子（比如中文、字母、空格）。',
      fix: '检查输入的内容，去掉空格用 .strip()，或者提示同学只填数字。',
      sample: sample('s = input("请输入数字：").strip()\nn = int(s)'),
    }),
  },
  {
    test: (c) => c.type === 'ValueError' && /unpack/.test(c.msg),
    make: () => ({
      title: '两边数量对不上',
      why: '用 a, b = ... 一次接多个值时，左边变量个数和右边的值个数要一样。',
      fix: '数一数左右两边各有几个，改成一样多。',
      sample: sample('a, b = 1, 2          # 左边 2 个变量，右边就给 2 个值\nprint(a, b)'),
    }),
  },
  {
    test: (c) => c.type === 'ValueError',
    make: (c) => ({
      title: '值不合适',
      why: '类型是对的，但这个值 Python 处理不了。',
      fix: `检查 ${(c.srcLine || '').trim() || '这一行'} 里的值是不是合理（比如有没有填错、有没有输入多余的符号）。`,
    }),
  },

  // ---------------- 其它常见运行时错误 ----------------
  {
    test: (c) => c.type === 'ZeroDivisionError',
    make: () => ({
      title: '除数是 0',
      why: '除法 / 或取余 % 的右边算出来是 0，数学里也不能除以 0。',
      fix: '看看除数是从哪来的（是不是 input 输入了 0，或者循环第一次就是 0）；可以先判断再算。',
      sample: sample('if b != 0:\n    print(a / b)\nelse:\n    print("除数不能是 0")'),
    }),
  },
  {
    test: (c) => c.type === 'IndexError',
    make: () => ({
      title: '取了不存在的第几个',
      why: '编号（下标）是从 0 开始数的，最后一个是「长度 - 1」。取 5 个元素的第 6 个就会越界。',
      fix: '先看看一共有几个：print(len(列表))；最大只能取到 len(列表) - 1。',
      sample: sample('nums = [10, 20, 30]\nprint(nums[0])   # 第一个是 0\nprint(nums[2])   # 最后一个是 2，不是 3'),
    }),
  },
  {
    test: (c) => c.type === 'KeyError',
    make: (c) => {
      const m = /KeyError:\s*'?([^']*)'?/.exec(c.msg);
      const key = m ? m[1] : '';
      return {
        title: `字典里没有「${key}」这个键`,
        why: '字典要用里面真的存在的键去取，键要一模一样（大小写、空格都算）。',
        fix: '先用 print(字典.keys()) 看看里面有哪些键，或者用 字典.get(键, 默认值)。',
        sample: sample('score = {"小明": 90}\nprint(score.get("小红", 0))   # 没有就给默认值，不报错'),
      };
    },
  },
  {
    test: (c) => c.type === 'AttributeError',
    make: (c) => {
      const m = /'([^']+)' object has no attribute '([^']+)'/.exec(c.msg);
      const obj = m ? m[1] : '';
      const attr = m ? m[2] : '';
      const near = guess(attr, ['append', 'upper', 'lower', 'strip', 'split', 'join', 'sort', 'reverse', 'keys', 'values', 'items', 'count', 'index', 'replace', 'format', 'title', 'pop', 'remove', 'add', 'extend', 'insert', 'copy', 'clear', 'startswith', 'endswith', 'find']);
      return {
        title: `${obj} 这类东西没有「${attr}」这个用法`,
        why: '点号 . 后面的方法名拼错了，或者这个类型根本没这个方法（比如文字没有 append，列表没有 upper）。',
        fix: near ? `你是不是想写 ${near}()？` : '想想它是什么类型：文字用 upper/lower/strip，列表用 append/sort，别混着用。',
        sample: sample('name = "python"\nprint(name.upper())    # 文字变大写\n\nnums = [1, 2]\nnums.append(3)         # 列表加元素'),
      };
    },
  },
  {
    test: (c) => c.type === 'UnboundLocalError',
    make: () => ({
      title: '函数里的变量还没赋值就用',
      why: '函数里面给某个变量赋了值，Python 就把它当成「函数内部的变量」，外面那个同名的值就用不了了。',
      fix: '在函数里先给它赋值再用，或者把它作为参数传进来。',
      sample: sample('def show(n):\n    print(n)         # 通过参数把值传进来\n\nshow(10)'),
    }),
  },
  {
    test: (c) => c.type === 'ModuleNotFoundError' || c.type === 'ImportError',
    make: (c) => {
      const m = /No module named '([^']+)'/.exec(c.msg);
      const mod = m ? m[1] : '';
      return {
        title: `导入「${mod}」失败`,
        why: '浏览器里的 Python 只自带了标准库（random、math、time…），turtle、pygame 这类需要安装的库用不了，名字拼错也会这样。',
        fix: '检查库名拼写（是 math 不是 maths）；需要安装的库只能在自己电脑上跑。',
        sample: sample('import random\nprint(random.randint(1, 10))\n\nimport math\nprint(math.pi)'),
      };
    },
  },
  {
    test: (c) => c.type === 'FileNotFoundError',
    make: () => ({
      title: '找不到这个文件',
      why: '浏览器里的 Python 看不到你自己电脑上的文件，只能读到它自己那一片小天地里的东西。',
      fix: '上课练习时，把内容直接用 input() 输入，或者写成一个变量放在代码里。',
    }),
  },
  {
    test: (c) => c.type === 'EOFError',
    make: () => ({
      title: '程序还想要输入，但答案给完了',
      why: '程序调用了 input()，可你准备的答案不够多（或者一行都没给）。',
      fix: '重新运行，在输入框里多给它几行答案；或者检查循环次数是不是太多了。',
      sample: sample('for i in range(3):        # 循环 3 次，就要准备 3 行答案\n    s = input("第" + str(i + 1) + "个数：")\n    print("你输入的是", s)'),
    }),
  },
  {
    test: (c) => c.type === 'RecursionError',
    make: () => ({
      title: '函数自己调自己，停不下来了',
      why: '函数里面又调用了自己，而且没有写出「什么时候停下来」，就会一直转下去。',
      fix: '给递归加一个结束条件（比如 if n == 0: return 1）。',
      sample: sample('def count_down(n):\n    if n == 0:            # 有了这个条件，它才会停下来\n        return\n    print(n)\n    count_down(n - 1)\n\ncount_down(5)'),
    }),
  },
  {
    test: (c) => c.type === 'OverflowError' || c.type === 'MemoryError',
    make: () => ({
      title: '数字太大，算不动了',
      why: '这个数大到 Python 也装不下（比如 10 ** 100000）。',
      fix: '把数字改小一点，或者换一种算法。',
    }),
  },
  {
    test: (c) => c.type === 'AssertionError',
    make: () => ({
      title: 'assert 检查没通过',
      why: 'assert 后面的条件算出来是 False，说明结果和预期不一样。',
      fix: '看看这个条件为什么不成立，检查前面的计算。',
    }),
  },
  {
    test: (c) => c.type === 'KeyboardInterrupt',
    make: () => ({
      title: '程序被打断了',
      why: '你点了「停止」，或者程序被强行中断了。',
      fix: '这不算写错，改完代码再运行一次就好。',
    }),
  },
];

const GENERIC = {
  title: '程序在这里停下来了',
  why: 'Python 遇到了它处理不了的情况，就停下来报了这个错。',
  fix: '先看中文解释里的位置和原因，改完再运行一次；看不懂就把它读给老师听 😊',
};

/**
 * 生成中文解释
 * @param {{type:string,message:string,lineno:number,traceback:string}} err 来自 worker 的结构化报错
 * @param {string} code 学生当前的代码
 */
export function explainError(err, code) {
  const lines = String(code || '').split('\n');
  const lineno = Number(err && err.lineno) || 0;
  const srcLine = lineno > 0 && lines[lineno - 1] != null ? lines[lineno - 1] : '';
  const ctx = {
    type: String((err && err.type) || ''),
    msg: String((err && err.message) || ''),
    lineno,
    srcLine,
    lines,
  };
  const hit = RULES.find((r) => {
    try {
      return r.test(ctx);
    } catch (e) {
      return false;
    }
  });
  const data = hit ? hit.make(ctx) : GENERIC;
  return {
    ...data,
    lineno,
    srcLine: srcLine.trim(),
    type: ctx.type,
    message: ctx.msg,
  };
}
