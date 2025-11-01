export type StudioRole = 'user' | 'assistant' | 'system'

export interface StudioMessage {
  id: string
  role: StudioRole
  content: string
  ts: number
}

export interface StudioThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

type DBShape = {
  version: number
  threads: StudioThread[]
  messages: Record<string, StudioMessage[]>
}

const KEY = 'ai-studio-db-v1'

export class AIStudioStorage {
  private db: DBShape

  constructor() {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      this.db = JSON.parse(raw)
    } else {
      this.db = { version: 1, threads: [], messages: {} }
      this.persist()
    }
  }

  private persist() {
    localStorage.setItem(KEY, JSON.stringify(this.db))
  }

  getThreads(): StudioThread[] {
    return [...this.db.threads].sort((a,b)=>b.updatedAt - a.updatedAt)
  }

  getMessages(threadId: string) {
    return this.db.messages[threadId] ?? []
  }

  createThread(title: string): StudioThread {
    const id = crypto.randomUUID()
    const now = Date.now()
    const t: StudioThread = { id, title, createdAt: now, updatedAt: now }
    this.db.threads.push(t)
    this.db.messages[id] = []
    this.persist()
    return t
  }

  renameThread(id: string, title: string) {
    const t = this.db.threads.find(x => x.id === id)
    if (!t) return
    t.title = title
    t.updatedAt = Date.now()
    this.persist()
  }

  deleteThread(id: string) {
    this.db.threads = this.db.threads.filter(x => x.id !== id)
    delete this.db.messages[id]
    this.persist()
  }

  appendMessage(threadId: string, role: StudioRole, content: string) {
    const m = { id: crypto.randomUUID(), role, content, ts: Date.now() }
    this.db.messages[threadId] = this.db.messages[threadId] ?? []
    this.db.messages[threadId].push(m)
    const t = this.db.threads.find(x => x.id === threadId)
    if (t) t.updatedAt = Date.now()
    this.persist()
    return m
  }
}
