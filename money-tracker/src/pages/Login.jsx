import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { mockBackend } from '../lib/mockBackend';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  const handleGoogleCallback = async (response) => {
    setIsLoading(true);
    setError('');
    const res = await loginWithGoogle(response.credential);
    if (!res.success) {
      setError(res.error || 'Google login failed');
      setIsLoading(false);
      return;
    }
    navigate('/dashboard');
  };

  useEffect(() => {
    const initGoogleSignIn = () => {
      if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
        window.google.accounts.id.initialize({
          client_id: clientID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('googleBtnContainer'),
          { theme: 'outline', size: 'large', width: 336 }
        );
      } else {
        setTimeout(initGoogleSignIn, 500);
      }
    };
    initGoogleSignIn();
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegister) {
        const registerRes = await mockBackend.register(username, password);
        if (registerRes.success) {
          // Log in automatically after registering
          const loginRes = await login(username, password);
          if (!loginRes.success) {
            setError(loginRes.error);
            setIsLoading(false);
            return;
          }
          navigate('/dashboard');
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error);
          setIsLoading(false);
          return;
        }
        navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {isRegister ? 'Sign Up' : t('Login')}
        </h2>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading 
              ? (isRegister ? 'Signing up...' : 'Logging in...') 
              : (isRegister ? 'Sign Up' : t('Login'))}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--text-muted)' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 1rem', fontSize: '0.9rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <div id="googleBtnContainer"></div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontWeight: '500' }} 
                onClick={() => { setIsRegister(false); setError(''); }}
              >
                Log In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontWeight: '500' }} 
                onClick={() => { setIsRegister(true); setError(''); }}
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

