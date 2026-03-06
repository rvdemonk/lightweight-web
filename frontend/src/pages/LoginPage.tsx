import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';
import { APP_VERSION } from '../version';

const fieldLabelStyle = {
  fontSize: 10,
  color: 'var(--text-secondary)',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

function errorMessage(status: number): string {
  switch (status) {
    case 401: return 'INVALID CREDENTIALS';
    case 409: return 'USERNAME TAKEN';
    case 403: return 'INVALID INVITE CODE';
    default: return 'AUTHENTICATION FAILED';
  }
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegistering) {
        const { token } = await api.register(username, password, inviteCode || undefined);
        setToken(token);
        navigate('/');
      } else {
        const { token } = await api.login(username, password);
        setToken(token);
        navigate('/');
      }
    } catch (err: any) {
      const status = err?.status || 0;
      setError(errorMessage(status));
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  const inputStyle = (hasError: boolean) => ({
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
      {/* Wordmark */}
      <div style={{
        textAlign: 'center',
        marginBottom: 48,
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-primary)',
          letterSpacing: '6px',
          textShadow: 'var(--glow-primary-text)',
        }}>
          LIGHTWEIGHT
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-data)',
          color: 'var(--text-secondary)',
          letterSpacing: '2px',
          marginTop: 8,
        }}>
          v{APP_VERSION}
        </div>
      </div>

      {/* Auth form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        {/* Username field */}
        <div style={{ marginBottom: 4 }}>
          <span style={fieldLabelStyle}>USERNAME</span>
        </div>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          style={inputStyle(!!error)}
          autoFocus
        />

        {/* Password field */}
        <div style={{ marginBottom: 4 }}>
          <span style={fieldLabelStyle}>PASSWORD</span>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
          style={inputStyle(!!error)}
        />

        {/* Invite code field (register mode only) */}
        {isRegistering && (
          <>
            <div style={{ marginBottom: 4 }}>
              <span style={fieldLabelStyle}>INVITE CODE</span>
            </div>
            <input
              type="text"
              placeholder="required"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              autoComplete="off"
              style={inputStyle(!!error)}
            />
          </>
        )}

        {error && (
          <div style={{
            color: 'var(--accent-red)',
            fontSize: 12,
            marginBottom: 8,
            textShadow: 'var(--glow-red-text)',
            letterSpacing: '0.5px',
          }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-full" style={{
          ['--btn-cut' as string]: '10px',
        }}>
          {isRegistering ? 'Register' : 'Login'}
        </button>

        {/* Divider */}
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

        {/* Mode toggle */}
        <button
          type="button"
          className="btn btn-secondary btn-full"
          style={{ fontSize: 13 }}
          onClick={toggleMode}
        >
          {isRegistering ? 'Login' : 'Register'}
        </button>
      </form>
    </div>
  );
}
