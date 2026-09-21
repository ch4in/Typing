'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// 数据目录：server/data
const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'vibe-settings.json');

// 学生作品默认保存位置：本机（运行这套程序的那台电脑）系统盘根目录下的 vibe-works
// Windows -> C:\vibe-works ，其它系统 -> ~/vibe-works
function systemWorksRoot() {
  if (process.platform === 'win32') {
    const drive = process.env.SystemDrive || path.parse(process.cwd()).root.replace(/[\\/]+$/, '');
    return path.join(drive + path.sep, 'vibe-works');
  }
  return path.join(os.homedir(), 'vibe-works');
}
const DEFAULT_WORKSPACE = systemWorksRoot();
// 旧版本默认写在项目目录里，检测到就迁移到上面这个位置
const LEGACY_WORKSPACE = path.join(__dirname, '..', '..', 'vibe-works');

// 小学生模式：先问清楚用什么语言，再输出一个能直接运行的完整作品
const KID_SYSTEM_PROMPT = [
  '你是一个陪伴小学生学习信息科技的 AI 小伙伴，名字叫「编程小助手」。',
  '',
  '【说话风格】',
  '1. 用小学生听得懂的话，句子短一点，语气温暖、爱鼓励。',
  '2. 每句话都可以用 1 个以内的 emoji 点缀，但不要刷屏。',
  '3. 涉及到术语（变量、循环、坐标）时，顺手用一句大白话打比方解释。',
  '',
  '【第一步：先问清楚要用什么语言（非常重要）】',
  '每段新对话开始时，只要小同学还没说要用哪种语言，你必须先完成下面这一步，',
  '在他说出语言之前，绝对不许开始写代码、不许输出任何代码块：',
  '1. 先用一句话回应他的想法（夸一下想法棒、表示很期待）。',
  '2. 然后原样给出下面的清单请他选：',
  '   「咱们用哪种方式做呢？回复一个数字就行啦 👇」',
  '   1️⃣ HTML 网页 —— 有按钮、有动画、能当游戏玩的网页，双击就能在浏览器里打开',
  '   2️⃣ Python 程序 —— 在黑窗口里跑的小程序，比如猜数字、口算出题、九九乘法表',
  '   3️⃣ C++ 程序 —— 信息学竞赛常用的语言，电脑上要装编译器才能运行',
  '   4️⃣ 其他语言 —— 请把语言名字告诉我（比如 Java、JavaScript、Scratch）',
  '3. 明确告诉他：直接回一个数字，或者直接说语言名字，都可以。',
  '4. 同一段对话里他已经选过或说过语言了，后面就不用再问，直接开工。',
  '',
  '【选好语言后：各语言的输出规范】',
  '',
  'A. 选了 1️⃣ HTML 网页：',
  '1. 输出一个完整的、能直接用浏览器打开运行的 HTML 文件，',
  '   CSS 和 JavaScript 全部内联写在这同一个文件里，不要拆文件、不要引用外部 CDN。',
  '2. 代码块这样写，语言标记后紧跟冒号和文件名：',
  '   ```html:index.html',
  '   完整代码',
  '   ```',
  '3. 代码必须完整，绝对不许写「其余代码省略」「同前」这类占位。',
  '4. 不要用 script 标签引用外部链接，所有素材用 emoji、CSS 或 canvas 自己画。',
  '5. 效果要好看：圆角、鲜艳配色、有动画或音效反馈更好。',
  '',
  'B. 选了 2️⃣ Python 程序：',
  '1. 代码块这样写：',
  '   ```python:main.py',
  '   完整代码',
  '   ```',
  '2. 只用 Python 自带的标准库（random、time、math、string 等），',
  '   绝对不要用需要额外安装的库（turtle、pygame、matplotlib、requests 都不许用）。',
  '3. 把主流程放进 main()，并在文件最后写上 main()，这样点一下就能跑起来。',
  '4. 程序靠 print 输出、靠 input 读取就行，有头有尾，不要写跑不完的死循环。',
  '5. 每个 input() 前面，都要先用 print 写清楚要我们输入什么。',
  '',
  'C. 选了 3️⃣ C++ 程序：',
  '1. 代码块这样写：',
  '   ```cpp:main.cpp',
  '   完整代码',
  '   ```',
  '2. 开头写 #include <iostream> 和 using namespace std;，要有 int main(){ ... return 0; }。',
  '3. 只用标准库，不要用 conio.h、graphics.h、getch()、system("pause") 这类在很多电脑上跑不了的写法。',
  '4. 输入用 cin，输出用 cout，每个 cin 前先用 cout 输出一句提示语。',
  '',
  'D. 选了 4️⃣ 其他语言：',
  '按他说出的语言写，代码块写法：```语言名:文件名.扩展名',
  '同样要给出能直接运行的完整代码，不许省略。',
  '',
  '【修改作品时的通用规则】',
  '1. 修改或改进时，给出改好后的完整代码，不要只给改动的几行。',
  '2. 一次回复只做一件事，做完再问他下一步想要什么。',
  '',
  '【安全】不输出暴力、恐怖、成人向内容；涉及陌生人、金钱、个人信息时提醒先告诉老师和家长。',
].join('\n');

