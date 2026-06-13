'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { handleApiError } from '@/lib/utils/errorHandler';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const redirect = searchParams.get('redirect');
      router.push(redirect && redirect.startsWith('/') ? redirect : '/dashboard');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .login-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          display: flex;
          overflow: hidden;
        }

        /* ===== LEFT PANEL ===== */
        .login-left {
          position: relative;
          flex: 1.1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
        }

        .login-left img.bg-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 8s ease;
        }

        .login-left:hover img.bg-photo {
          transform: scale(1.04);
        }

        .login-left-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(180, 70, 0, 0.18) 0%,
            rgba(120, 40, 0, 0.55) 50%,
            rgba(40, 15, 0, 0.88) 100%
          );
        }

        .login-left-content {
          position: relative;
          z-index: 2;
          padding: 48px 52px;
        }

        .campus-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 120, 20, 0.18);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 150, 50, 0.35);
          border-radius: 100px;
          padding: 7px 18px;
          margin-bottom: 28px;
          box-shadow: 0 4px 24px rgba(200, 80, 0, 0.2);
        }

        .campus-badge span {
          font-size: 11.5px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .campus-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fb923c;
          animation: pulse-dot 2s ease-in-out infinite;
          box-shadow: 0 0 8px #fb923c;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.5); }
        }

        .login-left-title {
          font-size: 40px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.18;
          margin-bottom: 16px;
          text-shadow: 0 4px 32px rgba(0,0,0,0.5);
          letter-spacing: -0.5px;
        }

        .login-left-title span {
          color: #fb923c;
          display: block;
        }

        .login-left-subtitle {
          font-size: 14.5px;
          font-weight: 400;
          color: rgba(255,255,255,0.75);
          line-height: 1.75;
          max-width: 360px;
          margin-bottom: 40px;
        }

        .left-divider {
          width: 48px;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(to right, #fb923c, rgba(251,146,60,0.2));
          margin-bottom: 32px;
        }

        .left-tagline {
          font-size: 12.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ===== RIGHT PANEL ===== */
        .login-right {
          width: 440px;
          min-width: 440px;
          background: #f0f4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          position: relative;
          overflow: hidden;
        }

        .login-right::before {
          content: '';
          position: absolute;
          top: -120px;
          right: -120px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-right::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -80px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          position: relative;
          z-index: 1;
        }

        /* Logos row */
        .logo-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 32px;
        }

        .logo-row img {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }

        .logo-divider {
          width: 1px;
          height: 40px;
          background: #d1d5db;
        }

        .logo-text-block {}

        .logo-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e3a8a;
          line-height: 1.3;
        }

        .logo-subtitle {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        /* Heading */
        .form-heading {
          margin-bottom: 28px;
        }

        .form-heading h1 {
          font-size: 26px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .form-heading h1 span {
          color: #d97706ff;
        }

        .form-heading p {
          font-size: 13.5px;
          color: #6b7280;
        }

        /* Form fields */
        .field-group {
          margin-bottom: 18px;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #345c9dff;
          margin-bottom: 7px;
          letter-spacing: 0.02em;
        }

        .field-input-wrap {
          position: relative;
        }

        .field-input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #d1d9e6;
          border-radius: 10px;
          font-size: 14px;
          color: #111827;
          background: #fff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .field-input::placeholder {
          color: #9ca3af;
        }

        .field-input:focus {
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30,64,175,0.10);
        }

        .field-input.has-icon {
          padding-right: 44px;
        }

        .field-icon-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .field-icon-btn:hover {
          color: #374151;
        }

        /* Error alert */
        .error-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 18px;
          font-size: 13px;
          color: #b91c1c;
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s, box-shadow 0.2s;
          background: linear-gradient(135deg, #d87816e8 50%, #d87816e8 50%, #d87816e8 50%);
          box-shadow: 0 4px 15px rgba(30,64,175,0.4);
          letter-spacing: 0.03em;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(215, 154, 22, 0.75);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .submit-btn-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 0.5s ease;
        }

        .submit-btn:hover .submit-btn-shine {
          left: 140%;
        }

        /* Spinner */
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer text */
        .login-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          line-height: 1.6;
        }

        .login-footer a {
          color: #c26417ff;
          text-decoration: none;
          font-weight: 500;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }

        .divider-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .divider-text {
          font-size: 11px;
          color: #9ca3af;
          white-space: nowrap;
        }

        /* Responsive */
        @media (max-width: 820px) {
          .login-left { display: none; }
          .login-right {
            width: 100%;
            min-width: unset;
            padding: 32px 24px;
          }
        }
      `}</style>

      <div className="login-root">

        {/* ===== LEFT SIDE — Campus Photo ===== */}
        <div className="login-left">
          <img
            src="/fotofik.jpg"
            alt="Gedung FIK UPNVJ"
            className="bg-photo"
          />
          <div className="login-left-overlay" />

          <div className="login-left-content">
            <div className="campus-badge">
              <div className="campus-badge-dot" />
              <span>Sistem Repository FIK UPNVJ</span>
            </div>

            <h2 className="login-left-title">
              Fakultas Ilmu Komputer<br />
              <span>UPN "Veteran" Jakarta</span>
            </h2>

            <div className="left-divider" />

            <p className="login-left-subtitle">
              Platform penyimpanan dan pengelolaan dokumen
              resmi sivitas akademika FIK UPNVJ.
            </p>

            <p className="left-tagline">Fakultas Ilmu Komputer · UPNVJ</p>
          </div>
        </div>

        {/* ===== RIGHT SIDE — Login Form ===== */}
        <div className="login-right">
          <div className="login-card">

            {/* Logo Row */}
            <div className="logo-row">
              <img src="/upnvj.png" alt="Logo UPNVJ" />
              <div className="logo-divider" />
              <div className="logo-text-block">
                <div className="logo-title">
                  Universitas Pembangunan Nasional<br />
                  "Veteran" Jakarta
                </div>
                <div className="logo-subtitle">Fakultas Ilmu Komputer</div>
              </div>
            </div>

            {/* Heading */}
            <div className="form-heading">
              <h1>Selamat Datang di <span>Repository FIK UPNVJ</span></h1>
              <p>Platform Repository Dokumen Internal FIK UPNVJ</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>

              {/* Email */}
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">
                  Alamat Email
                </label>
                <div className="field-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input"
                    placeholder="Email FIK UPNVJ"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label" htmlFor="login-password">
                  Kata Sandi
                </label>
                <div className="field-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input has-icon"
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="field-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="error-alert" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0, marginTop:'1px'}}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="submit-btn"
              >
                <span className="submit-btn-shine" />
                {loading ? (
                  <>
                    <span className="spinner" />
                    Sedang masuk...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>

            </form>

            <div className="divider-row">
              <div className="divider-line" />
              <span className="divider-text">Sistem Informasi Resmi</span>
              <div className="divider-line" />
            </div>

            <div className="login-footer">
              Akses hanya untuk sivitas akademika FIK UPNVJ.<br />
              Hubungi <a href="mailto:admin@fik.upnvj.ac.id">admin@fik.upnvj.ac.id</a> jika ada kendala.
            </div>

          </div>
        </div>

      </div>
    </>
  );
}