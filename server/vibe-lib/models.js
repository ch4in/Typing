'use strict';

// 百炼后台已开通的免费模型清单（额度 1M tokens/模型，expire 为额度到期日）
const MODELS = [
  {
    id: 'qwen3.8-max-0902',
    label: 'Qwen3.8 Max',
    vendor: '通义千问',
    tier: '旗舰',
    quota: 1000000,
    expire: '2026/12/01',
    desc: '能力最强，适合复杂重构、架构设计、疑难 Bug',
  },
  {
    id: 'deepseek-v4-pro-0813',
    label: 'DeepSeek V4 Pro',
    vendor: 'DeepSeek',
    tier: '旗舰',
    quota: 1000000,
    expire: '2026/11/13',
    desc: '代码能力强、推理扎实，适合完整项目生成',
  },
  {
    id: 'kimi-k3',
    label: 'Kimi K3',
    vendor: 'Moonshot',
    tier: '旗舰',
    quota: 1000000,
    expire: '2026/11/18',
    desc: '长上下文友好，适合大仓库理解与多文件改造',
  },
  {
    id: 'qwen3.8-2.4t-a95b',
    label: 'Qwen3.8 2.4T',
    vendor: '通义千问',
    tier: '旗舰',
    quota: 1000000,
    expire: '2026/11/12',
    desc: '超大参数 MoE，适合高难度任务',
  },
  {
    id: 'glm-5.3',
    label: 'GLM 5.3',
    vendor: '智谱',
    tier: '均衡',
    quota: 1000000,
    expire: '2026/11/23',
    desc: '中文表达自然，适合日常开发与文案注释',
  },
  {
    id: 'qwen3.8-27b',
    label: 'Qwen3.8 27B',
    vendor: '通义千问',
    tier: '均衡',
    quota: 1000000,
    expire: '2026/11/18',
    desc: '性价比高，适合日常改代码',
  },
  {
    id: 'qwen3.8-flash',
    label: 'Qwen3.8 Flash',
    vendor: '通义千问',
    tier: '快速',
    quota: 1000000,
    expire: '2026/11/25',
    desc: '响应快，适合补全、解释、简单修改',
  },
  {
    id: 'qwen3.7-flash-2026-07-15',
    label: 'Qwen3.7 Flash',
    vendor: '通义千问',
    tier: '快速',
    quota: 1000000,
    expire: '2026/10/23',
    desc: '快照版，速度最快，额度到期最早，建议优先消耗',
  },
  {
    id: 'deepseek-v4.1-flash',
    label: 'DeepSeek V4.1 Flash',
    vendor: 'DeepSeek',
    tier: '快速',
    quota: 1000000,
    expire: '2026/12/13',
    desc: '快且稳，适合重构建议与代码审查',
  },
  {
    id: 'deepseek-v4-flash-0731',
    label: 'DeepSeek V4 Flash',
    vendor: 'DeepSeek',
    tier: '快速',
    quota: 1000000,
    expire: '2026/10/31',
    desc: '快照版，适合试跑与批量小改',
  },
];

function all() {
  return MODELS;
}

function get(id) {
  return MODELS.find((m) => m.id === id) || null;
}

function ids() {
  return MODELS.map((m) => m.id);
}

function exists(id) {
  return ids().includes(id);
}

// 按到期日排序，方便「先花快到期的」
function byExpiry() {
  return [...MODELS].sort((a, b) => a.expire.localeCompare(b.expire));
}

module.exports = { all, get, ids, exists, byExpiry };
