import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './platform.css'
import { FolderSidebar } from './platform/FolderSidebar'
import { AIStudioStorage, type StudioThread } from './platform/AIStudioStorage'
import { StudioChat } from './platform/StudioChat'
import { ResultsContainer } from './platform/ResultsContainer'
import { StagedRevealOverlay } from './platform/StagedRevealOverlay'
import { useRealtimeLanes } from './platform/useRealtimeLanes'

type Mode = 'architect' | 'studio'

export default function TheArchitectPlatform() {
  const [mode, setMode] = useState<Mode>('architect')

  // Architect state
  const [vision, setVision] = useState('Build a SaaS that lets teams draft, review, and publish internal runbooks with role-based permissions, search, and versioning.')
  const [runId, setRunId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const { lanes, runStatus, reset: resetRealtime } = useRealtimeLanes(runId)

  // Studio state
  const storage = useMemo(() => new AIStudioStorage(), [])
  const [threads, setThreads] = useState<StudioThread[]>(storage.getThreads())
  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0]?.id ?? storage.createThread('New Idea').id)

  useEffect(() => {
    if (!threads.find(t => t.id === activeThreadId) && threads.length > 0) {
      setActiveThreadId(threads[0].id)
    }
  }, [threads, activeThreadId])

  // Promote Studio → Architect
  function promoteToArchitect(threadId: string) {
    const msgs = storage.getMessages(threadId)
    const transcript = msgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    const prompt = [
      'Use the following brainstorming transcript to craft a crisp product vision:',
      'Include product goals, core users, core jobs, constraints, and success criteria.',
      'Return a concise, high-level description first (2-3 sentences). Then bullet the rest.',
      '',
      transcript
    ].join('\n')
    setVision(prompt)
    setMode('architect')
  }

  async function startArchitecture() {
    if (!vision.trim()) return
    setRunning(true)
    setRunId(null)
    resetRealtime()

    const { data, error } = await supabase.functions.invoke('arch-runner', { body: { vision } })
    if (error) {
      console.error(error)
      setRunning(false)
      return
    }
    if (data?.run_id) setRunId(data.run_id)
  }

  useEffect(() => {
    if (runStatus === 'succeeded' || runStatus === 'failed') setRunning(false)
  }, [runStatus])

  return (
    <div className="platform-root">
      <header className="platform-header">
        <div className="platform-header-inner">
          <div className="brand">
            <div className="dot" />
            <strong>Architect Platform</strong>
          </div>
          <div className="mode-toggle">
            <button className={mode==='architect'?'active':''} onClick={()=>setMode('architect')}>Architect</button>
            <button className={mode==='studio'?'active':''} onClick={()=>setMode('studio')}>Studio</button>
          </div>
        </div>
      </header>

      <div className="platform-body">
        {mode === 'architect' ? (
          <div className="main-pane">
            <div className="card" style={{ background:'#111217', border:'1px solid #1f2430', borderRadius:12, padding:16 }}>
              <label>Vision</label>
              <textarea className="textarea" value={vision} onChange={e=>setVision(e.target.value)} placeholder="Describe what you want to build…" />
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button className="btn" onClick={startArchitecture} disabled={running}>{running ? 'Building…' : 'Build Architecture'}</button>
                {runId && <span className="badge">Run: {runId.slice(0,8)}</span>}
                {runStatus && <span className="badge">Status: {runStatus}</span>}
              </div>
            </div>

            <div style={{ marginTop:16 }}>
              <ResultsContainer runId={runId} lanes={lanes} />
            </div>

            {running && <StagedRevealOverlay lanes={lanes} onCancel={()=>{}} />}
          </div>
        ) : (
          <div style={{ display:'flex', gap:14, width:'100%' }}>
            <div className="left-rail">
              <FolderSidebar
                threads={threads}
                activeId={activeThreadId}
                onSelect={id => setActiveThreadId(id)}
                onCreate={() => { const t = storage.createThread('New Idea'); setThreads(storage.getThreads()); setActiveThreadId(t.id); }}
                onRename={(id, title) => { storage.renameThread(id, title); setThreads(storage.getThreads()); }}
                onDelete={(id) => { storage.deleteThread(id); setThreads(storage.getThreads()); }}
                onPromote={(id) => promoteToArchitect(id)}
              />
            </div>
            <div className="main-pane">
              <StudioChat
                threadId={activeThreadId}
                storage={storage}
                onChange={() => setThreads(storage.getThreads())}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
