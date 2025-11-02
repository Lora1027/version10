
import { useEffect, useMemo, useState } from 'react'
import AuthGate from '../components/AuthGate'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabaseClient'
import { fmt } from '../lib/money'
import { downloadCSV } from '../lib/export'

type Item = { id:string; user_id:string; sku:string; name:string; unit_cost:number; qty_on_hand:number; created_at:string }

export default function Inventory(){
  const [email, setEmail] = useState<string|null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [msg, setMsg] = useState('')
  const [editRow, setEditRow] = useState<Item | null>(null)

  async function load(){
    const me = await supabase.auth.getUser()
    setEmail(me.data.user?.email ?? null)
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending:false })
    if (error) { alert('Load failed: ' + error.message); return; }
    setItems((data as Item[]) || [])
  }
  useEffect(()=>{ load() }, [])

  async function addSingle(e:any){
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    const { error } = await supabase.from('inventory').insert({
      sku: String(f.get('sku')||''),
      name: String(f.get('name')||''),
      unit_cost: Number(f.get('unit_cost')||0),
      qty_on_hand: Number(f.get('qty_on_hand')||0)
    } as any)
    if (error) { alert('Save failed: ' + error.message); return; }
    ;(e.target as HTMLFormElement).reset()
    load()
  }

  function parseCSV(text:string){
    const lines = text.trim().split(/\r?\n/)
    const rows = lines.map(l => l.split(',').map(x=>x.trim()))
    const [h, ...data] = rows
    if(!h || h.length<4) throw new Error('Invalid header. Expected sku,name,unit_cost,qty_on_hand')
    return data.map(r => ({ sku:r[0], name:r[1], unit_cost:Number(r[2]||0), qty_on_hand:Number(r[3]||0) }))
  }

  async function bulkUpload(e:any){
    const file = e.target.files?.[0]
    if(!file) return
    const text = await file.text()
    try{
      const records = parseCSV(text).slice(0, 2000)
      const { error } = await supabase.from('inventory').insert(records as any[])
      if(error) { alert('Bulk upload failed: ' + error.message); return; }
      setMsg(`Uploaded ${records.length} items.`)
      load()
    }catch(err:any){
      setMsg(err.message)
    }
  }

  async function saveEdit(){
    if(!editRow) return
    const { id, ...rest } = editRow
    const { error } = await supabase.from('inventory').update(rest as any).eq('id', id)
    if(error){ alert('Update failed: ' + error.message); return; }
    setEditRow(null)
    load()
  }

  async function remove(id:string){
    if(!confirm('Delete this item?')) return
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if(error){ alert('Delete failed: ' + error.message); return; }
    if(editRow?.id === id) setEditRow(null)
    load()
  }

  const rowsForExport = useMemo(() => items.map(x => ({
    sku: x.sku, name: x.name, unit_cost: x.unit_cost, qty_on_hand: x.qty_on_hand,
    total_value: x.unit_cost * x.qty_on_hand, created_at: x.created_at
  })), [items])

  return (
    <AuthGate>
      <Nav email={email} />
      <div className="container">
        <div className="card">
          <h2>Add Single Item</h2>
          <form className="row" onSubmit={addSingle}>
            <div style={{gridColumn:'span 3'}}><label>SKU</label><input className="input" name="sku" required/></div>
            <div style={{gridColumn:'span 5'}}><label>Name</label><input className="input" name="name" required/></div>
            <div style={{gridColumn:'span 2'}}><label>Unit Cost</label><input className="input" name="unit_cost" type="number" step="0.01" required/></div>
            <div style={{gridColumn:'span 2'}}><label>Qty</label><input className="input" name="qty_on_hand" type="number" step="1" required/></div>
            <div style={{gridColumn:'span 12'}}><button className="btn">Save</button></div>
          </form>
        </div>

        <div className="card">
          <h2>Bulk Upload (CSV)</h2>
          <input className="no-print" type="file" accept=".csv" onChange={bulkUpload} />
          <p className="small">Expected columns: <code>sku,name,unit_cost,qty_on_hand</code></p>
          {msg && <p className="small">{msg}</p>}
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <button className="btn no-print" onClick={() => downloadCSV('inventory_export.csv', rowsForExport)}>Download CSV (Excel)</button>
            <button className="btn secondary no-print" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        <div className="card">
          <h2>Inventory</h2>
          <table className="table">
            <thead><tr><th>SKU</th><th>Name</th><th>Unit Cost</th><th>Qty</th><th>Value</th><th>Added</th><th className="no-print">Actions</th></tr></thead>
            <tbody>
              {items.map(x => (
                <tr key={x.id}>
                  <td>{x.sku}</td><td>{x.name}</td><td>{fmt(x.unit_cost)}</td><td>{x.qty_on_hand}</td>
                  <td>{fmt(x.unit_cost * x.qty_on_hand)}</td><td>{new Date(x.created_at).toLocaleDateString()}</td>
                  <td className="no-print">
                    <button className="btn secondary" style={{marginRight:6}} onClick={() => setEditRow({...x})}>Edit</button>
                    <button className="btn" onClick={() => remove(x.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="small">No items yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGate>
  )
}
