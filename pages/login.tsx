
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [msg, setMsg] = useState<string>('')
  const router = useRouter()

  async function handle(){
    setMsg('')
    if(mode==='signup'){
      const { error } = await supabase.auth.signUp({ email, password })
      if(error) setMsg(error.message); else setMsg('Check your email to confirm. Then sign in.')
    }else{
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if(error) setMsg(error.message); else { setMsg(''); router.push('/') }
    }
  }

  return (
    <div className="container">
      <h1>Inkhale Business Platform</h1>
      <div className="card" style={{maxWidth:480}}>
        <label>Email</label>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        <label style={{marginTop:8}}>Password</label>
        <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <div style={{display:'flex',gap:8, marginTop:12}}>
          <button className="btn" onClick={handle}>{mode==='signin'?'Sign in':'Sign up'}</button>
          <button className="btn secondary" onClick={()=>setMode(mode==='signin'?'signup':'signin')}>Switch to {mode==='signin'?'Sign up':'Sign in'}</button>
        </div>
        {msg && <p className="small" style={{marginTop:8}}>{msg}</p>}
      </div>
      <footer>Set your Supabase keys in <code>.env.local</code></footer>
    </div>
  )
}
