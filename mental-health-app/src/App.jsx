import React, { useEffect, useMemo, useState, useCallback, useContext, createContext, useRef } from 'react';
import './index.css';

/**********************
 * Lightweight Router *
 **********************/
const RouterContext = createContext({ path: '/', navigate: (p) => {} });

function useHashRouter() {
  const [path, setPath] = useState(() => window.location.hash.replace('#', '') || '/');
  useEffect(() => {
    const onHashChange = () => setPath(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = useCallback((to) => {
    if (!to.startsWith('/')) to = '/' + to;
    window.location.hash = to;
  }, []);
  return { path, navigate };
}

function Router({ children }) {
  const router = useHashRouter();
  return (
    <RouterContext.Provider value={router}>{children}</RouterContext.Provider>
  );
}

function Route({ path, children }) {
  const { path: current } = useContext(RouterContext);
  if (current === path) return children;
  return null;
}

function Link({ to, className, children, onClick }) {
  const { navigate } = useContext(RouterContext);
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/*****************
 * Theme Context *
 *****************/
const ThemeContext = createContext(null);
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
function useTheme() { const ctx = useContext(ThemeContext); if (!ctx) throw new Error('useTheme in provider'); return ctx; }

/****************
 * I18n Context *
 ****************/
const I18nContext = createContext(null);
const dict = {
  en: { crisis: 'Crisis', hotlines: 'Emergency hotlines', grounding: 'Grounding exercises', coping: 'Coping steps' },
  es: { crisis: 'Crisis', hotlines: 'Líneas de emergencia', grounding: 'Ejercicios de anclaje', coping: 'Pasos de afrontamiento' },
};
function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  useEffect(() => localStorage.setItem('lang', lang), [lang]);
  const t = useCallback((k) => (dict[lang]?.[k] ?? dict.en[k] ?? k), [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}
function useI18n() { const ctx = useContext(I18nContext); if (!ctx) throw new Error('useI18n in provider'); return ctx; }

/*************************
 * Mock Auth Provider Stubs
 *************************/
const AuthContext = createContext(null);

function createFakeDelay(result, ms = 500) {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms));
}

function useProvideAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signInWithEmailLink = useCallback(async (email) => {
    setLoading(true); setError(null);
    try {
      await createFakeDelay(true);
      const u = { id: 'uid_123', email, nickname: 'Explorer', token: 'mock-token' };
      setUser(u); localStorage.setItem('user', JSON.stringify(u));
      return true;
    } catch (e) {
      setError('Failed to send magic link');
      return false;
    } finally { setLoading(false); }
  }, []);

  const signInWithPhoneOtp = useCallback(async (phone, otp) => {
    setLoading(true); setError(null);
    try {
      await createFakeDelay(true);
      const u = { id: 'uid_234', phone, nickname: 'Friend', token: 'mock-token' };
      setUser(u); localStorage.setItem('user', JSON.stringify(u));
      return true;
    } catch (e) {
      setError('Invalid or expired OTP');
      return false;
    } finally { setLoading(false); }
  }, []);

  const signUpWithEmailPassword = useCallback(async ({ email, password, nickname, consents }) => {
    setLoading(true); setError(null);
    try {
      await createFakeDelay(true);
      const u = { id: 'uid_345', email, nickname, consents, token: 'mock-token' };
      setUser(u); localStorage.setItem('user', JSON.stringify(u));
      return true;
    } catch (e) {
      setError('Sign-up failed');
      return false;
    } finally { setLoading(false); }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setLoading(true); setError(null);
    try {
      await createFakeDelay(true);
      return true;
    } catch (e) {
      setError('Failed to send reset email');
      return false;
    } finally { setLoading(false); }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null); localStorage.removeItem('user');
  }, []);

  return { user, loading, error, signInWithEmailLink, signInWithPhoneOtp, signUpWithEmailPassword, forgotPassword, signOut };
}

function AuthProvider({ children }) {
  const value = useProvideAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**********************
 * Toasts (global)    *
 **********************/
const ToastContext = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (<div key={t.id} className="toast">{t.msg}</div>))}
      </div>
    </ToastContext.Provider>
  );
}
function useToast() { const ctx = useContext(ToastContext); if (!ctx) throw new Error('useToast in provider'); return ctx; }

/**********************
 * Local storage utils *
 **********************/
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

/****************
 * Mood Context *
 ****************/
const MoodContext = createContext(null);
function MoodProvider({ children }) {
  const [entries, setEntries] = useState(() => storage.get('entries', []));
  const addEntry = useCallback((entry) => {
    const list = [...entries, entry];
    setEntries(list); storage.set('entries', list);
  }, [entries]);
  const todayKey = new Date().toISOString().slice(0,10);
  const todayEntry = entries.find((e) => (e.date || '').slice(0,10) === todayKey);
  const suggestion = useMemo(() => {
    const last = entries[entries.length - 1];
    if (!last || !last.mood) return 'Take a deep breath. A 2-minute mindfulness break can reset your day.';
    if (last.mood <= 2) return 'Consider a short walk outside and hydrate. Fresh air can lift low moods.';
    if (last.mood === 3) return 'Write a quick gratitude note. Noticing small wins builds momentum.';
    return 'You seem upbeat. Channel it into a small habit: 5-minute stretch or message a friend.';
  }, [entries]);
  return <MoodContext.Provider value={{ entries, addEntry, todayEntry, suggestion }}>{children}</MoodContext.Provider>;
}
function useMood() { const ctx = useContext(MoodContext); if (!ctx) throw new Error('useMood in provider'); return ctx; }

/*******************
 * Journal Context  *
 *******************/
const JournalContext = createContext(null);

