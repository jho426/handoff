import mockLogs from '../data/mockLogs'
import './Logs.css'
import { useState } from 'react'

const Logs = () => {
  const [query, setQuery] = useState('')

  const filtered = mockLogs.filter(l => {
    const q = query.toLowerCase()
    return (
      l.nurse.toLowerCase().includes(q) ||
      l.room.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    )
  })

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h2>Activity Logs</h2>
        <div className="logs-controls">
          <input placeholder="Search logs (nurse, room, action)" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="logs-list">
        {filtered.map(log => (
          <div key={log.id} className="log-item">
            <div className="log-time">{log.time}</div>
            <div className="log-body">
              <div className="log-top">
                <div className="log-action">{log.action}</div>
                <div className="log-meta">Room {log.room} • {log.nurse}</div>
              </div>
              <div className="log-details">{log.details}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="no-results">No logs found.</div>}
      </div>
    </div>
  )
}

export default Logs
