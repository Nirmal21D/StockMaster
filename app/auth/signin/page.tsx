'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background px-4 py-8 flex items-center justify-center">
      {/* Forms Container - Centered */}
      <div className="max-w-lg mx-auto w-full">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
        
        {/* Login Form - Active */}
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-primary/20 dark:border-primary/10 p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Login</h2>
          </div>

          {/* Logo inside form */}
          <div className="flex items-center justify-center mb-8">
            {mounted && (
              <img src={theme === 'dark' ? '/app_dark.png' : '/sm.png'} alt="StockMaster Logo" className="h-20 w-auto" />
            )}
            {!mounted && (
              <img src="/sm.png" alt="StockMaster Logo" className="h-20 w-auto" />
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Id
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors font-medium"
            >
              {loading ? 'Signing in...' : 'SIGN IN'}
            </button>

            <div className="text-center text-xs text-muted-foreground">
              <a href="/auth/forgot-password" className="hover:text-primary transition-colors">
                Forget Password ?
              </a>
              {' | '}
              <a href="/signup" className="hover:text-primary transition-colors">
                Sign Up
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

