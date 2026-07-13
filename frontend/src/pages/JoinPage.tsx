import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { Lockup } from '../components/Lockup';

function errorMessage(status: number): string {
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    api.validateJoinCode(code).then(result => {
      setValid(result.valid);
      setInvitedBy(result.invited_by);
    }).catch(() => {
      setValid(false);
    });
  }, [code]);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const resp = await api.googleAuth(credential);
      setToken(resp.token);
      navigate('/');
    } catch (err: any) {
      setLoading(false);
      setError(err?.status === 401 ? 'GOOGLE SIGN-IN FAILED' : 'REGISTRATION FAILED');
    }
  }, [navigate]);

  const { buttonRef, googleReady } = useGoogleSignIn(handleGoogleCredential);

  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setError('');
    setLoading(true);

    try {
      const { token } = await api.joinWithCode(code, username, password);
      setToken(token);
      navigate('/primer');
    } catch (err: any) {
      setLoading(false);
      const status = err?.status || 0;
      setError(errorMessage(status));
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
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
        <div style={{ maxWidth: 320, width: '100%', padding: '0 24px' }}>
          <Lockup />
        </div>
        <div style={{
          fontSize: 13,
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          marginTop: 24,
          textTransform: 'uppercase',
        }}>
          Validating invite...
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
        <div style={{ maxWidth: 320, width: '100%', marginBottom: 32 }}>
          <Lockup />
        </div>
        <div style={{
          fontSize: 14,
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          color: 'var(--accent-red)',
          textShadow: 'var(--glow-red-text)',
          letterSpacing: '0.04em',
          marginBottom: 24,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          Invite link invalid or already used
        </div>
        <Link to="/beta" style={{
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          color: 'var(--accent-cyan)',
          textShadow: 'var(--glow-cyan-text)',
          letterSpacing: '0.5px',
          textDecoration: 'none',
        }}>
          Join the beta instead
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Lockup */}
        <div style={{ maxWidth: 320, margin: '0 auto 24px' }}>
          <Lockup />
        </div>

        {/* Invited by */}
        {invitedBy && (
          <div style={{
            fontSize: 15,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            letterSpacing: '0.5px',
            marginBottom: 32,
            textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            Invited by{' '}
            <span style={{
              color: 'var(--accent-cyan)',
              textShadow: 'var(--glow-cyan-text)',
              fontWeight: 600,
            }}>
              {invitedBy.toUpperCase()}
            </span>
          </div>
        )}

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
            autoComplete="new-password"
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
            Register
          </button>

          {/* Login link */}
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
    </div>
  );
}