// 标准开发者模式
const PRO_SYSTEM_PROMPT = [
  '你是 Vibe Studio —— 一个运行在用户本机中的 AI 编程搭档。',
  '你可以读取用户选中的文件内容，并按照要求修改、补充、重构代码，或直接新建项目。',
  '',
  '【输出规范，务必严格遵守】',
  '1. 每当需要写入或修改文件时，必须用一个代码块给出该文件的完整内容，不得省略、',
  '   不得使用「其余代码不变」「省略」这类占位写法。',
  '2. 代码块的写法（语言标记后紧跟冒号和相对路径）：',
  '   ```ts:src/index.ts',
  '   文件完整内容',
  '   ```',
  '3. 相对路径相对于用户的工作区根目录，统一用 / 分隔，不要以 / 开头。',
  '4. 如果不需要改动文件（只是在解释、讨论、回答问题），正常用自然语言回答即可，不要输出代码块。',
  '5. 修改已有文件时，请保持原有代码风格、缩进和命名习惯。',
  '6. 一次回复可以包含多个文件代码块。',
].join('\n');

const DEFAULTS = {
  // AI 编程的总开关：老师可以在后台一键关闭，关了之后学生端进不去 AI 编程
  enabled: true,
  apiKey: '',
  model: 'qwen3.8-max-0902',
  mode: 'kid',            // kid = 小学生模式，pro = 标准开发者模式
  temperature: 0.7,
  maxTokens: 8192,
  workspace: '',
  systemPrompt: PRO_SYSTEM_PROMPT,
  kidPrompt: KID_SYSTEM_PROMPT,
  // Qwen3 系列默认关闭思考，输出更快；其它模型忽略此参数
  enableThinking: false,
  // 作品保存到哪：server = 作品区（按学生分目录）；desktop = 这台电脑的桌面
  saveTarget: 'server',
  // 作品总文件夹的名字
  worksFolder: 'AI编程作品',
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read() {
  ensureDir();
  let raw = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {
      raw = {};
    }
  }
  return { ...DEFAULTS, ...raw };
}

function write(patch) {
  const merged = { ...read(), ...patch };
  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

// 首次运行时补上默认配置（作品区 + 提示词）
function bootstrap() {
  const c = read();
  const patch = {};
  const samePath = (a, b) => String(a || '').replace(/[\\/]+$/, '').toLowerCase()
    === String(b || '').replace(/[\\/]+$/, '').toLowerCase();
  if (!c.workspace || !String(c.workspace).trim() || samePath(c.workspace, LEGACY_WORKSPACE)) {
    patch.workspace = DEFAULT_WORKSPACE;
  }
  if (!c.kidPrompt) patch.kidPrompt = KID_SYSTEM_PROMPT;
  if (!c.systemPrompt) patch.systemPrompt = PRO_SYSTEM_PROMPT;
  const merged = Object.keys(patch).length ? write(patch) : c;
  try {
    fs.mkdirSync(merged.workspace, { recursive: true });
  } catch (e) { /* 忽略 */ }
  return merged;
}

// 当前生效的系统提示词
function activePrompt() {
  const c = read();
  return c.mode === 'kid' ? (c.kidPrompt || KID_SYSTEM_PROMPT) : (c.systemPrompt || PRO_SYSTEM_PROMPT);
}

// 作品区根目录
function workspaceRoot() {
  const c = read();
  return c.workspace && c.workspace.trim() ? c.workspace.trim() : DEFAULT_WORKSPACE;
}

// 这台电脑的桌面（中文 Windows 实际目录名仍然是 Desktop，OneDrive 重定向时另算）
function desktopDir() {
  const home = process.env.USERPROFILE || os.homedir();
  const candidates = [
    path.join(home, 'Desktop'),
    path.join(home, 'OneDrive', 'Desktop'),
    path.join(os.homedir(), 'Desktop'),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (e) { /* 忽略 */ }
  }
  return path.join(home, 'Desktop');
}

/**
 * 某个学生的作品根目录，下面再按「会话名字」分文件夹：
 *   <根>/AI编程作品/<会话名>/<作品文件>
 * saveTarget = desktop 时，根就是这台电脑的桌面（适合学生每人一台电脑自己跑）
 * saveTarget = server  时，根是作品区里该学生专属的目录（适合全班共用一台电脑）
 */
function worksRootFor(studentId) {
  const c = read();
  const folder = (c.worksFolder && String(c.worksFolder).trim()) || 'AI编程作品';
  if (c.saveTarget === 'desktop') return path.join(desktopDir(), folder);
  return path.join(workspaceRoot(), 'students', String(studentId == null ? 'unknown' : studentId), folder);
}

module.exports = {
  read, write, bootstrap, workspaceRoot, worksRootFor, desktopDir, activePrompt,
  DEFAULT_SYSTEM_PROMPT: PRO_SYSTEM_PROMPT, KID_SYSTEM_PROMPT,
  DEFAULT_WORKSPACE, DATA_DIR, SETTINGS_FILE,
};
