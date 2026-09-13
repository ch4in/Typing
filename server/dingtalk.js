const fs = require('fs');
const path = require('path');

// 极简 .env 加载（避免新增依赖），仅填充尚未存在的环境变量
function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const APP_KEY = process.env.DINGTALK_APP_KEY;
const APP_SECRET = process.env.DINGTALK_APP_SECRET;

let _tokenCache = { token: null, exp: 0 };

// 企业内部应用 access_token（带缓存，约 2 小时有效）
async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.exp) return _tokenCache.token;
  const url = `https://oapi.dingtalk.com/gettoken?appkey=${APP_KEY}&appsecret=${APP_SECRET}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode !== 0) {
    throw new Error('钉钉获取access_token失败: ' + JSON.stringify(data));
  }
  _tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in - 120) * 1000 };
  return data.access_token;
}

// 调用钉钉旧版服务端 API（topapi 系列），access_token 作为 query 参数
async function callApi(apiPath, body = {}) {
  const token = await getAccessToken();
  const sep = apiPath.includes('?') ? '&' : '?';
  const url = `https://oapi.dingtalk.com${apiPath}${sep}access_token=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const PAGE_SIZE = 30; // 文档规定 page_size 最大 30

// 取某父部门下的直接子部门（superId 为 null/undefined 时取第一层级），依据 has_more 翻页
// 返回 [{ dept_id, name, dept_type, ... }]
async function fetchDeptChildren(superId) {
  const list = [];
  let page = 1;
  while (true) {
    const body = { page_no: page, page_size: PAGE_SIZE };
    if (superId != null) body.super_id = superId;
    const r = await callApi('/topapi/edu/dept/list', body);
    if (r.errcode !== 0) {
      throw new Error('dept/list 失败: ' + JSON.stringify(r));
    }
    const result = r.result || {};
    const details = Array.isArray(result.details) ? result.details : [];
    list.push(...details);
    if (!result.has_more || details.length === 0) break;
    page++;
  }
  return list;
}

// 遍历家校通讯录，收集所有「班级」节点
// 返回 [{ classId, className, schoolName }]
async function fetchClasses() {
  const classes = [];
  // BFS：{ superId, schoolName }，superId=null 表示从第一层级（通常为校区）开始
  const queue = [{ superId: null, schoolName: null }];
  let guard = 0;

  while (queue.length && guard++ < 5000) {
    const { superId, schoolName } = queue.shift();
    const children = await fetchDeptChildren(superId);

    for (const d of children) {
      const type = String(d.dept_type || '').toLowerCase();
      const name = d.name;
      // 学校名：优先取祖先中的 campus（校区）；若顶层节点本身不是 campus，则用顶层节点名兜底
      const school = schoolName || (type === 'campus' ? name : (superId == null ? name : null));

      if (type === 'class') {
        classes.push({ classId: d.dept_id, className: name, schoolName: school || name || '未命名学校' });
        // 班级是叶子节点，无需继续下钻
      } else {
        queue.push({ superId: d.dept_id, schoolName: school });
      }
    }
  }
  return classes;
}

// 取某班级下的学生（role=student），依据 has_more 翻页
// 返回 [{ name, userId, studentNo }]
async function fetchStudentsInClass(classId) {
  const students = [];
  let page = 1;
  while (true) {
    const r = await callApi('/topapi/edu/user/list', {
      role: 'student',
      class_id: classId,
      page_no: page,
      page_size: PAGE_SIZE,
    });
    if (r.errcode !== 0) {
      throw new Error('user/list 失败: ' + JSON.stringify(r));
    }
    const result = r.result || {};
    const details = Array.isArray(result.details) ? result.details : [];
    for (const u of details) {
      const role = String(u.role || '').toLowerCase();
      if (role && role !== 'student') continue;
      const name = u.name;
      if (!name) continue;
      // 学号在 feature(JSON) 或顶层 student_no 里
      let studentNo = u.student_no || null;
      if (!studentNo && u.feature) {
        try { studentNo = JSON.parse(u.feature).student_no || null; } catch { /* ignore */ }
      }
      students.push({ name, userId: u.userid || null, studentNo });
    }
    if (!result.has_more || details.length === 0) break;
    page++;
  }
  return students;
}

module.exports = { getAccessToken, callApi, fetchDeptChildren, fetchClasses, fetchStudentsInClass };
