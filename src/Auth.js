import { supabase } from './supabaseClient'

let email = ''
let setMessage
let setLoading

export function initAuth(_setMessage, _setLoading) {
  setMessage = _setMessage
  setLoading = _setLoading
}

export function setEmail(newEmail) {
  email = newEmail
}

export async function magicLink() {
  setLoading(true)
  setMessage('')
  try {
    const redirectTo = window.location.hostname.includes("localhost")
      ? "http://localhost:3000/dashboard"
      : "https://app.tallyhauls.com/dashboard"

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { redirectTo }
    })

    if (error) {
      console.error("SignIn error:", error)
      setMessage(`Magic link error: ${error.message}`)
    } else {
      setMessage('✅ Magic link sent! Check your email.')
    }
  } catch (err) {
    console.error(err)
    setMessage(`Magic link error: ${err?.message || 'Unknown error'}`)
  } finally {
    setLoading(false)
  }
}
