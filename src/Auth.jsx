import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabase'

export function Auth() {
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
              },
            },
          }}
          providers={[]}
          redirectTo={`${window.location.origin}/app`}
        />
      </div>
    </div>
  )
} 