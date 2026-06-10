import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface VerifyEmailProps {
  onVerificationSuccess: (user: any) => void;
}

export const VerifyEmail: React.FC<VerifyEmailProps> = ({ onVerificationSuccess }) => {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every(d => d !== '') && newCode.length === 6) handleVerification(newCode.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(text)) return;
    const newCode = [...code];
    for (let i = 0; i < text.length; i++) newCode[i] = text[i];
    setCode(newCode);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
    if (newCode.every(d => d !== '')) handleVerification(newCode.join(''));
  };

  const handleVerification = async (verificationCode: string) => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/verify-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem('registering_email');
        onVerificationSuccess(data.user);
        navigate('/home', { replace: true });
      } else {
        setError(data.message || 'Verification failed. Please check the code and try again.');
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const targetEmail = localStorage.getItem('registering_email') || 'your email';

  return (
    <PageShell>
      <h1 style={h1Style}>Tap the link in your email</h1>
      <p className="mb-6" style={{ color: '#8c8c8c', fontSize: '1rem', lineHeight: 1.5 }}>
        We sent a sign-up code to the email below. Enter it to finish signing up.
      </p>

      {/* Email pill display — Netflix style */}
      <div className="flex items-center justify-between px-4 mb-6 rounded"
        style={{ height: '56px', background: 'rgba(22,22,22,0.7)', border: '1px solid rgba(255,255,255,0.25)' }}>
        <span style={{ color: '#fff', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '12px' }}>
          {targetEmail}
        </span>
        <Link to="/signup" className="text-white hover:underline text-sm font-medium shrink-0">Change</Link>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} className="mb-5 px-4 py-3 rounded"
            style={{ background: 'rgba(111,24,29,0.95)', border: '1px solid rgba(229,9,20,0.35)', fontSize: '0.875rem', lineHeight: 1.5 }}>
            <span className="font-semibold block">Verification Failed</span>
            <span style={{ color: '#c0c0c0' }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6-digit code inputs */}
      <form onSubmit={(e) => { e.preventDefault(); handleVerification(code.join('')); }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', width: '100%' }}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text" maxLength={1} value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={loading}
              className="focus:outline-none disabled:opacity-50"
              style={{
                width: 0,
                flex: '1 1 0',
                minWidth: 0,
                maxWidth: '64px',
                height: '60px',
                textAlign: 'center',
                fontSize: '1.375rem',
                fontWeight: 500,
                color: '#fff',
                background: 'rgba(22,22,22,0.7)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '4px',
              }}
            />
          ))}
        </div>
        <button type="submit" disabled={loading || code.some(d => d === '')}
          style={{ height: '48px', background: (loading || code.some(d => d === '')) ? '#8c0000' : '#e50914', color: '#fff', fontSize: '1rem', fontWeight: 500, border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Verify Code'}
        </button>
      </form>

      <p className="mt-5" style={{ color: '#737373', fontSize: '0.875rem' }}>
        Did not get a code? Check your spam or{' '}
        <span className="text-white cursor-pointer hover:underline">resend it</span>.
      </p>

      <p className="mt-14" style={{ color: '#595959', fontSize: '0.8125rem', lineHeight: 1.5 }}>
        This page is protected by Google reCAPTCHA to ensure you're not a bot.
      </p>
    </PageShell>
  );
};

const h1Style: React.CSSProperties = { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '0.4rem', color: '#fff' };

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-white"
      style={{ fontFamily: "'NetflixSans','Helvetica Neue',Helvetica,Arial,sans-serif", background: 'radial-gradient(ellipse at 50% 0%, #471a0e 0%, #1a0000 40%, #000000 80%)' }}>
      <header className="flex items-center px-[5%]" style={{ height: '80px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link to="/login">
          <span className="text-[#e50914] select-none" style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-1px' }}>HASH</span>
        </Link>
      </header>
      <main style={{ width: '100%', minHeight: 'calc(100vh - 80px)', padding: '60px 16px 80px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>{children}</div>
      </main>
      <footer style={{ background: 'rgba(0,0,0,0.75)', borderTop: '1px solid #333', padding: '30px 5% 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p className="mb-5" style={{ color: '#737373', fontSize: '0.8125rem' }}>Questions? Call 000-800-919-1743 (Toll-Free)</p>
          <div className="grid mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {['FAQ', 'Help Centre', 'Terms of Use', 'Privacy', 'Cookie Preferences', 'Corporate Information'].map(item => (
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