// WebCrypto helpers
function strToBuf(s) { return new TextEncoder().encode(s); }
function bufToStr(b) { return new TextDecoder().decode(b); }
function b64ToBuf(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function bufToB64(buf) { let s = ''; const b = new Uint8Array(buf); for (let i=0;i<b.length;i++) s += String.fromCharCode(b[i]); return btoa(s); }

async function deriveKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey('raw', strToBuf(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(passphrase, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, strToBuf(plaintext));
  return { iv: bufToB64(iv), salt: bufToB64(salt), ciphertext: bufToB64(ct) };
}

async function decryptText(passphrase, { iv, salt, ciphertext }) {
  const key = await deriveKey(passphrase, b64ToBuf(salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(iv) }, key, b64ToBuf(ciphertext));
  return bufToStr(pt);
}

function JournalProvider({ children }) {
  const [entries, setEntries] = useState(() => storage.get('journalEntries', []));
  const [passphrase, setPassphrase] = useState('');

  const addEntry = useCallback(async (entry, encrypt) => {
    let payload = { ...entry };
    if (encrypt) {
      if (!passphrase) throw new Error('Passphrase required for encryption');
      const enc = await encryptText(passphrase, entry.note || '');
      payload = { ...entry, note: undefined, encrypted: true, enc };
    }
    const list = [...entries, payload];
    setEntries(list); storage.set('journalEntries', list);
  }, [entries, passphrase]);

  const decryptNote = useCallback(async (entry) => {
    if (!entry.encrypted) return entry.note;
    if (!passphrase) throw new Error('Passphrase required to decrypt');
    try { return await decryptText(passphrase, entry.enc); } catch { return 'Unable to decrypt'; }
  }, [passphrase]);

  return (
    <JournalContext.Provider value={{ entries, addEntry, setPassphrase, passphrase, decryptNote }}>
      {children}
    </JournalContext.Provider>
  );
}
function useJournal() { const ctx = useContext(JournalContext); if (!ctx) throw new Error('useJournal in provider'); return ctx; }

/*********************
 * Community Context *
 *********************/
const CommunityContext = createContext(null);
function CommunityProvider({ children }) {
  const [threads, setThreads] = useState(() => storage.get('threads', [
    { id:1, title:'How do you do daily check-ins?', preview:'I started using 3 emojis to quickly tag my mood...', content:'...', anonymous:true, author:'Anon', createdAt: new Date().toISOString() },
    { id:2, title:'7-day walk challenge', preview:'Join me for 7 days of short walks. It helps my anxiety a lot.', content:'...', anonymous:false, author:'Kai', createdAt: new Date().toISOString() },
  ]));
  useEffect(()=>{ storage.set('threads', threads); }, [threads]);
  const addThread = useCallback((t) => setThreads((arr) => [t, ...arr]), []);
  return <CommunityContext.Provider value={{ threads, addThread }}>{children}</CommunityContext.Provider>;
}
function useCommunity() { const ctx = useContext(CommunityContext); if (!ctx) throw new Error('useCommunity in provider'); return ctx; }

/*****************
 * UI Components *
 *****************/
function SkipLink() {
  return <a href="#main" className="skip-link">Skip to content</a>;
}

function Navbar({ onOpenCrisis }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <header className="navbar">
      <SkipLink />
      <div className="container nav-inner">
        <div className="brand">
          <button className="btn subtle burger" aria-label="Toggle menu" onClick={()=>setOpen(o=>!o)}>☰</button>
          <span className="brand-logo" aria-hidden>🌿</span>
          <span className="brand-name">MindfulSpace</span>
        </div>
        <nav className={`nav-actions ${open? 'open' : ''}`}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/checkin" className="nav-link">Check-in</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/journal" className="nav-link">Journal</Link>
          <Link to="/community" className="nav-link">Community</Link>
          <Link to="/caregiver" className="nav-link">Caregiver</Link>
          <Link to="/admin" className="nav-link">Admin</Link>
          <Link to="/legal" className="nav-link">Legal</Link>
          <button className="btn subtle" title="Toggle theme" onClick={toggle}>{theme === 'dark' ? '🌙' : '☀️'}</button>
          <select aria-label="Language" className="input" value={lang} onChange={(e)=>setLang(e.target.value)} style={{ width: 70, padding:'6px 10px' }}>
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
          <button className="btn crisis" onClick={onOpenCrisis}>Crisis</button>
          {user ? (
            <div className="user-controls">
              <span className="user-pill">Hi, {user.nickname || user.email || 'Friend'}</span>
              <button className="btn subtle" onClick={signOut}>Sign Out</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn ghost">Login</Link>
              <Link to="/signup" className="btn primary">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-logo" aria-hidden>🌿</span>
          <span className="brand-name">MindfulSpace</span>
        </div>
        <p className="muted">Your safe space to track, reflect, and heal.</p>
        <p className="tiny">© {new Date().getFullYear()} MindfulSpace. All rights reserved.</p>
      </div>
    </footer>
  );
}

function CTAButton({ children, onClick, to, variant = 'primary' }) {
  const content = (
    <button className={`btn ${variant}`} onClick={onClick}>
      <span className="btn-glow" aria-hidden />
      {children}
    </button>
  );
  if (to) return <Link to={to} className={`btn ${variant}`}>{children}</Link>;
  return content;
}

function HeroCard() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <h1 className="headline">MindfulSpace</h1>
          <p className="tagline">Your safe space to track, reflect, and heal</p>
          <div className="hero-ctas">
            <CTAButton to="/signup">Get Started</CTAButton>
            <CTAButton to="/login" variant="ghost">I have an account</CTAButton>
          </div>
          <div className="hero-stats">
            <Stat label="Daily check-ins" value="12k+" />
            <Stat label="Journal entries" value="350k+" />
            <Stat label="Community members" value="50k+" />
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="orb orb-lg" />
          <div className="orb orb-md" />
          <div className="orb orb-sm" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card feature">
      <div className="feature-icon" aria-hidden>{icon}</div>
      <div className="feature-content">
        <h3>{title}</h3>
        <p className="muted">{desc}</p>
      </div>
    </div>
  );
}

function Testimonials() {
  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">What people say</h2>
        <div className="grid three">
          <Testimonial quote="I finally have a gentle routine to check-in with myself." author="Amara" />
          <Testimonial quote="The mood tracker helped me notice patterns I never saw before." author="Kai" />
          <Testimonial quote="The community makes me feel less alone in my journey." author="Nova" />
        </div>
      </div>
    </section>
  );
}

