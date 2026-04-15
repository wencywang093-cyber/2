import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { Editor } from './components/Editor'
import type { Session } from '@supabase/supabase-js'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />
  }

  return (
    <Editor
      userId={session.user.id}
      onLogout={() => supabase.auth.signOut()}
    />
  )
}

export default App
