
import { useEffect, useMemo, useState } from 'react'
import AuthGate from '../components/AuthGate'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabaseClient'
import { fmt } from '../lib/money'
import BalancesInline from '../components/BalancesInline'

type Tx = {
  id: string; user_id: string; date: string;
  type: 'income' | 'expense'; category: string | null;
  method: 'cash' | 'gcash' | 'bank'; amount: number; notes: string | null
}
type Balance = { id:string; user_id:string; label:string; kind:'cash'|'gcash'|'bank'|'capital'; balance:number; updated_at:string }

export default function Dashboard(){
  const [email, setEmail] = useState<string|null>(null)
  const [tx, setTx] = useState<Tx[]>([])
  const [balances, setBalances] = useState<Balance[]>([])

  async function load(){
    const me = await supabase.auth.getUser()
    setEmail(me.data.user?.email ?? null)
    const { data: t } = await supabase.from('transactions').select('*').order('date', { ascending:false })
    setTx((t as Tx[]) || [])
    const { data: b } = await supabase.from('balances').select('*').order('updated_at', { ascending:false })
    setBalances((b as Balance[]) || [])
  }
  useEffect(()=>{ load() }, [])

  const totals = useMemo(()=>{
    const income = tx.filter(x=>x.type==='income').reduce((a,b)=>a+b.amount,0)
    const expense = tx.filter(x=>x.type==='expense').reduce((a,b)=>a+b.amount,0)
    const net = income-expense
    const cashOnHand = balances.filter(b=>['cash','gcash','bank'].includes(b.kind)).reduce((a,b)=>a+b.balance,0)
    const capital = balances.filter(b=>b.kind==='capital').reduce((a,b)=>a+b.balance,0)
    return { income, expense, net, cashOnHand, capital }
  },[tx, balances])

  return (
    <AuthGate>
      <Nav email={email} />
      <div className="container">
        <div className="kpi">
          <div className="card"><h3>Total Income</h3><div>{fmt(totals.income)}</div></div>
          <div className="card"><h3>Total Expenses</h3><div>{fmt(totals.expense)}</div></div>
          <div className="card"><h3>Net Profit</h3><div>{fmt(totals.net)}</div></div>
          <div className="card"><h3>Cash on Hand</h3><div>{fmt(totals.cashOnHand)}</div></div>
          <div className="card"><h3>Beginning (Capital)</h3><div>{fmt(totals.capital)}</div></div>
        </div>

        <div className="card">
          <h2>Cash / Bank / Capital (Inline Edit)</h2>
          <BalancesInline onChanged={load} />
        </div>
      </div>
    </AuthGate>
  )
}
