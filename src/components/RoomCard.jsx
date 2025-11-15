import { useState } from 'react';
import { FiActivity, FiAlertCircle, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
import './RoomCard.css';

const RoomCard = ({ room, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  const getRiskLabel = (riskLevel) => {
    return riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
  };

  return (
    <div 
      className={`room-card ${room.patient.riskLevel}`}
      onClick={() => onSelect && onSelect(room)}
    >
      <div className="room-card-header">
        <div className="room-number">Room {room.id}</div>
        <div className="risk-badge">
          {getRiskLabel(room.patient.riskLevel)} Risk
        </div>
      </div>

      <div className="patient-info">
        <div className="patient-name">
          <FiUser className="icon" />
          {room.patient.name}
        </div>
        <div className="patient-details">
          <span>{room.patient.age} years</span>
          <span>•</span>
          <span>{room.patient.condition}</span>
        </div>
        <div className="diagnosis">{room.patient.diagnosis}</div>
      </div>

      <div className="vitals-grid">
        <div className="vital-item">
          <span className="vital-label">BP</span>
          <span className="vital-value">{room.patient.lastVitals.bp}</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">HR</span>
          <span className="vital-value">{room.patient.lastVitals.heartRate}</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">Temp</span>
          <span className="vital-value">{room.patient.lastVitals.temp}°F</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">O2</span>
          <span className="vital-value">{room.patient.lastVitals.o2Sat}%</span>
        </div>
      </div>

      <div className="assigned-nurse">
        <FiUser className="icon" />
        <span>{room.assignedNurse.name}</span>
        <span className="expertise-badge">{room.assignedNurse.expertise}</span>
      </div>

      <div className="ai-insights">
        <div className="insights-header">
          <FiActivity className="icon" />
          <span>AI Insights</span>
        </div>
        <div className="insights-list">
          {room.patient.aiInsights.slice(0, expanded ? room.patient.aiInsights.length : 1).map((insight, idx) => (
            <div key={idx} className={`insight-item ${insight.includes('⚠️') ? 'alert' : ''}`}>
              {insight}
            </div>
          ))}
          {room.patient.aiInsights.length > 1 && (
            <button 
              className="expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? 'Show less' : `+${room.patient.aiInsights.length - 1} more`}
            </button>
          )}
        </div>
      </div>

      <div className="upcoming-tasks">
        <div className="tasks-header">
          <FiClock className="icon" />
          <span>Next Task</span>
        </div>
        {room.tasks.length > 0 && (
          <div className="next-task">
            <span className="task-time">{room.tasks[0].time}</span>
            <span className="task-desc">{room.tasks[0].description}</span>
            <span 
              className={`task-priority ${room.tasks[0].priority}`}
            >
              {room.tasks[0].priority}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomCard;

