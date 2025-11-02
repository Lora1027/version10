
import { useEffect, useMemo, useState } from 'react'
import AuthGate from '../components/AuthGate'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabaseClient'
import { fmt } from '../lib/money'
import { downloadCSV } from '../lib/export'

type Balance = { id:string; user_id:string; label:string; kind:'cash'|'gcash'|'bank'|'capital'; balance:number; updated_at:string }

export default function BalancesPage(){
  const [email, setEmail] = useState<string|null>(null)
  const [rows, setRows] = useState<Balance[]>([])
  const [editing, setEditing] = useState<Balance | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { (async () => {
      const me = await supabase.auth.getUser()
      setEmail(me.data.user?.email ?? null)
      await load()
  })()}, [])

  async function load() {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) { alert('Load failed: ' + error.message); return }
    setRows((data as Balance[]) || [])
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    const record = {
      label: String(f.get('label')||''),
      kind: String(f.get('kind')||'cash') as Balance['kind'],
      balance: Number(f.get('balance')||0)
    }
    const { error } = await supabase.from('balances').insert(record as any)
    if (error) { alert('Save failed: ' + error.message); return }
    ;(e.target as HTMLFormElement).reset()
    setMsg('Saved.')
    await load()
  }

  async function saveEdit() {
    if (!editing) return
    const { id, user_id, ...payload } = editing
    const { error } = await supabase.from('balances').update(payload as any).eq('id', id)
    if (error) { alert('Update failed: ' + error.message); return }
    setEditing(null)
    setMsg('Updated.')
    await load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this balance record?')) return
    const { error } = await supabase.from('balances').delete().eq('id', id)
    if (error) { alert('Delete failed: ' + error.message); return }
    if (editing?.id === id) setEditing(null)
    setMsg('Deleted.')
    await load()
  }

  const total = useMemo(() => rows.reduce((a,b)=>a + b.balance, 0), [rows])
  const exportRows = useMemo(() => rows.map(r => ({
    label: r.label, kind: r.kind, balance: r.balance, updated_at: r.updated_at
  })), [rows])

  return (
    <AuthGate>
      <Nav email={email} />
      <div className="container">
        <div className="card">
          <h2>Add Balance</h2>
          <form className="row" onSubmit={add}>
            <div style={{ gridColumn:'span 4' }}>
              <label>Label</label>
              <input className="input" name="label" placeholder="e.g. Starting Capital / Cash Drawer / GCash / BPI" required />
            </div>
            <div style={{ gridColumn:'span 3' }}>
              <label>Kind</label>
              <select className="input" name="kind">
                <option value="capital">Capital</option>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div style={{ gridColumn:'span 3' }}>
              <label>Amount</label>
              <input className="input" name="balance" type="number" step="0.01" required />
            </div>
            <div style={{ gridColumn:'span 2', display:'flex', alignItems:'end' }}>
              <button className="btn">Save</button>
            </div>
          </form>
          {msg && <p className="small" style={{marginTop:6}}>{msg}</p>}
        </div>

        <div className="card">
          <h2>Balances</h2>
          <div style={{display:'flex', gap:8, marginBottom:8}}>
            <div className="small" style={{padding:'8px 0'}}>Total: <b>{fmt(total)}</b></div>
            <button className="btn" onClick={() => downloadCSV('balances.csv', exportRows)}>Download CSV</button>
            <button className="btn secondary" onClick={() => window.print()}>Print</button>
          </div>
          <table className="table">
            <thead>
              <tr><th>Label</th><th>Kind</th><th>Amount</th><th>Updated</th><th className="no-print">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td>{r.kind}</td>
                  <td>{fmt(r.balance)}</td>
                  <td>{new Date(r.updated_at).toLocaleString()}</td>
                  <td className="no-print">
                    <button className="btn secondary" style={{marginRight:6}} onClick={() => setEditing({...r})}>Edit</button>
                    <button className="btn" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="small">No balances recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="card">
            <h2>Edit Balance</h2>
            <div className="row">
              <div style={{ gridColumn:'span 4' }}>
                <label>Label</label>
                <input className="input" value={editing.label} onChange={e => setEditing({...editing, label:e.target.value})}/>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label>Kind</label>
                <select className="input" value={editing.kind} onChange={e => setEditing({...editing, kind:e.target.value as any})}>
                  <option value="capital">Capital</option>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div style={{ gridColumn:'span 3' }}>
                <label>Amount</label>
                <input className="input" type="number" step="0.01" value={editing.balance}
                       onChange={e => setEditing({...editing, balance:Number(e.target.value)})}/>
              </div>
              <div style={{ gridColumn:'span 2', display:'flex', gap:8, alignItems:'end' }}>
                <button className="btn" onClick={saveEdit}>Update</button>
                <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}
