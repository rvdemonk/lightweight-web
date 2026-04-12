import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';
import { APP_VERSION } from '../version';

const fieldLabelStyle = {
  fontSize: 10,
  color: 'var(--text-secondary)',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};

function errorMessage(status: number, body?: string): string {
  switch (status) {
    case 403: return 'INVITE LINK INVALID';
    case 409: return 'USERNAME TAKEN';
    case 400: return 'USERNAME 3-20 CHARS, PASSWORD 8+ CHARS';
    default: return 'REGISTRATION FAILED';
  }
}

export function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [valid, setValid] = useState<boolean | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    api.validateJoinCode(code).then(result => {
      setValid(result.valid);
      setInvitedBy(result.invited_by);
    }).catch(() => {
      setValid(false);
    });
  }, [code]);

  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setError('');

    try {
      const { token } = await api.joinWithCode(code, username, password);
      setToken(token);
      navigate('/primer');
    } catch (err: any) {
      const status = err?.status || 0;
      setError(errorMessage(status));
    }
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    marginBottom: 12,
    borderColor: hasError ? 'var(--accent-red)' : undefined,
    boxShadow: hasError ? 'var(--error-shadow)' : undefined,
  });

  // Loading state
  if (valid === null) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
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
          marginTop: 16,
        }}>
          VALIDATING INVITE...
        </div>
      </div>
    );
  }

  // Invalid / used invite
  if (!valid) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '0 24px',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-primary)',
          letterSpacing: '6px',
          textShadow: 'var(--glow-primary-text)',
          marginBottom: 32,
        }}>
          LIGHTWEIGHT
        </div>
        <div style={{
          fontSize: 13,
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-red)',
          textShadow: 'var(--glow-red-text)',
          letterSpacing: '1px',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          INVITE LINK INVALID OR ALREADY USED
        </div>
        <Link to="/primer" style={{
          fontSize: 12,
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-cyan)',
          textShadow: 'var(--glow-cyan-text)',
          letterSpacing: '1px',
          textDecoration: 'none',
        }}>
          LEARN MORE ABOUT LIGHTWEIGHT
        </Link>
      </div>
    );
  }

  // Valid invite — registration form
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
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
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

      {/* Attribution */}
      {invitedBy && (
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-data)',
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          marginBottom: 24,
        }}>
          INVITED BY <span style={{ color: 'var(--accent-cyan)', textShadow: 'var(--glow-cyan-text)' }}>{invitedBy.toUpperCase()}</span>
        </div>
      )}

      {/* Registration form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
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

        <div style={{ marginBottom: 4 }}>
          <span style={fieldLabelStyle}>PASSWORD</span>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          style={inputStyle(!!error)}
        />

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
          Register
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

        <Link to="/login" style={{ textDecoration: 'none', display: 'block' }}>
          <button type="button" className="btn btn-secondary btn-full" style={{ fontSize: 13 }}>
            Login
          </button>
        </Link>
      </form>
    </div>
  );
}
