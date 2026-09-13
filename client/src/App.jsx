import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import pinyin from 'pinyin';

// ==================== 工具函数 ====================
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const se = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}:${se}`;
}

// 使用 pinyin 库获取汉字拼音（不带声调）
function getPinyin(ch) {
  if (!ch || /^[\x00-\x7F]+$/.test(ch)) return null;
  const result = pinyin(ch, { style: pinyin.STYLE_NORMAL, heteronym: false });
  return result && result.length > 0 ? result[0][0] : null;
}

// ==================== API 工具 ====================
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getAdminToken() {
  return localStorage.getItem('admin_token');
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

async function adminApi(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAdminToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// ==================== Context ====================
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// ==================== 登录弹窗 ====================
function LoginModal({ onClose, onSuccess }) {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    api('/schools').then(data => {
      setSchools(data);
      // 默认选择"沙城一小"
      const defaultSchool = data.find(s => s.name === '沙城一小');
      if (defaultSchool) {
        setSchoolId(String(defaultSchool.id));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (schoolId) {
      setClasses([]);
      setClassId('');
      api(`/classes/${schoolId}`).then(setClasses).catch(() => {});
    }
  }, [schoolId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ schoolId: parseInt(schoolId), classId: parseInt(classId), name })
      });
      login(result.student, result.token);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>🌟 欢迎登录</h2>
        <p className="modal-subtitle">请选择你的学校和班级</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>🏫 学校</label>
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
              <option value="">请选择学校</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>📚 班级</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} required disabled={!schoolId}>
              <option value="">请选择班级</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>✏️ 姓名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入你的姓名" required />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '验证中...' : '开始学习 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==================== 首页导航 ====================
function HomePage() {
  const [cards, setCards] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api('/cards').then(setCards).catch(() => {});
  }, []);

  const handleCardClick = (card) => {
    if (card.is_local) {
      if (!user) {
        setShowLogin(true);
        return;
      }
      navigate(card.local_path);
    } else if (card.link) {
      window.open(card.link, '_blank');
    }
  };

  return (
    <div className="home-page">
      <div className="user-bar">
        {user ? (
          <>
            <div className="user-info">
              <div className="user-avatar">{user.name[0]}</div>
              <span>{user.schoolName} · {user.className} · {user.name}</span>
            </div>
            <button className="btn btn-secondary btn-small" onClick={logout}>退出</button>
          </>
        ) : (
          <button className="btn btn-primary btn-small" onClick={() => setShowLogin(true)}>🔑 登录</button>
        )}
      </div>

      <div className="home-header">
        <div className="decorations">
          <span>🌟</span><span>📚</span><span>🎨</span><span>🚀</span><span>💡</span>
        </div>
        <h1>学习导航</h1>
        <p className="subtitle">选择一个卡片，开启你的学习之旅吧！</p>
      </div>

      <div className="card-grid">
        {cards.map((card) => (
          <div
            key={card.id}
            className="nav-card"
            style={{ '--card-color': card.color }}
            onClick={() => handleCardClick(card)}
          >
            <span className="card-icon">{card.icon}</span>
            <div className="card-title">{card.title}</div>
            <div className="card-desc">{card.description}</div>
            <span className={`card-badge ${card.is_local ? 'badge-local' : 'badge-external'}`}>
              {card.is_local ? '🏠 本地应用' : '🔗 外部链接'}
            </span>
          </div>
        ))}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

// ==================== 打字练习列表 ====================
function TypingHome() {
  const [tab, setTab] = useState('practice');
  const [articles, setArticles] = useState([]);
  const [tests, setTests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showTestCode, setShowTestCode] = useState(null);
  const [showTestRank, setShowTestRank] = useState(null);
  const [testRanking, setTestRanking] = useState([]);
  const [testMyResult, setTestMyResult] = useState(null);
  const [showPracticeRank, setShowPracticeRank] = useState(null);
  const [practiceRanking, setPracticeRanking] = useState([]);
  const [practiceMyResult, setPracticeMyResult] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 刷新列表数据的 key，返回列表时递增触发重新加载
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    api('/articles').then(setArticles).catch(() => {});
    if (user) {
      api(`/tests/${user.classId}`).then(setTests).catch(() => {});
    }
  }, [user, refreshKey]);

  // 切换到测试 tab 时重新拉取测试列表（确保获取后台最新添加的测试）
  useEffect(() => {
    if (tab === 'test' && user) {
      api(`/tests/${user.classId}`).then(setTests).catch(() => {});
    }
  }, [tab, user]);

  // 组件挂载时刷新（从文章页面返回时）
  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const filteredArticles = filter === 'all' ? articles : articles.filter(a => a.type === filter);

  const startPractice = (article) => {
    navigate(`/typing/practice/${article.id}`);
  };

  const handleTestClick = async (t) => {
    if (t.completed) {
      // 已完成测试 → 显示排名
      setShowTestRank(t);
      try {
        const [ranking, myResult] = await Promise.all([
          api(`/tests/${t.id}/ranking`),
          api(`/tests/${t.id}/my-result`)
        ]);
        setTestRanking(ranking);
        setTestMyResult(myResult);
      } catch (err) {
        setTestRanking([]);
        setTestMyResult(null);
      }
    } else {
      // 未完成 → 输入测试码
      setShowTestCode(t);
    }
  };

  const handleViewRank = async (t, e) => {
    e.stopPropagation();
    setShowTestRank(t);
    try {
      const [ranking, myResult] = await Promise.all([
        api(`/tests/${t.id}/ranking`),
        api(`/tests/${t.id}/my-result`)
      ]);
      setTestRanking(ranking);
      setTestMyResult(myResult);
    } catch (err) {
      setTestRanking([]);
      setTestMyResult(null);
    }
  };

  const handlePracticeRank = async (article, e) => {
    e.stopPropagation();
    setShowPracticeRank(article);
    try {
      const [ranking, myResult] = await Promise.all([
        api(`/articles/${article.id}/ranking`),
        api(`/articles/${article.id}/my-result`)
      ]);
      setPracticeRanking(ranking);
      setPracticeMyResult(myResult);
    } catch (err) {
      setPracticeRanking([]);
      setPracticeMyResult(null);
    }
  };

  return (
    <div className="typing-page">
      <div className="typing-user-bar">
        {user ? (
          <div className="typing-user-info">
            <span className="typing-user-avatar">{user.name[0]}</span>
            <span className="typing-user-name">{user.name}</span>
            <span className="typing-user-class">{user.schoolName} · {user.className}</span>
            <button className="typing-logout-btn" onClick={() => { logout(); navigate('/'); }}>退出</button>
          </div>
        ) : (
          <button className="typing-login-btn" onClick={() => window.location.href = '/'}>🔑 登录</button>
        )}
      </div>
      <a href="/" className="back-btn">⬅ 返回导航</a>
      <h2>⌨️ 打字平台</h2>

      <div className="tabs">
        <button className={`tab ${tab === 'practice' ? 'active' : ''}`} onClick={() => setTab('practice')}>
          📝 练习列表
        </button>
        <button className={`tab ${tab === 'test' ? 'active' : ''}`} onClick={() => setTab('test')}>
          🏆 班级测试
        </button>
      </div>

      {tab === 'practice' && (
        <>
          <div className="filter-bar">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
            <button className={`filter-btn ${filter === 'chinese' ? 'active' : ''}`} onClick={() => setFilter('chinese')}>CN 中文</button>
            <button className={`filter-btn ${filter === 'english' ? 'active' : ''}`} onClick={() => setFilter('english')}>EN 英文</button>
          </div>
          <div className="article-list">
            {filteredArticles.map((a) => (
              <div key={a.id} className="article-item" onClick={() => startPractice(a)}>
                <div className="article-info">
                  <h4 title={a.title}>{a.title}</h4>
                  <div className="article-meta">
                    <span className={`tag tag-${a.type === 'chinese' ? 'cn' : 'en'}`}>
                      {a.type === 'chinese' ? '中文' : '英文'}
                    </span>
                    <span className={`tag tag-${a.difficulty}`}>
                      {a.difficulty === 'easy' ? '简单' : a.difficulty === 'medium' ? '中等' : '困难'}
                    </span>
                    <span>{a.content.length} 字</span>
                  </div>
                </div>
                <div className="article-item-actions">
                  <button className="btn btn-secondary btn-small" onClick={(e) => handlePracticeRank(a, e)} title="查看排名">🏆 排名</button>
                </div>
              </div>
            ))}
            {filteredArticles.length === 0 && <div className="empty-state">暂无练习文章</div>}
          </div>
        </>
      )}

      {tab === 'test' && (
        <div className="test-list">
          {tests.map((t) => (
            <div key={t.id} className="test-item" onClick={() => handleTestClick(t)}>
              <div className="test-info">
                <h4 title={t.title}>{t.title}</h4>
                <div className="test-meta">
                  <span>⏱ {Math.floor(t.duration / 60)}分{t.duration % 60}秒</span>
                  {t.completed ? (
                    <>
                      <span className="test-completed-badge">✅ 已完成</span>
                      <span>⚡ {t.my_wpm} 字/分</span>
                      <span>🎯 {t.my_accuracy}%</span>
                      <span>🏆 #{t.my_rank}/{t.total_completed}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="test-item-actions">
                <button className="btn btn-secondary btn-small" onClick={(e) => handleViewRank(t, e)} title="查看排名">🏆 排名</button>
              </div>
            </div>
          ))}
          {tests.length === 0 && <div className="empty-state">暂无班级测试，等待老师发布吧！📋</div>}
        </div>
      )}

      {showTestCode && (
        <TestCodeModal
          test={showTestCode}
          onClose={() => setShowTestCode(null)}
          onStart={(test) => {
            navigate(`/typing/test/${test.id}`);
            setShowTestCode(null);
          }}
        />
      )}

      {showTestRank && (
        <TestRankModal
          test={showTestRank}
          ranking={testRanking}
          myResult={testMyResult}
          onClose={() => { setShowTestRank(null); setTestRanking([]); setTestMyResult(null); }}
          onRetry={() => {
            setShowTestRank(null);
            setTestRanking([]);
            setTestMyResult(null);
            // 弹出测试码输入框，而不是直接跳过
            setShowTestCode(showTestRank);
          }}
        />
      )}

      {showPracticeRank && (
        <PracticeRankModal
          article={showPracticeRank}
          ranking={practiceRanking}
          myResult={practiceMyResult}
          onClose={() => { setShowPracticeRank(null); setPracticeRanking([]); setPracticeMyResult(null); }}
          onStart={() => {
            setShowPracticeRank(null);
            setPracticeRanking([]);
            setPracticeMyResult(null);
            navigate(`/typing/practice/${showPracticeRank.id}`);
          }}
        />
      )}
    </div>
  );
}

// ==================== 测试码弹窗 ====================
function TestCodeModal({ test, onClose, onStart }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/tests/join', {
        method: 'POST',
        body: JSON.stringify({ testId: test.id, testCode: code })
      });
      onStart(test);
      // onStart 会触发 navigate 并卸载本组件，不再 setLoading(false)
      return;
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay test-code-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>🔐 输入测试码</h2>
        <p className="modal-subtitle">请输入老师提供的测试码进入测试</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入测试码"
              required
              autoFocus
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '验证中...' : '进入测试 🚀'}
          </button>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onClose}>取消</button>
        </form>
      </div>
    </div>
  );
}

// ==================== 测试排名弹窗 ====================
function TestRankModal({ test, ranking, myResult, onClose, onRetry }) {
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const [allData, setAllData] = React.useState({ data: [], total: 0 });

  // 首次加载或翻页
  React.useEffect(() => {
    if (ranking) {
      // 兼容旧格式（纯数组）和新格式（{data, total}）
      if (Array.isArray(ranking)) {
        setAllData({ data: ranking, total: ranking.length });
      } else if (ranking.data) {
        setAllData(ranking);
      }
    }
  }, [ranking]);

  const loadPage = async (p) => {
    setPage(p);
    try {
      const r = await api(`/tests/${test.id}/ranking?page=${p}&pageSize=${pageSize}`);
      setAllData(r);
    } catch (err) {}
  };

  const rankingData = allData.data || [];
  const totalPages = Math.ceil(allData.total / pageSize);

  // 排名：优先从 myResult.rank 获取，如果没有则前端兜底请求全部排名
  const [userRank, setUserRank] = React.useState(-1);
  const rankFetched = React.useRef(false);
  React.useEffect(() => {
    if (myResult && myResult.rank != null) {
      setUserRank(Number(myResult.rank));
    } else if (myResult && test && allData.total > 0 && !rankFetched.current) {
      rankFetched.current = true;
      // 兜底：请求全部排名数据来查找用户排名
      api(`/tests/${test.id}/ranking?page=1&pageSize=${allData.total}`)
        .then(r => {
          const list = r.data || r;
          const idx = list.findIndex(item => item.student_name === myResult.student_name);
          setUserRank(idx >= 0 ? idx + 1 : -1);
        })
        .catch(() => setUserRank(-1));
    }
  }, [myResult, test, allData.total]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 'min(95vw, 800px)' }} onClick={e => e.stopPropagation()}>
        <h2>🏆 {test.title}</h2>
        <p style={{ color: '#636e72', marginBottom: 12, fontSize: '0.9em' }}>
          ⏱ {Math.floor(test.duration / 60)}分{test.duration % 60}秒 · 共 {allData.total} 人
        </p>
        {myResult && (
          <div className="my-result-card" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', borderRadius: 12, padding: '12px 16px',
            marginBottom: 16, display: 'flex', justifyContent: 'space-around', alignItems: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>{myResult.wpm}</div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>速度(字/分)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>{myResult.accuracy}%</div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>正确率</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>
                {userRank > 0 ? `#${userRank}` : myResult ? '...' : '-'}
              </div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>排名</div>
            </div>
          </div>
        )}
        {rankingData.length > 0 ? (
          <>
            <table className="ranking-table" style={{ fontSize: '0.85em' }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>排名</th>
                  <th>姓名</th>
                  <th>学校</th>
                  <th>班级</th>
                  <th>速度</th>
                  <th>正确率</th>
                  <th>用时</th>
                  <th>完成时间</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.map((r, i) => (
                  <tr key={i} className={r.student_name === myResult?.student_name ? 'my-rank' : ''}>
                    <td>
                      {((page - 1) * pageSize + i) < 3 ? (
                        <span className={`rank-badge rank-${(page - 1) * pageSize + i + 1}`}>{(page - 1) * pageSize + i + 1}</span>
                      ) : (page - 1) * pageSize + i + 1}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.student_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.school_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.class_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.wpm} 字/分</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.accuracy}%</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.duration_seconds != null ? `${Math.floor(r.duration_seconds / 60)}'${r.duration_seconds % 60}"` : '-'}</td>
                    <td style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary btn-small" disabled={page <= 1} onClick={() => loadPage(page - 1)}>◀ 上一页</button>
                <span style={{ fontSize: '0.85em', color: '#636e72' }}>第 {page}/{totalPages} 页</span>
                <button className="btn btn-secondary btn-small" disabled={page >= totalPages} onClick={() => loadPage(page + 1)}>下一页 ▶</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">暂无排名数据</div>
        )}
        <div style={{ marginTop: 15, display: 'flex', gap: 8 }}>
          {myResult ? (
            <button className="btn btn-primary" onClick={onRetry}>🔄 重新测试</button>
          ) : (
            <span style={{ color: '#636e72', fontSize: '0.85em', alignSelf: 'center' }}>你还没有完成此测试</span>
          )}
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 练习排名弹窗 ====================
function PracticeRankModal({ article, ranking, myResult, onClose, onStart }) {
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const [allData, setAllData] = React.useState({ data: [], total: 0 });

  React.useEffect(() => {
    if (ranking) {
      if (Array.isArray(ranking)) {
        setAllData({ data: ranking, total: ranking.length });
      } else if (ranking.data) {
        setAllData(ranking);
      }
    }
  }, [ranking]);

  const loadPage = async (p) => {
    setPage(p);
    try {
      const r = await api(`/articles/${article.id}/ranking?page=${p}&pageSize=${pageSize}`);
      setAllData(r);
    } catch (err) {}
  };

  const rankingData = allData.data || [];
  const totalPages = Math.ceil(allData.total / pageSize);

  // 排名：优先从 myResult.rank 获取，如果没有则前端兜底请求全部排名
  const [userRank, setUserRank] = React.useState(-1);
  const rankFetched = React.useRef(false);
  React.useEffect(() => {
    if (myResult && myResult.rank != null) {
      setUserRank(Number(myResult.rank));
    } else if (myResult && article && allData.total > 0 && !rankFetched.current) {
      rankFetched.current = true;
      // 兜底：请求全部排名数据来查找用户排名
      api(`/articles/${article.id}/ranking?page=1&pageSize=${allData.total}`)
        .then(r => {
          const list = r.data || r;
          const idx = list.findIndex(item => item.student_name === myResult.student_name);
          setUserRank(idx >= 0 ? idx + 1 : -1);
        })
        .catch(() => setUserRank(-1));
    }
  }, [myResult, article, allData.total]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 'min(95vw, 800px)' }} onClick={e => e.stopPropagation()}>
        <h2>🏆 {article.title}</h2>
        <p style={{ color: '#636e72', marginBottom: 12, fontSize: '0.9em' }}>
          📝 {article.type === 'chinese' ? '中文' : '英文'} · {article.difficulty === 'easy' ? '简单' : article.difficulty === 'medium' ? '中等' : '困难'} · {article.content.length} 字 · 共 {allData.total} 人
        </p>
        {myResult && (
          <div className="my-result-card" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', borderRadius: 12, padding: '12px 16px',
            marginBottom: 16, display: 'flex', justifyContent: 'space-around', alignItems: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>{myResult.wpm}</div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>速度(字/分)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>{myResult.accuracy}%</div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>正确率</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>
                {userRank > 0 ? `#${userRank}` : myResult ? '...' : '-'}
              </div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>排名</div>
            </div>
          </div>
        )}
        {rankingData.length > 0 ? (
          <>
            <table className="ranking-table" style={{ fontSize: '0.85em' }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>排名</th>
                  <th>姓名</th>
                  <th>学校</th>
                  <th>班级</th>
                  <th>速度</th>
                  <th>正确率</th>
                  <th>用时</th>
                  <th>完成时间</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.map((r, i) => (
                  <tr key={r.id || i} className={r.student_name === myResult?.student_name ? 'my-rank' : ''}>
                    <td>
                      {((page - 1) * pageSize + i) < 3 ? (
                        <span className={`rank-badge rank-${(page - 1) * pageSize + i + 1}`}>{(page - 1) * pageSize + i + 1}</span>
                      ) : (page - 1) * pageSize + i + 1}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.student_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.school_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.class_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.wpm} 字/分</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.accuracy}%</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.duration_seconds != null ? `${Math.floor(r.duration_seconds / 60)}'${r.duration_seconds % 60}"` : '-'}</td>
                    <td style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary btn-small" disabled={page <= 1} onClick={() => loadPage(page - 1)}>◀ 上一页</button>
                <span style={{ fontSize: '0.85em', color: '#636e72' }}>第 {page}/{totalPages} 页</span>
                <button className="btn btn-secondary btn-small" disabled={page >= totalPages} onClick={() => loadPage(page + 1)}>下一页 ▶</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">暂无练习数据</div>
        )}
        <div style={{ marginTop: 15, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={onStart}>🔄 开始练习</button>
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 打字界面 ====================
function TypingEditor() {
  const { id } = useParams();
  const isTest = window.location.pathname.includes('/test/');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [article, setArticle] = useState(null);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, correct: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [myResult, setMyResult] = useState(null);
  const [charIndex, setCharIndex] = useState(0);
  const [errors, setErrors] = useState(new Set());
  const [wrongChars, setWrongChars] = useState({}); // { displayIdx: '用户输入的错误字符' }
  const [composingText, setComposingText] = useState(''); // IME组合中的拼音预览
  const [shakeIndex, setShakeIndex] = useState(-1); // 触发抖动动画的字符索引
  const [focused, setFocused] = useState(false);

  const startTimeRef = React.useRef(null);
  const inputRef = React.useRef('');
  const composingRef = React.useRef(false);
  const hiddenInputRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const finishedRef = React.useRef(false);
  const startedRef = React.useRef(false);
  const articleRef = React.useRef(null);
  const userScrolledRef = React.useRef(false);
  const errorsRef = React.useRef(new Set());
  const savedScrollYRef = React.useRef(0);

  useEffect(() => {
    if (isTest) {
      // 测试模式：先通过 test id 获取测试信息（含 article_id），再加载对应文章
      api(`/tests/${id}/detail`).then(testData => {
        setTimeLeft(testData.duration);
        api(`/articles/${testData.article_id}`).then(articleData => {
          setArticle(articleData);
          articleRef.current = articleData;
        }).catch(() => navigate('/typing'));
        api(`/tests/${id}/my-result`).then(r => {
          if (r) { setMyResult(r); setShowResult(true); }
        }).catch(() => {});
        api(`/tests/${id}/ranking`).then(setRanking).catch(() => {});
      }).catch(() => navigate('/typing'));
    } else {
      // 练习模式：直接用 article id 加载文章
      api(`/articles/${id}`).then(data => {
        setArticle(data);
        articleRef.current = data;
      }).catch(() => navigate('/typing'));
    }
  }, [id]);

  // 同步 ref
  useEffect(() => { finishedRef.current = finished; }, [finished]);
  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { errorsRef.current = errors; }, [errors]);

  // 抖动动画：短暂显示后清除
  useEffect(() => {
    if (shakeIndex < 0) return;
    const timer = setTimeout(() => setShakeIndex(-1), 400);
    return () => clearTimeout(timer);
  }, [shakeIndex]);

  // 计时器
  useEffect(() => {
    if (!started || finished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTypingRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, finished]);

  // 获取跳过换行符后的有效内容（用于输入比对）
  const getTypableContent = useCallback((content) => {
    return content ? content.replace(/\r?\n/g, '') : '';
  }, []);

  const getTypableLength = useCallback((content) => {
    return content ? content.replace(/\r?\n/g, '').length : 0;
  }, []);

  const processInput = useCallback((text) => {
    if (!text) return;
    if (finishedRef.current) return;

    if (!articleRef.current) return;
    const typableLen = getTypableLength(articleRef.current.content);
    const typableContent = getTypableContent(articleRef.current.content);

    // 如果已经输入到最后一个字，不再追加新内容到打字框
    if (inputRef.current.length >= typableLen) {
      return;
    }

    // 当前要输入的位置
    const curIdx = inputRef.current.length;

    // 如果前一个字符是错误的，当前字符必须输入正确才能继续
    if (curIdx > 0 && errorsRef.current.has(curIdx - 1)) {
      // 检查当前输入的字符是否与正确字符匹配
      const expectedChar = typableContent[curIdx];
      // 逐个字符检查（支持一次输入多个字符的情况，如IME）
      for (let i = 0; i < text.length; i++) {
        const checkIdx = curIdx + i;
        if (checkIdx >= typableLen) break;
        if (text[i] !== typableContent[checkIdx]) {
          // 有字符不匹配，阻止全部输入
          return;
        }
      }
    }

    if (!startedRef.current) {
      setStarted(true);
      startedRef.current = true;
      startTimeRef.current = Date.now();
    }

    // 截断多余输入，只取到可输入内容长度
    const maxLen = typableLen;
    const allowedText = text.slice(0, maxLen - inputRef.current.length);
    if (!allowedText) return;

    const newInput = inputRef.current + allowedText;
    inputRef.current = newInput;
    setInput(newInput);
    calculateStatsRef.current(newInput);

    // 检查是否全部正确完成
    if (newInput.length >= typableLen) {
      let allCorrect = true;
      for (let i = 0; i < typableContent.length; i++) {
        if (newInput[i] !== typableContent[i]) {
          allCorrect = false;
          break;
        }
      }
      if (allCorrect) {
        finishTypingRef.current();
      }
    }
  }, [getTypableLength, getTypableContent]);

  const calculateStatsRef = React.useRef((currentInput) => {
    if (!articleRef.current) return;
    const content = articleRef.current.content;
    // 跳过换行符进行比对
    const typableContent = content.replace(/\r?\n/g, '');
    let correct = 0;
    const newErrors = new Set();
    const newWrongChars = {};
    let newErrorIdx = -1;
    for (let i = 0; i < currentInput.length; i++) {
      if (i < typableContent.length && currentInput[i] === typableContent[i]) {
        correct++;
      } else {
        newErrors.add(i);
        // 检测新产生的错误位置（之前没有错误的，取第一个）
        if (newErrorIdx < 0 && !errorsRef.current.has(i)) {
          newErrorIdx = i;
        }
        // 记录用户输入的错误字符
        if (i < currentInput.length) {
          newWrongChars[i] = currentInput[i];
        }
      }
    }
    const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
    const wpm = elapsed > 0 ? Math.round(correct / elapsed) : 0;
    const accuracy = currentInput.length > 0 ? Math.round((correct / currentInput.length) * 100) : 100;
    setStats({ wpm, accuracy, correct, total: currentInput.length });
    setErrors(newErrors);
    setWrongChars(newWrongChars);
    setCharIndex(currentInput.length);
    // 同步更新 errorsRef，确保下次比较时是最新的
    errorsRef.current = newErrors;
    // 触发新错误字符的抖动动画
    if (newErrorIdx >= 0) {
      setShakeIndex(newErrorIdx);
    }
  });

  // 使用隐藏input + input事件来处理所有输入（包括中文IME）
  useEffect(() => {
    const hiddenInput = hiddenInputRef.current;
    if (!hiddenInput) return;

    const handleInput = (e) => {
      if (finishedRef.current) return;
      // IME 组合中的 input 事件不处理（包括 isComposing 和 compositionstart/end 之间）
      if (e.isComposing || composingRef.current) return;

      const value = e.target.value;
      if (!value) return;

      // 获取新增的内容（隐藏input会被清空，所以整个value就是新输入）
      processInput(value);
      // 立即清空隐藏input，等待下一次输入
      hiddenInput.value = '';
    };

    const handleCompositionStart = () => {
      composingRef.current = true;
    };

    const handleCompositionUpdate = (e) => {
      // IME组合中，显示正在输入的拼音
      setComposingText(e.data || '');
    };

    const handleCompositionEnd = (e) => {
      composingRef.current = false;
      setComposingText('');
      if (finishedRef.current) {
        hiddenInput.value = '';
        return;
      }
      // IME组合结束，隐藏input中已经有了组合后的完整文本
      const value = hiddenInput.value;
      if (value) {
        processInput(value);
        hiddenInput.value = '';
      }
    };

    const handleKeyDown = (e) => {
      if (finishedRef.current) return;
      // IME激活中，不拦截
      if (e.isComposing || composingRef.current) return;

      // Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (!startedRef.current) return;
        const newInput = inputRef.current.slice(0, -1);
        inputRef.current = newInput;
        setInput(newInput);
        calculateStatsRef.current(newInput);
        return;
      }
    };

    // 隐藏input失焦后自动恢复焦点，确保始终能接收键盘输入
    const handleBlur = () => {
      if (finishedRef.current) return;
      // 短暂延迟后重新聚焦，避免与点击事件冲突
      setTimeout(() => {
        if (hiddenInputRef.current && !finishedRef.current) {
          hiddenInputRef.current.focus({ preventScroll: true });
        }
      }, 50);
    };

    hiddenInput.addEventListener('input', handleInput);
    hiddenInput.addEventListener('compositionstart', handleCompositionStart);
    hiddenInput.addEventListener('compositionupdate', handleCompositionUpdate);
    hiddenInput.addEventListener('compositionend', handleCompositionEnd);
    hiddenInput.addEventListener('keydown', handleKeyDown);
    hiddenInput.addEventListener('blur', handleBlur);

    return () => {
      hiddenInput.removeEventListener('input', handleInput);
      hiddenInput.removeEventListener('compositionstart', handleCompositionStart);
      hiddenInput.removeEventListener('compositionupdate', handleCompositionUpdate);
      hiddenInput.removeEventListener('compositionend', handleCompositionEnd);
      hiddenInput.removeEventListener('keydown', handleKeyDown);
      hiddenInput.removeEventListener('blur', handleBlur);
    };
  }, [article]);

  const finishTypingRef = React.useRef(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    const currentInput = inputRef.current;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const art = articleRef.current;
    const content = art ? art.content : '';
    const typableContent = content.replace(/\r?\n/g, '');
    let correct = 0;
    for (let i = 0; i < Math.min(currentInput.length, typableContent.length); i++) {
      if (currentInput[i] === typableContent[i]) correct++;
    }
    const wpm = elapsed > 0 ? Math.round(correct / (elapsed / 60)) : 0;
    const accuracy = currentInput.length > 0 ? Math.round((correct / currentInput.length) * 100) : 100;
    const result = { wpm, accuracy, correctChars: correct, totalChars: currentInput.length, durationSeconds: Math.round(elapsed), ignored: false };

    if (user) {
      try {
        if (isTest) {
          const submitRes = await api('/tests/submit', {
            method: 'POST',
            body: JSON.stringify({ testId: parseInt(id), ...result, completed: 1 })
          });
          if (submitRes.ignored) result.ignored = true;
          const r = await api(`/tests/${id}/ranking`);
          setRanking(r.data || r);
          const mr = await api(`/tests/${id}/my-result`);
          setMyResult(mr);
        } else {
          const submitRes = await api('/practice/submit', {
            method: 'POST',
            body: JSON.stringify({ articleId: parseInt(id), ...result })
          });
          if (submitRes.ignored) result.ignored = true;
          const r = await api(`/articles/${id}/ranking`);
          setRanking(r.data || r);
        }
      } catch (err) {}
    }

    setResults(result);
    setShowResult(true);
  });

  const renderArticle = () => {
    if (!article) return null;
    const chars = article.content.split('');

    // 构建跳过换行符的映射：displayIndex -> charIndex
    // displayIndex 是排除换行符后的序号，用于与输入进行比对
    let displayIdx = 0;
    const elements = [];
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      // 换行符渲染为 <br>，不参与输入比对
      if (char === '\n' || char === '\r') {
        // \r\n 组合只渲染一个 <br>
        if (char === '\r' && i + 1 < chars.length && chars[i + 1] === '\n') {
          continue; // 跳过 \r，等处理 \n 时再渲染
        }
        elements.push(<br key={`br-${i}`} />);
        continue;
      }

      let cls = 'char pending';
      if (displayIdx < charIndex) {
        cls = errors.has(displayIdx) ? 'char incorrect' : 'char correct';
      } else if (displayIdx === charIndex) {
        cls = 'char current';
      }
      // 抖动动画
      if (displayIdx === shakeIndex) {
        cls += ' char-shake';
      }
      const isSpace = char === ' ';
      if (isSpace) {
        cls += ' special-space';
      }
      // 如果有错误字符，显示错误字符提示
      const wrongChar = wrongChars[displayIdx];
      const isCurrent = displayIdx === charIndex;
      elements.push(
        <span key={i} className={cls} style={{ position: 'relative' }}>
          {isSpace ? <span className="space-indicator">␣</span> : char}
          {wrongChar && (
            <span className="wrong-char-hint">
              {wrongChar === ' ' ? '␣' : wrongChar}
            </span>
          )}
          {isCurrent && composingText && (
            <span className="ime-composing-preview">{composingText}</span>
          )}
        </span>
      );
      displayIdx++;
    }
    return elements;
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // 页面加载时自动聚焦（依赖 article，确保 input 已渲染）
  useEffect(() => {
    if (article && hiddenInputRef.current) {
      hiddenInputRef.current.focus({ preventScroll: true });
      setFocused(true);
    }
  }, [article]);

  // 监听焦点变化，失去焦点时自动重新聚焦
  useEffect(() => {
    const handleBlur = () => {
      setFocused(false);
      setTimeout(() => {
        if (hiddenInputRef.current && !finishedRef.current) {
          hiddenInputRef.current.focus({ preventScroll: true });
          setFocused(true);
        }
      }, 100);
    };
    const el = hiddenInputRef.current;
    if (el) {
      el.addEventListener('blur', handleBlur);
    }
    return () => {
      if (el) {
        el.removeEventListener('blur', handleBlur);
      }
    };
  }, [finished]);

  // 监听用户手动滚动，标记为非自动滚动
  useEffect(() => {
    const handleUserScroll = () => {
      userScrolledRef.current = true;
      savedScrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleUserScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleUserScroll);
  }, []);

  // 检测 status-bar 是否滚出视口，超出时悬浮固定到顶部
  useEffect(() => {
    const statusBar = document.getElementById('typing-status-bar');
    if (!statusBar) return;

    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '0';
    sentinel.style.height = '1px';
    sentinel.style.width = '1px';
    sentinel.style.pointerEvents = 'none';
    statusBar.parentNode?.insertBefore(sentinel, statusBar);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          statusBar.classList.remove('sticky');
        } else {
          statusBar.classList.add('sticky');
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, [article]);

  // 自动滚动到当前正在输入的字符位置
  // 使用 useLayoutEffect 在 DOM 更新后立即执行，避免闪烁
  React.useLayoutEffect(() => {
    if (!article || !containerRef.current) return;
    
    const currentChar = document.querySelector('.article-display .char.current');
    if (!currentChar) return;

    const charRect = currentChar.getBoundingClientRect();

    // 更新隐藏输入框位置，让输入法候选框显示在当前字符旁边
    if (hiddenInputRef.current) {
      hiddenInputRef.current.style.left = charRect.left + 'px';
      hiddenInputRef.current.style.top = (charRect.top + charRect.height + 2) + 'px';
      hiddenInputRef.current.style.width = Math.max(charRect.width, 20) + 'px';
      hiddenInputRef.current.style.height = charRect.height + 'px';
      // 确保使用 clip:auto 而非 opacity:0，这样IME候选窗才能正常显示
      hiddenInputRef.current.style.clip = 'auto';
      hiddenInputRef.current.style.color = 'transparent';
      hiddenInputRef.current.style.caretColor = 'transparent';
      hiddenInputRef.current.style.background = 'transparent';
    }
    
    const viewportHeight = window.innerHeight;
    
    // 当前字符是否在视口可见范围内（给一些边距）
    const margin = 80;
    const isBelowViewport = charRect.bottom > viewportHeight - margin;
    const isAboveViewport = charRect.top < margin;

    if (isBelowViewport || isAboveViewport) {
      // 当前字符不在视口内 → 自动滚动到它
      currentChar.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (window.scrollY === 0 && savedScrollYRef.current > 0) {
      // 渲染导致滚动位置被意外重置到顶部 → 恢复用户之前的滚动位置
      window.scrollTo({ top: savedScrollYRef.current, behavior: 'instant' });
    }
  }, [charIndex, article]);

  if (!article) return <div className="typing-editor"><p>加载中...</p></div>;

  return (
    <div className="typing-editor" ref={containerRef}>
      <a href="/typing" className="back-link">⬅ 返回列表</a>

      <div className="status-bar" id="typing-status-bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="status-stats-row" style={{ flex: 1 }}>
            <div className="status-item">
              <div className={`status-value ${timeLeft <= 30 ? 'timer-warning' : ''}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="status-label">⏱ 倒计时</div>
            </div>
            <div className="status-item">
              <div className="status-value">{stats.wpm}</div>
              <div className="status-label">⚡ 字/分钟</div>
            </div>
            <div className="status-item">
              <div className="status-value">{stats.accuracy}%</div>
              <div className="status-label">🎯 正确率</div>
            </div>
            <div className="status-item">
              <div className="status-value">{stats.correct}/{article.content.replace(/\r?\n/g, '').length}</div>
              <div className="status-label">✅ 进度</div>
            </div>
          </div>
          {/* 中文拼音提示 - 固定占位区域，保持布局稳定 */}
          {article?.type === 'chinese' && !finished && (() => {
            const typableContent = article.content.replace(/\r?\n/g, '');
            const curChar = charIndex < typableContent.length ? typableContent[charIndex] : '';
            const py = curChar ? getPinyin(curChar) : null;
            return (
              <div className="status-item pinyin-hint" style={{ flexShrink: 0, minWidth: 80, textAlign: 'center' }}>
                <div className="status-value" style={{
                  background: py ? 'linear-gradient(135deg, #3498db, #74B9FF)' : 'transparent',
                  WebkitBackgroundClip: py ? 'text' : 'unset',
                  WebkitTextFillColor: py ? 'transparent' : 'transparent',
                  backgroundClip: py ? 'text' : 'unset',
                  fontSize: '1.2em',
                  minHeight: '1.8em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>{py || '\u00A0'}</div>
                <div className="status-label" style={{ color: py ? '#3498db' : 'transparent' }}>🔤 拼音</div>
              </div>
            );
          })()}
        </div>
        <div className="typing-progress-bar">
          <div className="typing-progress-fill" style={{ width: `${(() => { const len = article.content.replace(/\r?\n/g, '').length; return len > 0 ? Math.min(100, (charIndex / len) * 100) : 0; })()}%` }} />
        </div>
        <div className="status-label" style={{ textAlign: 'center', marginTop: 4 }}>
          {!started ? '⌨️ 开始输入' : finished ? '✅ 完成' : '⌨️ 输入中...'}
        </div>
      </div>

      <h3 style={{ marginBottom: 12, color: '#636e72' }}>
        {isTest ? '🏆 测试' : '📝 练习'}：{article.title}
      </h3>

      <div className="article-display" onPaste={(e) => e.preventDefault()} onClick={() => {
        if (hiddenInputRef.current) {
          hiddenInputRef.current.focus({ preventScroll: true });
        }
      }}>
        {renderArticle()}
      </div>

      {/* 隐藏的输入框定位到当前字符旁边，让输入法候选框显示在正确位置 */}
      {/* 使用 clip 裁剪而非 opacity:0，因为 opacity:0 会导致某些浏览器的IME候选窗不显示 */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="hidden-typing-input"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        onPaste={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          left: '0px',
          top: '0px',
          width: '20px',
          height: '24px',
          clip: 'rect(0, 0, 0, 0)',
          pointerEvents: 'none',
          fontSize: '16px',
          lineHeight: '1',
          padding: 0,
          border: '1px solid transparent',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'transparent',
          outline: 'none',
          resize: 'none',
        }}
        ref={(el) => {
          hiddenInputRef.current = el;
          if (el) {
            // 动态跟随当前字符位置
            const updatePos = () => {
              const charEl = document.querySelector('.char.current');
              if (charEl) {
                const rect = charEl.getBoundingClientRect();
                el.style.left = rect.left + 'px';
                el.style.top = (rect.top + rect.height + 2) + 'px';
                el.style.width = Math.max(rect.width, 20) + 'px';
                el.style.height = rect.height + 'px';
                // 使用 clip 方式隐藏而非 opacity，确保IME候选窗可见
                el.style.clip = 'auto';
                el.style.color = 'transparent';
                el.style.caretColor = 'transparent';
                el.style.background = 'transparent';
              }
            };
            updatePos();
            // 使用 MutationObserver 监听字符变化
            const observer = new MutationObserver(updatePos);
            const articleDisplay = document.querySelector('.article-display');
            if (articleDisplay) {
              observer.observe(articleDisplay, { childList: true, subtree: true, characterData: true });
            }
            el._cleanup = () => observer.disconnect();
          }
        }}
      />



      {showResult && results && (
        <ResultModal
          results={results}
          isTest={isTest}
          ranking={ranking}
          myResult={myResult}
          onClose={() => setShowResult(false)}
          onRetry={() => {
            inputRef.current = '';
            setInput('');
            setStarted(false);
            setFinished(false);
            setTimeLeft(300);
            setStats({ wpm: 0, accuracy: 100, correct: 0, total: 0 });
            setShowResult(false);
            setResults(null);
            setCharIndex(0);
            setErrors(new Set());
            composingRef.current = false;
            // 重新聚焦隐藏input
            setTimeout(() => {
              if (hiddenInputRef.current) {
                hiddenInputRef.current.value = '';
                hiddenInputRef.current.focus({ preventScroll: true });
                setFocused(true);
              }
            }, 100);
          }}
          onBack={() => navigate('/typing')}
        />
      )}
    </div>
  );
}

// ==================== 结果弹窗 ====================
function ResultModal({ results, isTest, ranking, myResult, onClose, onRetry, onBack }) {
  const getEmoji = () => {
    if (results.wpm >= 60) return '🏆';
    if (results.wpm >= 40) return '🌟';
    if (results.wpm >= 20) return '👍';
    return '💪';
  };

  const getComment = () => {
    if (results.wpm >= 60) return '太厉害了！你是打字小能手！';
    if (results.wpm >= 40) return '非常棒！继续加油！';
    if (results.wpm >= 20) return '不错哦！多练习会更棒！';
    return '加油！每天练习会越来越快！';
  };

  return (
    <div className="modal-overlay result-modal">
      <div className="modal">
        <div className="result-icon">{getEmoji()}</div>
        <h2>{isTest ? '测试完成！' : '练习完成！'}</h2>
        <p style={{ color: '#636e72', marginBottom: 15 }}>{getComment()}</p>

        {results.ignored && (
          <div style={{
            background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
            padding: '10px 14px', marginBottom: 15, fontSize: '0.9em', color: '#856404',
            textAlign: 'center'
          }}>
            ⚠️ 正确率低于60%，本次结果不记录成绩，请继续加油！
          </div>
        )}

        <div className="result-stats">
          <div className="result-stat">
            <div className="val">{results.wpm}</div>
            <div className="lbl">⚡ 字/分钟</div>
          </div>
          <div className="result-stat">
            <div className="val">{results.accuracy}%</div>
            <div className="lbl">🎯 正确率</div>
          </div>
          <div className="result-stat">
            <div className="val">{results.durationSeconds}s</div>
            <div className="lbl">⏱ 用时</div>
          </div>
        </div>

        <p style={{ fontSize: '0.9em', color: '#636e72' }}>
          正确 {results.correctChars} 字 / 共输入 {results.totalChars} 字
        </p>

        {ranking.length > 0 && !isTest && (
          <div className="ranking-section" style={{ marginTop: 15, textAlign: 'left' }}>
            <h3>🏆 练习排行</h3>
            <p style={{ fontSize: '0.85em', color: '#636e72', marginBottom: 8 }}>
              所有完成此练习的学生排名
            </p>
            <table className="ranking-table" style={{ fontSize: '0.85em' }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>排名</th>
                  <th>姓名</th>
                  <th>学校</th>
                  <th>班级</th>
                  <th>速度</th>
                  <th>正确率</th>
                  <th>用时</th>
                  <th>完成时间</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td>
                      {i < 3 ? (
                        <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      ) : i + 1}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.student_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.school_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.class_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.wpm} 字/分</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.accuracy}%</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.duration_seconds != null ? `${Math.floor(r.duration_seconds / 60)}'${r.duration_seconds % 60}"` : '-'}</td>
                    <td style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onRetry}>
            🔄 再来一次
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onBack}>
            📋 返回列表
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 教师后台 ====================
function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(!!getAdminToken());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('cards');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      localStorage.setItem('admin_token', result.token);
      setLoggedIn(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!loggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="modal" style={{ maxWidth: 380 }}>
          <h2>🔐 教师后台</h2>
          <p className="modal-subtitle">请输入管理员密码</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn btn-primary">登录</button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.8em', color: '#b2bec3' }}>
            默认密码: admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>👨‍🏫 教师管理后台</h2>
        <button className="btn btn-secondary btn-small" onClick={() => { localStorage.removeItem('admin_token'); setLoggedIn(false); }}>
          退出后台
        </button>
      </div>

      <div className="admin-tabs">
        {['cards', 'schools', 'classes', 'students', 'articles', 'practices', 'tests'].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ cards: '📇 导航卡片', schools: '🏫 学校', classes: '📚 班级', students: '👦 学生', articles: '📄 文章', practices: '📊 练习数据', tests: '📋 测试' }[t]}
          </button>
        ))}
      </div>

      <div className="admin-section">
        {tab === 'cards' && <CardManager />}
        {tab === 'schools' && <SchoolManager />}
        {tab === 'classes' && <ClassManager />}
        {tab === 'students' && <StudentManager />}
        {tab === 'articles' && <ArticleManager />}
        {tab === 'practices' && <PracticeDataManager />}
        {tab === 'tests' && <TestManager />}
      </div>
    </div>
  );
}

