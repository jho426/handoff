import { useState } from 'react';
import { FiGrid, FiList, FiMap, FiUsers, FiFilter } from 'react-icons/fi';
import RoomCard from './RoomCard';
import NurseSchedule from './NurseSchedule';
import TaskList from './TaskList';
import RouteMap from './RouteMap';
import { mockRooms } from '../data/mockData';
import './Dashboard.css';

const Dashboard = () => {
  const [view, setView] = useState('rooms'); // rooms, tasks, route, schedule
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterRisk, setFilterRisk] = useState('all');

  const filteredRooms = filterRisk === 'all' 
    ? mockRooms 
    : mockRooms.filter(room => room.patient.riskLevel === filterRisk);

  const riskCounts = {
    all: mockRooms.length,
    critical: mockRooms.filter(r => r.patient.riskLevel === 'critical').length,
    high: mockRooms.filter(r => r.patient.riskLevel === 'high').length,
    medium: mockRooms.filter(r => r.patient.riskLevel === 'medium').length,
    low: mockRooms.filter(r => r.patient.riskLevel === 'low').length,
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Handoff Dashboard</h1>
          <p className="subtitle">Smart patient care coordination platform</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-value">{mockRooms.length}</div>
            <div className="stat-label">Active Rooms</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-value">{riskCounts.critical}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card high">
            <div className="stat-value">{riskCounts.high}</div>
            <div className="stat-label">High Risk</div>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${view === 'rooms' ? 'active' : ''}`}
            onClick={() => setView('rooms')}
          >
            <FiGrid className="icon" />
            Rooms
          </button>
          <button 
            className={`nav-tab ${view === 'tasks' ? 'active' : ''}`}
            onClick={() => setView('tasks')}
          >
            <FiList className="icon" />
            Tasks
          </button>
          <button 
            className={`nav-tab ${view === 'route' ? 'active' : ''}`}
            onClick={() => setView('route')}
          >
            <FiMap className="icon" />
            Route
          </button>
          <button 
            className={`nav-tab ${view === 'schedule' ? 'active' : ''}`}
            onClick={() => setView('schedule')}
          >
            <FiUsers className="icon" />
            Schedule
          </button>
        </div>

        {view === 'rooms' && (
          <div className="filter-controls">
            <FiFilter className="icon" />
            <select 
              value={filterRisk} 
              onChange={(e) => setFilterRisk(e.target.value)}
              className="risk-filter"
            >
              <option value="all">All Risk Levels ({riskCounts.all})</option>
              <option value="critical">Critical ({riskCounts.critical})</option>
              <option value="high">High ({riskCounts.high})</option>
              <option value="medium">Medium ({riskCounts.medium})</option>
              <option value="low">Low ({riskCounts.low})</option>
            </select>
          </div>
        )}
      </nav>

      <main className="dashboard-main">
        {view === 'rooms' && (
          <div className="rooms-grid">
            {filteredRooms.map(room => (
              <RoomCard 
                key={room.id} 
                room={room}
                onSelect={setSelectedRoom}
              />
            ))}
          </div>
        )}

        {view === 'tasks' && (
          <TaskList />
        )}

        {view === 'route' && (
          <RouteMap />
        )}

        {view === 'schedule' && (
          <NurseSchedule />
        )}
      </main>

      {selectedRoom && (
        <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Room {selectedRoom.id} - {selectedRoom.patient.name}</h2>
              <button className="close-btn" onClick={() => setSelectedRoom(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Patient Information</h3>
                <div className="detail-grid">
                  <div><strong>MRN:</strong> {selectedRoom.patient.mrn}</div>
                  <div><strong>Age:</strong> {selectedRoom.patient.age} years</div>
                  <div><strong>Admission Date:</strong> {selectedRoom.patient.admissionDate}</div>
                  <div><strong>Diagnosis:</strong> {selectedRoom.patient.diagnosis}</div>
                  <div><strong>Condition:</strong> {selectedRoom.patient.condition}</div>
                  <div><strong>Risk Level:</strong> {selectedRoom.patient.riskLevel}</div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Vital Signs</h3>
                <div className="vitals-detail">
                  <div>Blood Pressure: <strong>{selectedRoom.patient.lastVitals.bp}</strong></div>
                  <div>Heart Rate: <strong>{selectedRoom.patient.lastVitals.heartRate} bpm</strong></div>
                  <div>Temperature: <strong>{selectedRoom.patient.lastVitals.temp}°F</strong></div>
                  <div>O2 Saturation: <strong>{selectedRoom.patient.lastVitals.o2Sat}%</strong></div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Medications</h3>
                <ul className="medications-list">
                  {selectedRoom.patient.medications.map((med, idx) => (
                    <li key={idx}>{med}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h3>Allergies</h3>
                <p>{selectedRoom.patient.allergies.length > 0 ? selectedRoom.patient.allergies.join(', ') : 'None'}</p>
              </div>

              <div className="detail-section">
                <h3>All Tasks</h3>
                <div className="tasks-list">
                  {selectedRoom.tasks.map(task => (
                    <div key={task.id} className="task-item">
                      <span className="task-time">{task.time}</span>
                      <span className="task-type">{task.type}</span>
                      <span className="task-description">{task.description}</span>
                      <span className={`task-priority ${task.priority}`}>{task.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

