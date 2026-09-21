'use strict';

// 阿里云百炼 —— OpenAI 兼容模式
const BASE = process.env.DASHSCOPE_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

class DashScopeError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'DashScopeError';
    this.status = status;
  }
}

function explain(status, detail) {
  let msg = detail || '';
  try {
    const j = JSON.parse(detail);
    msg = (j.error && (j.error.message || JSON.stringify(j.error))) || j.message || detail;
  } catch (e) {
    /* 不是 JSON 就用原文 */
  }
  const lower = String(msg).toLowerCase();
  if (status === 401) return new DashScopeError(401, 'API Key 无效或已失效（401）：' + msg);
  if (status === 403) return new DashScopeError(403, '没有该模型的访问权限，或免费额度已用完（403）：' + msg);
  if (status === 429) return new DashScopeError(429, '触发限流或免费额度耗尽（429）：' + msg);
  if (lower.includes('quota') || lower.includes('free')) {
    return new DashScopeError(status, '免费额度可能已用完（' + status + '）：' + msg);
  }
  return new DashScopeError(status, '百炼返回错误（' + status + '）：' + msg);
}

function buildPayload({ model, messages, temperature, maxTokens, enableThinking, includeUsage, noThinking }) {
  const payload = {
    model,
    messages,
    // 必须显式开启流式，否则接口会一次性返回，前端长时间收不到任何东西（表现为「卡住」）
    stream: true,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    max_tokens: maxTokens || 8192,
  };
  // enable_thinking 仅 Qwen3 系列支持，其它模型传了会 400
  if (!noThinking && enableThinking === false && /^qwen3/i.test(model)) {
    payload.enable_thinking = false;
  }
  if (includeUsage) payload.stream_options = { include_usage: true };
  return payload;
}

async function post(payload, apiKey, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 120000);
  try {
    const r = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    return r;
  } finally {
    clearTimeout(timer);
  }
}

function parseError(err) {
  if (err && err.name === 'AbortError') return new Error('请求超时或被中断');
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * 流式对话。handlers: { onDelta, onReasoning, onUsage, onError }
 * 返回 Promise<{ content, reasoning, usage }>
 */
function chatStream(params, handlers) {
  const h = handlers || {};
  const useUsage = true;

  return (async () => {
    // 依次尝试：完整参数 -> 去掉 stream_options -> 再去掉 enable_thinking
    // 不同模型对这两个参数的容忍度不一样，400 时按错误信息逐个降级
    const variants = [
      { includeUsage: useUsage },
      { includeUsage: false },
      { includeUsage: false, noThinking: true },
    ];

    let res = null;
    for (let i = 0; i < variants.length; i += 1) {
      res = await post(buildPayload({ ...params, ...variants[i] }), params.apiKey, params.timeoutMs);
      if (res.ok) break;
      const txt = await res.text().catch(() => '');
      const last = i === variants.length - 1;
      const canDowngrade =
        res.status === 400 &&
        !last &&
        (/stream_options|enable_thinking|unknown.*param/i.test(txt) || !txt.trim());
      if (!canDowngrade) throw explain(res.status, txt);
      console.warn(`[dashscope] 参数不被接受（${txt.slice(0, 120)}），降级重试`);
    }

    let content = '';
    let reasoning = '';
    let usage = null;

    await streamSSE(res, (obj) => {
      if (obj.usage) usage = obj.usage;
      const choice = Array.isArray(obj.choices) ? obj.choices[0] : null;
      if (!choice) return;
      const d = choice.delta || {};
      if (typeof d.reasoning_content === 'string' && d.reasoning_content) {
        reasoning += d.reasoning_content;
        if (h.onReasoning) h.onReasoning(d.reasoning_content);
      }
      if (typeof d.content === 'string' && d.content) {
        content += d.content;
        if (h.onDelta) h.onDelta(d.content);
      }
    }, { idleTimeoutMs: params.idleTimeoutMs || 60000 });

    return { content, reasoning, usage };
  })().catch((e) => {
    const err = parseError(e);
    if (h.onError) h.onError(err);
    throw err;
  });
}

// 读取 SSE 响应体，逐条回调 JSON 对象
// 兼容两种 body：Node 18+ 原生 fetch 给的是 Web 标准流（有 getReader），
// 老版本/其它实现给的是 Node 流（有 on）。两种都要支持，否则 Node 24 上直接崩。
async function streamSSE(res, onEvent, opts) {
  const idleTimeoutMs = (opts && opts.idleTimeoutMs) || 0;
  const decoder = new TextDecoder('utf-8');
  let buf = '';

  // 超过这么久一个字节都没收到就认为卡住了，主动断开并返回可读的错误
  let idleTimer = null;
  const clearIdle = () => { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } };
  const armIdle = () => {
    if (!idleTimeoutMs) return null;
    clearIdle();
    return new Promise((_, reject) => {
      idleTimer = setTimeout(() => {
        reject(new Error(`超过 ${Math.round(idleTimeoutMs / 1000)} 秒没有收到新内容，已自动断开`));
      }, idleTimeoutMs);
    });
  };

  const flush = (final) => {
    const lines = buf.split('\n');
    buf = final ? '' : (lines.pop() || '');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        onEvent(JSON.parse(data));
      } catch (e) {
        /* 忽略脏数据 */
      }
    }
  };

  const body = res && res.body;
  if (!body) throw new Error('响应没有内容（body 为空）');

  // Web 标准流（Node 18+ fetch）
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const idle = armIdle();
        const { done, value } = idle ? await Promise.race([reader.read(), idle]) : await reader.read();
        clearIdle();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        flush(false);
      }
      buf += decoder.decode();
    } finally {
      clearIdle();
      try { await reader.cancel(); } catch (e) { /* ignore */ }
      try { reader.releaseLock(); } catch (e) { /* ignore */ }
    }
    if (buf.trim()) flush(true);
    return;
  }

  // Node 流（老实现）
  await new Promise((resolve, reject) => {
    let timer = null;
    const reset = () => {
      if (timer) clearTimeout(timer);
      if (!idleTimeoutMs) return;
      timer = setTimeout(() => {
        try { if (typeof body.destroy === 'function') body.destroy(); } catch (e) { /* ignore */ }
        reject(new Error(`超过 ${Math.round(idleTimeoutMs / 1000)} 秒没有收到新内容，已自动断开`));
      }, idleTimeoutMs);
    };
    reset();
    body.on('data', (chunk) => {
      reset();
      buf += decoder.decode(chunk, { stream: true });
      flush(false);
    });
    body.on('end', () => {
      if (timer) clearTimeout(timer);
      if (buf.trim()) flush(true);
      resolve();
    });
    body.on('error', (e) => {
      if (timer) clearTimeout(timer);
      reject(parseError(e));
    });
  });
}

/** 拉取远端模型列表（可能受权限限制，失败不影响内置清单） */
async function listModels(apiKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(BASE + '/models', {
      headers: { Authorization: 'Bearer ' + apiKey },
      signal: ctrl.signal,
    });
    if (!res.ok) throw explain(res.status, await res.text().catch(() => ''));
    const j = await res.json();
    return (j.data || []).map((m) => m.id);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chatStream, listModels, DashScopeError, BASE };
