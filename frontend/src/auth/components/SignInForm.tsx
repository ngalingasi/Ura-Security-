import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../store/authStore';
import { authApi } from '../api/authApi';
import type { OtpChannel } from '../../types';

type Step = 'credentials' | 'channel' | 'otp';

// ── Icons ─────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeCloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

/** Email envelope icon */
function EmailIcon() {
  return (
    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

/** Mobile / SMS icon */
function SmsIcon() {
  return (
    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignInForm() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [step,            setStep]            = useState<Step>('credentials');
  const [loginField,      setLoginField]      = useState('');
  const [password,        setPassword]        = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [channels,        setChannels]        = useState<OtpChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | null>(null);
  const [maskedContact,   setMaskedContact]   = useState('');
  const [otp,             setOtp]             = useState(['', '', '', '', '', '']);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [resending,       setResending]       = useState(false);

  // ── Step 1: validate credentials ───────────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.validateCredentials(loginField, password);
      if (!data.status) {
        if (data.must_change_password) {
          const res = await authApi.login(loginField, password);
          login(res.data.user, res.data.tokens.access.token, res.data.tokens.refresh.token);
          navigate('/change-password');
          return;
        }
        setError(data.message);
        return;
      }
      setChannels(data.channels ?? []);
      setStep('channel');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: send OTP via chosen channel ────────────────────────────────────
  const handleSendOtp = async (channel: 'email' | 'sms') => {
    setError('');
    setLoading(true);
    setSelectedChannel(channel);
    try {
      const { data } = await authApi.sendOtp(loginField, channel);
      setMaskedContact(data.maskedContact);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(loginField, code);
      login(data.user, data.tokens.access.token, data.tokens.refresh.token);
      navigate(data.user.must_change_password ? '/change-password' : '/');
    } catch {
      setError('Invalid or expired OTP. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!selectedChannel) return;
    setResending(true);
    setError('');
    try {
      const { data } = await authApi.sendOtp(loginField, selectedChannel);
      setMaskedContact(data.maskedContact);
      setOtp(['', '', '', '', '', '']);
    } catch {
      setError('Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  // ── OTP input helpers ──────────────────────────────────────────────────────
  const handleOtpChange = (val: string, idx: number) => {
    const updated = [...otp];
    updated[idx] = val.replace(/\D/g, '').slice(-1);
    setOtp(updated);
    if (val && idx < 5) {
      (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      (document.getElementById(`otp-${idx - 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const chars = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const updated = [...otp];
    chars.forEach((c, i) => { updated[i] = c; });
    setOtp(updated);
    (document.getElementById(`otp-${Math.min(chars.length, 5)}`) as HTMLInputElement)?.focus();
  };

  // ── Class helpers ──────────────────────────────────────────────────────────
  const otpInputCls =
    'h-12 w-full rounded-lg border border-gray-300 bg-transparent text-center text-xl font-bold ' +
    'text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-none focus:ring-2 ' +
    'focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white';

  const inputCls =
    'h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs ' +
    'placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 ' +
    'dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 ' +
    'focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-4">

        {/* Mobile logo — credentials step */}
        {step === 'credentials' && (
          <div className="mb-8 text-center lg:hidden">
            <img src="/images/logo/logo.png" alt="Ura Security" className="w-20 h-20 object-contain mx-auto mb-3" />
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Tanzania Police Force</h1>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Corporation Sole</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ura Security</p>
          </div>
        )}

        {/* Logo for OTP steps */}
        {(step === 'channel' || step === 'otp') && (
          <div className="mb-8 text-center">
            <img src="/images/logo/logo.png" alt="Ura Security" className="w-24 h-24 object-contain mx-auto mb-3 drop-shadow-md" />
            <h1 className="text-base font-bold text-gray-800 dark:text-white">Tanzania Police Force</h1>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Corporation Sole</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ura Security</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Step 1: Credentials ── */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Sign In</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter your credentials to continue</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Username or Email
              </label>
              <input
                type="text"
                placeholder="admin or admin@tpfcs.go.tz"
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500"
                >
                  {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:hover:text-brand-400">
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              disabled={loading || !loginField || !password}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Continue →'}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP Channel ── */}
        {step === 'channel' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Choose Verification Method</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select how you want to receive your OTP</p>
            </div>
            <div className="space-y-3">
              {channels.map((ch) => (
                <button
                  key={ch.type}
                  onClick={() => handleSendOtp(ch.type)}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all dark:border-gray-700 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 disabled:opacity-60"
                >
                  {/* Channel icon — email vs SMS */}
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    {ch.type === 'sms' ? <SmsIcon /> : <EmailIcon />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-800 dark:text-white">{ch.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{ch.display}</p>
                  </div>
                  {loading && selectedChannel === ch.type && (
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStep('credentials'); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── Step 3: OTP Entry ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Enter Verification Code</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Code sent to <span className="font-medium text-gray-700 dark:text-gray-300">{maskedContact}</span>
                {' '}via <span className="font-medium text-gray-700 dark:text-gray-300">
                  {selectedChannel === 'sms' ? 'SMS' : 'Email'}
                </span>
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                6-digit security code
              </label>
              <div className="flex gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={handleOtpPaste}
                    className={otpInputCls}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep('channel'); setError(''); setOtp(['', '', '', '', '', '']); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                ← Change method
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-brand-500 hover:text-brand-600 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
