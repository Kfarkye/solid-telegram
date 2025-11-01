import '../platform.css'
import type { LaneKey, LaneState } from './useRealtimeLanes'

export function StagedRevealOverlay(props: { lanes: Record<LaneKey, LaneState>, onCancel: ()=>void }) {
  const { lanes, onCancel } = props
  const order: LaneKey[] = ['spec','sql','ui','test','cicd']

  function pill(lane: LaneState) {
    const ok = lane.status === 'succeeded'
    return (
      <div className={`lane ${ok?'done':''}`}>
        <span className="badge">{lane.lane.toUpperCase()}</span>
        <span className="badge">status: {lane.status}</span>
      </div>
    )
  }

  return (
    <div className="overlay">
      <div className="overlay-card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <strong>Generating architecture…</strong>
          <button className="btn secondary" onClick={onCancel}>Dismiss</button>
        </div>
        <div className="small">Outputs reveal as lanes finish.</div>
        <div style={{ marginTop:8 }}>
          {order.map(k => <div key={k}>{pill(lanes[k])}</div>)}
        </div>
      </div>
    </div>
  )
}
