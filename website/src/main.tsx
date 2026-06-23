import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Archive,
  BookOpenCheck,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  DatabaseZap,
  Download,
  Eye,
  FileJson,
  Gauge,
  Github,
  Images,
  Layers3,
  Lock,
  Rocket,
  ScanLine,
  Sparkles,
  TimerReset,
  Wand2
} from 'lucide-react';
import './styles.css';

const repoUrl = 'https://github.com/sky271801/mistake-notebook';
const releaseUrl = `${repoUrl}/releases`;

const features = [
  {
    icon: <Camera />,
    title: '拍题即入库',
    text: '相册多选和拍照导入都支持，题目图、答案图分开管理，适合整理试卷、作业和练习册。'
  },
  {
    icon: <TimerReset />,
    title: '复习自动排期',
    text: '按「忘了、吃力、记住、很熟」记录结果，系统自动计算下一次复习时间。'
  },
  {
    icon: <Images />,
    title: '图片级复盘',
    text: '支持预览、放大和拖动查看，保留原题细节，也能写下答案、启发和错误原因。'
  },
  {
    icon: <DatabaseZap />,
    title: '离线优先',
    text: '数据保存在手机本地 IndexedDB，没有后端账号负担，通勤、晚自习和断网场景都能用。'
  }
];

const timeline = [
  { label: '导入', value: '多图 / 拍照', icon: <ScanLine /> },
  { label: '归因', value: '科目 + 错因', icon: <Layers3 /> },
  { label: '回看', value: '日历排期', icon: <CalendarClock /> },
  { label: '巩固', value: '四档反馈', icon: <BookOpenCheck /> }
];

const stats = [
  { value: '100%', label: '本地保存' },
  { value: '4 档', label: '复习反馈' },
  { value: '5 个', label: '核心视图' },
  { value: 'JSON', label: '备份恢复' }
];

const highlights = [
  '导入草稿自动保存，退出后还能继续整理',
  '科目、错因、题源支持自定义快捷项',
  '复习日历展示未来安排，高考倒计时常驻提醒',
  '本地 JSON 备份，Android 端可调起系统分享面板'
];

function LandingPage() {
  return (
    <main className="site-shell">
      <FloatingNav />
      <section className="hero-section" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="signal-chip">
              <Sparkles size={16} />
              离线优先的智能错题中枢
            </span>
            <h1>错题本</h1>
            <p className="hero-lede">
              把每一次失分变成下一次命中的坐标。拍照导入题目、记录答案启发、自动安排复习节奏，
              让高强度备考也有清晰仪表盘。
            </p>
            <div className="hero-actions">
              <a className="primary-cta" href={releaseUrl}>
                <Download size={19} />
                获取 Android 版
              </a>
              <a className="secondary-cta" href={repoUrl}>
                <Github size={19} />
                查看源码
              </a>
            </div>
            <div className="hero-proof" aria-label="产品指标">
              {stats.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="section-strip" id="workflow">
        <div className="section-head">
          <span>Learning Pipeline</span>
          <h2>从拍下错题到再次掌握，流程只有一条线。</h2>
        </div>
        <div className="timeline-grid">
          {timeline.map((item, index) => (
            <article className="timeline-card" key={item.label}>
              <div className="timeline-index">0{index + 1}</div>
              <div className="timeline-icon">{item.icon}</div>
              <h3>{item.label}</h3>
              <p>{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="section-head">
          <span>Core Systems</span>
          <h2>不是简单相册，是围绕复习结果运转的学习系统。</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-section">
        <div className="console-panel">
          <div className="console-top">
            <span />
            <span />
            <span />
          </div>
          <div className="console-grid">
            <div>
              <span className="console-kicker">Review Engine</span>
              <h2>复习反馈会改变下一次出现的时间。</h2>
              <p>
                你不需要手动推算间隔。每一道题都会携带阶段、难度和下次复习时间，
                今天该看的内容会自动浮到最前面。
              </p>
            </div>
            <div className="signal-list">
              {highlights.map((item) => (
                <div key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="privacy-section" id="privacy">
        <div className="privacy-copy">
          <span>Privacy First</span>
          <h2>错题、答案和图片默认只在你的设备里。</h2>
          <p>
            应用没有后端数据库，核心数据保存在手机 WebView 的 IndexedDB。
            需要迁移时再导出 JSON 备份，学习资料不必先经过云端。
          </p>
        </div>
        <div className="privacy-grid">
          <article>
            <Lock />
            <h3>本地数据</h3>
            <p>错题、图片、分类和复习记录都以本地数据模型保存。</p>
          </article>
          <article>
            <FileJson />
            <h3>可迁移备份</h3>
            <p>导出包含文字、设置、复习记录和图片 data URL 的 JSON 文件。</p>
          </article>
          <article>
            <Archive />
            <h3>长期沉淀</h3>
            <p>已掌握题目可归档，画廊仍能检索和复盘历史。</p>
          </article>
        </div>
      </section>

      <section className="final-cta" id="download">
        <div>
          <span>Ready for Launch</span>
          <h2>让下一轮复习开始得更精准。</h2>
          <p>现在就把错题本放进你的备考工具链。</p>
        </div>
        <a className="primary-cta" href={releaseUrl}>
          <Rocket size={19} />
          前往下载
          <ChevronRight size={18} />
        </a>
      </section>
    </main>
  );
}

function FloatingNav() {
  return (
    <nav className="floating-nav" aria-label="主导航">
      <a className="brand-mark" href="#top" aria-label="错题本首页">
        <Wand2 size={19} />
        <span>错题本</span>
      </a>
      <div className="nav-links">
        <a href="#workflow">流程</a>
        <a href="#features">功能</a>
        <a href="#privacy">隐私</a>
      </div>
      <a className="nav-download" href={releaseUrl}>
        <Download size={17} />
        下载
      </a>
    </nav>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual" aria-label="错题本应用界面预览">
      <div className="orbit-ring ring-one" />
      <div className="orbit-ring ring-two" />
      <div className="phone-frame">
        <div className="phone-status">
          <span>21:48</span>
          <span>5G</span>
        </div>
        <div className="app-top">
          <div>
            <span>星期二</span>
            <strong>今日复习</strong>
          </div>
          <b>12 待复习</b>
        </div>
        <div className="exam-card">
          <span>高考倒计时</span>
          <strong>347 天</strong>
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="mistake-preview">
          <div className="preview-head">
            <span>函数零点错题</span>
            <Eye size={16} />
          </div>
          <div className="scan-card">
            <div className="scan-line" />
            <p>f(x)=ln x - ax</p>
            <small>求参数 a 的取值范围</small>
          </div>
          <div className="tag-row">
            <span>数学</span>
            <span>概念不清</span>
            <span>试卷</span>
          </div>
          <div className="review-row">
            <button>忘了</button>
            <button>吃力</button>
            <button>记住</button>
            <button>很熟</button>
          </div>
        </div>
        <div className="tab-dock">
          <Gauge />
          <Camera />
          <CalendarClock />
        </div>
      </div>
      <div className="floating-metric metric-a">
        <span>Next</span>
        <strong>06.27</strong>
      </div>
      <div className="floating-metric metric-b">
        <span>Accuracy</span>
        <strong>+18%</strong>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
