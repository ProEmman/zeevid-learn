import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

// ── Keyframe animations ───────────────────────────────────────────────────────
const styleTag = `
  @keyframes floatA {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(30px, -40px) scale(1.08); }
  }
  @keyframes floatB {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-25px, 35px) scale(1.05); }
  }
  @keyframes floatC {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(20px, 30px) scale(0.95); }
  }
  @keyframes floatD {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-30px, -20px) scale(1.06); }
  }
`

// ── Style constants ───────────────────────────────────────────────────────────

// Left panel — blue glass, rounded left only on desktop
const glassLeft = {
  background: 'rgba(255,255,255,0.15)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
}

// Right panel — green glass, rounded right only on desktop
const glassRight = {
  background: 'rgba(34,197,94,0.25)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(34,197,94,0.4)',
}

const glassInput = {
  background: 'rgba(255,255,255,0.2)',
  border: '1px solid rgba(255,255,255,0.4)',
  color: '#ffffff',
  outline: 'none',
  width: '100%',
  borderRadius: '12px',
  padding: '12px 12px 12px 40px',
  fontSize: '16px',
  fontWeight: 400,
  fontFamily: "'Inter', sans-serif",
  transition: 'box-shadow 0.2s, border-color 0.2s',
}

const glassInputFocusStyle = '0 0 0 3px rgba(255,255,255,0.3)'

const solidBtn = {
  width: '100%',
  background: '#ffffff',
  color: '#1a73e8',
  fontWeight: '700',
  fontSize: '15px',
  fontFamily: "'Inter', sans-serif",
  padding: '13px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.2s, opacity 0.2s',
  minHeight: '44px',
  textShadow: 'none',
  letterSpacing: '0.01em',
}

const outlineBtn = {
  width: '100%',
  background: 'transparent',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '14px',
  fontFamily: "'Inter', sans-serif",
  padding: '12px',
  borderRadius: '12px',
  border: '2px solid rgba(255,255,255,0.7)',
  cursor: 'pointer',
  transition: 'background 0.2s',
  minHeight: '44px',
  textShadow: '0 1px 3px rgba(0,0,0,0.2)',
}

const textShadow = '0 1px 3px rgba(0,0,0,0.3)'

// ── White SVG Icons ───────────────────────────────────────────────────────────
const IMail   = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
const ILock   = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
const IPerson = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
const IAt     = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
const IPhone  = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
const IEyeOn  = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
const IEyeOff = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
const ICheck  = () => <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
const IArrow  = () => <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>

// ── Glass input ───────────────────────────────────────────────────────────────
function GInput({ icon, type = 'text', placeholder, value, onChange, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 12, pointerEvents: 'none', display: 'flex' }}>{icon}</span>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...glassInput, boxShadow: focused ? glassInputFocusStyle : 'none', borderColor: focused ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
      />
    </div>
  )
}

// ── Glass password ────────────────────────────────────────────────────────────
function GPassword({ placeholder, value, onChange, required }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 12, pointerEvents: 'none', display: 'flex' }}><ILock /></span>
      <input
        type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...glassInput, paddingRight: 44, boxShadow: focused ? glassInputFocusStyle : 'none', borderColor: focused ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
        {show ? <IEyeOn /> : <IEyeOff />}
      </button>
    </div>
  )
}

// ── Glass select ──────────────────────────────────────────────────────────────
function GSelect({ value, onChange, required, children }) {
  const [focused, setFocused] = useState(false)
  return (
    <select value={value} onChange={onChange} required={required}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...glassInput, paddingLeft: 14, appearance: 'none', boxShadow: focused ? glassInputFocusStyle : 'none', borderColor: focused ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
      {children}
    </select>
  )
}

// ── Field label ───────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <p style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', marginBottom: 5, textShadow }}>
    {children}
  </p>
)

