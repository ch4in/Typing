import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';

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
    api('/schools').then(setSchools).catch(() => {});
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
  const { user } = useAuth();
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
      const ranking = await api(`/tests/${t.id}/ranking`);
      setTestRanking(ranking);
      setTestMyResult(null);
    } catch (err) {
      setTestRanking([]);
      setTestMyResult(null);
    }
  };

  const handlePracticeRank = async (article, e) => {
    e.stopPropagation();
    setShowPracticeRank(article);
    try {
      const ranking = await api(`/articles/${article.id}/ranking`);
      setPracticeRanking(ranking);
    } catch (err) {
      setPracticeRanking([]);
    }
  };

  return (
    <div className="typing-page">
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
            <button className={`filter-btn ${filter === 'chinese' ? 'active' : ''}`} onClick={() => setFilter('chinese')}>🇨🇳 中文</button>
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
                  <span className="article-arrow">▶</span>
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
                  <span>📄 {t.article_title}</span>
                  <span>⏱ {Math.floor(t.duration / 60)}分{t.duration % 60}秒</span>
                  {t.completed ? (
                    <span className="test-completed-badge">✅ 已完成</span>
                  ) : null}
                </div>
              </div>
              <div className="test-item-actions">
                <button className="btn btn-secondary btn-small" onClick={(e) => handleViewRank(t, e)} title="查看排名">🏆 排名</button>
                <span className="test-arrow">{t.completed ? '🏆' : '▶'}</span>
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
            navigate(`/typing/test/${showTestRank.id}`);
          }}
        />
      )}

      {showPracticeRank && (
        <PracticeRankModal
          article={showPracticeRank}
          ranking={practiceRanking}
          onClose={() => { setShowPracticeRank(null); setPracticeRanking([]); }}
          onStart={() => {
            setShowPracticeRank(null);
            setPracticeRanking([]);
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
  const userRank = ranking.findIndex(r => r.student_name === myResult?.student_name) + 1;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <h2>🏆 {test.title}</h2>
        <p style={{ color: '#636e72', marginBottom: 12, fontSize: '0.9em' }}>
          📄 {test.article_title} · ⏱ {Math.floor(test.duration / 60)}分{test.duration % 60}秒
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
                {userRank > 0 ? `#${userRank}` : '-'}
              </div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>排名</div>
            </div>
          </div>
        )}
        {ranking.length > 0 ? (
          <table className="ranking-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>速度</th>
                <th>正确率</th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 20).map((r, i) => (
                <tr key={i} className={r.student_name === myResult?.student_name ? 'my-rank' : ''}>
                  <td>
                    {i < 3 ? (
                      <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                    ) : i + 1}
                  </td>
                  <td>{r.student_name}</td>
                  <td>{r.wpm} 字/分</td>
                  <td>{r.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">暂无排名数据</div>
        )}
        <div style={{ marginTop: 15, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={onRetry}>🔄 重新测试</button>
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 练习排名弹窗 ====================
function PracticeRankModal({ article, ranking, onClose, onStart }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <h2>🏆 {article.title}</h2>
        <p style={{ color: '#636e72', marginBottom: 12, fontSize: '0.9em' }}>
          📝 {article.type === 'chinese' ? '中文' : '英文'} · {article.difficulty === 'easy' ? '简单' : article.difficulty === 'medium' ? '中等' : '困难'} · {article.content.length} 字
        </p>
        {ranking.length > 0 ? (
          <table className="ranking-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>学校</th>
                <th>速度</th>
                <th>正确率</th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 20).map((r, i) => (
                <tr key={r.id || i}>
                  <td>
                    {i < 3 ? (
                      <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                    ) : i + 1}
                  </td>
                  <td>{r.student_name}</td>
                  <td>{r.school_name}</td>
                  <td>{r.wpm} 字/分</td>
                  <td>{r.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
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

  const processInput = useCallback((text) => {
    if (!text) return;
    if (finishedRef.current) return;

    // 如果已经输入到最后一个字，不再追加新内容到打字框
    if (articleRef.current && inputRef.current.length >= articleRef.current.content.length) {
      return;
    }

    if (!startedRef.current) {
      setStarted(true);
      startedRef.current = true;
      startTimeRef.current = Date.now();
    }

    // 截断多余输入，只取到文章内容长度
    const maxLen = articleRef.current ? articleRef.current.content.length : Infinity;
    const allowedText = text.slice(0, maxLen - inputRef.current.length);
    if (!allowedText) return;

    const newInput = inputRef.current + allowedText;
    inputRef.current = newInput;
    setInput(newInput);
    calculateStatsRef.current(newInput);

    // 检查是否全部正确完成
    if (articleRef.current && newInput.length >= articleRef.current.content.length) {
      const content = articleRef.current.content;
      let allCorrect = true;
      for (let i = 0; i < content.length; i++) {
        if (newInput[i] !== content[i]) {
          allCorrect = false;
          break;
        }
      }
      if (allCorrect) {
        finishTypingRef.current();
      }
    }
  }, []);

  const calculateStatsRef = React.useRef((currentInput) => {
    if (!articleRef.current) return;
    const content = articleRef.current.content;
    let correct = 0;
    const newErrors = new Set();
    for (let i = 0; i < currentInput.length; i++) {
      if (i < content.length && currentInput[i] === content[i]) {
        correct++;
      } else {
        newErrors.add(i);
      }
    }
    const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
    const wpm = elapsed > 0 ? Math.round(correct / elapsed) : 0;
    const accuracy = currentInput.length > 0 ? Math.round((correct / currentInput.length) * 100) : 100;
    setStats({ wpm, accuracy, correct, total: currentInput.length });
    setErrors(newErrors);
    setCharIndex(currentInput.length);
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

    const handleCompositionEnd = (e) => {
      composingRef.current = false;
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
    hiddenInput.addEventListener('compositionend', handleCompositionEnd);
    hiddenInput.addEventListener('keydown', handleKeyDown);
    hiddenInput.addEventListener('blur', handleBlur);

    return () => {
      hiddenInput.removeEventListener('input', handleInput);
      hiddenInput.removeEventListener('compositionstart', handleCompositionStart);
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
    let correct = 0;
    for (let i = 0; i < Math.min(currentInput.length, content.length); i++) {
      if (currentInput[i] === content[i]) correct++;
    }
    const wpm = elapsed > 0 ? Math.round(correct / (elapsed / 60)) : 0;
    const accuracy = currentInput.length > 0 ? Math.round((correct / currentInput.length) * 100) : 100;
    const result = { wpm, accuracy, correctChars: correct, totalChars: currentInput.length, durationSeconds: Math.round(elapsed) };
    setResults(result);
    setShowResult(true);

    if (user) {
      try {
        if (isTest) {
          await api('/tests/submit', {
            method: 'POST',
            body: JSON.stringify({ testId: parseInt(id), ...result, completed: 1 })
          });
          const r = await api(`/tests/${id}/ranking`);
          setRanking(r);
          const mr = await api(`/tests/${id}/my-result`);
          setMyResult(mr);
        } else {
          // 练习模式提交练习结果
          await api('/practice/submit', {
            method: 'POST',
            body: JSON.stringify({ articleId: parseInt(id), ...result })
          });
          const r = await api(`/articles/${id}/ranking`);
          setRanking(r);
        }
      } catch (err) {}
    }
  });

  const renderArticle = () => {
    if (!article) return null;
    const chars = article.content.split('');

    return chars.map((char, idx) => {
      let cls = 'char pending';
      if (idx < charIndex) {
        cls = errors.has(idx) ? 'char incorrect' : 'char correct';
      } else if (idx === charIndex) {
        cls = 'char current';
      }
      const isSpace = char === ' ';
      if (isSpace) {
        cls += ' special-space';
      }
      return <span key={idx} className={cls}>
        {isSpace ? <span className="space-indicator">␣</span> : char}
      </span>;
    });
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

  // 自动滚动到当前正在输入的字符位置
  // 使用 useLayoutEffect 在 DOM 更新后立即执行，避免闪烁
  React.useLayoutEffect(() => {
    if (!article || !containerRef.current) return;
    
    const currentChar = document.querySelector('.article-display .char.current');
    if (!currentChar) return;

    const charRect = currentChar.getBoundingClientRect();
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

      <div className="status-bar">
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
          <div className="status-value">{stats.correct}/{article.content.length}</div>
          <div className="status-label">✅ 进度</div>
        </div>
      </div>
      <div className="typing-progress-wrapper">
        <div className="typing-progress-bar">
          <div className="typing-progress-fill" style={{ width: `${article.content.length > 0 ? Math.min(100, (charIndex / article.content.length) * 100) : 0}%` }} />
        </div>
        <div className="status-label">
          {!started ? '⌨️ 开始输入' : finished ? '✅ 完成' : '⌨️ 输入中...'}
        </div>
      </div>

      <h3 style={{ marginBottom: 12, color: '#636e72' }}>
        {isTest ? '🏆 测试' : '📝 练习'}：{article.title}
      </h3>

      <div className="article-display" onClick={() => {
        if (hiddenInputRef.current) {
          hiddenInputRef.current.focus({ preventScroll: true });
        }
      }}>
        {renderArticle()}
      </div>

      {/* 隐藏的输入框放在文章下方，避免focus时页面跳回顶部 */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="hidden-typing-input"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
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

  const userRank = ranking.findIndex(r => r.student_name === myResult?.student_name) + 1;

  return (
    <div className="modal-overlay result-modal">
      <div className="modal">
        <div className="result-icon">{getEmoji()}</div>
        <h2>{isTest ? '测试完成！' : '练习完成！'}</h2>
        <p style={{ color: '#636e72', marginBottom: 15 }}>{getComment()}</p>

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

        {ranking.length > 0 && (
          <div className="ranking-section" style={{ marginTop: 15, textAlign: 'left' }}>
            <h3>🏆 {isTest ? '班级排行' : '练习排行'}</h3>
            {isTest && userRank > 0 && (
              <p style={{ fontSize: '0.85em', color: '#636e72', marginBottom: 8 }}>
                你的排名：第 <strong style={{ color: '#FF6B6B' }}>{userRank}</strong> 名
              </p>
            )}
            {!isTest && (
              <p style={{ fontSize: '0.85em', color: '#636e72', marginBottom: 8 }}>
                所有完成此练习的学生排名
              </p>
            )}
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>姓名</th>
                  {!isTest && <th>学校</th>}
                  <th>班级</th>
                  <th>速度</th>
                  <th>正确率</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 20).map((r, i) => (
                  <tr key={i} className={isTest && r.student_name === myResult?.student_name ? 'my-rank' : ''}>
                    <td>
                      {i < 3 ? (
                        <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      ) : i + 1}
                    </td>
                    <td>{r.student_name}</td>
                    {!isTest && <td>{r.school_name}</td>}
                    <td>{r.class_name}</td>
                    <td>{r.wpm} 字/分</td>
                    <td>{r.accuracy}%</td>
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

  const add = async () => {
    if (!form.title) return;
    await adminApi('/admin/cards', { method: 'POST', body: JSON.stringify(form) });
    setForm({ title: '', description: '', icon: '📚', color: '#FF6B6B', link: '', is_local: false, local_path: '', sort_order: 0 });
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
        <input placeholder="颜色" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: 100 }} />
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
            { key: 'color', label: '颜色', placeholder: '#FF6B6B' },
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

  return (
    <div>
      <h3>👦 学生管理</h3>
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

  const loadData = useCallback(async (p, ps) => {
    setLoading(true);
    try {
      const r = await adminApi(`/admin/practices/results?page=${p}&pageSize=${ps}`);
      setResults(r.data);
      setTotal(r.total);
      setPage(r.page);
      setPageSize(r.pageSize);
    } catch (err) {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(1, pageSize);
  }, []);

  const handlePageSizeChange = (newSize) => {
    const newPageSize = parseInt(newSize);
    setPageSize(newPageSize);
    loadData(1, newPageSize);
  };

  const totalPages = Math.ceil(total / pageSize);

  const exportCSV = () => {
    if (results.length === 0) return;
    const BOM = '\uFEFF';
    let csv = BOM + '序号,文章标题,学生姓名,学校,班级,速度(字/分),正确率(%),提交时间\n';
    results.forEach((r, i) => {
      csv += `${(page - 1) * pageSize + i + 1},${r.article_title || '-'},${r.student_name},${r.school_name},${r.class_name},${r.wpm},${r.accuracy}%,${r.created_at}\n`;
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
          <table className="admin-table">
            <thead><tr><th>序号</th><th>文章</th><th>学生</th><th>学校</th><th>班级</th><th>速度</th><th>正确率</th><th>时间</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id}>
                  <td>{(page - 1) * pageSize + i + 1}</td>
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
                onClick={() => loadData(page - 1, pageSize)}
              >◀ 上一页</button>
              <span style={{ fontSize: '0.9em', color: '#636e72' }}>
                第 {page} / {totalPages} 页
              </span>
              <button
                className="btn btn-secondary btn-small"
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1, pageSize)}
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

  const load = () => {
    adminApi('/admin/tests').then(setItems).catch(() => {});
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
    if (!confirm('确定删除？')) return;
    await adminApi(`/admin/tests/${id}`, { method: 'DELETE' });
    load();
  };

  const viewTestResults = async (testId) => {
    const r = await adminApi(`/admin/tests/${testId}/results`);
    setResults(r);
    setViewResults(testId);
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

      <table className="admin-table">
        <thead><tr><th>标题</th><th>文章</th><th>班级</th><th>测试码</th><th>时长</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {items.map(t => (
            <tr key={t.id}>
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
        <div className="modal-overlay" onClick={() => setViewResults(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3>📊 测试结果</h3>
            {results.length === 0 ? (
              <div className="empty-state">暂无测试结果</div>
            ) : (
              <table className="ranking-table">
                <thead><tr><th>排名</th><th>学生</th><th>班级</th><th>速度</th><th>正确率</th><th>完成</th></tr></thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.student_name}</td>
                      <td>{r.class_name}</td>
                      <td>{r.wpm} 字/分</td>
                      <td>{r.accuracy}%</td>
                      <td>{r.completed ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn btn-secondary" style={{ marginTop: 15 }} onClick={() => setViewResults(null)}>关闭</button>
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
