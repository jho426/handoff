import { FiUser, FiTrendingUp, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { mockRooms, mockNurses } from '../data/mockData';
import './NurseSchedule.css';

const NurseSchedule = () => {
  const getWorkloadPercentage = (nurse) => {
    return (nurse.currentWorkload / nurse.maxWorkload) * 100;
  };

  const getWorkloadColor = (percentage) => {
    if (percentage >= 100) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    return '#10b981';
  };

  const getNurseRooms = (nurseName) => {
    return mockRooms.filter(room => room.assignedNurse.name === nurseName);
  };

  return (
    <div className="nurse-schedule">
      <div className="schedule-header">
        <h2>AI-Driven Nurse Scheduling</h2>
        <p className="subtitle">Automatically optimized assignments based on expertise, workload, and room demands</p>
      </div>

      <div className="nurses-grid">
        {mockNurses.map(nurse => {
          const assignedRooms = getNurseRooms(nurse.name);
          const workloadPercentage = getWorkloadPercentage(nurse);
          
          return (
            <div key={nurse.id} className="nurse-card">
              <div className="nurse-header">
                <div className="nurse-info">
                  <FiUser className="nurse-icon" />
                  <div>
                    <h3>{nurse.name}</h3>
                    <div className="nurse-expertise">
                      {nurse.expertise.join(' • ')}
                    </div>
                  </div>
                </div>
                <div className="efficiency-badge">
                  <FiTrendingUp className="icon" />
                  {nurse.efficiency}% Efficiency
                </div>
              </div>

              <div className="workload-section">
                <div className="workload-header">
                  <span>Current Workload</span>
                  <span className="workload-count">
                    {nurse.currentWorkload} / {nurse.maxWorkload} patients
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
                          {nurse.expertise.some(exp => 
                            room.assignedNurse.expertise.includes(exp)
                          ) ? 'Expertise match' : 'Workload optimization'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
              <p>Average efficiency: {Math.round(mockNurses.reduce((sum, n) => sum + n.efficiency, 0) / mockNurses.length)}%</p>
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

