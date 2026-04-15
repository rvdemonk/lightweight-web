import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';

const isAndroidUA = /android/i.test(navigator.userAgent);

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
          fontSize: 16,
          fontFamily: 'var(--font-body)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.7,
        }}>
          You will receive a download link for the Android beta at{' '}
          <span style={{
            fontFamily: 'var(--font-data)',
            color: 'var(--accent-cyan)',
            textShadow: 'var(--glow-cyan-text)',
            fontSize: 14,
          }}>{email}</span>
          {' '}shortly.
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
            transform: 'scale(1.08)',
            transformOrigin: 'center',
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

// ── Google Sign-In hook (shared by both flows) ──

function useGoogleSignIn(onSuccess: (credential: string) => void) {
  const [googleReady, setGoogleReady] = useState(false);
  const [clientId, setClientId] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSuccess);
  callbackRef.current = onSuccess;

  useEffect(() => {
    api.getConfig().then(config => {
      if (config.google_client_id) setClientId(config.google_client_id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: { credential: string }) => callbackRef.current(resp.credential),
        });
        setGoogleReady(true);
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [clientId]);

  useEffect(() => {
    if (!googleReady || !buttonRef.current) return;
    const google = (window as any).google;
    google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: 320,
      text: 'signin_with',
    });
  }, [googleReady]);

  return { buttonRef, googleReady };
}

// ── Non-Android flow: username/password + optional Google Sign-In ──

function RegisterFlow({ referrer }: { referrer: string | null }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const device = /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'desktop';
      const result = await api.betaSignup(credential, device, referrer || undefined);
      setToken(result.token);
      navigate('/');
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

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
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
          style={{ ['--btn-cut' as string]: '10px' }}
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Join Beta'}
        </button>
      </form>

      {/* OR divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '20px 0',
        width: '100%',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '1px' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      </div>

      {/* Google Sign-In */}
      <div style={{ width: '100%' }}>
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
          <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
        )}
      </div>
    </>
  );
}

// ── Page shell ──

export function BetaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referrer = searchParams.get('ref');

  const loggedIn = isLoggedIn();

  useLayoutEffect(() => {
    if (loggedIn) navigate('/', { replace: true });
  }, [loggedIn, navigate]);

  if (loggedIn) return null;

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
