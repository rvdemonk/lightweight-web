import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ display: 'block' }}>
      <rect x="1.5" y="1.5" width="25" height="25" rx="1"
        stroke="var(--accent-primary)" strokeWidth={1.5} />
      <polygon points="1.5,1.5 26.5,8.2 8.2,26.5"
        stroke="var(--accent-primary)" strokeWidth={1.5}
        strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Lockup({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: size * 0.35,
      filter: 'drop-shadow(0 0 6px rgba(212,118,44,0.4)) drop-shadow(0 0 16px rgba(212,118,44,0.1))',
    }}>
      <Mark size={size} />
      <span style={{
        fontSize: size * 1.1,
        fontWeight: 600,
        fontFamily: 'var(--font-display)',
        color: 'var(--accent-primary)',
        letterSpacing: '0.06em',
        lineHeight: 1,
      }}>
        LIGHTWEIGHT
      </span>
    </div>
  );
}

function errorMessage(status: number): string {
  switch (status) {
    case 400: return 'USERNAME 3-20 CHARS, PASSWORD 8+ CHARS';
    case 401: return 'INVALID CREDENTIALS';
    case 409: return 'USERNAME TAKEN';
    case 403: return 'INVALID INVITE CODE';
    default: return 'AUTHENTICATION FAILED';
  }
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adminCode = searchParams.get('code');

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const resp = await api.googleAuth(credential);
      setToken(resp.token);
      navigate('/');
    } catch (err: any) {
      setLoading(false);
      setError(err?.status === 401 ? 'GOOGLE SIGN-IN FAILED' : 'AUTHENTICATION FAILED');
    }
  }, [navigate]);

  const { buttonRef, googleReady } = useGoogleSignIn(handleGoogleCredential);

  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering && adminCode) {
        const { token } = await api.register(username, password, adminCode);
        setToken(token);
        navigate('/primer');
      } else {
        const { token } = await api.login(username, password);
        setToken(token);
        navigate('/');
      }
    } catch (err: any) {
      setLoading(false);
      const status = err?.status || 0;
      setError(errorMessage(status));
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    marginBottom: 12,
    borderColor: hasError ? 'var(--accent-red)' : undefined,
    boxShadow: hasError ? 'var(--error-shadow)' : undefined,
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      padding: '0 24px 24px',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Lockup */}
        <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'center' }}>
          <Lockup size={42} />
        </div>

        {/* Google Sign-In */}
        <div style={{ width: '100%', marginBottom: 4 }}>
          {loading ? (
            <div style={{
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '12px 0',
            }}>
              Signing in...
            </div>
          ) : (
            <div ref={buttonRef} style={{
              display: 'flex',
              justifyContent: 'center',
              height: 44,
              overflow: 'hidden',
              visibility: googleReady ? 'visible' : 'hidden',
            }} />
          )}
        </div>

        {/* OR divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '16px auto',
          width: '100%',
          maxWidth: 320,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '1px' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        {/* Username/password form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            style={inputStyle(!!error)}
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            style={inputStyle(!!error)}
          />

          {error && (
            <div style={{
              color: 'var(--accent-red)',
              fontSize: 13,
              marginBottom: 8,
              textShadow: 'var(--glow-red-text)',
              letterSpacing: '0.5px',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" style={{
            ['--btn-cut' as string]: '10px',
          }} disabled={loading}>
            {isRegistering ? 'Register' : 'Login'}
          </button>

          {/* Mode toggle — only show Register when admin code is in URL */}
          {(adminCode || isRegistering) && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                margin: '16px 0',
              }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '1px' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-full"
                style={{ fontSize: 13 }}
                onClick={toggleMode}
              >
                {isRegistering ? 'Login' : 'Register'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
