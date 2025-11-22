'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Clock, Mail, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function PendingApprovalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get email from session or localStorage
    const storedEmail = localStorage.getItem('pendingUserEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleSignOut = async () => {
    localStorage.removeItem('pendingUserEmail');
    router.push('/auth/signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-yellow-400 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Account Pending Approval</h1>
        
        <p className="text-gray-400 mb-6">
          Your account registration is pending approval by an administrator.
        </p>

        {email && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{email}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <p className="text-blue-400 text-sm">
              ⏳ You will be able to log in once an administrator approves your account.
            </p>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">What happens next?</p>
            <ul className="text-left text-sm text-gray-500 space-y-1">
              <li>• An administrator will review your registration</li>
              <li>• You'll be assigned a role and warehouse access</li>
              <li>• You'll receive access to the system</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Back to Login
            </button>
            <Link
              href="/signup"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center"
            >
              Register Another
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

