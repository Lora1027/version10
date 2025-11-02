// components/Nav.tsx
// ...
return (
  <div className="nav">
    <Link href="/">Dashboard</Link>
    <Link href="/transactions">Transactions</Link>   {/* <-- add this line */}
    <Link href="/inventory">Inventory</Link>
    <Link href="/comparison">Comparison</Link>
    <Link href="/balances">Balances</Link>
    <div style={{marginLeft:'auto'}} className="small">{email}</div>
    <button onClick={logout} className="btn secondary">Logout</button>
  </div>
)
// ...

import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Nav({ email }: { email?: string | null }){
  const router = useRouter()
  async function logout(){
    await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <div className="nav">
      <Link href="/">Dashboard</Link>
      <Link href="/inventory">Inventory</Link>
      <Link href="/comparison">Comparison</Link>
      <Link href="/balances">Balances</Link>
      <div style={{marginLeft:'auto'}} className="small">{email}</div>
      <button onClick={logout} className="btn secondary">Logout</button>
    </div>
  )
}
