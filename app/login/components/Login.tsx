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
  <div className="flex min-h-screen">

    {/* LEFT SIDE - Background FIK */}
    <div
      className="hidden md:flex w-1/2 items-center justify-center bg-cover bg-[position:30%_center] relative"
      style={{
        backgroundImage: "url('/fotofik.jpg')",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-white/10 to-transparent"></div>

      {/* Text */}
      <div className="relative z-10 text-white px-12">
        <h1 className="text-4xl font-bold leading-tight">
          Fakultas Ilmu Komputer UPNVJ
        </h1>

        <h2 className="mt-2 text-3xl font-semibold text-orange-400">
          Repository System
        </h2>

        <p className="mt-6 text-gray-200 max-w-md">
          Sistem penyimpanan dokumen resmi untuk Wakil Dekan, Dosen,
          dan Tenaga Kependidikan Fakultas Ilmu Komputer UPN Veteran Jakarta.
        </p>
      </div>
    </div>

    {/* RIGHT SIDE - LOGIN FORM */}
    <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-50 px-6">

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg space-y-6">

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