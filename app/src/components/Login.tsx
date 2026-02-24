import { useState } from 'react';
import { login } from '../api';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1a1d27',
        padding: '2.5rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '380px',
        border: '1px solid #2a2d3a',
      }}>
        <h1 style={{
          color: '#e2e8f0',
          fontSize: '1.5rem',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}>
          🎯 Job Tracker
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          marginBottom: '2rem',
          textAlign: 'center',
        }}>
          Sign in to continue
        </p>

        {error && (
          <div style={{
            background: '#2d1b1b',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.7rem 0.9rem',
              background: '#0f1117',
              border: '1px solid #2a2d3a',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.7rem 0.9rem',
              background: '#0f1117',
              border: '1px solid #2a2d3a',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: loading ? '#2a2d3a' : '#4f8bff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}