function Testimonial({ quote, author }) {
  return (
    <div className="card testimonial">
      <p>“{quote}”</p>
      <div className="tiny muted">— {author}</div>
    </div>
  );
}

function LoadingSpinner({ label = 'Loading' }) {
  return (
    <div className="spinner" role="status" aria-live="polite" aria-label={label}>
      <div className="dot" /><div className="dot" /><div className="dot" />
    </div>
  );
}

function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className="error" role="alert">{message}</div>;
}

function FormInput({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
      />
    </label>
  );
}

function AuthButton({ children, loading }) {
  return (
    <button className="btn primary wide" disabled={loading}>
      {loading ? <LoadingSpinner label="Loading" /> : children}
    </button>
  );
}

/****************
 * Accessible Modal
 ****************/
function Modal({ open, onClose, titleId, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    const prev = document.activeElement;
    const focusable = el?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable?.[0];
    first?.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      if (e.key === 'Tab' && focusable && focusable.length) {
        const arr = Array.from(focusable);
        const idx = arr.indexOf(document.activeElement);
        if (e.shiftKey && idx === 0) { e.preventDefault(); arr[arr.length-1].focus(); }
        else if (!e.shiftKey && idx === arr.length -1) { e.preventDefault(); arr[0].focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); prev && prev.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(e)=>{ if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="card form-card" ref={ref} style={{ width:'min(960px, 95vw)' }}>
        {children}
      </div>
    </div>
  );
}

/****************
 * Landing Page *
 ****************/
function LandingPage() {
  return (
    <main id="main">
      <HeroCard />
      <section className="section">
        <div className="container">
          <h2 className="section-title">Built for gentle growth</h2>
          <div className="grid four">
            <FeatureCard icon="📍" title="Check-ins" desc="Quick daily check-ins to ground yourself and spot trends." />
            <FeatureCard icon="🌈" title="Mood tracker" desc="Visualize your emotional landscape over time." />
            <FeatureCard icon="📝" title="Journaling" desc="Reflect safely with private or guided prompts." />
            <FeatureCard icon="🤝" title="Community" desc="Connect with others who understand and support." />
          </div>
        </div>
      </section>
      <Testimonials />
      <CtaBand />
    </main>
  );
}

function CtaBand() {
  return (
    <section className="cta-band">
      <div className="container cta-inner">
        <h3>Ready to begin your mindful journey?</h3>
        <div className="cta-actions">
          <CTAButton to="/signup">Create your space</CTAButton>
          <CTAButton to="/login" variant="ghost">I already have an account</CTAButton>
        </div>
      </div>
    </section>
  );
}

/**************
 * Legal Page *
 **************/
function LegalPage() {
  return (
    <main id="main" className="section">
      <div className="container">
        <h2 className="section-title">Privacy & Terms</h2>
        <div className="card">
          <p className="muted">This is a demo privacy policy placeholder. Replace with your real policy and terms.</p>
          <p className="tiny muted">We do not store PII in exports. Journal encryption uses client-side AES-GCM when a passphrase is set.</p>
        </div>
      </div>
    </main>
  );
}

/**************
 * Auth Pages *
 **************/
function LoginPage() {
  const { loading, error, signInWithEmailLink, signInWithPhoneOtp, forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState('');

  const onMagic = async (e) => {
    e.preventDefault();
    setInfo('Sending magic link...');
    const ok = await signInWithEmailLink(email);
    setInfo(ok ? 'Magic link sent. Check your inbox.' : '');
  };

  const onOtp = async (e) => {
    e.preventDefault();
    setInfo('Verifying OTP...');
    const ok = await signInWithPhoneOtp(phone, otp);
    setInfo(ok ? 'OTP verified.' : '');
  };

  const onForgot = async (e) => {
    e.preventDefault();
    setInfo('Sending reset instructions...');
    const ok = await forgotPassword(email);
    setInfo(ok ? 'Reset email sent.' : '');
  };

  return (
    <main id="main" className="section">
      <div className="container auth">
        <div className="card form-card">
          <h2>Login</h2>
          <ErrorMessage message={error} />
          {info && <div className="info" aria-live="polite">{info}</div>}

          <form onSubmit={onMagic} className="form">
            <FormInput id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
            <AuthButton loading={loading}>Send magic link</AuthButton>
          </form>

          <div className="divider"><span>or</span></div>

          <form onSubmit={onOtp} className="form">
            <FormInput id="phone" label="Phone (optional)" type="tel" value={phone} onChange={setPhone} placeholder="+1 555 000 1234" />
            <FormInput id="otp" label="OTP" type="text" value={otp} onChange={setOtp} placeholder="6-digit code" />
            <AuthButton loading={loading}>Verify OTP</AuthButton>
          </form>

          <button className="btn subtle" onClick={onForgot} disabled={!email || loading}>Forgot password</button>

          <p className="muted tiny">By logging in, you agree to our <Link to="/legal" className="link">privacy policy</Link>.</p>
        </div>
      </div>
    </main>
  );
}

function SignupPage() {
  const { loading, error, signUpWithEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentCaregiver, setConsentCaregiver] = useState(false);
  const [info, setInfo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setInfo('Creating your account...');
    const ok = await signUpWithEmailPassword({ email, password, nickname, consents: { privacy: consentPrivacy, caregiver: consentCaregiver } });
    setInfo(ok ? 'Account created. Welcome!' : '');
  };

  return (
    <main id="main" className="section">
      <div className="container auth">
        <div className="card form-card">
          <h2>Sign Up</h2>
          <ErrorMessage message={error} />
          {info && <div className="info" aria-live="polite">{info}</div>}

          <form onSubmit={onSubmit} className="form">
            <FormInput id="email-su" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
            <FormInput id="pw-su" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
            <FormInput id="nick-su" label="Nickname (optional)" value={nickname} onChange={setNickname} placeholder="How should we call you?" />

            <label className="check">
              <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} required />
              <span>I agree to the privacy policy</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={consentCaregiver} onChange={(e) => setConsentCaregiver(e.target.checked)} />
              <span>Opt-in to caregiver support (optional)</span>
            </label>

            <AuthButton loading={loading}>Create account</AuthButton>
          </form>
        </div>
      </div>
    </main>
  );
}

/*******************
 * Onboarding Flow *
 *******************/
function StepIndicator({ steps, current }) {
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={s} className={`step ${i <= current ? 'active' : ''}`}>
          <span className="bubble">{i + 1}</span>
          <span className="label">{s}</span>
        </div>
      ))}
    </div>
  );
}

