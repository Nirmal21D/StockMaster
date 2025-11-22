'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        if (result.error.includes('pending approval') || result.error.includes('Account pending')) {
          // Store email for pending page
          localStorage.setItem('pendingUserEmail', email);
          router.push('/auth/pending');
          return;
        } else if (result.error.includes('inactive')) {
          setError('Your account is inactive. Please contact an administrator.');
        } else {
          setError(result.error === 'CredentialsSignin' ? 'Invalid login credentials' : result.error || 'An error occurred. Please try again.');
        }
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">StockMaster</h1>
          <p className="text-gray-400">Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Login ID
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>

          <div className="text-center text-sm text-gray-400">
            <a href="/auth/forgot-password" className="hover:text-blue-400 transition-colors">
              Forget Password?
            </a>
            {' | '}
            <a href="/signup" className="hover:text-blue-400 transition-colors">
              Sign Up
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

