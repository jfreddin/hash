import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Close help dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
        navigate('/home', { replace: true });
      } else {
        setError(data.message || 'Incorrect password. Please try again or you can reset your password.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        fontFamily: "'NetflixSans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        background: 'radial-gradient(ellipse at 50% 0%, #471a0e 0%, #1a0000 40%, #000000 80%)',
      }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center px-[5%] md:px-[4%]"
        style={{ height: '80px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Link to="/login">
          <span
            className="text-[#e50914] select-none"
            style={{
              fontFamily: "'NetflixSans', 'Helvetica Neue', Arial, sans-serif",
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-1px',
            }}
          >
            HASH
          </span>
        </Link>
      </header>

      {/* ── Main content area – fills viewport height minus header, NOT flex-centered ── */}
      <main style={{ width: '100%', minHeight: 'calc(100vh - 80px)', padding: '60px 16px 80px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>

          {/* Heading */}
          <h1
            className="text-white mb-[0.4rem]"
            style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}
          >
            Enter your info to sign in
          </h1>

          {/* Subtext */}
          <p className="mb-7" style={{ color: '#8c8c8c', fontSize: '1rem' }}>
            Or get started with a{' '}
            <Link to="/signup" className="text-white underline underline-offset-2 hover:no-underline">
              new account
            </Link>
            .
          </p>

          {/* ── Error Box ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="mb-5 px-4 py-3 rounded"
                style={{
                  background: 'rgba(111,24,29,0.95)',
                  border: '1px solid rgba(229,9,20,0.35)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                }}
              >
                <span className="font-semibold block">Incorrect email or password</span>
                <span style={{ color: '#c0c0c0' }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Email input ── */}
            <FloatingInput
              id="email"
              type="text"
              label="Email or username"
              value={email}
              onChange={setEmail}
            />

            {/* ── Password input ── */}
            <div className="relative mt-3">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="current-password"
                className="peer w-full rounded"
                style={inputStyle}
              />
              <label htmlFor="password" style={labelBaseStyle} className="peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-base peer-focus:top-[8px] peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[8px] peer-[:not(:placeholder-shown)]:text-[11px] transition-all duration-150 pointer-events-none absolute left-4">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* ── Sign In Button ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 flex items-center justify-center rounded font-medium transition-colors"
              style={{
                height: '48px',
                background: loading ? '#8c0000' : '#e50914',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 500,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Sign In'}
            </button>
          </form>

          {/* ── Get Help dropdown – FLOATING, zero layout impact ── */}
          <div ref={helpRef} className="relative mt-5 inline-block">
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className="flex items-center gap-1 transition-colors"
              style={{ color: '#8c8c8c', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Get Help
              <motion.span
                animate={{ rotate: helpOpen ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <ChevronDown size={15} />
              </motion.span>
            </button>

            {/* Floating dropdown — position:absolute so it NEVER pushes content */}
            <AnimatePresence>
              {helpOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 rounded z-50"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    minWidth: '200px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                  }}
                >
                  <Link
                    to="/forgot-password"
                    onClick={() => setHelpOpen(false)}
                    className="block px-5 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── reCAPTCHA text ── */}
          <p className="mt-16" style={{ color: '#595959', fontSize: '0.8125rem', lineHeight: 1.5 }}>
            This page is protected by Google reCAPTCHA to ensure you're not a bot.
          </p>
        </div>
      </main>

      {/* ── Footer – naturally below the fold, user must scroll ── */}
      <footer style={{ background: 'rgba(0,0,0,0.75)', borderTop: '1px solid #333', padding: '30px 5% 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p className="mb-5" style={{ color: '#737373', fontSize: '0.8125rem' }}>
            Questions? Call 000-800-919-1743 (Toll-Free)
          </p>
          <div
            className="grid mb-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}
          >
            {['FAQ', 'Help Centre', 'Terms of Use', 'Privacy', 'Cookie Preferences', 'Corporate Information'].map((item) => (
              <span
                key={item}
                className="cursor-pointer hover:underline"
                style={{ color: '#737373', fontSize: '0.8125rem' }}
              >
                {item}
              </span>
            ))}
          </div>
          {/* Language Select */}
          <div className="relative inline-block">
            <select
              defaultValue="en"
              className="appearance-none rounded pr-8 pl-4 py-2 text-zinc-300 cursor-pointer focus:outline-none"
              style={{
                background: 'transparent',
                border: '1px solid #737373',
                fontSize: '0.8125rem',
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ─── Shared input styles ─────────────────────────────── */
const inputStyle: React.CSSProperties = {
  height: '56px',
  paddingTop: '20px',
  paddingBottom: '6px',
  paddingLeft: '16px',
  paddingRight: '16px',
  background: 'rgba(22,22,22,0.7)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '1rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelBaseStyle: React.CSSProperties = {
  color: '#8c8c8c',
  fontSize: '11px',
  top: '8px',
  lineHeight: 1,
};

/* ─── FloatingInput component ─────────────────────────── */
function FloatingInput({
  id, type, label, value, onChange,
}: {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        autoComplete={type === 'email' ? 'email' : 'off'}
        className="peer w-full rounded"
        style={inputStyle}
      />
      <label
        htmlFor={id}
        style={labelBaseStyle}
        className="peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-base peer-focus:top-[8px] peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[8px] peer-[:not(:placeholder-shown)]:text-[11px] transition-all duration-150 pointer-events-none absolute left-4"
      >
        {label}
      </label>
    </div>
  );
}
