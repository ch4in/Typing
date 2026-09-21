/* 直连阿里云百炼，验证：API Key 是否有效 / 模型是否可用 / 流式是否正常
 * 用法：
 *   node test-chat.js                 测试设置里当前选中的模型
 *   node test-chat.js qwen3.8-flash   测试指定模型
 *   node test-chat.js --list          列出该 Key 能用的所有模型
 */
'use strict';

const config = require('./server/vibe-lib/config');
const dashscope = require('./server/vibe-lib/dashscope');
const models = require('./server/vibe-lib/models');

const arg = process.argv[2];

// Key 必须是纯 ASCII（英文/数字/符号），否则 fetch 设 header 时会直接崩
function badKeyReason(key) {
  if (!key) return '还没有填 API Key';
  const bad = String(key).match(/[^\x21-\x7e]/g);
  if (bad) return 'API Key 含有非法字符：「' + bad.slice(0, 5).join('') + '」等，请重新复制（应以 sk- 开头，纯英文）';
  return null;
}

function checkKey(c) {
  const reason = badKeyReason(c.apiKey);
  if (!reason) return true;
  console.log('❌ ' + reason);
  console.log('   当前保存的值首字符是：' + String(c.apiKey).slice(0, 1));
  console.log('   请在页面右上角「⚙ 老师设置」里重新粘贴并保存');
  return false;
}

async function listAll() {
  const c = config.read();
  if (!checkKey(c)) return;
  console.log('正在拉取该 Key 可用的模型列表…');
  const ids = await dashscope.listModels(c.apiKey);
  console.log('可用模型（共 ' + ids.length + ' 个）：');
  ids.forEach((id) => console.log('  - ' + id));
  const known = models.ids().filter((id) => ids.includes(id));
  console.log('\n其中在内置清单里的：' + (known.length ? known.join(', ') : '（无）'));
}

async function chat(modelId) {
  const c = config.read();
  if (!checkKey(c)) return;
  const model = modelId || c.model;
  console.log('API Key：已填写（' + String(c.apiKey).slice(0, 6) + '…' + String(c.apiKey).slice(-4) + '）');
  console.log('使用模型：' + model);
  console.log('正在发送测试消息…\n');

  const t0 = Date.now();
  let chunks = 0;
  let content = '';
  try {
    const r = await dashscope.chatStream({
      model,
      messages: [
        { role: 'system', content: '你很简洁。' },
        { role: 'user', content: '请只回复两个字：你好' },
      ],
      apiKey: c.apiKey,
      temperature: 0.7,
      maxTokens: 512,
      enableThinking: c.enableThinking,
    }, {
      onDelta: (t) => { chunks += 1; content += t; },
    });
    console.log('✅ 成功！耗时 ' + (Date.now() - t0) + 'ms，收到 ' + chunks + ' 个流式片段');
    console.log('回复内容：' + (r.content || '(空)'));
    if (r.usage) console.log('消耗 tokens：' + JSON.stringify(r.usage));
  } catch (e) {
    console.log('❌ 失败：' + (e && e.message ? e.message : e));
    console.log('\n常见原因：');
    console.log('  1. Key 填错或已失效（401）');
    console.log('  2. 该模型不在你的免费额度范围内（403）');
    console.log('  3. 免费额度已用完（429 / quota）');
    console.log('  4. 网络连不上 dashscope.aliyuncs.com');
    console.log('\n可以运行 `node test-chat.js --list` 看看这个 Key 到底能用哪些模型。');
  }
}

(async () => {
  if (arg === '--list') await listAll();
  else await chat(arg);
  process.exit(0);
})().catch((e) => {
  console.error('脚本自身出错：', e);
  process.exit(1);
});
