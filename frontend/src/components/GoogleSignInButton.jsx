import { useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/**
 * Proper Google Sign-In button using @react-oauth/google.
 *
 * Flow:
 *  1. useGoogleLogin (implicit) → access_token from Google
 *  2. Fetch user profile from Google's /userinfo endpoint
 *  3. POST to /api/auth/google with access_token + profile
 *  4. Backend verifies access_token and returns our app JWT
 *  5. setSession() stores JWT and updates React auth state
 *
 * Props:
 *   onSuccess(user) – called after successful login
 *   onError(msg)    – called on failure
 *   loading         – external loading state
 *   setLoading      – external setter
 */
export default function GoogleSignInButton({ onSuccess, onError, loading, setLoading }) {
  const { setSession } = useAuth();

  const handleSuccess = useCallback(async (tokenResponse) => {
    setLoading?.(true);
    try {
      // 1. Fetch user profile using the Google access token
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      if (!infoRes.ok) throw new Error('Failed to get Google profile. Please try again.');
      const profile = await infoRes.json();

      // 2. Send to our backend
      const { data } = await api.post('/auth/google', {
        accessToken: tokenResponse.access_token,
        profile: {
          sub: profile.sub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        },
      });

      // 3. Set auth state in React (stores JWT + user in context)
      await setSession(data.token, data.user);
      onSuccess?.(data.user);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Google sign-in failed. Please try again.';
      onError?.(msg);
    } finally {
      setLoading?.(false);
    }
  }, [setSession, onSuccess, onError, setLoading]);

  const handleError = useCallback(() => {
    onError?.('Google sign-in was cancelled or blocked. Please try again.');
    setLoading?.(false);
  }, [onError, setLoading]);

  const googleLogin = useGoogleLogin({
    onSuccess: handleSuccess,
    onError: handleError,
    flow: 'implicit',
  });

  const hasClientId = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim());

  const handleClick = () => {
    if (!hasClientId) {
      onError?.('Google Sign-In is not configured on this host. Please set VITE_GOOGLE_CLIENT_ID or use email/password sign-in.');
      return;
    }
    setLoading?.(true);
    googleLogin();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Continue with Google"
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-[#0D0D0D] rounded-[10px] text-[14px] font-bold text-[#0D0D0D] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgba(0,0,0,0.15)] transition-all disabled:opacity-60 disabled:cursor-not-allowed select-none"
    >
      {loading ? (
        <svg className="animate-spin w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        /* Google "G" logo */
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      )}
      <span>{loading ? 'Signing in with Google…' : 'Continue with Google'}</span>
    </button>
  );
}
