import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectMessage = location.state?.message || '';
  const initialName = location.state?.name || (!location.state?.emailOrName?.includes('@') ? location.state?.emailOrName || '' : '');
  const initialEmail = location.state?.email || (location.state?.emailOrName?.includes('@') ? location.state?.emailOrName || '' : '');

  const [form, setForm] = useState({
    name: initialName,
    email: initialEmail,
    password: '',
    confirm: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/data-collection');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleGoogleSuccess = () => {
    navigate('/dashboard');
  };

  const handleGoogleError = (msg) => setError(msg);

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="font-display font-extrabold text-2xl flex items-center gap-1">
            <span className="bg-[#FFFF66] text-[#0D0D0D] px-2 py-0.5 rounded-[6px]">ST</span>
            <span>AI</span>
          </div>
        </div>

        <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] p-8 shadow-[4px_4px_0_#0D0D0D]">
          <h1 className="text-2xl font-extrabold mb-1">Create your account</h1>
          <p className="text-sm text-[#555555] mb-6">Start studying smarter with AI — it&apos;s free</p>

          {redirectMessage && (
            <div className="bg-[#fffbeb] border-2 border-[#fde047] rounded-[8px] px-4 py-3 text-sm text-[#854d0e] font-medium mb-4">
              {redirectMessage}
            </div>
          )}

          {error && (
            <div className="bg-[#fff0f0] border-2 border-red-300 rounded-[8px] px-4 py-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {/* Google Sign-In with mode="register" */}
          <GoogleSignInButton mode="register" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E0E0E0]" />
            <span className="text-xs font-semibold text-[#999999] uppercase tracking-wide">or with email</span>
            <div className="flex-1 h-px bg-[#E0E0E0]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', ph: 'Your name' },
              { label: 'Email', key: 'email', type: 'email', ph: 'you@example.com' },
              { label: 'Password', key: 'password', type: 'password', ph: 'Min. 6 characters' },
              { label: 'Confirm Password', key: 'confirm', type: 'password', ph: 'Repeat password' },
            ].map(({ label, key, type, ph }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold">{label}</label>
                <input
                  type={type}
                  placeholder={ph}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                  className="px-3.5 py-3 border-2 border-[#0D0D0D] rounded-[8px] text-sm outline-none focus:shadow-[0_0_0_3px_#87CEEB] transition-all"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[8px] font-display font-bold text-[15px] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgba(0,0,0,0.2)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#555555] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0D0D0D] underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
