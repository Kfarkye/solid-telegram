import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type LaneKey = 'spec' | 'sql' | 'ui' | 'test' | 'cicd'
export type LaneState = {
  lane: LaneKey
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  output?: any
  meta?: any
  created_at?: string
}

export function useRealtimeLanes(runId: string | null) {
  const [lanes, setLanes] = useState<Record<LaneKey, LaneState>>({
    spec: { lane:'spec', status:'queued' },
    sql: { lane:'sql', status:'queued' },
    ui: { lane:'ui', status:'queued' },
    test: { lane:'test', status:'queued' },
    cicd: { lane:'cicd', status:'queued' },
  })
  const [runStatus, setRunStatus] = useState<'queued'|'running'|'succeeded'|'failed'|null>(null)

  useEffect(()=>{
    if (!runId) return
    let mounted = true

    async function hydrate() {
      const { data: laneRows } = await supabase.from('lane_events').select('*').eq('run_id', runId).order('created_at', { ascending: true })
      if (laneRows) {
        const next: any = { ...lanes }
        for (const row of laneRows) {
          next[row.lane] = { lane: row.lane, status: row.status, output: row.output, meta: row.meta, created_at: row.created_at }
        }
        if (mounted) setLanes(next)
      }
      const { data: runRows } = await supabase.from('arch_runs').select('*').eq('id', runId).limit(1)
      if (runRows && runRows.length) setRunStatus(runRows[0].status)
    }
    hydrate()

    const ch = supabase
      .channel(`lanes-${runId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lane_events', filter: `run_id=eq.${runId}` }, payload => {
        const row: any = payload.new
        setLanes(prev => ({ ...prev, [row.lane]: { lane: row.lane, status: row.status, output: row.output, meta: row.meta, created_at: row.created_at } }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arch_runs', filter: `id=eq.${runId}` }, payload => {
        const row: any = payload.new
        setRunStatus(row.status)
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  function reset() {
    setLanes({
      spec: { lane:'spec', status:'queued' },
      sql: { lane:'sql', status:'queued' },
      ui: { lane:'ui', status:'queued' },
      test: { lane:'test', status:'queued' },
      cicd: { lane:'cicd', status:'queued' },
    })
    setRunStatus(null)
  }

  return { lanes, runStatus, reset }
}
