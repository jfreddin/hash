import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

interface SignupProps {
  onSignupSuccess: (user: any) => void;
}

export const Signup: React.FC<SignupProps> = ({ onSignupSuccess }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) { setError('All fields are required.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, username, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('registering_email', email);
        onSignupSuccess(data.user);
        navigate('/verify-email', { replace: true });
      } else {
        setError(data.message || 'Signup failed. Please try again.');
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <PageShell>
      <h1 style={h1Style}>Create a new account</h1>
      <p className="mb-7" style={subStyle}>
        Already have an account?{' '}
        <Link to="/login" className="text-white underline underline-offset-2 hover:no-underline">Sign in</Link>.
      </p>

      <AnimatePresence>
        {error && <ErrorBox message={error} />}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <FloatingInput id="name" type="text" label="Full name" value={name} onChange={setName} />
        <FloatingInput id="username" type="text" label="Username" value={username} onChange={setUsername} />
        <FloatingInput id="email" type="email" label="Email address" value={email} onChange={setEmail} />
        <div className="relative">
          <input
            id="password" type={showPassword ? 'text' : 'password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder=" " className="peer w-full rounded" style={inputStyle}
          />
          <label htmlFor="password" style={labelBaseStyle}
            className="peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-base peer-focus:top-[8px] peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[8px] peer-[:not(:placeholder-shown)]:text-[11px] transition-all duration-150 pointer-events-none absolute left-4">
            Password
          </label>
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors" tabIndex={-1}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button type="submit" disabled={loading} style={btnStyle(loading)}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Sign Up'}
        </button>
      </form>

      <p className="mt-16" style={{ color: '#595959', fontSize: '0.8125rem', lineHeight: 1.5 }}>
        This page is protected by Google reCAPTCHA to ensure you're not a bot.
      </p>
    </PageShell>
  );
};

/* ─── Shared ─── */
const inputStyle: React.CSSProperties = {
  height: '56px', paddingTop: '20px', paddingBottom: '6px', paddingLeft: '16px', paddingRight: '16px',
  background: 'rgba(22,22,22,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '4px',
  color: '#fff', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.15s',
};
const labelBaseStyle: React.CSSProperties = { color: '#8c8c8c', fontSize: '11px', top: '8px', lineHeight: 1 };
const h1Style: React.CSSProperties = { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '0.4rem', color: '#fff' };
const subStyle: React.CSSProperties = { color: '#8c8c8c', fontSize: '1rem' };
const btnStyle = (loading: boolean): React.CSSProperties => ({
  height: '48px', background: loading ? '#8c0000' : '#e50914', color: '#fff', fontSize: '1rem',
  fontWeight: 500, border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px',
});

function FloatingInput({ id, type, label, value, onChange }: { id: string; type: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder=" " autoComplete={type === 'email' ? 'email' : 'off'} className="peer w-full rounded" style={inputStyle} />
      <label htmlFor={id} style={labelBaseStyle}
        className="peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-base peer-focus:top-[8px] peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[8px] peer-[:not(:placeholder-shown)]:text-[11px] transition-all duration-150 pointer-events-none absolute left-4">
        {label}
      </label>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }} className="mb-5 px-4 py-3 rounded"
      style={{ background: 'rgba(111,24,29,0.95)', border: '1px solid rgba(229,9,20,0.35)', fontSize: '0.875rem', lineHeight: 1.5 }}>
      <span className="font-semibold block">Error</span>
      <span style={{ color: '#c0c0c0' }}>{message}</span>
    </motion.div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-white"
      style={{ fontFamily: "'NetflixSans','Helvetica Neue',Helvetica,Arial,sans-serif", background: 'radial-gradient(ellipse at 50% 0%, #471a0e 0%, #1a0000 40%, #000000 80%)' }}>
      <header className="flex items-center px-[5%]" style={{ height: '80px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link to="/login">
          <span className="text-[#e50914] select-none" style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-1px' }}>HASH</span>
        </Link>
      </header>
      <main className="px-4" style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '60px', paddingBottom: '80px' }}>
        <div className="mx-auto" style={{ maxWidth: '440px' }}>
          {children}
        </div>
      </main>
      <footer style={{ background: 'rgba(0,0,0,0.75)', borderTop: '1px solid #333', padding: '30px 5% 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p className="mb-5" style={{ color: '#737373', fontSize: '0.8125rem' }}>Questions? Call 000-800-919-1743 (Toll-Free)</p>
          <div className="grid mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {['FAQ', 'Help Centre', 'Terms of Use', 'Privacy', 'Cookie Preferences', 'Corporate Information'].map((item) => (
              <span key={item} className="cursor-pointer hover:underline" style={{ color: '#737373', fontSize: '0.8125rem' }}>{item}</span>
            ))}
          </div>
          <div className="relative inline-block">
            <select defaultValue="en" className="appearance-none rounded pr-8 pl-4 py-2 text-zinc-300 cursor-pointer focus:outline-none"
              style={{ background: 'transparent', border: '1px solid #737373', fontSize: '0.8125rem' }}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </footer>
    </div>
  );
}
