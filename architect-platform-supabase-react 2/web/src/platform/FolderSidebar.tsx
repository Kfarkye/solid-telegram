import { useState } from 'react'
import '../platform.css'
import type { StudioThread } from './AIStudioStorage'

export function FolderSidebar(props: {
  threads: StudioThread[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onPromote: (id: string) => void
}) {
  const { threads, activeId, onSelect, onCreate, onRename, onDelete, onPromote } = props
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState<string>('')

  return (
    <div className="sidebar">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3>Studio</h3>
        <button className="btn" onClick={onCreate} title="New chat">New</button>
      </div>
      <div className="small">Persistent multi-conversations</div>
      <div className="hr" />
      <div>
        {threads.map(t => (
          <div key={t.id} className={`thread ${t.id===activeId?'active':''}`} onClick={() => onSelect(t.id)}>
            {editingId === t.id ? (
              <input className="input" value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>{ onRename(t.id, title || 'Untitled'); setEditingId(null) }} onKeyDown={e=>{ if (e.key==='Enter'){ onRename(t.id, title || 'Untitled'); setEditingId(null) } }} autoFocus />
            ) : (
              <>
                <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:150 }}>{t.title}</div>
                <div className="actions" onClick={e=>e.stopPropagation()}>
                  <button className="btn secondary" onClick={()=>{ setEditingId(t.id); setTitle(t.title) }}>Rename</button>
                  <button className="btn secondary" onClick={()=> onPromote(t.id)}>Promote</button>
                  <button className="btn secondary" onClick={()=> onDelete(t.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {threads.length === 0 && <div className="small">No conversations yet.</div>}
      </div>
    </div>
  )
}
