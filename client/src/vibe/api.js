// AI 编程模块的前端接口层
const BASE = '/api/vibe';

function authHeaders(extra) {
  const headers = { 'Content-Type': 'application/json', ...(extra || {}) };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

async function req(path, options = {}) {
  const res = await fetch(BASE + path, { ...options, headers: authHeaders(options.headers) });
  if (!res.ok) {
    let msg = '请求失败';
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch (e) { /* 保持默认 */ }
    throw new Error(msg);
  }
  return res.json();
}

const body = (obj) => ({ body: JSON.stringify(obj || {}) });

export const vibeApi = {
  getSettings: () => req('/settings'),
  saveSettings: (patch) => req('/settings', { method: 'POST', ...body(patch) }),
  models: () => req('/models'),

  listSessions: () => req('/sessions'),
  createSession: (model) => req('/sessions', { method: 'POST', ...body({ model }) }),
  getSession: (id) => req('/sessions/' + id),
  renameSession: (id, name) => req('/sessions/' + id, { method: 'PATCH', ...body({ name }) }),
  deleteSession: (id) => req('/sessions/' + id, { method: 'DELETE' }),

  tree: () => req('/tree'),
  readFile: (p) => req('/file?path=' + encodeURIComponent(p)),
  writeFile: (p, content) => req('/file', { method: 'POST', ...body({ path: p, content }) }),
  extract: (sessionId, index) => req('/extract', { method: 'POST', ...body({ sessionId, index }) }),
  apply: (files) => req('/apply', { method: 'POST', ...body({ files }) }),

  saveWork: (payload) => req('/work', { method: 'POST', ...body(payload) }),
  works: () => req('/works'),
  // 把作品下载到本机（返回原始 Response，自己转 blob）
  workRaw: (path) => fetch(BASE + '/works/download?path=' + encodeURIComponent(path), { headers: authHeaders() }),

  // 流式对话：返回原始 Response
  chatRaw: (payload) => fetch(BASE + '/chat', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }),
};

// ---------------------------------------------------------------------------
// 教师后台专用的 AI 编程设置接口（不会被学生看到）
const ADMIN_BASE = '/api/admin/vibe';

async function adminReq(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) headers.Authorization = 'Bearer ' + adminToken;
  const res = await fetch(ADMIN_BASE + path, { ...options, headers });
  if (!res.ok) {
    let msg = '请求失败';
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch (e) { /* 保持默认 */ }
    throw new Error(msg);
  }
  return res.json();
}

export const vibeAdminApi = {
  getSettings: () => adminReq('/settings'),
  saveSettings: (patch) => adminReq('/settings', { method: 'POST', body: JSON.stringify(patch || {}) }),
  models: () => adminReq('/models'),

  // 查看学生的 AI 对话
  sessions: (params) => {
    const qs = params
      ? '?' + Object.entries(params)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
      : '';
    return adminReq('/sessions' + qs);
  },
  session: (id) => adminReq('/sessions/' + id),
};
