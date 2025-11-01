import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { AIStudioStorage, StudioMessage } from './AIStudioStorage'

export function StudioChat(props: { threadId: string, storage: AIStudioStorage, onChange: ()=>void }) {
  const { threadId, storage, onChange } = props
  const [messages, setMessages] = useState<StudioMessage[]>(storage.getMessages(threadId))
  const [input, setInput] = useState('Explore the core value prop of a runbook SaaS.')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    setMessages(storage.getMessages(threadId))
  }, [threadId])

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim()) return
    setLoading(true)
    storage.appendMessage(threadId, 'user', input)
    onChange()
    setMessages(storage.getMessages(threadId))
    setInput('')

    const payload = { messages: [{ role:'system', content: 'You are an insightful, concise ideation partner.' }, ...storage.getMessages(threadId).map(m => ({ role: m.role, content: m.content }))] }
    const { data, error } = await supabase.functions.invoke('llm-router', { body: payload })
    if (error) {
      storage.appendMessage(threadId, 'assistant', `Error: ${error.message}`)
    } else {
      storage.appendMessage(threadId, 'assistant', data?.output_text || '[empty]')
    }
    onChange()
    setMessages(storage.getMessages(threadId))
    setLoading(false)
  }

  return (
    <div>
      <div className="card" style={{ background:'#111217', border:'1px solid #1f2430', borderRadius:12, padding:16 }}>
        <div className="small">Sandbox chat. Powered by <span className="badge">llm-router</span></div>
      </div>

      <div style={{ marginTop:12 }}>
        {messages.map(m => (
          <div key={m.id} className="card" style={{ background:'#0f1115', border:'1px solid #2a2f3a', borderRadius:12, padding:12, marginBottom:8 }}>
            <div className="small"><span className="badge">{m.role}</span></div>
            <div style={{ marginTop:6, whiteSpace:'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="card" style={{ background:'#111217', border:'1px solid #1f2430', borderRadius:12, padding:16, marginTop:12 }}>
        <textarea className="textarea" value={input} onChange={e=>setInput(e.target.value)} placeholder="Say something…" />
        <div style={{ marginTop:10, display:'flex', gap:8 }}>
          <button className="btn" onClick={send} disabled={loading}>{loading?'Sending…':'Send'}</button>
        </div>
      </div>
    </div>
  )
}