function PreferenceCard({ title, desc, active, onToggle }) {
  return (
    <button type="button" className={`card preference ${active ? 'active' : ''}`} onClick={onToggle} aria-pressed={active}>
      <h4>{title}</h4>
      <p className="muted tiny">{desc}</p>
    </button>
  );
}

function MultiStepForm({ onComplete }) {
  const steps = ['Personal', 'Baseline', 'Preferences'];
  const [current, setCurrent] = useState(0);
  const [form, setForm] = useState({ nickname: '', age: '', region: '', baseline: '', reminders: true, community: true, privateJournal: true });

  const next = () => setCurrent((c) => Math.min(c + 1, steps.length - 1));
  const back = () => setCurrent((c) => Math.max(c - 1, 0));

  const submit = (e) => {
    e?.preventDefault();
    if (current < steps.length - 1) next();
    else { storage.set('onboarding', form); onComplete?.(form); }
  };

  return (
    <div className="card form-card">
      <StepIndicator steps={steps} current={current} />

      {current === 0 && (
        <form className="form" onSubmit={submit}>
          <FormInput id="nick-ob" label="Nickname" value={form.nickname} onChange={(v) => setForm({ ...form, nickname: v })} placeholder="What should we call you?" />
          <FormInput id="age-ob" label="Age" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} placeholder="Your age" />
          <FormInput id="region-ob" label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} placeholder="e.g., US, EU, NG" />
          <div className="actions">
            <button type="button" className="btn subtle" onClick={back} disabled>Back</button>
            <button type="submit" className="btn primary">Next</button>
          </div>
        </form>
      )}

      {current === 1 && (
        <form className="form" onSubmit={submit}>
          <label className="field" htmlFor="baseline">
            <span className="field-label">How have you been feeling lately?</span>
            <select id="baseline" className="input" value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })}>
              <option value="">Select an option</option>
              <option value="low">Low</option>
              <option value="neutral">Neutral</option>
              <option value="positive">Positive</option>
            </select>
          </label>
          <div className="actions">
            <button type="button" className="btn subtle" onClick={back}>Back</button>
            <button type="submit" className="btn primary">Next</button>
          </div>
        </form>
      )}

      {current === 2 && (
        <form className="form" onSubmit={submit}>
          <div className="grid three">
            <PreferenceCard title="Reminders" desc="Gentle nudges to check-in" active={form.reminders} onToggle={() => setForm({ ...form, reminders: !form.reminders })} />
            <PreferenceCard title="Community" desc="Participate and connect" active={form.community} onToggle={() => setForm({ ...form, community: !form.community })} />
            <PreferenceCard title="Private Journal" desc="Keep entries private" active={form.privateJournal} onToggle={() => setForm({ ...form, privateJournal: !form.privateJournal })} />
          </div>
          <div className="actions">
            <button type="button" className="btn subtle" onClick={back}>Back</button>
            <button type="submit" className="btn primary">Finish</button>
          </div>
        </form>
      )}
    </div>
  );
}

function OnboardingPage() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const handleComplete = (data) => {
    console.log('Onboarding data', data);
    setDone(true);
  };

  return (
    <main id="main" className="section">
      <div className="container auth">
        {done ? (
          <div className="card form-card center">
            <h2>You're all set{user?.nickname ? `, ${user.nickname}` : ''}!</h2>
            <p className="muted">Preferences saved. You can update them anytime.</p>
            <div className="actions">
              <Link to="/" className="btn primary">Go to Home</Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="page-title">Onboarding</h2>
            <MultiStepForm onComplete={handleComplete} />
          </>
        )}
      </div>
    </main>
  );
}

/**********************
 * D. Daily Check-in  *
 **********************/
const EMOJIS = [
  { v: 1, e: '😔', l: 'Low' },
  { v: 2, e: '����', l: 'Meh' },
  { v: 3, e: '😐', l: 'Neutral' },
  { v: 4, e: '🙂', l: 'Content' },
  { v: 5, e: '😄', l: 'Great' },
];

function MoodSelector({ value, onChange }) {
  return (
    <div className="grid five" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
      {EMOJIS.map(m => (
        <button key={m.v} type="button" className={`card`} onClick={() => onChange(m)} aria-pressed={value?.v === m.v} title={m.l}>
          <div style={{ fontSize: 28, textAlign: 'center' }}>{m.e}</div>
          <div className="tiny muted" style={{ textAlign: 'center', marginTop: 6 }}>{m.l}</div>
        </button>
      ))}
    </div>
  );
}

function ReflectionInput({ value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">How are you feeling?</span>
      <textarea className="input" rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Write a short reflection..." />
    </label>
  );
}

