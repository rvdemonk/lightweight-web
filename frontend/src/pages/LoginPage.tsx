import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';
import splashImg from '../assets/splash-schematic.jpg';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (isLoggedIn()) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Try login first, fall back to setup
      try {
        const { token } = await api.login(password);
        setToken(token);
        navigate('/');
      } catch {
        // Maybe it's first run — try setup
        const { token } = await api.setup(password);
        setToken(token);
        navigate('/');
      }
    } catch (err) {
      setError('Invalid password');
    }
  };

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
      {/* Schematic hero */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        marginBottom: 32,
        position: 'relative',
      }}>
        <img
          src={splashImg}
          alt="LIGHTWEIGHT"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        {/* Bottom fade so image bleeds into background */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(to bottom, transparent, var(--bg-primary))',
        }} />
      </div>

      {/* Auth form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            ACCESS CODE
          </span>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%',
            marginBottom: 12,
            borderColor: error ? 'var(--accent-red)' : undefined,
            boxShadow: error ? '0 0 6px rgba(232, 50, 50, 0.2)' : undefined,
          }}
          autoFocus
        />
        {error && (
          <div style={{
            color: 'var(--accent-red)',
            fontSize: 12,
            marginBottom: 8,
            textShadow: 'var(--glow-red-text)',
            letterSpacing: '0.5px',
          }}>
            ACCESS DENIED
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-full" style={{
          ['--btn-cut' as string]: '10px',
        }}>
          Authenticate
        </button>
      </form>

      {/* Bottom status */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        fontSize: 11,
        color: 'var(--text-secondary)',
        letterSpacing: '2px',
        opacity: 0.5,
      }}>
        LIGHTWEIGHT v0.1.0
      </div>
    </div>
  );
}
