
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function DebugBar(){
  const [email, setEmail] = useState<string | null>(null)
  const [url, setUrl] = useState<string | undefined>(undefined)
  const [hasSession, setHasSession] = useState<boolean>(false)
  useEffect(() => {
    setUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    supabase.auth.getSession().then(({data}) => setHasSession(!!data.session))
    supabase.auth.getUser().then(({data}) => setEmail(data.user?.email ?? null))
  }, [])
  if (process.env.NEXT_PUBLIC_DEBUGBAR !== 'on') return null
  return (
    <div className="debugbar">
      <div><b>Debug</b></div>
      <div>Session: {hasSession ? 'YES' : 'NO'}</div>
      <div>User: {email || '(none)'}</div>
      <div>SUPABASE_URL: {url}</div>
    </div>
  )
}
