import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

export function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        navigate(from, { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, from])

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="title-bar">
          <div className="title">
            HEX<span className="highlight">Plore</span>
            <span className="cursor">█</span>
          </div>
        </div>
        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4a9eff',
                  brandAccent: '#3a8eef',
                  inputBackground: '#2a2a2a',
                  inputText: '#ffffff',
                  inputPlaceholder: '#888888',
                }
              }
            },
            style: {
              button: {
                borderRadius: '4px',
                fontSize: '14px',
              },
              input: {
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#2a2a2a',
                borderColor: '#333',
                color: '#fff',
              },
              label: {
                color: '#fff',
                fontSize: '14px',
              }
            },
          }}
          providers={[]}
          onlyThirdPartyProviders={false}
        />
      </div>
    </div>
  )
} 