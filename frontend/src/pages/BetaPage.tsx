import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

const isAndroidUA = /android/i.test(navigator.userAgent);
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=xyz.rigby3.lightweight';
const PLAY_STORE_TEST_LINK = 'https://play.google.com/apps/testing/xyz.rigby3.lightweight';

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


// ── Android flow: Google Sign-In to collect Play Store email ──

function AndroidFlow({ referrer }: { referrer: string | null }) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleCredential = useCallback(async (credential: string) => {
    setState('loading');
    setError('');
    try {
      const result = await api.betaSignup(credential, 'android', referrer || undefined);
      setToken(result.token);
      setEmail(result.email);
      setState('success');
    } catch (err: any) {
      setState('error');
      setError(err?.status === 401 ? 'GOOGLE SIGN-IN FAILED' : 'SIGNUP FAILED — TRY AGAIN');
    }
  }, [referrer]);

  const { buttonRef, googleReady } = useGoogleSignIn(handleCredential);

  if (state === 'success') {
    return (
      <>
        <div style={{
          fontSize: 18,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          color: 'var(--accent-green)',
          textShadow: 'var(--glow-green-text)',
          letterSpacing: '1px',
          marginBottom: 24,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          You're in
        </div>
        <div style={{
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          Signed in as{' '}
          <span style={{
            fontFamily: 'var(--font-data)',
            color: 'var(--accent-cyan)',
            textShadow: 'var(--glow-cyan-text)',
            fontSize: 13,
          }}>{email}</span>
        </div>
        <a
          href={PLAY_STORE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-full"
          style={{
            ['--btn-cut' as string]: '10px',
            textDecoration: 'none',
            display: 'block',
            textAlign: 'center',
          }}
        >
          Install from Google Play
        </a>
      </>
    );
  }

  return (
    <>
      <div style={{
        fontSize: 16,
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: 32,
      }}>
        Join beta with your Google account.
      </div>

      <div style={{ width: '100%' }}>
        {state === 'loading' ? (
          <div style={{
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '16px 0',
          }}>
            Signing in...
          </div>
        ) : (
          <div ref={buttonRef} style={{
            display: 'flex',
            justifyContent: 'center',
            transform: googleReady ? 'scale(1.08)' : undefined,
            transformOrigin: 'center',
            visibility: googleReady ? 'visible' : 'hidden',
            height: 48,
            overflow: 'hidden',
          }} />
        )}
        {!googleReady && state !== 'loading' && (
          <div style={{
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '16px 0',
          }}>
            Loading...
          </div>
        )}
      </div>

      {error && (
        <div style={{
          color: 'var(--accent-red)',
          fontSize: 13,
          marginTop: 16,
          textShadow: 'var(--glow-red-text)',
          letterSpacing: '0.5px',
        }}>
          {error}
        </div>
      )}
    </>
  );
}

// ── Non-Android flow: username/password + optional Google Sign-In ──

function RegisterFlow({ referrer }: { referrer: string | null }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPostGoogle, setShowPostGoogle] = useState(false);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const device = isIOS ? 'ios' : 'desktop';
      const result = await api.betaSignup(credential, device, referrer || undefined);
      setToken(result.token);
      setGoogleEmail(result.email);

      if (isIOS) {
        // iPhone: straight to web app
        navigate('/');
      } else {
        // Desktop: show both options
        setShowPostGoogle(true);
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.status === 401 ? 'GOOGLE SIGN-IN FAILED' : 'SIGNUP FAILED — TRY AGAIN');
    }
  }, [referrer, navigate]);

  const { buttonRef, googleReady } = useGoogleSignIn(handleGoogleCredential);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const device = /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'desktop';
      const { token } = await api.betaRegister(username, password, device, email || undefined, referrer || undefined);
      setToken(token);
      navigate('/primer');
    } catch (err: any) {
      setLoading(false);
      const status = err?.status || 0;
      switch (status) {
        case 400: setError('USERNAME 3-20 CHARS, PASSWORD 8+ CHARS'); break;
        case 409: setError('USERNAME TAKEN'); break;
        default: setError('REGISTRATION FAILED'); break;
      }
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    marginBottom: 12,
    borderColor: hasError ? 'var(--accent-red)' : undefined,
    boxShadow: hasError ? 'var(--error-shadow)' : undefined,
  });

  // Desktop post-Google: show both options
  if (showPostGoogle) {
    return (
      <>
        <div style={{
          fontSize: 18,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          color: 'var(--accent-green)',
          textShadow: 'var(--glow-green-text)',
          letterSpacing: '1px',
          marginBottom: 24,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          You're in
        </div>
        <div style={{
          fontSize: 17,
          fontFamily: 'var(--font-body)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          Signed in as{' '}
          <span style={{
            fontFamily: 'var(--font-data)',
            color: 'var(--accent-cyan)',
            textShadow: 'var(--glow-cyan-text)',
            fontSize: 15,
          }}>{googleEmail}</span>
        </div>

        {/* Android card */}
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 4,
          padding: '24px',
          marginBottom: 16,
          width: '100%',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}>
            {/* Android icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V7H6v11zM3.5 7C2.67 7 2 7.67 2 8.5v7c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-7C5 7.67 4.33 7 3.5 7zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0012 0c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 006 6h12c0-2.21-1.2-4.15-2.97-5.18-.15-.09-.01.25 0 .34zM10 4H9V3h1v1zm5 0h-1V3h1v1z"
                fill="var(--accent-primary)" />
            </svg>
            <div style={{
              fontSize: 16,
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              color: 'var(--accent-primary)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              Android Users
            </div>
          </div>
          <div style={{
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            Install Lightweight on your Android device via Google Play
          </div>
          <a
            href={PLAY_STORE_TEST_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-full"
            style={{
              ['--btn-cut' as string]: '10px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
            }}
          >
            Get the Android App
          </a>
        </div>

        {/* Web/iPhone card */}
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 4,
          padding: '24px',
          width: '100%',
        }}>
          <div style={{
            fontSize: 16,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            iPhone & Web Users
          </div>
          <div style={{
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            Start tracking workouts now in the web app
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{
              ['--btn-cut' as string]: '10px',
              background: 'var(--bg-elevated)',
              color: 'var(--accent-cyan)',
              filter: 'none',
            }}
            onClick={() => navigate('/')}
          >
            Go to Lightweight Web
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{
        fontSize: 16,
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: 32,
      }}>
        Sign up to join the Lightweight beta
      </div>

      {/* Google Sign-In — golden path */}
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
            visibility: googleReady ? 'visible' : 'hidden',
            height: 44,
            overflow: 'hidden',
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

      {/* Custom registration — secondary */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
        <input
          type="email"
          placeholder="EMAIL"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          style={inputStyle(!!error)}
        />
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

        <button
          type="submit"
          className="btn btn-primary btn-full"
          style={{
            ['--btn-cut' as string]: '10px',
            background: 'var(--bg-elevated)',
            color: 'var(--accent-primary)',
            filter: 'none',
          }}
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Join Beta'}
        </button>
      </form>
    </>
  );
}

// ── Page shell ──

export function BetaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referrer = searchParams.get('ref');

  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

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
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <Lockup size={42} />
        </div>

        {/* Closed Beta */}
        <div style={{
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          color: 'var(--accent-cyan)',
          textShadow: 'var(--glow-cyan-text)',
          letterSpacing: '2px',
          marginBottom: 32,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          Closed Beta
        </div>

        {/* Referrer */}
        {referrer && (
          <div style={{
            fontSize: 11,
            fontFamily: 'var(--font-data)',
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
            marginBottom: 24,
          }}>
            REFERRED BY{' '}
            <span style={{ color: 'var(--accent-cyan)', textShadow: 'var(--glow-cyan-text)' }}>
              {referrer.toUpperCase()}
            </span>
          </div>
        )}

        {/* Platform-specific flow */}
        {(isAndroidUA || searchParams.has('android')) ? (
          <AndroidFlow referrer={referrer} />
        ) : (
          <RegisterFlow referrer={referrer} />
        )}
      </div>
    </div>
  );
}
