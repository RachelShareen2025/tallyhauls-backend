import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Read any pending signup data stored before redirect (magic link flow)
  function readPending() {
    try {
      const raw = localStorage.getItem('tallyhauls_pending')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  }

  function clearPending() {
    try {
      localStorage.removeItem('tallyhauls_pending')
    } catch (e) {}
  }

  // Listen for auth state changes (SIGNED_IN -> upsert user row & redirect)
  useEffect(() => {
    const handleAuth = async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user
          // Prefer local state, but if user came via magic link (new tab) read pending from localStorage
          const pending = readPending() || {}
          const companyVal = company || pending.company || ''
          const contactVal = contactInfo || pending.contact_info || pending.contactInfo || ''
          const emailVal = user.email || pending.email || ''

          // Upsert user row (id primary key expected)
          const { error: upsertError } = await supabase.from('users').upsert([
            {
              id: user.id,
              email: emailVal,
              company: companyVal,
              contact_info: contactVal
            }
          ])
          if (upsertError) console.error('Upsert user error on SIGNED_IN:', upsertError)

          // Clean pending storage
          clearPending()

          // Redirect to dashboard only if not already there (prevents loops)
          if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard'
          }
        }
      } catch (e) {
        console.error('Auth state handler error:', e)
      }
    }

    const sub = supabase.auth.onAuthStateChange((event, session) => {
      handleAuth(event, session)
    })

    // cleanup subscription
    return () => {
      try {
        sub?.data?.subscription?.unsubscribe?.()
      } catch (e) {}
    }
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) 

  // Helper: attempt to insert/upsert user row when we have a user object
  async function upsertUserRow(userId, userEmail, companyVal, contactVal) {
    try {
      const { error } = await supabase.from('users').upsert([
        {
          id: userId,
          email: userEmail,
          company: companyVal || '',
          contact_info: contactVal || ''
        }
      ])
      if (error) throw error
    } catch (err) {
      console.error('Error upserting user row:', err)
    }
  }

  // Store pending signup data (used for magic-link redirect flows)
  function storePending(emailVal, companyVal, contactVal) {
    try {
      const payload = {
        email: emailVal || '',
        company: companyVal || '',
        contact_info: contactVal || '',
        created_at: new Date().toISOString()
      }
      localStorage.setItem('tallyhauls_pending', JSON.stringify(payload))
    } catch (e) {
      console.error('Failed to store pending signup data', e)
    }
  }

  // Signup with email + password (explicit redirectTo)
  async function signUp() {
    setLoading(true)
    setMessage('')
    try {
      // Save pending details so when user confirms via email we can upsert company/contact
      storePending(email, company, contactInfo)

      const redirectTo = window.location.origin
      const { data, error } = await supabase.auth.signUp(
        { email, password },
        { redirectTo }
      )

      if (error) {
        setMessage(`Signup error: ${error.message}`)
        setLoading(false)
        return
      }

      // If user object is returned immediately (depends on confirmation settings), upsert now
      const userId = data?.user?.id
      const userEmail = data?.user?.email
      if (userId && userEmail) {
        await upsertUserRow(userId, userEmail, company, contactInfo)
        clearPending()
      }

      setMessage('Signup successful! Check your email to confirm (or click the magic link).')
    } catch (err) {
      console.error(err)
      setMessage(`Signup error: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Login with email + password
  async function signIn() {
    setLoading(true)
    setMessage('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(`Login error: ${error.message}`)
        setLoading(false)
        return
      }

      const userId = data?.user?.id
      const userEmail = data?.user?.email
      if (userId && userEmail) {
        // upsert with current form values (if provided)
        await upsertUserRow(userId, userEmail, company, contactInfo)
        // Redirect only if not already on dashboard
        if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard'
        }
      } else {
        setMessage('Logged in successfully!')
      }
    } catch (err) {
      console.error(err)
      setMessage(`Login error: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Magic link login (passwordless) — explicitly set redirectTo and store pending
  async function magicLink() {
    setLoading(true)
    setMessage('')
    try {
      // Store data before redirect so we can upsert after magic link click
      storePending(email, company, contactInfo)

      const redirectTo = window.location.origin
      const { error } = await supabase.auth.signInWithOtp({
        email
      }, {
        redirectTo
      })

      if (error) {
        setMessage(`Magic link error: ${error.message}`)
      } else {
        setMessage('Magic link sent! Check your email.')
      }
    } catch (err) {
      console.error(err)
      setMessage(`Magic link error: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: 6 }}>Welcome to TallyHauls</h2>
      <p style={{ marginTop: 0, marginBottom: 18 }}>Your Freight Finances, Simplified. Enter your email.</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }}
      />

      <input
        type="password"
        placeholder="Password (optional for magic link)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }}
      />

      <input
        type="text"
        placeholder="Company (optional)"
        value={company}
        onChange={e => setCompany(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }}
      />

      <input
        type="text"
        placeholder="Contact info (phone / WhatsApp / role)"
        value={contactInfo}
        onChange={e => setContactInfo(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 10, marginBottom: 16, boxSizing: 'border-box' }}
      />

      <button
        onClick={signUp}
        disabled={loading || !email || !password}
        style={{ width: '100%', padding: 12, marginBottom: 10, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Sign Up
      </button>

      <button
        onClick={signIn}
        disabled={loading || !email || !password}
        style={{ width: '100%', padding: 12, marginBottom: 10, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Log In
      </button>

      <button
        onClick={magicLink}
        disabled={loading || !email}
        style={{ width: '100%', padding: 12, marginBottom: 10, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Send Magic Link
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  )
}
