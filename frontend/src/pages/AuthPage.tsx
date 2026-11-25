import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthPageProps {
  onAuthenticated: (token: string, user: User) => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(name, email, password);

      onAuthenticated(result.token, result.user);
      navigate(result.user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(role: 'CUSTOMER' | 'ADMIN') {
    setMode('login');
    setError(null);
    if (role === 'ADMIN') {
      setEmail('owner@pizzashop.local');
      setPassword('Owner123!');
    } else {
      setEmail('customer@pizzashop.local');
      setPassword('Customer123!');
    }
  }

  return (
    <section className="auth-shell card-panel" aria-labelledby="auth-heading">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBlockEnd: '1.25rem',
        }}
      >
        <h1
          id="auth-heading"
          style={{ fontFamily: 'var(--font-display)', margin: 0 }}
        >
          {mode === 'login' ? 'Welcome Back' : 'Create Customer Account'}
        </h1>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>

      {error && (
        <div
          className="alert alert-error"
          role="alert"
          style={{ marginBlockEnd: '1rem' }}
        >
          {error}
        </div>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="form-field">
            <label htmlFor="auth-name">Full name</label>
            <input
              id="auth-name"
              name="name"
              type="text"
              autoComplete="name"
              minLength={2}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-field">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label htmlFor="auth-password">Password</label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{showPassword ? 'Hide' : 'Show'}</span>
            </button>
          </div>
          <input
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting
            ? 'Please wait...'
            : mode === 'login'
              ? 'Sign in'
              : 'Create Account'}
        </button>
      </form>

      <div
        style={{
          marginBlockStart: '1.5rem',
          paddingBlockStart: '1.15rem',
          borderBlockStart: '1px solid var(--border)',
        }}
      >
        <p
          style={{
            margin: '0 0 0.65rem',
            fontSize: '0.85rem',
            color: 'var(--ink-muted)',
          }}
        >
          Quick demo accounts (seeded automatically):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('CUSTOMER')}
          >
            Fill Customer
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('ADMIN')}
          >
            Fill Shop Owner (Admin)
          </button>
        </div>
      </div>
    </section>
  );
}
