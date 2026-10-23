import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.identifier, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.notFound) {
        navigate('/register', {
          state: {
            emailOrName: form.identifier,
            message: 'No account found with this username or email. Please register below to get started!'
          }
        });
        return;
      }
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const handleGoogleSuccess = () => {
    navigate('/dashboard');
  };

  const handleGoogleNotFound = (profile) => {
    navigate('/register', {
      state: {
        name: profile?.name || '',
        email: profile?.email || '',
        message: 'No STAI account found for this Google account. Please register below!'
      }
    });
  };

  const handleGoogleError = (msg) => setError(msg);

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="font-display font-extrabold text-2xl flex items-center gap-1">
            <span className="bg-[#FFFF66] text-[#0D0D0D] px-2 py-0.5 rounded-[6px]">ST</span>
            <span>AI</span>
          </div>
        </div>

        <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] p-8 shadow-[4px_4px_0_#0D0D0D]">
          <h1 className="text-2xl font-extrabold mb-1">Welcome back</h1>
          <p className="text-sm text-[#555555] mb-6">Log in to continue studying smarter</p>

          {error && (
            <div className="bg-[#fff0f0] border-2 border-red-300 rounded-[8px] px-4 py-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {/* Google Sign-In with mode="login" and onNotFound redirect */}
          <GoogleSignInButton
            mode="login"
            onSuccess={handleGoogleSuccess}
            onNotFound={handleGoogleNotFound}
            onError={handleGoogleError}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E0E0E0]" />
            <span className="text-xs font-semibold text-[#999999] uppercase tracking-wide">or with credentials</span>
            <div className="flex-1 h-px bg-[#E0E0E0]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold">Username or Email</label>
              <input
                type="text"
                placeholder="Enter your username or email"
                value={form.identifier}
                onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                required
                autoComplete="username"
                className="px-3.5 py-3 border-2 border-[#0D0D0D] rounded-[8px] text-sm outline-none focus:shadow-[0_0_0_3px_#87CEEB] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
                className="px-3.5 py-3 border-2 border-[#0D0D0D] rounded-[8px] text-sm outline-none focus:shadow-[0_0_0_3px_#87CEEB] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[8px] font-display font-bold text-[15px] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgba(0,0,0,0.2)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in…' : 'Log In →'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#555555] mt-5">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-[#0D0D0D] underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
