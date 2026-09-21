import React, { useEffect, useRef, useState } from 'react';

// 把一段（可能还没写完的）回答拆成 文本 / 代码块。
// 代码块没闭合时也要输出，只是标成 open，这样才能边生成边显示。
function parseBlocks(content) {
  const parts = [];
  const text = String(content || '');
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('```', i);
    if (open < 0) break;
    const nl = text.indexOf('\n', open);
    const info = text.slice(open + 3, nl < 0 ? text.length : nl);
    const bodyStart = nl < 0 ? text.length : nl + 1;
    const close = text.indexOf('```', bodyStart);
    if (open > start) parts.push({ type: 'text', value: text.slice(start, open) });
    if (close < 0) {
      parts.push({ type: 'code', info, value: text.slice(bodyStart), open: true });
      return parts;
    }
    parts.push({ type: 'code', info, value: text.slice(bodyStart, close), open: false });
    i = close + 3;
    start = i;
  }
  if (start < text.length) parts.push({ type: 'text', value: text.slice(start) });
  return parts;
}

const EXT_MAP = {
  html: 'html', htm: 'html', javascript: 'js', js: 'js', jsx: 'jsx',
  ts: 'ts', tsx: 'tsx', typescript: 'ts', python: 'py', py: 'py',
  css: 'css', json: 'json', md: 'md', markdown: 'md', sql: 'sql',
  java: 'java', c: 'c', cpp: 'cpp', go: 'go', txt: 'txt', text: 'txt',
};

// 解析 ```html:index.html 这类信息串
export function parseInfo(info) {
  const raw = String(info || '').trim();
  let m = raw.match(/^([A-Za-z0-9+#_-]{1,12})[:：](.+)$/);
  if (m) return { language: m[1], name: m[2].trim() };
  m = raw.match(/^([A-Za-z0-9+#_-]{1,12})\s+(.+)$/);
  if (m) return { language: m[1], name: m[2].trim() };
  if (/\.[A-Za-z0-9]{1,8}$/.test(raw)) {
    const ext = raw.slice(raw.lastIndexOf('.') + 1).toLowerCase();
    return { language: ext, name: raw };
  }
  return { language: raw || 'text', name: '' };
}

export function extOf(language, name) {
  if (name) {
    const m = String(name).match(/\.([A-Za-z0-9]{1,8})$/);
    if (m) return m[1].toLowerCase();
  }
  return EXT_MAP[String(language || '').toLowerCase()] || 'txt';
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* 走降级方案 */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function Inline({ text }) {
  const tokens = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((t, i) => {
    if (/^\*\*[^*]+\*\*$/.test(t)) return <strong key={i}>{t.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(t)) return <code key={i} className="v-inline-code">{t.slice(1, -1)}</code>;
    return <span key={i}>{t}</span>;
  });
}

export function CodeBlock({ code, language, name, actions, live, unfinished }) {
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);
  const stickToBottom = useRef(true);
  const lower = String(language || '').toLowerCase();

  // 代码一行行长出来的时候，跟着往下滚，永远看得到最新的一行
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !live) return;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [code, live]);

  // 学生自己往上翻去看前面的代码时，就先别拽着他回来
  const onBodyScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };
  const previewable = ['html', 'htm', 'svg', 'js', 'jsx', 'javascript', 'css', 'python', 'py', 'cpp', 'c', 'java', 'cs'].includes(lower)
    || /\.(html?|svg|jsx?|css|py|cpp|cc|java|cs)$/i.test(String(name));

  const onCopy = async () => {
    const ok = await copyText(code);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1600);
  };

  // 直接把这段代码拿到自己的电脑上，不用先保存
  const onDownload = () => {
    let file = String(name || '').trim() || `代码.${extOf(language)}`;
    if (!/\.[A-Za-z0-9]{1,8}$/.test(file)) file += '.' + extOf(language);
    file = file.replace(/[\\/:*?"<>|]/g, '_');
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <div className={`v-code${live ? ' v-code-live' : ''}`}>
      <div className="v-code-head">
        <span>{live ? '⏳' : '📄'}</span>
        <span className="v-code-name">{name || `代码.${extOf(language)}`}</span>
        {live && <span className="v-code-tag">正在生成…</span>}
        {unfinished && !live && <span className="v-code-tag warn">⚠️ 没写完</span>}
        {!live && (
          <span className="v-code-acts">
            {previewable && <button className="v-act hot" onClick={actions.onPreview}>▶ 预览</button>}
            <button className="v-act" onClick={actions.onSave}>💾 保存作品</button>
            <button className="v-act" onClick={onDownload} title="把这段代码下载到自己的电脑上">⬇️ 下载</button>
            <button className="v-act" onClick={onCopy}>{copied ? '✅ 已复制' : '📋 复制'}</button>
            {actions.canWrite && <button className="v-act" onClick={actions.onWrite}>✨ 写入项目</button>}
          </span>
        )}
      </div>
      <pre className="v-code-body" ref={bodyRef} onScroll={live ? onBodyScroll : undefined}>
        {code.replace(/\s+$/, '')}
        {live && <span className="v-caret" />}
      </pre>
    </div>
  );
}

export default function MessageItem({ msg, isStreaming, index, onPreview, onSave, onWrite, canWrite }) {
  const content = msg.content || '';

  // 代码块没闭合时照样渲染（标 live），这样才能看到代码一行行长出来，
  // 而不是等收尾的 ``` 到了才一次性蹦出来。
  const parts = parseBlocks(content);

  const fileMeta = (info) => {
    const { language, name } = parseInfo(info);
    return { language, name: name || `作品.${extOf(language)}` };
  };

  const last = parts[parts.length - 1];
  const tailIsLiveCode = isStreaming && last && last.type === 'code' && last.open;

  return (
    <div className={`v-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
      <div className="v-ava">{msg.role === 'user' ? '🧒' : '🤖'}</div>
      <div className="v-bub">
        {parts.map((p, i) => {
          if (p.type === 'code') {
            const meta = fileMeta(p.info);
            return (
              <CodeBlock
                key={i}
                code={p.value}
                language={meta.language}
                name={meta.name}
                live={isStreaming && p.open}
                unfinished={p.open && !isStreaming}
                actions={{
                  onPreview: () => onPreview({ title: meta.name, html: p.value, language: meta.language, name: meta.name }),
                  onSave: () => onSave({ name: meta.name, language: meta.language, content: p.value }),
                  onWrite: () => onWrite(index),
                  canWrite,
                }}
              />
            );
          }
          const blocks = String(p.value).split(/\n{2,}/).filter((b) => b.trim() !== '');
          return blocks.map((b, j) => (
            <p className="v-p" key={`${i}-${j}`}>
              <Inline text={b} />
            </p>
          ));
        })}
        {isStreaming && !tailIsLiveCode && <span className="v-caret" />}
      </div>
    </div>
  );
}
