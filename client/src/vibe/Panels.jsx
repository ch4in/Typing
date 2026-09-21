import React, { useState } from 'react';
import { vibeApi } from './api';

/* ==================== 通用弹层外壳 ==================== */
export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="v-mask" onClick={onClose}>
      <div className={`v-modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="v-modal-head">
          <span>{title}</span>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="v-modal-body">{children}</div>
        {footer && <div className="v-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ==================== 老师设置（学生端 / 教师后台共用，靠 api 区分）==================== */
export function SettingsModal({ settings, models, api = vibeApi, onClose, onSaved }) {
  const [form, setForm] = useState({
    apiKey: '',
    model: settings.model,
    mode: settings.mode,
    temperature: settings.temperature,
    workspace: settings.workspace,
    kidPrompt: settings.kidPrompt,
    systemPrompt: settings.systemPrompt,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setMsg('');
    try {
      const patch = { ...form };
      // 没改动就不回传空 key
      if (!patch.apiKey) delete patch.apiKey;
      await api.saveSettings(patch);
      setMsg('✅ 已保存');
      onSaved();
      setTimeout(onClose, 600);
    } catch (e) {
      setMsg('❌ ' + e.message);
    }
    setBusy(false);
  };

  const grouped = models.reduce((acc, m) => {
    (acc[m.tier] = acc[m.tier] || []).push(m);
    return acc;
  }, {});

  return (
    <Modal
      title="⚙️ 老师设置"
      onClose={onClose}
      footer={
        <>
          {msg && <span style={{ marginRight: 'auto', fontSize: 14 }}>{msg}</span>}
          <button className="v-btn" onClick={onClose}>取消</button>
          <button className="v-btn primary" onClick={submit} disabled={busy}>{busy ? '保存中…' : '保存'}</button>
        </>
      }
    >
      <div className="v-field">
        <label>阿里云百炼 API Key<span className="hint">留空表示不修改</span></label>
        <input
          className="v-input-line"
          type="password"
          placeholder={settings.hasKey ? `已保存（${settings.keyMasked}）` : '填 sk- 开头的密钥'}
          value={form.apiKey}
          onChange={(e) => set('apiKey', e.target.value)}
        />
      </div>

      <div className="v-field">
        <label>对话对象</label>
        <div className="v-radios">
          <div className={`v-radio${form.mode === 'kid' ? ' on' : ''}`} onClick={() => set('mode', 'kid')}>
            <b>🧒 小学生模式</b>
            <span>说话温暖好懂，先问清用哪种语言，再给一个能直接跑起来的完整作品</span>
          </div>
          <div className={`v-radio${form.mode === 'pro' ? ' on' : ''}`} onClick={() => set('mode', 'pro')}>
            <b>🧑‍💻 标准模式</b>
            <span>面向老师开发用，可多文件、按路径写入</span>
          </div>
        </div>
      </div>

      <div className="v-field">
        <label>模型<span className="hint">都是你有免费额度的，快到期的排前面</span></label>
        <select className="v-select" value={form.model} onChange={(e) => set('model', e.target.value)}>
          {['旗舰', '均衡', '快速'].map((tier) => (
            <optgroup key={tier} label={tier}>
              {(grouped[tier] || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}（{m.vendor} · {m.expire}到期 · {m.desc}）
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="v-field">
        <label>作品保存位置（学生电脑上的文件夹）<span className="hint">作品会存在这里的 works 文件夹，默认 {settings.workspace || 'C:\\vibe-works'}</span></label>
        <input className="v-input-line" value={form.workspace} onChange={(e) => set('workspace', e.target.value)} />
      </div>

      <div className="v-field">
        <label>{form.mode === 'kid' ? '小学生模式提示词' : '标准模式提示词'}</label>
        <textarea
          className="v-textarea"
          value={form.mode === 'kid' ? form.kidPrompt : form.systemPrompt}
          onChange={(e) => set(form.mode === 'kid' ? 'kidPrompt' : 'systemPrompt', e.target.value)}
        />
      </div>
    </Modal>
  );
}

/* ==================== 运行预览 ==================== */
export function PreviewOverlay({ title, html, onClose }) {
  const [runKey, setRunKey] = useState(0);
  return (
    <div className="v-preview-wrap">
      <div className="v-preview-bar">
        <b>▶ {title || '作品预览'}</b>
        <span className="grow" />
        <button onClick={() => setRunKey((k) => k + 1)}>↻ 重新运行</button>
        <button onClick={onClose}>✕ 关闭预览</button>
      </div>
      <iframe
        key={runKey}
        className="v-preview-frame"
        title={title || 'preview'}
        sandbox="allow-scripts allow-modals allow-forms allow-pointer-lock"
        srcDoc={html}
      />
    </div>
  );
}

/* ==================== 给作品起名字 ==================== */
export function SaveWorkModal({ defaultName, onClose, onConfirm }) {
  const [name, setName] = useState(defaultName || '');
  return (
    <Modal
      title="💾 保存作品"
      onClose={onClose}
      footer={
        <>
          <button className="v-btn" onClick={onClose}>取消</button>
          <button className="v-btn primary" onClick={() => onConfirm(name.trim() || defaultName)}>保存</button>
        </>
      }
    >
      <div className="v-field">
        <label>给这个作品起个名字吧</label>
        <input className="v-input-line" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <p style={{ color: '#8a83a8', fontSize: 13, margin: 0 }}>
        保存后会放进「AI编程作品」文件夹里，按对话名字分开；左下角「我的作品」里随时能找到 🙂
      </p>
    </Modal>
  );
}

/* ==================== 我的作品 ==================== */
export function WorksModal({ items, root, onClose, onPreview }) {
  const open = async (path) => {
    try {
      const f = await vibeApi.readFile(path);
      if (f.exists && !f.binary) {
        const m = /\.([A-Za-z0-9]{1,8})$/.exec(path);
        onPreview({ title: path, html: f.content, language: m ? m[1] : '' });
      } else alert('这个文件打不开哦');
    } catch (e) {
      alert(e.message);
    }
  };

  // 把作品拿到自己的电脑上（服务器上那份还留着）
  const download = async (path) => {
    try {
      const res = await vibeApi.workRaw(path);
      if (!res.ok) { alert('下载失败啦，再试一次？'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = String(path).split('/').pop() || '作品.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {
      alert(e.message);
    }
  };

  const empty = !items || items.length === 0;
  return (
    <Modal title="📦 我的作品" onClose={onClose} wide>
      {empty && <p style={{ color: '#8a83a8' }}>还没有作品呢～ 让小助手帮你写一个网页，再点「💾 保存作品」就有啦！</p>}
      {!empty && items.map((dir) => (
        <div className="v-work-item" key={dir.name}>
          <h4>📁 {dir.name}</h4>
          {dir.files.length === 0 && <span style={{ color: '#8a83a8', fontSize: 13 }}>（空文件夹）</span>}
          {dir.files.map((f) => (
            <span className="v-work-file" key={f.path}>
              <span className="v-work-name" onClick={() => open(f.path)}>▶ {f.name}</span>
              <button className="v-work-dl" onClick={() => download(f.path)} title="下载到我自己的电脑上">⬇️ 下载</button>
            </span>
          ))}
        </div>
      ))}
      {root && (
        <p style={{ color: '#b3aed0', fontSize: 12, marginTop: 16 }}>
          作品保存在：{root}
          <br />
          想放到自己的电脑上，就点文件旁边的「⬇️ 下载」😊
        </p>
      )}
    </Modal>
  );
}

/* ==================== 写入项目的 diff 确认 ==================== */
export function DiffModal({ changes, loading, onClose, onApply }) {
  // 用「未勾选的路径」来存状态，默认全选（changes 变化时依然正确）
  const [unpicked, setUnpicked] = useState([]);
  if (loading) {
    return <Modal title="✨ 写入项目" onClose={onClose}><p>正在分析 AI 给出的文件…</p></Modal>;
  }
  if (!changes || changes.length === 0) {
    return (
      <Modal title="✨ 写入项目" onClose={onClose}>
        <p>这条回复里没有找到带文件名的代码块。</p>
        <p style={{ color: '#8a83a8', fontSize: 13 }}>
          提示：让 AI 用小助手规范输出，代码块这样写：<code className="v-inline-code">```html:index.html</code>
        </p>
      </Modal>
    );
  }
  const isPicked = (path) => !unpicked.includes(path);
  const toggle = (path) => setUnpicked((list) => (list.includes(path) ? list.filter((p) => p !== path) : [...list, path]));
  const pickedCount = changes.filter((c) => isPicked(c.path)).length;
  const write = () => onApply(changes.filter((c) => isPicked(c.path)).map((c) => ({ path: c.path, content: c.content })));

  return (
    <Modal
      title="✨ 写入项目"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="v-btn" onClick={onClose}>取消</button>
          <button className="v-btn primary" onClick={write} disabled={pickedCount === 0}>写入 {pickedCount} 个文件</button>
        </>
      }
    >
      {changes.map((c, i) => (
        <div className="v-file-card" key={c.path}>
          <div className="v-file-head">
            <input type="checkbox" checked={isPicked(c.path)} onChange={() => toggle(c.path)} />
            <span className="p">{c.path}</span>
            {c.isNew && <span className="v-tag new">新文件</span>}
            <span className="v-tag add">+{c.added}</span>
            <span className="v-tag del">-{c.removed}</span>
          </div>
          <div className="v-diff">
            {(c.rows || []).slice(0, 400).map((r, k) => (
              <div className={`v-d-row ${r.type}`} key={k}>
                <span className="v-d-num">{r.newLine ?? ''}</span>
                <span className="v-d-text">{r.text || ' '}</span>
              </div>
            ))}
            {c.tooLarge && <div className="v-d-row"><span className="v-d-text">（改动太大，只显示部分）</span></div>}
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ==================== 文件树 ==================== */
export function TreeNode({ node, depth, onOpen, active }) {
  const [open, setOpen] = useState(depth < 1);
  const pad = { paddingLeft: 8 + depth * 14 };
  if (node.type === 'dir') {
    return (
      <div>
        <div className="v-tree-node" style={pad} onClick={() => setOpen((o) => !o)}>
          {open ? '📂' : '📁'} {node.name}
        </div>
        {open && (node.children || []).map((c) => (
          <TreeNode key={c.path} node={c} depth={depth + 1} onOpen={onOpen} active={active} />
        ))}
      </div>
    );
  }
  return (
    <div
      className={`v-tree-node${active === node.path ? ' on' : ''}`}
      style={pad}
      onClick={() => onOpen(node.path)}
    >
      📄 {node.name}
    </div>
  );
}
