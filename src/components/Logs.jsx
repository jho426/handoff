import './Logs.css'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const Logs = () => {
  const [query, setQuery] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch logs from Supabase
  useEffect(() => {
    fetchLogs()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'logs'
        },
        (payload) => {
          console.log('Real-time update:', payload)
          // Refresh logs when changes occur
          fetchLogs()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('time', { ascending: false })
        .limit(100)

      if (error) throw error

      // Format the logs to match the expected structure
      const formattedLogs = data.map(log => ({
        id: log.id,
        time: formatTime(log.time),
        nurse: log.nurse,
        room: log.room,
        action: log.action,
        details: log.details
      }))

      setLogs(formattedLogs)
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Format timestamp to readable format
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '')
  }

  // Filter logs based on search query
  const filtered = logs.filter(l => {
    const q = query.toLowerCase()
    return (
      l.nurse.toLowerCase().includes(q) ||
      l.room.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="logs-page">
        <div className="logs-header">
          <h2>Activity Logs</h2>
        </div>
        <div className="logs-list">
          <div className="loading">Loading logs...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="logs-page">
        <div className="logs-header">
          <h2>Activity Logs</h2>
        </div>
        <div className="logs-list">
          <div className="error">Error loading logs: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h2>Activity Logs</h2>
        <div className="logs-controls">
          <input 
            placeholder="Search logs (nurse, room, action)" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
          <button onClick={fetchLogs} className="refresh-btn">
            ↻ Refresh
          </button>
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
        {filtered.length === 0 && (
          <div className="no-results">
            {query ? 'No logs found matching your search.' : 'No logs available.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default Logs
