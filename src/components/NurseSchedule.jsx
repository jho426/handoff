import { useState, useEffect } from 'react';
import { FiUser, FiTrendingUp, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import './NurseSchedule.css';

const NurseSchedule = () => {
  const [nurses, setNurses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch nurses and rooms from Supabase
  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nurses'
        },
        () => {
          console.log('Nurses changed, refreshing...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_assignments'
        },
        () => {
          console.log('Room assignments changed, refreshing...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch nurses
      const { data: nursesData, error: nursesError } = await supabase
        .from('nurses')
        .select('*')
        .order('name', { ascending: true });

      if (nursesError) throw nursesError;

      // Fetch rooms with patients and assignments
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(`
          *,
          patients (*),
          room_assignments (
            nurse_id,
            nurses (*)
          )
        `);

      if (roomsError) throw roomsError;

      // Transform room data
      const formattedRooms = roomsData
        .filter(room => room.patients)
        .map(room => ({
          id: room.id,
          patient: {
            name: room.patients.name,
            diagnosis: room.patients.diagnosis,
            riskLevel: room.patients.risk_level,
          },
          assignedNurse: room.room_assignments?.[0]?.nurses || null,
        }));

      setNurses(nursesData);
      setRooms(formattedRooms);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadPercentage = (nurse) => {
    return (nurse.current_workload / nurse.max_workload) * 100;
  };

  const getWorkloadColor = (percentage) => {
    if (percentage >= 100) return '#e74c3c';
    if (percentage >= 75) return '#f39c12';
    return '#445031'; // Brand green
  };

  const getNurseRooms = (nurseId) => {
    return rooms.filter(room => room.assignedNurse?.id === nurseId);
  };

  if (loading) {
    return (
      <div className="nurse-schedule">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading nurse schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nurse-schedule">
        <div className="error-state">
          <p>Error loading schedules: {error}</p>
          <button onClick={fetchData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nurse-schedule">
      <div className="schedule-header">
        <h2>AI-Driven Nurse Scheduling</h2>
        <p className="subtitle">Automatically optimized assignments based on expertise, workload, and room demands</p>
      </div>

      {nurses.length === 0 ? (
        <div className="empty-state">
          <p>No nurses found. Add nurse data in Supabase to get started.</p>
        </div>
      ) : (
        <div className="nurses-grid">
          {nurses.map(nurse => {
            const assignedRooms = getNurseRooms(nurse.id);
            const workloadPercentage = getWorkloadPercentage(nurse);
            
            return (
              <div key={nurse.id} className="nurse-card">
                <div className="nurse-header">
                  <div className="nurse-info">
                    <FiUser className="nurse-icon" />
                    <div>
                      <h3>{nurse.name}</h3>
                      <div className="nurse-expertise">
                        {nurse.expertise?.join(' • ') || 'General Care'}
                      </div>
                    </div>
                  </div>
                  {nurse.efficiency && (
                    <div className="efficiency-badge">
                      <FiTrendingUp className="icon" />
                      {nurse.efficiency}% Efficiency
                    </div>
                  )}
                </div>

                <div className="workload-section">
                  <div className="workload-header">
                    <span>Current Workload</span>
                    <span className="workload-count">
                      {nurse.current_workload} / {nurse.max_workload} patients
                    </span>
                  </div>
                  <div className="workload-bar-container">
                    <div 
                      className="workload-bar"
                      style={{
                        width: `${workloadPercentage}%`,
                        backgroundColor: getWorkloadColor(workloadPercentage)
                      }}
                    />
                  </div>
                  {workloadPercentage >= 100 && (
                    <div className="workload-warning">
                      <FiAlertCircle className="icon" />
                      At maximum capacity
                    </div>
                  )}
                  {workloadPercentage >= 75 && workloadPercentage < 100 && (
                    <div className="workload-warning medium">
                      <FiAlertCircle className="icon" />
                      High workload - consider redistribution
                    </div>
                  )}
                  {workloadPercentage < 75 && (
                    <div className="workload-status good">
                      <FiCheckCircle className="icon" />
                      Optimal workload
                    </div>
                  )}
                </div>

                <div className="assigned-rooms">
                  <h4>Assigned Rooms ({assignedRooms.length})</h4>
                  {assignedRooms.length > 0 ? (
                    <div className="rooms-list">
                      {assignedRooms.map(room => (
                        <div 
                          key={room.id} 
                          className={`room-assignment ${room.patient.riskLevel}`}
                        >
                          <div className="room-assignment-header">
                            <span className="room-id">Room {room.id}</span>
                            <span className={`risk-badge ${room.patient.riskLevel}`}>
                              {room.patient.riskLevel}
                            </span>
                          </div>
                          <div className="room-patient">
                            {room.patient.name}
                          </div>
                          <div className="room-diagnosis">
                            {room.patient.diagnosis}
                          </div>
                          <div className="room-match-reason">
                            <span className="match-label">Match reason:</span>
                            <span className="match-text">
                              {nurse.expertise?.some(exp => 
                                room.patient.diagnosis?.toLowerCase().includes(exp.toLowerCase().split(' ')[0])
                              ) ? 'Expertise match' : 'Workload optimization'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-rooms">
                      <p>No rooms assigned yet</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="scheduling-insights">
        <h3>AI Scheduling Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>Optimal Distribution</h4>
              <p>Workload balanced across all nurses with expertise matching patient needs</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">⚡</div>
            <div className="insight-content">
              <h4>Efficiency Score</h4>
              <p>
                Average efficiency: {
                  nurses.length > 0 
                    ? Math.round(nurses.reduce((sum, n) => sum + (n.efficiency || 0), 0) / nurses.length)
                    : 0
                }%
              </p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🔄</div>
            <div className="insight-content">
              <h4>Auto-Adjustment</h4>
              <p>Schedule updates automatically when new patients arrive or conditions change</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseSchedule;