// ==================== 通用编辑弹窗 ====================
function EditModal({ title, fields, data, onChange, onSave, onClose, loading }) {
  const useGrid = fields.length >= 4;
  
  const handleFieldChange = (key, rawValue, fieldOnChange) => {
    let value = rawValue;
    const numKeys = ['school_id', 'class_id', 'article_id', 'sort_order', 'duration', 'is_local', 'enabled'];
    if (numKeys.includes(key) && rawValue !== '') {
      value = Number(rawValue);
    }
    const newData = { ...data, [key]: value };
    onChange(newData);
    if (fieldOnChange) fieldOnChange(value);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal edit-modal" style={{ padding: '20px 24px' }}>
        <h2>{title}</h2>
        <div className="edit-modal-fields" style={useGrid ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' } : undefined}>
          {fields.map(f => (
            <div className="form-group" key={f.key} style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={data[f.key] ?? ''}
                  onChange={e => handleFieldChange(f.key, e.target.value, f.onChange)}
                >
                  <option value="">{f.placeholder || '请选择'}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={data[f.key] || ''} onChange={e => onChange({ ...data, [f.key]: e.target.value })} placeholder={f.placeholder} rows={4} />
              ) : f.type === 'color' ? (
                <div className="color-picker-wrap" onClick={() => { const inp = document.getElementById(`color-input-${f.key}`); if (inp) inp.click(); }}>
                  <span className="color-swatch" style={{ background: data[f.key] || '#FF6B6B' }} />
                  <input id={`color-input-${f.key}`} type="color" value={data[f.key] || '#FF6B6B'} onChange={e => onChange({ ...data, [f.key]: e.target.value })} />
                  <span className="color-hex">{data[f.key] || '#FF6B6B'}</span>
                </div>
              ) : (
                <input type={f.type || 'text'} value={data[f.key] || ''} onChange={e => {
                  const val = f.type === 'number' ? Number(e.target.value) : e.target.value;
                  onChange({ ...data, [f.key]: val });
                }} placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
        <div className="edit-modal-actions">
          <button className="btn btn-primary" onClick={onSave} disabled={loading}>
            {loading ? '保存中...' : '💾 保存'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 卡片管理 ====================
function CardManager() {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', icon: '📚', color: '#FF6B6B', link: '', is_local: false, local_path: '', sort_order: 0 });
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => adminApi('/admin/cards').then(setCards).catch(() => {});
  useEffect(() => { load(); }, []);

  const randomColor = () => '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');

  const add = async () => {
    if (!form.title) return;
    await adminApi('/admin/cards', { method: 'POST', body: JSON.stringify(form) });
    setForm({ title: '', description: '', icon: '📚', color: randomColor(), link: '', is_local: false, local_path: '', sort_order: 0 });
    load();
  };

  const startEdit = (card) => {
    setEditing(card.id);
    setEditData({ ...card });
  };

  const saveEdit = async () => {
    setSaving(true);
    await adminApi(`/admin/cards/${editing}`, { method: 'PUT', body: JSON.stringify(editData) });
    setSaving(false);
    setEditing(null);
    setEditData(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('确定删除？')) return;
    await adminApi(`/admin/cards/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h3>📇 导航卡片管理</h3>
      <div className="admin-form">
        <input placeholder="标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input placeholder="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <input placeholder="图标(emoji)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} style={{ width: 100 }} />
        <div className="color-picker-wrap" onClick={() => document.getElementById('color-input-form')?.click()}>
          <span className="color-swatch" style={{ background: form.color }} />
          <input id="color-input-form" type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
          <span className="color-hex">{form.color}</span>
        </div>
        <input placeholder="链接" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
        <select value={form.is_local ? '1' : '0'} onChange={e => setForm({ ...form, is_local: e.target.value === '1' })}>
          <option value="0">外部链接</option>
          <option value="1">本地应用</option>
        </select>
        {form.is_local && <input placeholder="本地路径" value={form.local_path} onChange={e => setForm({ ...form, local_path: e.target.value })} />}
        <input placeholder="排序" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} style={{ width: 80 }} />
        <button className="btn btn-primary btn-small" onClick={add}>添加</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>标题</th><th>图标</th><th>类型</th><th>链接</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {cards.map(c => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td style={{ fontSize: '1.5em' }}>{c.icon}</td>
              <td>{c.is_local ? '本地' : '外部'}</td>
              <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.is_local ? c.local_path : c.link}
              </td>
              <td>{c.sort_order}</td>
              <td>{c.enabled ? '✅ 启用' : '❌ 禁用'}</td>
              <td>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => startEdit(c)}>✏️ 编辑</button>
                <button className="btn btn-danger btn-small" onClick={() => remove(c.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && editData && (
        <EditModal
          title="编辑卡片"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onClose={() => { setEditing(null); setEditData(null); }}
          loading={saving}
          fields={[
            { key: 'title', label: '标题', placeholder: '标题' },
            { key: 'description', label: '描述', placeholder: '描述' },
            { key: 'icon', label: '图标(emoji)', placeholder: '📚' },
            { key: 'color', label: '颜色', type: 'color' },
            { key: 'link', label: '链接', placeholder: 'https://...' },
            { key: 'local_path', label: '本地路径', placeholder: '/typing' },
            { key: 'sort_order', label: '排序', placeholder: '0', type: 'number' },
            { key: 'is_local', label: '类型', type: 'select', options: [{ value: 0, label: '外部链接' }, { value: 1, label: '本地应用' }] },
            { key: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '禁用' }] },
          ]}
        />
      )}
    </div>
  );
}

// ==================== 学校管理 ====================
function SchoolManager() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => adminApi('/admin/schools').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name) return;
    await adminApi('/admin/schools', { method: 'POST', body: JSON.stringify({ name }) });
    setName('');
    load();
  };

  const startEdit = (school) => {
    setEditing(school.id);
    setEditData({ ...school });
  };

  const saveEdit = async () => {
    setSaving(true);
    await adminApi(`/admin/schools/${editing}`, { method: 'PUT', body: JSON.stringify(editData) });
    setSaving(false);
    setEditing(null);
    setEditData(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('确定删除该学校？将同时删除相关班级和学生！')) return;
    await adminApi(`/admin/schools/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h3>🏫 学校管理</h3>
      <div className="admin-form">
        <input placeholder="学校名称" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary btn-small" onClick={add}>添加学校</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>学校名称</th><th>操作</th></tr></thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => startEdit(s)}>✏️ 编辑</button>
                <button className="btn btn-danger btn-small" onClick={() => remove(s.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && editData && (
        <EditModal
          title="编辑学校"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onClose={() => { setEditing(null); setEditData(null); }}
          loading={saving}
          fields={[{ key: 'name', label: '学校名称', placeholder: '学校名称' }]}
        />
      )}
    </div>
  );
}

// ==================== 班级管理 ====================
function ClassManager() {
  const [items, setItems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState('');
  const [batchNames, setBatchNames] = useState('');
  const [batchSchoolId, setBatchSchoolId] = useState('');
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    adminApi('/admin/classes').then(setItems).catch(() => {});
    adminApi('/admin/schools').then(setSchools).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!schoolId || !name) return;
    await adminApi('/admin/classes', { method: 'POST', body: JSON.stringify({ school_id: parseInt(schoolId), name }) });
    setName('');
    load();
  };

  const batchAdd = async () => {
    if (!batchSchoolId || !batchNames) return;
    await adminApi('/admin/classes/batch', { method: 'POST', body: JSON.stringify({ school_id: parseInt(batchSchoolId), names: batchNames }) });
    setBatchNames('');
    load();
  };

  const startEdit = (cls) => {
    setEditing(cls.id);
    setEditData({ ...cls, school_id: cls.school_id });
  };

  const saveEdit = async () => {
    setSaving(true);
    await adminApi(`/admin/classes/${editing}`, { method: 'PUT', body: JSON.stringify({ school_id: Number(editData.school_id), name: editData.name }) });
    setSaving(false);
    setEditing(null);
    setEditData(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('确定删除该班级？将同时删除相关学生！')) return;
    await adminApi(`/admin/classes/${id}`, { method: 'DELETE' });
    load();
  };

  const schoolOptions = schools.map(s => ({ value: s.id, label: s.name }));

  return (
    <div>
      <h3>📚 班级管理</h3>
      <div className="admin-form">
        <select value={schoolId} onChange={e => setSchoolId(e.target.value)}>
          <option value="">选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input placeholder="班级名称" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary btn-small" onClick={add}>添加班级</button>
      </div>
      <div className="admin-form" style={{ marginTop: 8 }}>
        <select value={batchSchoolId} onChange={e => setBatchSchoolId(e.target.value)}>
          <option value="">选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <textarea placeholder="批量导入（每行一个班级名称）" value={batchNames} onChange={e => setBatchNames(e.target.value)} />
        <button className="btn btn-primary btn-small" onClick={batchAdd}>批量导入</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>学校</th><th>班级</th><th>操作</th></tr></thead>
        <tbody>
          {items.map(c => (
            <tr key={c.id}>
              <td>{c.school_name}</td>
              <td>{c.name}</td>
              <td>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => startEdit(c)}>✏️ 编辑</button>
                <button className="btn btn-danger btn-small" onClick={() => remove(c.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && editData && (
        <EditModal
          title="编辑班级"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onClose={() => { setEditing(null); setEditData(null); }}
          loading={saving}
          fields={[
            { key: 'school_id', label: '所属学校', type: 'select', options: schoolOptions },
            { key: 'name', label: '班级名称', placeholder: '班级名称' },
          ]}
        />
      )}

    </div>
  );
}

// ==================== 学生管理 ====================
function StudentManager() {
  const [items, setItems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [name, setName] = useState('');
  const [batchNames, setBatchNames] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editSchools, setEditSchools] = useState([]);
  const [editClasses, setEditClasses] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    adminApi('/admin/schools').then(setSchools).catch(() => {});
    adminApi('/admin/classes').then(setAllClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (schoolId) {
      adminApi(`/admin/classes/${schoolId}`).then(data => {
        setClasses(Array.isArray(data) ? data : []);
      }).catch(() => setClasses([]));
      setClassId('');
    }
  }, [schoolId]);

  const load = () => {
    const params = filterClassId ? `?class_id=${filterClassId}` : '';
    adminApi(`/admin/students${params}`).then(setItems).catch(() => {});
  };
  useEffect(() => { load(); }, [filterClassId]);

  const add = async () => {
    if (!schoolId || !classId || !name) return;
    await adminApi('/admin/students', { method: 'POST', body: JSON.stringify({ school_id: parseInt(schoolId), class_id: parseInt(classId), name }) });
    setName('');
    load();
  };

  const batchAdd = async () => {
    if (!schoolId || !classId || !batchNames) return;
    await adminApi('/admin/students/batch', { method: 'POST', body: JSON.stringify({ school_id: parseInt(schoolId), class_id: parseInt(classId), names: batchNames }) });
    setBatchNames('');
    load();
  };

  const startEdit = (stu) => {
    setEditing(stu.id);
    setEditData({ ...stu, school_id: Number(stu.school_id), class_id: Number(stu.class_id) });
    setEditSchools([...schools]);
    const filteredClasses = allClasses.filter(c => Number(c.school_id) === Number(stu.school_id));
    setEditClasses(filteredClasses);
  };

  const handleEditSchoolChange = (sid) => {
    const sidNum = Number(sid);
    const filteredClasses = allClasses.filter(c => Number(c.school_id) === sidNum);
    setEditClasses(filteredClasses);
    setEditData(prev => ({ ...prev, school_id: sidNum, class_id: '' }));
  };

  const saveEdit = async () => {
    setSaving(true);
    await adminApi(`/admin/students/${editing}`, {
      method: 'PUT',
      body: JSON.stringify({ school_id: Number(editData.school_id), class_id: Number(editData.class_id), name: editData.name })
    });
    setSaving(false);
    setEditing(null);
    setEditData(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('确定删除？')) return;
    await adminApi(`/admin/students/${id}`, { method: 'DELETE' });
    load();
  };

  const syncDingtalk = async () => {
    if (!confirm('从钉钉家校通讯录拉取学校/班级/学生并写入后台？已存在的不会重复添加。')) return;
    setSyncing(true);
    try {
      const r = await adminApi('/admin/sync/dingtalk', { method: 'POST' });
      alert(`同步完成：扫描 ${r.classCount} 个班级，新增学校 ${r.schools} 个、班级 ${r.classes} 个、学生 ${r.students} 名。`);
      load();
      adminApi('/admin/schools').then(setSchools).catch(() => {});
      adminApi('/admin/classes').then(setAllClasses).catch(() => {});
    } catch (e) {
      alert('同步失败：' + e.message);
    }
    setSyncing(false);
  };

  return (
    <div>
      <h3>👦 学生管理</h3>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-primary btn-small" onClick={syncDingtalk} disabled={syncing}>
          {syncing ? '⏳ 同步中...' : '🔄 从钉钉同步通讯录'}
        </button>
        <span style={{ marginLeft: 10, fontSize: '0.85em', color: '#888' }}>
          从钉钉家校通讯录拉取学校、班级、学生（按名称去重，不覆盖已有数据）
        </span>
      </div>
      <div className="admin-form">
        <select value={schoolId} onChange={e => setSchoolId(e.target.value)}>
          <option value="">选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!schoolId}>
          <option value="">选择班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="学生姓名" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary btn-small" onClick={add}>添加</button>
      </div>
      <div className="admin-form" style={{ marginTop: 8 }}>
        <textarea placeholder="批量导入（每行一个姓名）" value={batchNames} onChange={e => setBatchNames(e.target.value)} />
        <button className="btn btn-primary btn-small" onClick={batchAdd}>批量导入</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>筛选班级：</label>
        <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)}>
          <option value="">全部</option>
          {allClasses.length > 0 ? allClasses.map(c => <option key={c.id} value={c.id}>{c.school_name} - {c.name}</option>) : null}
        </select>
      </div>
      <table className="admin-table">
        <thead><tr><th>学校</th><th>班级</th><th>姓名</th><th>操作</th></tr></thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id}>
              <td>{s.school_name}</td>
              <td>{s.class_name}</td>
              <td>{s.name}</td>
              <td>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => startEdit(s)}>✏️ 编辑</button>
                <button className="btn btn-danger btn-small" onClick={() => remove(s.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && editData && (
        <EditModal
          title="编辑学生"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onClose={() => { setEditing(null); setEditData(null); }}
          loading={saving}
          fields={[
            {
              key: 'school_id',
              label: '学校',
              type: 'select',
              options: editSchools.map(s => ({ value: s.id, label: s.name })),
              onChange: handleEditSchoolChange,
            },
            {
              key: 'class_id',
              label: '班级',
              type: 'select',
              options: editClasses.map(c => ({ value: c.id, label: c.name })),
            },
            { key: 'name', label: '姓名', placeholder: '学生姓名' },
          ]}
        />
      )}
    </div>
  );
}

// ==================== 文章管理 ====================
function ArticleManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', type: 'chinese', difficulty: 'easy' });
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => adminApi('/admin/articles').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title || !form.content) return;
    await adminApi('/admin/articles', { method: 'POST', body: JSON.stringify(form) });
    setForm({ title: '', content: '', type: 'chinese', difficulty: 'easy' });
    load();
  };

  const startEdit = (article) => {
    setEditing(article.id);
    setEditData({ ...article });
  };

  const saveEdit = async () => {
    setSaving(true);
    await adminApi(`/admin/articles/${editing}`, { method: 'PUT', body: JSON.stringify(editData) });
    setSaving(false);
    setEditing(null);
    setEditData(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('确定删除？')) return;
    await adminApi(`/admin/articles/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h3>📄 文章管理</h3>
      <div className="admin-form">
        <input placeholder="标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          <option value="chinese">中文</option>
          <option value="english">英文</option>
        </select>
        <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        <textarea placeholder="文章内容" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
        <button className="btn btn-primary btn-small" onClick={add}>添加文章</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>标题</th><th>类型</th><th>难度</th><th>内容</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.type === 'chinese' ? '中文' : '英文'}</td>
              <td>{a.difficulty === 'easy' ? '简单' : a.difficulty === 'medium' ? '中等' : '困难'}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</td>
              <td>{a.enabled ? '✅' : '❌'}</td>
              <td>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => startEdit(a)}>✏️ 编辑</button>
                <button className="btn btn-danger btn-small" onClick={() => remove(a.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && editData && (
        <EditModal
          title="编辑文章"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onClose={() => { setEditing(null); setEditData(null); }}
          loading={saving}
          fields={[
            { key: 'title', label: '标题', placeholder: '文章标题' },
            { key: 'type', label: '类型', type: 'select', options: [{ value: 'chinese', label: '中文' }, { value: 'english', label: '英文' }] },
            { key: 'difficulty', label: '难度', type: 'select', options: [{ value: 'easy', label: '简单' }, { value: 'medium', label: '中等' }, { value: 'hard', label: '困难' }] },
            { key: 'content', label: '内容', type: 'textarea', placeholder: '文章内容' },
            { key: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '禁用' }] },
          ]}
        />
      )}
    </div>
  );
}

// ==================== 练习数据管理 ====================
function PracticeDataManager() {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  // 文章筛选
  const [articles, setArticles] = useState([]);
  const [filterArticleId, setFilterArticleId] = useState('');
  // 测试结果管理
  const [resultEditing, setResultEditing] = useState(null);
  const [resultEditData, setResultEditData] = useState(null);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultForm, setResultForm] = useState({ student_name: '', class_name: '', wpm: 0, accuracy: 0, correct_chars: 0, total_chars: 0, duration_seconds: 0, completed: 0 });
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = useCallback(async (p, ps, articleId) => {
    setLoading(true);
    try {
      let url = `/admin/practices/results?page=${p}&pageSize=${ps}`;
      if (articleId) url += `&articleId=${articleId}`;
      const r = await adminApi(url);
      setResults(r.data);
      setTotal(r.total);
      setPage(r.page);
      setPageSize(r.pageSize);
      setSelectedIds(new Set());
    } catch (err) {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    adminApi('/admin/articles').then(setArticles).catch(() => {});
    loadData(1, pageSize);
  }, []);

  const handlePageSizeChange = (newSize) => {
    const newPageSize = parseInt(newSize);
    setPageSize(newPageSize);
    loadData(1, newPageSize, filterArticleId);
  };

  const handleArticleFilter = (articleId) => {
    setFilterArticleId(articleId);
    loadData(1, pageSize, articleId);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条练习数据？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      await adminApi('/admin/practices/results/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
    } catch (err) {
      alert('删除失败：' + err.message);
    }
    setDeleting(false);
    loadData(page, pageSize, filterArticleId);
  };

  const totalPages = Math.ceil(total / pageSize);

  const exportCSV = () => {
    if (results.length === 0) return;
    const BOM = '\uFEFF';
    let csv = BOM + '文章标题,学生姓名,学校,班级,速度(字/分),正确率(%),提交时间\n';
    results.forEach((r) => {
      csv += `${r.article_title || '-'},${r.student_name},${r.school_name},${r.class_name},${r.wpm},${r.accuracy}%,${r.created_at}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `练习数据_第${page}页.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3>📊 练习数据管理</h3>
      <p style={{ color: '#636e72', marginBottom: 12, fontSize: '0.9em' }}>
        查看所有学生的练习数据，按提交时间倒序排列
      </p>
      <div className="admin-form" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9em', color: '#636e72' }}>筛选文章：</span>
        <select value={filterArticleId} onChange={e => handleArticleFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">全部文章</option>
          {articles.map(a => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.9em', color: '#636e72' }}>每页显示：</span>
        <select value={pageSize} onChange={e => handlePageSizeChange(e.target.value)} style={{ width: 100 }}>
          <option value={50}>50 条</option>
          <option value={100}>100 条</option>
          <option value={200}>200 条</option>
          <option value={300}>300 条</option>
          <option value={500}>500 条</option>
        </select>
        <span style={{ fontSize: '0.9em', color: '#636e72' }}>共 {total} 条数据</span>
        {results.length > 0 && (
          <button className="btn btn-secondary btn-small" onClick={exportCSV}>📥 导出当前页CSV</button>
        )}
      </div>
      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : results.length === 0 ? (
        <div className="empty-state">暂无练习数据</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: '0.9em', color: '#636e72' }}>
              {selectedIds.size > 0 ? `已选 ${selectedIds.size} 条` : '未选择'}
            </span>
            {selectedIds.size > 0 && (
              <button
                className="btn btn-danger btn-small"
                onClick={batchDelete}
                disabled={deleting}
              >{deleting ? '删除中...' : `🗑️ 批量删除 (${selectedIds.size})`}</button>
            )}
          </div>
          <table className="admin-table">
            <thead><tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={selectedIds.size === results.length && results.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>文章</th><th>学生</th><th>学校</th><th>班级</th><th>速度</th><th>正确率</th><th>时间</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} style={selectedIds.has(r.id) ? { background: '#fff3cd' } : {}}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                  </td>
                  <td>{r.article_title || '-'}</td>
                  <td>{r.student_name}</td>
                  <td>{r.school_name}</td>
                  <td>{r.class_name}</td>
                  <td>{r.wpm} 字/分</td>
                  <td>{r.accuracy}%</td>
                  <td>{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary btn-small"
                disabled={page <= 1}
                onClick={() => loadData(page - 1, pageSize, filterArticleId)}
              >◀ 上一页</button>
              <span style={{ fontSize: '0.9em', color: '#636e72' }}>
                第 {page} / {totalPages} 页
              </span>
              <button
                className="btn btn-secondary btn-small"
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1, pageSize, filterArticleId)}
              >下一页 ▶</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==================== 测试管理 ====================
function TestManager() {
  const [items, setItems] = useState([]);
  const [articles, setArticles] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [form, setForm] = useState({ title: '', article_id: '', class_id: '', test_code: '', duration: 300, school_id: '' });
  const [viewResults, setViewResults] = useState(null);
  const [results, setResults] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editSchools, setEditSchools] = useState([]);
  const [editClasses, setEditClasses] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  // 测试结果管理
  const [resultEditing, setResultEditing] = useState(null);
  const [resultEditData, setResultEditData] = useState(null);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultForm, setResultForm] = useState({ student_name: '', class_name: '', wpm: 0, accuracy: 0, correct_chars: 0, total_chars: 0, duration_seconds: 0, completed: 0 });
  const [showAddForm, setShowAddForm] = useState(false);

  const load = () => {
    adminApi('/admin/tests').then(data => { setItems(data); setSelectedIds(new Set()); }).catch(() => {});
    adminApi('/admin/articles').then(setArticles).catch(() => {});
    adminApi('/admin/schools').then(setSchools).catch(() => {});
    adminApi('/admin/classes').then(setAllClasses).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (form.school_id) {
      adminApi(`/admin/classes/${form.school_id}`).then(data => {
        setClasses(Array.isArray(data) ? data : []);
      }).catch(() => setClasses([]));
      setForm(f => ({ ...f, class_id: '' }));
    }
  }, [form.school_id]);

  const add = async () => {
    if (!form.title || !form.article_id || !form.class_id || !form.test_code) return;
    await adminApi('/admin/tests', {
      method: 'POST',
      body: JSON.stringify({ ...form, article_id: parseInt(form.article_id), class_id: parseInt(form.class_id), duration: parseInt(form.duration) })
    });
    setForm({ title: '', article_id: '', class_id: '', test_code: '', duration: 300, school_id: '' });
    load();
  };

  const startEdit = (test) => {
    setEditing(test.id);
    setEditData({ ...test, article_id: Number(test.article_id), class_id: Number(test.class_id), school_id: Number(test.school_id), duration: Number(test.duration), enabled: Number(test.enabled) });
    setEditSchools([...schools]);
    const filteredClasses = allClasses.filter(c => Number(c.school_id) === Number(test.school_id) || Number(c.id) === Number(test.class_id));
    setEditClasses(filteredClasses);
  };

  const handleEditSchoolChange = (sid) => {
    const sidNum = Number(sid);
    const filteredClasses = allClasses.filter(c => Number(c.school_id) === sidNum);
    setEditClasses(filteredClasses);
    setEditData(prev => ({ ...prev, school_id: sidNum, class_id: '' }));
  };

  const saveEdit = async () => {
    setSaving(true);
    await adminApi(`/admin/tests/${editing}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: editData.title,
        article_id: Number(editData.article_id),
        class_id: Number(editData.class_id),
        test_code: editData.test_code,
        duration: Number(editData.duration),
        enabled: editData.enabled,
      })
    });
    setSaving(false);
    setEditing(null);
    setEditData(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('确定删除该测试及其所有结果数据？')) return;
    await adminApi(`/admin/tests/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(t => t.id)));
    }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个测试及其所有结果数据？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      await adminApi('/admin/tests/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
    } catch (err) {
      alert('删除失败：' + err.message);
    }
    setDeleting(false);
    load();
  };

  const viewTestResults = async (testId) => {
    const r = await adminApi(`/admin/tests/${testId}/results/detail`);
    setResults(r);
    setViewResults(testId);
    setShowAddForm(false);
    setResultEditing(null);
  };

  // 测试结果 - 新增
  const addResult = async () => {
    if (!resultForm.student_name) return;
    setResultSaving(true);
    await adminApi(`/admin/tests/${viewResults}/results`, {
      method: 'POST',
      body: JSON.stringify(resultForm)
    });
    setResultSaving(false);
    setShowAddForm(false);
    setResultForm({ student_name: '', class_name: '', wpm: 0, accuracy: 0, correct_chars: 0, total_chars: 0, duration_seconds: 0, completed: 0 });
    viewTestResults(viewResults);
  };

  // 测试结果 - 编辑
  const startEditResult = (r) => {
    setResultEditing(r.id);
    setResultEditData({ ...r });
  };

  const saveEditResult = async () => {
    setResultSaving(true);
    await adminApi(`/admin/tests/results/${resultEditing}`, {
      method: 'PUT',
      body: JSON.stringify(resultEditData)
    });
    setResultSaving(false);
    setResultEditing(null);
    setResultEditData(null);
    viewTestResults(viewResults);
  };

  // 测试结果 - 删除
  const deleteResult = async (id) => {
    if (!confirm('确定删除这条测试结果？')) return;
    await adminApi(`/admin/tests/results/${id}`, { method: 'DELETE' });
    viewTestResults(viewResults);
  };

  const articleOptions = articles.map(a => ({ value: a.id, label: `${a.title} (${a.type === 'chinese' ? '中文' : '英文'})` }));

  return (
    <div>
      <h3>📋 测试管理</h3>
      <div className="admin-form">
        <input placeholder="测试标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <select value={form.school_id} onChange={e => setForm({ ...form, school_id: e.target.value })}>
          <option value="">选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} disabled={!form.school_id}>
          <option value="">选择班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={form.article_id} onChange={e => setForm({ ...form, article_id: e.target.value })}>
          <option value="">选择文章</option>
          {articles.map(a => <option key={a.id} value={a.id}>{a.title} ({a.type === 'chinese' ? '中文' : '英文'})</option>)}
        </select>
        <input placeholder="测试码" value={form.test_code} onChange={e => setForm({ ...form, test_code: e.target.value })} />
        <input placeholder="时长(秒)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ width: 100 }} />
        <button className="btn btn-primary btn-small" onClick={add}>创建测试</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: '0.9em', color: '#636e72' }}>
          {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : '未选择'}
        </span>
        {selectedIds.size > 0 && (
          <button
            className="btn btn-danger btn-small"
            onClick={batchDelete}
            disabled={deleting}
          >{deleting ? '删除中...' : `🗑️ 批量删除 (${selectedIds.size})`}</button>
        )}
      </div>
      <table className="admin-table">
        <thead><tr>
          <th style={{ width: 40 }}>
            <input type="checkbox" checked={selectedIds.size === items.length && items.length > 0} onChange={toggleSelectAll} />
          </th>
          <th>标题</th><th>文章</th><th>班级</th><th>测试码</th><th>时长</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {items.map(t => (
            <tr key={t.id} style={selectedIds.has(t.id) ? { background: '#fff3cd' } : {}}>
              <td>
                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
              </td>
              <td>{t.title}</td>
              <td>{t.article_title}</td>
              <td>{t.school_name} - {t.class_name}</td>
              <td><code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>{t.test_code}</code></td>
              <td>{Math.floor(t.duration / 60)}分{t.duration % 60}秒</td>
              <td>{t.enabled ? '✅' : '❌'}</td>
              <td>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => startEdit(t)}>✏️ 编辑</button>
                <button className="btn btn-secondary btn-small" style={{ marginRight: 4 }} onClick={() => viewTestResults(t.id)}>📊 结果</button>
                <button className="btn btn-danger btn-small" onClick={() => remove(t.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && editData && (
        <EditModal
          title="编辑测试"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onClose={() => { setEditing(null); setEditData(null); }}
          loading={saving}
          fields={[
            { key: 'title', label: '测试标题', placeholder: '标题' },
            {
              key: 'school_id',
              label: '学校',
              type: 'select',
              options: editSchools.map(s => ({ value: s.id, label: s.name })),
              onChange: handleEditSchoolChange,
            },
            {
              key: 'class_id',
              label: '班级',
              type: 'select',
              options: editClasses.map(c => ({ value: c.id, label: c.name })),
            },
            { key: 'article_id', label: '文章', type: 'select', options: articleOptions },
            { key: 'test_code', label: '测试码', placeholder: '测试码' },
            { key: 'duration', label: '时长(秒)', placeholder: '300', type: 'number' },
            { key: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '禁用' }] },
          ]}
        />
      )}

      {viewResults && (
        <div className="modal-overlay" onClick={() => { setViewResults(null); setResultEditing(null); setShowAddForm(false); }}>
          <div className="modal" style={{ maxWidth: 900, padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>📊 测试结果管理</h3>
              <span style={{ color: '#636e72', fontSize: '0.8em' }}>共 {results.length} 条</span>
            </div>

            {/* 新增表单 */}
            {!showAddForm ? (
              <button className="btn btn-primary btn-small" style={{ marginBottom: 8, padding: '3px 10px', fontSize: '0.8em' }} onClick={() => setShowAddForm(true)}>➕ 新增结果</button>
            ) : (
              <div style={{ background: '#f8f9fa', padding: '8px 10px', borderRadius: 6, marginBottom: 8, fontSize: '0.85em' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>学生姓名*</label><input value={resultForm.student_name} onChange={e => setResultForm({ ...resultForm, student_name: e.target.value })} placeholder="姓名" style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>班级</label><input value={resultForm.class_name} onChange={e => setResultForm({ ...resultForm, class_name: e.target.value })} placeholder="班级" style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>速度(字/分)</label><input type="number" value={resultForm.wpm} onChange={e => setResultForm({ ...resultForm, wpm: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>正确率(%)</label><input type="number" value={resultForm.accuracy} onChange={e => setResultForm({ ...resultForm, accuracy: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>正确字数</label><input type="number" value={resultForm.correct_chars} onChange={e => setResultForm({ ...resultForm, correct_chars: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>总字数</label><input type="number" value={resultForm.total_chars} onChange={e => setResultForm({ ...resultForm, total_chars: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>用时(秒)</label><input type="number" value={resultForm.duration_seconds} onChange={e => setResultForm({ ...resultForm, duration_seconds: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '0.75em', color: '#636e72', marginBottom: 2 }}>完成</label><select value={resultForm.completed} onChange={e => setResultForm({ ...resultForm, completed: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }}><option value={1}>是</option><option value={0}>否</option></select></div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn btn-primary btn-small" style={{ padding: '2px 10px', fontSize: '0.8em' }} onClick={addResult} disabled={resultSaving}>{resultSaving ? '...' : '保存'}</button>
                  <button className="btn btn-secondary btn-small" style={{ padding: '2px 10px', fontSize: '0.8em' }} onClick={() => { setShowAddForm(false); setResultForm({ student_name: '', class_name: '', wpm: 0, accuracy: 0, correct_chars: 0, total_chars: 0, duration_seconds: 0, completed: 0 }); }}>取消</button>
                </div>
              </div>
            )}

            {results.length === 0 ? (
              <div className="empty-state">暂无测试结果</div>
            ) : (
              <>
                <table className="ranking-table" style={{ fontSize: '0.85em' }}>
                  <thead><tr><th style={{ width: 30 }}>#</th><th>学生</th><th>班级</th><th style={{ width: 70 }}>速度</th><th style={{ width: 60 }}>正确率</th><th style={{ width: 65 }}>正确/总</th><th style={{ width: 55 }}>用时</th><th style={{ width: 120 }}>完成时间</th><th style={{ width: 40 }}>✔</th><th style={{ width: 60 }}>操作</th></tr></thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id} style={{ ...(resultEditing === r.id ? { background: '#e3f2fd' } : {}), fontSize: '0.85em' }}>
                        <td>{i + 1}</td>
                        <td>{r.student_name}</td>
                        <td>{r.class_name}</td>
                        <td>{r.wpm}</td>
                        <td>{r.accuracy}%</td>
                        <td>{r.correct_chars}/{r.total_chars}</td>
                        <td>{r.duration_seconds != null ? `${Math.floor(r.duration_seconds / 60)}'${r.duration_seconds % 60}"` : '-'}</td>
                        <td style={{ fontSize: '0.8em', whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                        <td style={{ textAlign: 'center' }}>{r.completed ? '✅' : '❌'}</td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button className="btn btn-secondary" style={{ padding: '1px 5px', fontSize: '0.75em', marginRight: 2 }} onClick={() => startEditResult(r)}>✏️</button>
                          <button className="btn btn-danger" style={{ padding: '1px 5px', fontSize: '0.75em' }} onClick={() => deleteResult(r.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <a
                    href={`${API_BASE}/admin/tests/${viewResults}/results/export`}
                    className="btn btn-secondary btn-small"
                    style={{ textDecoration: 'none', flex: 1, textAlign: 'center', padding: '4px 10px', fontSize: '0.85em' }}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      const token = getAdminToken();
                      if (!token) {
                        e.preventDefault();
                        alert('请先登录管理员账号');
                        return;
                      }
                      e.currentTarget.href = `${API_BASE}/admin/tests/${viewResults}/results/export?token=${encodeURIComponent(token)}`;
                    }}
                  >📥 导出CSV</a>
                  <button className="btn btn-secondary btn-small" style={{ flex: 1, padding: '4px 10px', fontSize: '0.85em' }} onClick={() => { setViewResults(null); setResultEditing(null); setShowAddForm(false); }}>关闭</button>
                </div>
              </>
            )}
            {results.length === 0 && (
              <button className="btn btn-secondary btn-small" style={{ marginTop: 10 }} onClick={() => { setViewResults(null); setResultEditing(null); setShowAddForm(false); }}>关闭</button>
            )}

            {/* 编辑弹窗 */}
            {resultEditing && resultEditData && (
              <div className="modal-overlay" onClick={() => { setResultEditing(null); setResultEditData(null); }}>
                <div className="modal edit-modal" style={{ padding: '16px 20px', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ margin: '0 0 10px' }}>编辑测试结果</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.85em' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>学生姓名</label><input value={resultEditData.student_name || ''} onChange={e => setResultEditData({ ...resultEditData, student_name: e.target.value })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>班级</label><input value={resultEditData.class_name || ''} onChange={e => setResultEditData({ ...resultEditData, class_name: e.target.value })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>速度(字/分)</label><input type="number" value={resultEditData.wpm || 0} onChange={e => setResultEditData({ ...resultEditData, wpm: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>正确率(%)</label><input type="number" value={resultEditData.accuracy || 0} onChange={e => setResultEditData({ ...resultEditData, accuracy: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>正确字数</label><input type="number" value={resultEditData.correct_chars || 0} onChange={e => setResultEditData({ ...resultEditData, correct_chars: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>总字数</label><input type="number" value={resultEditData.total_chars || 0} onChange={e => setResultEditData({ ...resultEditData, total_chars: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>用时(秒)</label><input type="number" value={resultEditData.duration_seconds || 0} onChange={e => setResultEditData({ ...resultEditData, duration_seconds: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.8em' }}>完成状态</label><select value={resultEditData.completed} onChange={e => setResultEditData({ ...resultEditData, completed: Number(e.target.value) })} style={{ padding: '3px 6px', fontSize: '0.85em' }}><option value={1}>已完成</option><option value={0}>未完成</option></select></div>
                  </div>
                  <div className="edit-modal-actions" style={{ marginTop: 10 }}>
                    <button className="btn btn-primary btn-small" style={{ padding: '3px 12px', fontSize: '0.85em' }} onClick={saveEditResult} disabled={resultSaving}>{resultSaving ? '保存中...' : '💾 保存'}</button>
                    <button className="btn btn-secondary btn-small" style={{ padding: '3px 12px', fontSize: '0.85em' }} onClick={() => { setResultEditing(null); setResultEditData(null); }}>取消</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 主应用 ====================
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/typing" element={<TypingHome />} />
        <Route path="/typing/practice/:id" element={<TypingEditor />} />
        <Route path="/typing/test/:id" element={<TypingEditor />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </AuthProvider>
  );
}
