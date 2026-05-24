'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function sendOTP() {
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  async function verifyOTP() {
    if (!otp) return
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, first_name')
        .eq('id', data.user.id)
        .single()
      if (!profile?.first_name) {
        window.location.href = '/onboarding'
      } else {
        window.location.href = '/'
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      Height: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-inter), Arial, sans-serif',
      overflow: 'hidden',
    }}>

      {/* Left — city image */}
<div style={{
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  height: '100vh',
}}>
  <img
    src="https://images.pexels.com/photos/14386946/pexels-photo-14386946.jpeg"
    alt="City"
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center bottom',
      display: 'block',
    }}
  />
  {/* Subtle dark overlay */}
  <div style={{
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 100%)',
    pointerEvents: 'none',
  }} />
</div>

      {/* Right — auth form */}
      <div style={{
        width: 440,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        background: '#fff',
        zIndex: 10,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <img src="/hypr.svg" alt="hypr" style={{ height: 28, width: 'auto' }} />
        </div>

        {step === 'email' ? (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: 26, fontWeight: 700, color: '#0f0f0f',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
                letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2,
              }}>
                Your city, your street,<br />your news.
              </h1>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>
                Sign in or create an account to get your hyperlocal feed.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 500,
                color: '#555', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOTP()}
                style={{
                  width: '100%', padding: '12px 14px',
                  borderRadius: 8, border: '1px solid #E0E0E0',
                  fontSize: 15, outline: 'none',
                  fontFamily: 'var(--font-inter), Arial, sans-serif',
                  color: '#0f0f0f', background: '#fafafa',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#2BA887'}
                onBlur={e => e.target.style.borderColor = '#E0E0E0'}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#E53935', marginBottom: 12 }}>{error}</div>
            )}

            <button
              onClick={sendOTP}
              disabled={loading || !email}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 8, border: 'none',
                background: loading || !email ? '#E0E0E0' : '#2BA887',
                color: loading || !email ? '#aaa' : '#fff',
                fontSize: 15, fontWeight: 600,
                cursor: loading || !email ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>

            <p style={{ fontSize: 11, color: '#bbb', marginTop: 16, lineHeight: 1.6, textAlign: 'center' }}>
              By continuing you agree to our Terms of Service and Privacy Policy.
            </p>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: '#0f0f0f',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
                letterSpacing: '-0.02em', marginBottom: 8,
              }}>
                Check your email
              </h1>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>
                We sent a 6-digit code to <strong style={{ color: '#0f0f0f' }}>{email}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="tel"
                  maxLength={1}
                  value={otp[i] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    const newOtp = otp.split('')
                    newOtp[i] = val
                    const joined = newOtp.join('').slice(0, 6)
                    setOtp(joined)
                    if (val && i < 5) {
                      document.getElementById(`otp-${i + 1}`)?.focus()
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      document.getElementById(`otp-${i - 1}`)?.focus()
                    }
                  }}
                  style={{
                    width: 48, height: 56, textAlign: 'center',
                    borderRadius: 8, border: '1px solid #E0E0E0',
                    fontSize: 22, fontWeight: 600,
                    fontFamily: 'var(--font-inter), Arial, sans-serif',
                    color: '#0f0f0f', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2BA887'}
                  onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                />
              ))}
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#E53935', marginBottom: 12 }}>{error}</div>
            )}

            <button
              onClick={verifyOTP}
              disabled={loading || otp.length < 6}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 8, border: 'none',
                background: loading || otp.length < 6 ? '#E0E0E0' : '#2BA887',
                color: loading || otp.length < 6 ? '#aaa' : '#fff',
                fontSize: 15, fontWeight: 600,
                cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
                transition: 'background 0.15s',
                marginBottom: 12,
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              style={{
                width: '100%', padding: '12px',
                borderRadius: 8, border: '1px solid #E0E0E0',
                background: '#fff', color: '#555',
                fontSize: 14, cursor: 'pointer',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
              }}
            >
              ← Use a different email
            </button>

            <p style={{ fontSize: 13, color: '#888', marginTop: 16, textAlign: 'center' }}>
              Didn't receive it?{' '}
              <span
                onClick={sendOTP}
                style={{ color: '#2BA887', cursor: 'pointer', fontWeight: 500 }}
              >
                Resend code
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
