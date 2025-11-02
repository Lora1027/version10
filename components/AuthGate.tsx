
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function AuthGate({ children }:{ children: React.ReactNode }){
  const router = useRouter()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if(!data.session) router.replace('/login')
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if(!session) router.replace('/login')
    })
    return () => { sub.subscription.unsubscribe() }
  }, [router])
  if(!ready) return null
  return <>{children}</>
}
