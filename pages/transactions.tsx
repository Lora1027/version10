// pages/transactions.tsx
import { useEffect, useMemo, useState } from 'react'
import AuthGate from '../components/AuthGate'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabaseClient'
import { fmt } from '../lib/money'
import { downloadCSV } from '../lib/export'

type Tx = {
  id: string
  user_id: string
  date: string
  type: 'income' | 'expense'
  category: string | null
  method: 'cash' | 'gcash' | 'bank'
  amount: number
  notes: string | null
  inserted_at: string
}

export default function TransactionsPage(){
  const [email, setEmail] = useState<string|null>(null)
  const [rows, setRows] = useState<Tx[]>([])
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<Tx | null>(null)
  const [filters, setFilters] = useState<{q:string; type:''|'income'|'expense'; method:''|'cash'|'gcash'|'bank'}>({q:'', type:'', method:''})

  useEffect(() => { (async () => {
    const me = await supabase.auth.getUser()
    setEmail(me.data.user?.email ?? null)
    await load()
  })()}, [])

  async function load(){
    let query = supabase.from('transactions').select('*').order('date', { ascending:false }).limit(1000)
    if (filters.type)   query = query.eq('type', filters.type)
    if (filters.method) query = query.eq('method', filters.method)
    const { data, error } = await query
    if (error) { alert('Load failed: ' + error.message); return }
    let list = (data as Tx[]) || []
    if (filters.q) {
      const q = filters.q.toLowerCase()
      list = list.filter(r => (r.category||'').toLowerCase().includes(q) || (r.notes||'').toLowerCase().includes(q))
    }
    setRows(list)
  }

  async function add(e: React.FormEvent){
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    const rec = {
      date: String(f.get('date') || new Date().toISOString().slice(0,10)),
      type: String(f.get('type') || 'income') as 'income'|'expense',
      category: String(f.get('category') || ''),
      method: String(f.get('method') || 'cash') as 'cash'|'gcash'|'bank',
      amount: Number(f.get('amount') || 0),
      notes: String(f.get('notes') || '')
    }
    const { error } = await supabase.from('transactions').insert(rec as any)
    if (error) { alert('Save failed: ' + error.message); return }
    ;(e.target as HTMLFormElement).reset()
    setMsg('Saved.')
    await load()
  }

  async function saveEdit(){
    if (!editing) return
    const { id, user_id, inserted_at, ...payload } = editing
    const { error } = await supabase.from('transactions').update(payload as any).eq('id', id)
    if (error) { alert('Update failed: ' + error.message); return }
    setEditing(null)
    setMsg('Updated.')
    await load()
  }

  async function remove(id:string){
    if(!confirm('Delete this transaction?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { alert('Delete failed: ' + error.message); return }
    if (editing?.id === id) setEditing(null)
    setMsg('Deleted.')
    await load()
  }

  const totals = useMemo(() => {
    const income = rows.filter(r=>r.type==='income').reduce((a,b)=>a+b.amount,0)
    const expense = rows.filter(r=>r.type==='expense').reduce((a,b)=>a+b.amount,0)
    return { income, expense, net: income - expense }
  }, [rows])

  const exportRows = useMemo(() => rows.map(r => ({
    date:r.date, type:r.type, category:r.category, method:r.method, amount:r.amount, notes:r.notes
  })), [rows])

  return (
    <AuthGate>
      <Nav email={email} />
      <div className="container">

        <div className="kpi">
          <div className="card"><h3>Total Income</h3><div>{fmt(totals.income)}</div></div>
          <div className="card"><h3>Total Expense</h3><div>{fmt(totals.expense)}</div></div>
          <div className="card"><h3>Net</h3><div>{fmt(totals.net)}</div></div>
        </div>

        <div className="card">
          <h2>Add Transaction</h2>
          <form className="row" onSubmit={add}>
            <div style={{gridColumn:'span 2'}}><label>Date</label><input className="input" name="date" type="date" required/></div>
            <div style={{gridColumn:'span 2'}}><label>Type</label>
              <select className="input" name="type">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div style={{gridColumn:'span 3'}}><label>Category</label><input className="input" name="category" placeholder="e.g. Sales / COGS / Rent"/></div>
            <div style={{gridColumn:'span 2'}}><label>Method</label>
              <select className="input" name="method">
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div style={{gridColumn:'span 2'}}><label>Amount</label><input className="input" name="amount" type="number" step="0.01" required/></div>
            <div style={{gridColumn:'span 12'}}><label>Notes</label><input className="input" name="notes" placeholder="(optional)"/></div>
            <div style={{gridColumn:'span 12'}}><button className="btn">Save</button></div>
          </form>
          {msg && <p className="small" style={{marginTop:6}}>{msg}</p>}
        </div>

        <div className="card">
          <h2>Filter / Export</h2>
          <div className="row">
            <div style={{gridColumn:'span 4'}}>
              <label>Search (category/notes)</label>
              <input className="input" value={filters.q} onChange={e=>setFilters({...filters, q:e.target.value})}/>
            </div>
            <div style={{gridColumn:'span 3'}}>
              <label>Type</label>
              <select className="input" value={filters.type} onChange={e=>setFilters({...filters, type:e.target.value as any})}>
                <option value="">(all)</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div style={{gridColumn:'span 3'}}>
              <label>Method</label>
              <select className="input" value={filters.method} onChange={e=>setFilters({...filters, method:e.target.value as any})}>
                <option value="">(all)</option>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div style={{gridColumn:'span 2', display:'flex', alignItems:'end', gap:8}}>
              <button className="btn" onClick={load}>Apply</button>
              <button className="btn secondary" onClick={()=>downloadCSV('transactions.csv', exportRows)}>Download CSV</button>
              <button className="btn secondary" onClick={()=>window.print()}>Print</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Recent Transactions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Category</th><th>Method</th><th>Amount</th><th>Notes</th><th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.type}</td>
                  <td>{r.category}</td>
                  <td>{r.method}</td>
                  <td>{fmt(r.amount)}</td>
                  <td>{r.notes}</td>
                  <td className="no-print">
                    <button className="btn secondary" style={{marginRight:6}} onClick={()=>setEditing({...r})}>Edit</button>
                    <button className="btn" onClick={()=>remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan={7} className="small">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="card">
            <h2>Edit Transaction</h2>
            <div className="row">
              <div style={{gridColumn:'span 2'}}><label>Date</label>
                <input className="input" type="date" value={editing.date} onChange={e=>setEditing({...editing, date:e.target.value})}/></div>
              <div style={{gridColumn:'span 2'}}><label>Type</label>
                <select className="input" value={editing.type} onChange={e=>setEditing({...editing, type:e.target.value as any})}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div style={{gridColumn:'span 3'}}><label>Category</label>
                <input className="input" value={editing.category||''} onChange={e=>setEditing({...editing, category:e.target.value})}/></div>
              <div style={{gridColumn:'span 2'}}><label>Method</label>
                <select className="input" value={editing.method} onChange={e=>setEditing({...editing, method:e.target.value as any})}>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div style={{gridColumn:'span 2'}}><label>Amount</label>
                <input className="input" type="number" step="0.01" value={editing.amount}
                       onChange={e=>setEditing({...editing, amount:Number(e.target.value)})}/></div>
              <div style={{gridColumn:'span 12'}}><label>Notes</label>
                <input className="input" value={editing.notes||''} onChange={e=>setEditing({...editing, notes:e.target.value})}/></div>
              <div style={{gridColumn:'span 12', display:'flex', gap:8}}>
                <button className="btn" onClick={saveEdit}>Update</button>
                <button className="btn secondary" onClick={()=>setEditing(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthGate>
  )
}