// ── Floating blobs ────────────────────────────────────────────────────────────
const Blobs = () => (
  <>
    <div style={{ position: 'fixed', top: '8%',   left: '5%',  width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(2px)', animation: 'floatA 7s ease-in-out infinite alternate',  pointerEvents: 'none', zIndex: 0 }} />
    <div style={{ position: 'fixed', bottom: '10%',right: '6%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(2px)', animation: 'floatB 9s ease-in-out infinite alternate',  pointerEvents: 'none', zIndex: 0 }} />
    <div style={{ position: 'fixed', top: '45%',  right: '15%',width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(1px)', animation: 'floatC 8s ease-in-out infinite alternate',  pointerEvents: 'none', zIndex: 0 }} />
    <div style={{ position: 'fixed', bottom: '30%',left: '12%', width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(3px)', animation: 'floatD 11s ease-in-out infinite alternate', pointerEvents: 'none', zIndex: 0 }} />
  </>
)

// ── Right promo panel ─────────────────────────────────────────────────────────
function PromoPanel({ heading, subtitle, bullets, ctaLabel, onCta, borderRadius }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ ...glassRight, borderRadius, padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.8)', marginBottom: 16, textShadow }}>ZeeVid Learn+</p>
        <h2 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', lineHeight: 1.35, marginBottom: 10, textShadow }}>{heading}</h2>
        {subtitle && <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 28, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{subtitle}</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <ICheck />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 36 }}>
        <button onClick={onCta} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{ ...outlineBtn, background: hover ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}

// ── Error / success banners ───────────────────────────────────────────────────
const Err = ({ msg }) => msg ? (
  <p style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{msg}</p>
) : null

const Ok = ({ msg }) => msg ? (
  <p style={{ fontSize: 13, fontWeight: 700, color: '#bbf7d0', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, padding: '10px 14px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{msg}</p>
) : null

// ── Shell ─────────────────────────────────────────────────────────────────────
// On mobile: single left glass card, full width, rounded 24px all sides
// On md (768px+): two joined panels, left rounded-left, right rounded-right
// On lg (1024px+): max-width 900px centred
function Shell({ formPanel, promoPanel }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{styleTag}</style>
      <Blobs />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

        {/* ── Mobile: single card (hidden on md+) ── */}
        <div className="block md:hidden" style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ ...glassLeft, borderRadius: 24, padding: '32px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            {formPanel}
          </div>
        </div>

        {/* ── Tablet (md) ── */}
        <div className="hidden md:flex lg:hidden" style={{ width: '100%', maxWidth: 820, alignItems: 'stretch', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', borderRadius: 24 }}>
          <div style={{ ...glassLeft, flex: 1, borderRadius: '24px 0 0 24px', padding: '32px 28px', boxSizing: 'border-box' }}>
            {formPanel}
          </div>
          <div style={{ flex: 1, minHeight: 480 }}>
            <PromoPanel {...promoPanel} borderRadius="0 24px 24px 0" />
          </div>
        </div>

        {/* ── Desktop (lg+) ── */}
        <div className="hidden lg:flex" style={{ width: '100%', maxWidth: 900, alignItems: 'stretch', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', borderRadius: 24 }}>
          <div style={{ ...glassLeft, flex: 1, borderRadius: '24px 0 0 24px', padding: '40px 36px', boxSizing: 'border-box' }}>
            {formPanel}
          </div>
          <div style={{ flex: 1, minHeight: 520 }}>
            <PromoPanel {...promoPanel} borderRadius="0 24px 24px 0" />
          </div>
        </div>

      </div>
      <Footer minimal />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function Login() {
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [view, setView] = useState('login')

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword]     = useState('')
  const [loginError, setLoginError]           = useState('')
  const [loginLoading, setLoginLoading]       = useState(false)

  // Register state
  const [regForm, setRegForm] = useState({
    full_name: '', username: '', email: '', phone_number: '',
    password: '', confirm_password: '', user_type: '', student_id: '', class_level: ''
  })
  const [regError, setRegError]     = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Forgot state
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotMsg, setForgotMsg]               = useState('')
  const [forgotError, setForgotError]           = useState('')
  const [forgotLoading, setForgotLoading]       = useState(false)

  // ── Handlers (logic unchanged) ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const user = await login(loginIdentifier, loginPassword)
      if (user.user_type === 'teacher') navigate('/teacher/dashboard')
      else navigate('/student/home')
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegError('')
    setRegSuccess('')
    if (!regForm.user_type) return setRegError('Please select your role.')
    if (regForm.password !== regForm.confirm_password) return setRegError('Passwords do not match.')
    if (regForm.password.length < 6) return setRegError('Password must be at least 6 characters.')
    if (!regForm.email && !regForm.phone_number) return setRegError('Please enter an email or phone number.')
    setRegLoading(true)
    try {
      const payload = {
        full_name: regForm.full_name, username: regForm.username,
        email: regForm.email || undefined, phone_number: regForm.phone_number || undefined,
        password: regForm.password, user_type: regForm.user_type,
      }
      if (regForm.user_type === 'student') {
        payload.student_id = regForm.student_id
        payload.class_level = regForm.class_level
      }
      await register(payload)
      setRegSuccess('Account created! You can now log in.')
      setTimeout(() => setView('login'), 1500)
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotMsg('')
    setForgotLoading(true)
    try {
      const res = await fetch('http://localhost:5000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setForgotMsg(data.message)
    } catch (err) {
      setForgotError(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  const [btnHover, setBtnHover] = useState(false)

  // ── Login View ───────────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <Shell
        promoPanel={{
          heading: 'Next-generation learning starts here',
          subtitle: 'ZeeVid Learn+ gives teachers the tools to inspire and students the platform to excel.',
          bullets: [
            'AI-powered question generation from your own notes',
            'Smart flashcard study sessions with shuffle and scoring',
            'Track your progress and results in real time',
          ],
          ctaLabel: 'Create Account',
          onCta: () => { setView('register'); setLoginError('') },
        }}
        formPanel={
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <img src="/ZeeVid.png" alt="ZeeVid Learn+" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)', marginBottom: 5, textShadow }}>WELCOME BACK</p>
              <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', marginBottom: 5, textShadow }}>Sign In to ZeeVid Learn+</h1>
              <p style={{ fontSize: 14, fontWeight: 400, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label>Email / Phone / Username</Label>
                <GInput icon={<IMail />} placeholder="you@email.com" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <GPassword placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>

              <Err msg={loginError} />

              <div style={{ textAlign: 'right' }}>
                <button type="button" onClick={() => { setView('forgot'); setLoginError('') }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textShadow }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loginLoading}
                onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)}
                style={{ ...solidBtn, background: btnHover ? '#dbeafe' : '#ffffff', opacity: loginLoading ? 0.6 : 1 }}>
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: 20, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Don't have an account?{' '}
              <button onClick={() => { setView('register'); setLoginError('') }}
                style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', textShadow }}>
                Register
              </button>
            </p>
          </>
        }
      />
    )
  }

  // ── Register View ────────────────────────────────────────────────────────────
  if (view === 'register') {
    return (
      <Shell
        promoPanel={{
          heading: 'Join thousands of learners today',
          subtitle: 'Start your journey with the smartest learning platform built for modern classrooms.',
          bullets: [
            'Create your personalised study plan',
            'Access teacher-curated content and notes',
            'Study anytime, anywhere, on any device',
          ],
          ctaLabel: 'Sign In',
          onCta: () => { setView('login'); setRegError(''); setRegSuccess('') },
        }}
        formPanel={
          <>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <img src="/ZeeVid.png" alt="ZeeVid Learn+" style={{ width: 50, height: 50, objectFit: 'contain', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)', marginBottom: 4, textShadow }}>GET STARTED</p>
              <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', marginBottom: 4, textShadow }}>Create Your Account</h1>
              <p style={{ fontSize: 14, fontWeight: 400, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Join ZeeVid Learn+ for free</p>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div>
                <Label>Full Name</Label>
                <GInput icon={<IPerson />} placeholder="John Doe" value={regForm.full_name} onChange={e => setRegForm(p => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <Label>Username</Label>
                <GInput icon={<IAt />} placeholder="johndoe" value={regForm.username} onChange={e => setRegForm(p => ({ ...p, username: e.target.value }))} required />
              </div>
              <div>
                <Label>Email <span style={{ textTransform: 'none', fontSize: 10, fontWeight: 500, opacity: 0.7 }}>(optional if phone provided)</span></Label>
                <GInput icon={<IMail />} type="email" placeholder="you@email.com" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone <span style={{ textTransform: 'none', fontSize: 10, fontWeight: 500, opacity: 0.7 }}>(optional if email provided)</span></Label>
                <GInput icon={<IPhone />} type="tel" placeholder="+1 234 567 8900" value={regForm.phone_number} onChange={e => setRegForm(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div>
                <Label>Password</Label>
                <GPassword placeholder="Min. 6 characters" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <GPassword placeholder="Repeat password" value={regForm.confirm_password} onChange={e => setRegForm(p => ({ ...p, confirm_password: e.target.value }))} required />
              </div>

              <div>
                <Label>I am a...</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['teacher', 'Teacher'], ['student', 'Student']].map(([val, label]) => {
                    const active = regForm.user_type === val
                    return (
                      <button key={val} type="button" onClick={() => setRegForm(p => ({ ...p, user_type: val }))}
                        style={{
                          padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                          transition: 'all 0.2s', minHeight: 44,
                          background: active ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          color: active ? '#1a73e8' : '#ffffff',
                          border: active ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.35)',
                          textShadow: active ? 'none' : textShadow,
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {regForm.user_type === 'student' && (
                <>
                  <div>
                    <Label>Student ID</Label>
                    <GInput icon={<IAt />} placeholder="STU-00123" value={regForm.student_id} onChange={e => setRegForm(p => ({ ...p, student_id: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Class Level</Label>
                    <GSelect value={regForm.class_level} onChange={e => setRegForm(p => ({ ...p, class_level: e.target.value }))} required>
                      <option value="" disabled style={{ color: '#1a73e8' }}>Select Class Level</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(lvl => (
                        <option key={lvl} value={`Level ${lvl}`} style={{ color: '#1a73e8' }}>Level {lvl}</option>
                      ))}
                    </GSelect>
                  </div>
                </>
              )}

              <Err msg={regError} />
              <Ok msg={regSuccess} />

              <button type="submit" disabled={regLoading}
                style={{ ...solidBtn, opacity: regLoading ? 0.6 : 1, marginTop: 2 }}>
                {regLoading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: 16, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Already have an account?{' '}
              <button onClick={() => { setView('login'); setRegError(''); setRegSuccess('') }}
                style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', textShadow }}>
                Sign In
              </button>
            </p>
          </>
        }
      />
    )
  }

  // ── Forgot Password View ─────────────────────────────────────────────────────
  return (
    <Shell
      promoPanel={{
        heading: "We've got you covered",
        subtitle: "Forgot your password? No problem. Enter your details and we'll send you a reset link.",
        bullets: [
          'Reset link expires after 1 hour for your security',
          'Your existing data and progress are completely safe',
          'Contact support if you need any further help',
        ],
        ctaLabel: 'Back to Sign In',
        onCta: () => { setView('login'); setForgotError(''); setForgotMsg('') },
      }}
      formPanel={
        <>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/ZeeVid.png" alt="ZeeVid Learn+" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)', marginBottom: 5, textShadow }}>ACCOUNT RECOVERY</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', marginBottom: 5, textShadow }}>Reset Your Password</h1>
            <p style={{ fontSize: 14, fontWeight: 400, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Enter your email or phone and we'll send a reset link</p>
          </div>

          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Email or Phone Number</Label>
              <GInput icon={<IMail />} placeholder="you@email.com" value={forgotIdentifier} onChange={e => setForgotIdentifier(e.target.value)} required />
            </div>
            <Err msg={forgotError} />
            <Ok msg={forgotMsg} />
            <button type="submit" disabled={forgotLoading}
              style={{ ...solidBtn, opacity: forgotLoading ? 0.6 : 1 }}>
              {forgotLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={() => { setView('login'); setForgotError(''); setForgotMsg('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'underline', textShadow }}>
              <IArrow /> Back to Sign In
            </button>
          </div>
        </>
      }
    />
  )
}

export default Login
