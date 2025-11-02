
import { useEffect, useMemo, useState } from 'react'
import AuthGate from '../components/AuthGate'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabaseClient'
import { fmt } from '../lib/money'
import BalancesInline from '../components/BalancesInline'

type Tx = {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string | null
  method: 'cash' | 'gcash' | 'bank'
  amount: number
}
type Balance = { id:string; label:string; kind:'cash'|'gcash'|'bank'|'capital'; balance:number; updated_at:string }

function yyyymm(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
}
function sum(ns: number[]) { return ns.reduce((a,b)=>a+b,0) }
function betweenDaysInclusive(minDate?: string, maxDate?: string) {
  if (!minDate || !maxDate) return 0
  const a = new Date(minDate + 'T00:00:00').getTime()
  const b = new Date(maxDate + 'T00:00:00').getTime()
  const days = Math.floor((b - a) / (1000*60*60*24)) + 1
  return Math.max(0, days)
}
function isCOGS(cat?: string | null) { return (cat ?? '').trim().toLowerCase() === 'cogs' }
function isStockIn(cat?: string | null) {
  const c = (cat ?? '').toLowerCase()
  return c.includes('stock') || c.includes('inventory')
}

export default function ComparisonAll(){
  const [email, setEmail] = useState<string | null>(null)
  const [tx, setTx] = useState<Tx[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll(){
    const [{ data: t, error: te }, { data: b, error: be }] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      supabase.from('balances').select('*').order('updated_at', { ascending: true }),
    ])
    if (te) { alert('Load failed: ' + te.message); setLoading(false); return }
    if (be) { alert('Load failed: ' + be.message); setLoading(false); return }
    setTx((t as Tx[]) || [])
    setBalances((b as Balance[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(me => setEmail(me.data.user?.email ?? null))
    loadAll()
  }, [])

  const {
    firstDate, lastDate, days, revenue, orders, cogs, stockIn, opex, grossProfit, netProfit,
    beginningCapital, cashOnHand, diffProfitVsCash, avgSalesPerDay, avgGrossProfitPerDay, growthPct,
    monthlyRows
  } = useMemo(() => {
    const byDay = tx.length ? { firstDate: tx[0].date, lastDate: tx[tx.length-1].date } : { firstDate: undefined, lastDate: undefined }
    const days = betweenDaysInclusive(byDay.firstDate, byDay.lastDate) || 1
    const revenue = sum(tx.filter(r=>r.type==='income').map(r=>r.amount))
    const orders  = tx.filter(r=>r.type==='income').length
    const cogs    = sum(tx.filter(r=>r.type==='expense' && isCOGS(r.category)).map(r=>r.amount))
    const stockIn = sum(tx.filter(r=>r.type==='expense' && isStockIn(r.category)).map(r=>r.amount))
    const opex    = sum(tx.filter(r=>r.type==='expense' && !isCOGS(r.category)).map(r=>r.amount))
    const grossProfit = revenue - cogs
    const netProfit   = revenue - (cogs + opex)

    const beginningCapital = balances.filter(b=>b.kind==='capital').reduce((a,b)=>a+b.balance,0)
    const cashOnHand = balances.filter(b=>['cash','gcash','bank'].includes(b.kind)).reduce((a,b)=>a+b.balance,0)
    const diffProfitVsCash = cashOnHand - netProfit

    const avgSalesPerDay = revenue / days
    const avgGrossProfitPerDay = grossProfit / days

    const byMonth: Record<string, { sales:number; orders:number; cogs:number; opex:number }> = {}
    for (const r of tx) {
      const key = yyyymm(r.date)
      if (!byMonth[key]) byMonth[key] = { sales:0, orders:0, cogs:0, opex:0 }
      if (r.type==='income'){ byMonth[key].sales += r.amount; byMonth[key].orders += 1; }
      else { if (isCOGS(r.category)) byMonth[key].cogs += r.amount; else byMonth[key].opex += r.amount; }
    }
    const keys = Object.keys(byMonth).sort()
    const monthlyRows = keys.map(k => {
      const m = byMonth[k]
      const gross = m.sales - m.cogs
      const net   = m.sales - (m.cogs + m.opex)
      return { month:k, sales:m.sales, orders:m.orders, grossProfit:gross, opex:m.opex, netProfit:net }
    })
    let growthPct = 0
    if (monthlyRows.length >= 2) {
      const last  = monthlyRows[monthlyRows.length-1].sales
      const prev  = monthlyRows[monthlyRows.length-2].sales
      growthPct = prev === 0 ? 0 : ((last - prev) / prev) * 100
    }
    return {
      firstDate: byDay.firstDate, lastDate: byDay.lastDate, days, revenue, orders, cogs, stockIn, opex,
      grossProfit, netProfit, beginningCapital, cashOnHand, diffProfitVsCash,
      avgSalesPerDay, avgGrossProfitPerDay, growthPct, monthlyRows
    }
  }, [tx, balances])

  if (loading) return null

  return (
    <AuthGate>
      <Nav email={email} />
      <div className="container">
        <div className="card">
          <h2>Business Overview (All Data)</h2>
          <div className="small">Range: {firstDate ?? '—'} to {lastDate ?? '—'} • Days: {days}</div>
          <div className="kpi" style={{marginTop:12}}>
            <div className="card"><h3>BEGINNING (CAPITAL)</h3><div>{fmt(beginningCapital)}</div></div>
            <div className="card"><h3>STOCK IN</h3><div>{fmt(stockIn)}</div></div>
            <div className="card"><h3>RUNNING STOCKS</h3><div>{fmt(beginningCapital + stockIn - cogs)}</div></div>
            <div className="card"><h3>TOTAL ORDER</h3><div>{orders.toLocaleString()}</div></div>
            <div className="card"><h3>TOTAL REVENUE</h3><div>{fmt(revenue)}</div></div>
            <div className="card"><h3>GROSS PROFIT</h3><div>{fmt(grossProfit)}</div></div>
            <div className="card"><h3>OPEX</h3><div>{fmt(opex)}</div></div>
            <div className="card"><h3>NET PROFIT</h3><div>{fmt(netProfit)}</div></div>
            <div className="card"><h3>CASH ON HAND</h3><div>{fmt(cashOnHand)}</div></div>
            <div className="card"><h3>PROFIT vs CASH</h3><div>{fmt(diffProfitVsCash)}</div></div>
          </div>
          <div className="small" style={{marginTop:6}}>“Profit vs Cash” = Cash on Hand − Net Profit (helps you see if real cash matches computed profit).</div>
        </div>

        <div className="card">
          <h2>Averages & Growth</h2>
          <div className="kpi">
            <div className="card"><h3>AVERAGE SALES (per day)</h3><div>{fmt(avgSalesPerDay)}</div></div>
            <div className="card"><h3>AVERAGE GROSS PROFIT (per day)</h3><div>{fmt(avgGrossProfitPerDay)}</div></div>
            <div className="card"><h3>GROWTH</h3><div>{growthPct.toFixed(0)}%</div></div>
          </div>
        </div>

        <div className="card">
          <h2>Cash / Bank / Capital (Inline Edit)</h2>
          <BalancesInline onChanged={loadAll} />
        </div>

        <div className="card">
          <h2>Monthly Breakdown</h2>
          <table className="table">
            <thead>
              <tr>
                <th>MONTH</th><th>SALES</th><th>ORDERS</th><th>GROSS PROFIT</th><th>OPEX</th><th>NET PROFIT</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map(r => (
                <tr key={r.month}>
                  <td>{r.month}</td>
                  <td>{fmt(r.sales)}</td>
                  <td>{r.orders.toLocaleString()}</td>
                  <td>{fmt(r.grossProfit)}</td>
                  <td>{fmt(r.opex)}</td>
                  <td>{fmt(r.netProfit)}</td>
                </tr>
              ))}
              {monthlyRows.length === 0 && <tr><td colSpan={6} className="small">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGate>
  )
}
