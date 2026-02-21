'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { handleApiError } from '@/lib/utils/errorHandler';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthContext();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/fotofik.jpg')" }}>

      {/* optional dark overlay over background */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* LOGIN FORM CENTERED */}
      <div className="relative z-10 flex w-full items-center justify-center px-6">
        <div className="w-full max-w-md bg-white/90 p-8 rounded-xl shadow-lg space-y-6">

        <div>
          <h2 className="text-center text-5x1 font-bold text-orange-900">
            Login
          </h2>
          <p className="text-center text-sm text-gray-600 mt-1">
            Sign in to your account
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-orange-700">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-orange-500"
              placeholder="user@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-orange-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-orange-500"
              placeholder='masukin yang bener jing'
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

        </form>

      </div>

    </div>

  </div>
);
}