function MicroActionCheckbox({ label, checked, onChange }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SaveButton({ onClick }) {
  return <button className="btn primary" onClick={onClick}>Save check-in</button>;
}

function CheckinPage() {
  const { addEntry } = useMood();
  const { push } = useToast();
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [water, setWater] = useState(false);
  const [walk, setWalk] = useState(false);
  const [meditate, setMeditate] = useState(false);
  const [info, setInfo] = useState('');

  const save = () => {
    const now = new Date();
    const entry = { id: Date.now(), date: now.toISOString(), mood: mood?.v || null, moodLabel: mood?.l, note, actions: { water, walk, meditate } };
    addEntry(entry);
    setInfo('Check-in saved.');
    push('Check-in saved');
  };

  return (
    <main id="main" className="section">
      <div className="container auth">
        <div className="card form-card">
          <h2>Daily Check-in</h2>
          {info && <div className="info" aria-live="polite">{info}</div>}
          <div className="form">
            <MoodSelector value={mood} onChange={setMood} />
            <ReflectionInput value={note} onChange={setNote} />
            <div className="grid three">
              <MicroActionCheckbox label="Drink water" checked={water} onChange={setWater} />
              <MicroActionCheckbox label="Take a walk" checked={walk} onChange={setWalk} />
              <MicroActionCheckbox label="Meditate" checked={meditate} onChange={setMeditate} />
            </div>
            <div className="actions">
              <SaveButton onClick={save} />
              <Link to="/dashboard" className="btn ghost">Go to Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**********************
 * E. Dashboard Page  *
 **********************/
function useEntries() {
  const { entries } = useMood();
  return entries;
}

function MoodChart() {
  const entries = useEntries();
  const data = useMemo(() => entries.slice(-20).map(e => ({ x: new Date(e.date).getTime(), y: e.mood || 0 })), [entries]);
  const width = 300, height = 100, pad = 10;
  if (data.length < 2) return <div className="muted tiny">Not enough data for chart</div>;
  const minY = 0, maxY = 5;
  const minX = data[0].x, maxX = data[data.length-1].x;
  const points = data.map(({x,y}) => {
    const px = pad + (x - minX) / (maxX - minX || 1) * (width - pad*2);
    const py = height - (pad + (y - minY) / (maxY - minY) * (height - pad*2));
    return `${px},${py}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ width: '100%', maxWidth: 400 }}>
      <polyline points={points} fill="none" stroke="url(#g)" strokeWidth="2" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Heatmap() {
  const entries = useEntries();
  const map = useMemo(() => {
    const days = 28; const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0,10);
      const match = entries.find(e => (e.date || '').slice(0,10) === key);
      return { key, mood: match?.mood || 0 };
    });
  }, [entries]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {map.map((d) => (
        <div key={d.key} title={`${d.key} • mood ${d.mood || 'N/A'}`}
          style={{ height: 16, borderRadius: 4, background: d.mood === 0 ? 'rgba(255,255,255,0.06)' : `rgba(124,58,237,${0.15 + d.mood*0.15})`, border: '1px solid rgba(255,255,255,0.08)' }} />
      ))}
    </div>
  );
}

function calcStreak(entries) {
  const set = new Set(entries.map(e => (e.date || '').slice(0,10)));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0,10);
    if (set.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

function HabitCard() {
  const entries = useEntries();
  const streak = calcStreak(entries);
  return (
    <div className="card">
      <h3>Habit streak</h3>
      <p className="muted">You've checked in {streak} day{streak===1?'':'s'} in a row.</p>
    </div>
  );
}

function SuggestionCard() {
  const { suggestion } = useMood();
  return (
    <div className="card">
      <h3>Suggestion for today</h3>
      <p className="muted">{suggestion}</p>
    </div>
  );
}

function QuickCheckInButton() {
  return <Link to="/checkin" className="btn primary">Quick check-in</Link>;
}

function DashboardPage() {
  return (
    <main id="main" className="section">
      <div className="container">
        <h2 className="section-title">Dashboard</h2>
        <div className="grid three">
          <div className="card">
            <h3>Mood trend</h3>
            <MoodChart />
          </div>
          <div className="card">
            <h3>Last 4 weeks</h3>
            <Heatmap />
          </div>
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <h3>Actions</h3>
            <QuickCheckInButton />
            <SuggestionCard />
          </div>
        </div>
        <div className="section" style={{ paddingTop: 24 }}>
          <div className="grid three">
            <HabitCard />
            <div className="card"><h3>Upcoming challenges</h3><p className="muted">7-day gratitude starts Monday.</p></div>
            <div className="card"><h3>Peer activity</h3><p className="muted">Community has 132 new reflections today.</p></div>
          </div>
        </div>
      </div>
    </main>
  );
}

/*****************
 * F. Journal    *
 *****************/
function JournalEntryCard({ entry, onSelect }) {
  const d = new Date(entry.date);
  return (
    <button className="card" style={{ textAlign:'left' }} onClick={() => onSelect?.(entry)}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <strong>{d.toLocaleDateString()}</strong>
        <span title={entry.moodLabel}>{EMOJIS.find(e=>e.v===entry.mood)?.e || '—'}</span>
      </div>
      <div className="muted tiny" style={{ marginTop: 6 }}>{entry.tags?.join(', ')}</div>
      <p style={{ marginTop: 8, whiteSpace:'pre-wrap' }}>{entry.encrypted ? '•••••• encrypted ••••••' : (entry.note?.slice(0,120) || 'No content')}</p>
    </button>
  );
}

function EncryptionToggle({ value, onChange }) {
  return (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e)=>onChange(e.target.checked)} />
      <span>Encrypt this entry (client-side)</span>
    </label>
  );
}

function JournalEditor() {
  const { addEntry } = useJournal();
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [mood, setMood] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = { id: Date.now(), date: new Date().toISOString(), mood: mood?.v || null, moodLabel: mood?.l, note, tags: tags.split(',').map(t=>t.trim()).filter(Boolean) };
    try {
      await addEntry(payload, encrypted);
      setNote(''); setTags(''); setEncrypted(false); setMood(null);
    } finally { setSaving(false); }
  };

  return (
    <div className="card form-card">
      <h3>New entry</h3>
      <div className="form">
        <MoodSelector value={mood} onChange={setMood} />
        <label className="field">
          <span className="field-label">Write your thoughts</span>
          <textarea className="input" rows={6} value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Today I feel..." />
        </label>
        <FormInput id="tags" label="Tags (comma-separated)" value={tags} onChange={setTags} placeholder="e.g., gratitude, anxiety" />
        <EncryptionToggle value={encrypted} onChange={setEncrypted} />
        <div className="actions">
          <button className="btn primary" onClick={save} disabled={saving}>{saving? 'Saving...' : 'Save entry'}</button>
        </div>
      </div>
    </div>
  );
}

function JournalList({ entries, onSelect }) {
  if (!entries.length) return <div className="muted">No entries yet.</div>;
  return (
    <div className="grid three" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
      {entries.map(e => <JournalEntryCard key={e.id} entry={e} onSelect={onSelect} />)}
    </div>
  );
}

function JournalPage() {
  const { entries, setPassphrase, passphrase, decryptNote } = useJournal();
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  const sorted = useMemo(()=>[...entries].sort((a,b)=> new Date(b.date) - new Date(a.date)), [entries]);

  return (
    <main id="main" className="section">
      <div className="container">
        <h2 className="section-title">Journal</h2>
        <div className="card form-card">
          <label className="field">
            <span className="field-label">Journal passphrase (for encrypted entries)</span>
            <input className="input" type="password" value={passphrase} onChange={(e)=>setPassphrase(e.target.value)} placeholder="Enter passphrase..." />
          </label>
        </div>
        <JournalEditor />
        <div className="section" style={{ paddingTop:24 }}>
          <JournalList entries={sorted} onSelect={(e)=>{ setSelected(e); setOpen(true); }} />
        </div>
        <Modal open={open} onClose={()=>setOpen(false)} titleId="entryTitle">
          {selected && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 id="entryTitle">Entry • {new Date(selected.date).toLocaleString()}</h3>
                <button className="btn subtle" onClick={()=>setOpen(false)}>Close</button>
              </div>
              <p className="muted tiny">Mood: {EMOJIS.find(e=>e.v===selected.mood)?.e || '—'} {selected.moodLabel || ''}</p>
              <EntryBody entry={selected} decryptNote={decryptNote} />
            </>
          )}
        </Modal>
      </div>
    </main>
  );
}

function EntryBody({ entry, decryptNote }) {
  const [text, setText] = useState(entry.encrypted ? 'Decrypting...' : (entry.note || ''));
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      if (entry.encrypted) {
        const t = await decryptNote(entry);
        if (mounted) setText(t);
      }
    })();
    return ()=>{ mounted = false; };
  }, [entry, decryptNote]);
  return <div style={{ marginTop:10, whiteSpace:'pre-wrap' }}>{text}</div>;
}

/*******************
 * G. Community    *
 *******************/
function ThreadCard({ thread, onOpen }) {
  return (
    <button className="card" style={{ textAlign:'left' }} onClick={()=>onOpen?.(thread)}>
      <strong>{thread.title}</strong>
      <p className="muted tiny" style={{ marginTop:6 }}>{thread.anonymous? 'Anonymous' : thread.author}</p>
      <p style={{ marginTop:8 }}>{thread.preview}</p>
    </button>
  );
}

function GroupChallengeCard({ title, desc }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted">{desc}</p>
      <button className="btn ghost" style={{ marginTop:8 }}>Join challenge</button>
    </div>
  );
}

function PostModal({ open, onClose, onPost }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  return (
    <Modal open={open} onClose={onClose} titleId="postTitle">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 id="postTitle">New post</h3>
        <button className="btn subtle" onClick={onClose}>Close</button>
      </div>
      <div className="form">
        <FormInput id="pt" label="Title" value={title} onChange={setTitle} placeholder="What's on your mind?" />
        <label className="field">
          <span className="field-label">Content</span>
          <textarea className="input" rows={6} value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Share a thought, a question, or a win..." />
        </label>
        <label className="check"><input type="checkbox" checked={anonymous} onChange={(e)=>setAnonymous(e.target.checked)} /><span>Post anonymously</span></label>
        <div className="actions"><button className="btn primary" onClick={()=>{onPost?.({ id:Date.now(), title, preview: content.slice(0,140), content, anonymous, author:'You', createdAt: new Date().toISOString() }); onClose();}}>Post</button></div>
      </div>
    </Modal>
  );
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="actions" style={{ justifyContent:'center', marginTop: 12 }}>
      <button className="btn subtle" disabled={page<=1} onClick={()=>onChange(page-1)}>Prev</button>
      <span className="muted tiny">Page {page} of {pages}</span>
      <button className="btn subtle" disabled={page>=pages} onClick={()=>onChange(page+1)}>Next</button>
    </div>
  );
}

function CommunityPage() {
  const { threads, addThread } = useCommunity();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 6;
  const pages = Math.max(1, Math.ceil(threads.length / perPage));
  const view = threads.slice((page-1)*perPage, page*perPage);

  return (
    <main id="main" className="section">
      <div className="container">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 className="section-title">Community</h2>
          <button className="btn primary" onClick={()=>setOpen(true)}>New post</button>
        </div>
        <div className="grid three">
          {view.map(t => <ThreadCard key={t.id} thread={t} onOpen={(t)=>{ setActive(t); setViewOpen(true); }} />)}
        </div>
        <Pagination page={page} pages={pages} onChange={setPage} />
        <div className="section" style={{ paddingTop: 24 }}>
          <h3>Group challenges</h3>
          <div className="grid three">
            <GroupChallengeCard title="Gratitude week" desc="Write one gratitude per day." />
            <GroupChallengeCard title="Hydration habit" desc="Drink 6-8 glasses daily." />
            <GroupChallengeCard title="Breathe & stretch" desc="2 minutes of mindful breathing daily." />
          </div>
        </div>
        <Modal open={viewOpen} onClose={()=>setViewOpen(false)} titleId="threadTitle">
          {active && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 id="threadTitle">{active.title}</h3>
                <button className="btn subtle" onClick={()=>setViewOpen(false)}>Close</button>
              </div>
              <p className="muted tiny">{active.anonymous? 'Anonymous' : active.author} • {new Date(active.createdAt).toLocaleString()}</p>
              <p style={{ marginTop:10, whiteSpace:'pre-wrap' }}>{active.content || active.preview}</p>
            </>
          )}
        </Modal>
        <PostModal open={open} onClose={()=>setOpen(false)} onPost={(p)=>addThread(p)} />
      </div>
    </main>
  );
}

/*******************************
 * H. Caregiver / Resource Page *
 *******************************/
function ArticleCard({ title, desc }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted">{desc}</p>
      <button className="btn ghost" style={{ marginTop:8 }}>Read guide</button>
    </div>
  );
}

function VideoPlayer({ src }) {
  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ position:'relative', paddingTop:'56.25%' }}>
        <iframe title="video" src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:0 }} />
      </div>
    </div>
  );
}

function TipAccordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="card">
      <h3>Quick tips</h3>
      {items.map((it, i) => (
        <div key={i} style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 0' }}>
          <button className="btn subtle" onClick={()=>setOpen(open===i?null:i)}>{open===i? '−' : '+'} {it.title}</button>
          {open===i && <p className="muted" style={{ marginTop:8 }}>{it.body}</p>}
        </div>
      ))}
    </div>
  );
}

function CaregiverPage() {
  return (
    <main id="main" className="section">
      <div className="container">
        <h2 className="section-title">Caregiver & Resources</h2>
        <div className="grid three">
          <ArticleCard title="Supporting a teen with anxiety" desc="How to listen, validate, and guide gently." />
          <ArticleCard title="Creating routines that stick" desc="Small habits that reduce overwhelm." />
          <ArticleCard title="When to seek professional help" desc="Signs and steps to consider." />
        </div>
        <div className="section" style={{ paddingTop:24 }}>
          <h3>Explainer video</h3>
          <VideoPlayer src="https://www.youtube.com/embed/0fKBhvDjuy0" />
        </div>
        <div className="section" style={{ paddingTop:24 }}>
          <TipAccordion items={[
            { title:'If someone is in crisis', body:'Call local emergency services or the nearest crisis hotline immediately.' },
            { title:'How to start tough conversations', body:'Use open-ended questions and reflect what you hear without judgment.' },
            { title:'Encouraging healthy habits', body:'Model the habits yourself and celebrate small steps.' },
          ]} />
          <div className="actions" style={{ justifyContent:'center', marginTop:12 }}>
            <a className="btn primary" href="https://www.opencounseling.com/suicide-hotlines" target="_blank" rel="noreferrer">Crisis resources</a>
          </div>
        </div>
      </div>
    </main>
  );
}

/***********************
 * I. Crisis Modal/Page *
 ***********************/
function HotlineCard({ country, number, note }) {
  return (
    <a href={`tel:${number}`} className="card hotline">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <strong>{country}</strong>
        <span className="btn subtle">Call</span>
      </div>
      <div className="muted tiny" style={{ marginTop:6 }}>{number}</div>
      {note && <div className="tiny" style={{ marginTop:6 }}>{note}</div>}
    </a>
  );
}

function CopingStepCard({ title, desc }) {
  return (
    <div className="card">
      <strong>{title}</strong>
      <p className="muted" style={{ marginTop:6 }}>{desc}</p>
    </div>
  );
}

function BreathBox() {
  return (
    <div className="card" style={{ display:'grid', placeItems:'center', padding:24 }}>
      <div className="breath" aria-label="breathing exercise" />
      <div className="muted tiny" style={{ marginTop:8 }}>Breathe in 4s • Hold 4s • Out 4s</div>
    </div>
  );
}

function regionHotlines() {
  const region = (storage.get('onboarding', {})?.region || 'US').toUpperCase();
  const list = {
    US: [{ country:'United States', number:'988', note:'988 Suicide & Crisis Lifeline' }],
    UK: [{ country:'United Kingdom', number:'116 123', note:'Samaritans' }],
    NG: [{ country:'Nigeria', number:'0800 002 200', note:'Lifeline NG (example)' }],
    IN: [{ country:'India', number:'9152987821', note:'Kiran (24/7)' }],
    ZA: [{ country:'South Africa', number:'0800 567 567', note:'SADAG' }],
    EU: [{ country:'EU', number:'112', note:'EU emergency number' }],
  };
  return list[region] || list.US;
}

function CrisisContent() {
  const { t } = useI18n();
  const hotlines = regionHotlines();
  const { suggestion } = useMood();
  return (
    <div className="grid three">
      <div className="card">
        <h3>{t('hotlines')}</h3>
        <div className="grid three">
          {hotlines.map((h, i) => <HotlineCard key={i} {...h} />)}
        </div>
        <a className="btn primary" style={{ marginTop:10 }} href="https://www.opencounseling.com/suicide-hotlines" target="_blank" rel="noreferrer">More hotlines</a>
      </div>
      <div className="card">
        <h3>{t('grounding')}</h3>
        <BreathBox />
        <CopingStepCard title="5-4-3-2-1" desc="Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste." />
      </div>
      <div className="card">
        <h3>{t('coping')}</h3>
        <CopingStepCard title="A small step" desc={suggestion} />
        <CopingStepCard title="Reach out" desc="Text a trusted person and share one line about how you feel." />
        <CopingStepCard title="Hydrate" desc="Drink a glass of water and take 3 slow breaths." />
      </div>
    </div>
  );
}

function CrisisModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} titleId="crisisTitle">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 id="crisisTitle">Immediate Support</h3>
        <button className="btn subtle" onClick={onClose}>Close</button>
      </div>
      <div className="section" style={{ paddingTop:12 }}>
        <CrisisContent />
      </div>
    </Modal>
  );
}

function CrisisPage() {
  return (
    <main id="main" className="section">
      <div className="container">
        <h2 className="section-title">Crisis Support</h2>
        <CrisisContent />
      </div>
    </main>
  );
}

/*****************************
 * J. Admin / NGO Dashboard  *
 *****************************/
function StatsCard({ label, value }) {
  return (
    <div className="card" style={{ textAlign:'center' }}>
      <div className="stat-value" style={{ fontSize:24 }}>{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

function TrendChart({ days = 7 }) {
  const entries = useEntries();
  const buckets = useMemo(() => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0,10);
      const dayEntries = entries.filter(e => (e.date || '').slice(0,10) === key);
      const avg = dayEntries.length ? Math.round((dayEntries.reduce((s,e)=>s+(e.mood||0),0)/dayEntries.length)*10)/10 : 0;
      return { key, avg };
    });
  }, [entries, days]);
  const width = 300, height = 100, pad = 10;
  const minX = 0, maxX = buckets.length - 1;
  const points = buckets.map((b, i) => {
    const px = pad + (i - minX) / (maxX - minX || 1) * (width - pad*2);
    const py = height - (pad + (b.avg - 0) / (5 - 0) * (height - pad*2));
    return `${px},${py}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ width:'100%', maxWidth: 500 }}>
      <polyline points={points} fill="none" stroke="url(#g)" strokeWidth="2" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Filters({ value, onChange }) {
  return (
    <div className="actions" style={{ justifyContent:'flex-start' }}>
      <label className="check"><input type="radio" name="range" checked={value===7} onChange={()=>onChange(7)} /><span>7 days</span></label>
      <label className="check"><input type="radio" name="range" checked={value===30} onChange={()=>onChange(30)} /><span>30 days</span></label>
    </div>
  );
}

function ExportButton() {
  const entries = useEntries();
  const onExport = () => {
    const rows = [['date','mood','note','water','walk','meditate']].concat(entries.map(e => [e.date, e.mood ?? '', (e.note||'').replace(/\n/g,' '), e.actions?.water?1:0, e.actions?.walk?1:0, e.actions?.meditate?1:0]));
    const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'aggregated_checkins.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <button className="btn ghost" onClick={onExport}>Export CSV</button>;
}

function AdminDashboard() {
  const { entries } = useMood();
  const activeUsers = 1 + Math.floor(entries.length / 10); // placeholder metric
  const checkins = entries.length;
  const avgMood = entries.length ? (entries.reduce((s,e)=>s+(e.mood||0),0)/entries.length).toFixed(2) : '0.00';
  const [range, setRange] = useState(7);

  return (
    <main id="main" className="section">
      <div className="container">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 className="section-title">Admin / NGO Dashboard</h2>
          <ExportButton />
        </div>
        <Filters value={range} onChange={setRange} />
        <div className="grid three">
          <StatsCard label="Active users (est.)" value={activeUsers} />
          <StatsCard label="Total check-ins" value={checkins} />
          <StatsCard label="Average mood" value={avgMood} />
        </div>
        <div className="section" style={{ paddingTop:24 }}>
          <div className="card">
            <h3>Mood trend averages (last {range} days)</h3>
            <TrendChart days={range} />
          </div>
        </div>
      </div>
    </main>
  );
}

/*******************
 * K. Not Found    *
 *******************/
function NotFoundPage() {
  return (
    <main id="main" className="section">
      <div className="container" style={{ textAlign:'center' }}>
        <h2 className="section-title">404 – Page not found</h2>
        <p className="muted">The page you are looking for does not exist.</p>
        <div className="actions" style={{ justifyContent:'center', marginTop: 10 }}>
          <Link to="/dashboard" className="btn primary">Go to Dashboard</Link>
          <Link to="/" className="btn ghost">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}

function NotFoundGuard({ known }) {
  const { path } = useContext(RouterContext);
  const norm = (p) => (p.endsWith('/') && p !== '/' ? p.replace(/\/+$/, '') : p);
  if (!known.includes(norm(path))) return <NotFoundPage />;
  return null;
}

/********
 * App  *
 ********/
export default function App() {
  const [crisisOpen, setCrisisOpen] = useState(false);
  const knownPaths = ['/', '/login', '/signup', '/onboarding', '/checkin', '/dashboard', '/journal', '/community', '/caregiver', '/admin', '/crisis', '/legal'];
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <MoodProvider>
              <JournalProvider>
                <CommunityProvider>
                  <Router>
                    <Navbar onOpenCrisis={() => setCrisisOpen(true)} />
                    <Route path="/">
                      <LandingPage />
                    </Route>
                    <Route path="/login">
                      <LoginPage />
                    </Route>
                    <Route path="/signup">
                      <SignupPage />
                    </Route>
                    <Route path="/onboarding">
                      <OnboardingPage />
                    </Route>
                    <Route path="/checkin">
                      <CheckinPage />
                    </Route>
                    <Route path="/dashboard">
                      <DashboardPage />
                    </Route>
                    <Route path="/journal">
                      <JournalPage />
                    </Route>
                    <Route path="/community">
                      <CommunityPage />
                    </Route>
                    <Route path="/caregiver">
                      <CaregiverPage />
                    </Route>
                    <Route path="/admin">
                      <AdminDashboard />
                    </Route>
                    <Route path="/crisis">
                      <CrisisPage />
                    </Route>
                    <Route path="/legal">
                      <LegalPage />
                    </Route>
                    <NotFoundGuard known={knownPaths} />
                    <Footer />
                    <CrisisModal open={crisisOpen} onClose={() => setCrisisOpen(false)} />
                  </Router>
                </CommunityProvider>
              </JournalProvider>
            </MoodProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
