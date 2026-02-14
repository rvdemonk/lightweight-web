import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, isLoggedIn } from '../api/client';

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
      padding: 24,
    }}>
      <div style={{
        fontFamily: 'var(--font-data)',
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--accent-amber)',
        marginBottom: 32,
      }}>
        LIGHTWEIGHT
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
          autoFocus
        />
        {error && (
          <div style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 8 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-full">
          Login
        </button>
      </form>
    </div>
  );
}
