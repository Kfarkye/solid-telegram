import '../platform.css'
import type { LaneKey, LaneState } from './useRealtimeLanes'

export function ResultsContainer(props: { runId: string | null, lanes: Record<LaneKey, LaneState> }) {
  const { runId, lanes } = props

  function renderLane(lane: LaneState) {
    const status = lane.status
    const done = status === 'succeeded'
    const failed = status === 'failed'
    let body: any = null
    if (lane.output) {
      if (lane.output.text) {
        body = <pre className="code">{lane.output.text}</pre>
      } else {
        body = <pre className="code">{JSON.stringify(lane.output, null, 2)}</pre>
      }
    } else {
      body = <div className="small">Waiting for output…</div>
    }
    return (
      <div className={`lane ${done?'done':''}`}>
        <span className="badge">{lane.lane.toUpperCase()}</span>
        <span className="badge">status: {status}</span>
        {failed && <span className="badge" style={{ borderColor:'#ef4444', color:'#ef4444' }}>failed</span>}
        <div style={{ marginTop:8, width:'100%' }}>{body}</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <h2 style={{ margin:0 }}>Results</h2>
        {runId && <span className="badge">Run: {runId.slice(0,8)}</span>}
      </div>
      <div className="grid">
        {renderLane(lanes.spec)}
        {renderLane(lanes.sql)}
        {renderLane(lanes.ui)}
        {renderLane(lanes.test)}
        {renderLane(lanes.cicd)}
      </div>
    </div>
  )
}
