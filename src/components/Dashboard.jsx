import { useState } from "react";
import {
  FiGrid,
  FiList,
  FiMap,
  FiUsers,
  FiFilter,
  FiSettings,
} from "react-icons/fi";
import RoomCard from "./RoomCard";
import NurseSchedule from "./NurseSchedule";
import TaskList from "./TaskList";
import RouteMap from "./RouteMap";
import PatientDetail from "./PatientDetail";
import Logs from "./Logs";
import { mockRooms } from "../data/mockData";
import "./Dashboard.css";

const Dashboard = () => {
  const [view, setView] = useState("rooms"); // rooms, tasks, route, schedule
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterRisk, setFilterRisk] = useState("all");
  const [aiProvider, setAiProvider] = useState("claude");

  const filteredRooms =
    filterRisk === "all"
      ? mockRooms
      : mockRooms.filter((room) => room.patient.riskLevel === filterRisk);

  const riskCounts = {
    all: mockRooms.length,
    critical: mockRooms.filter((r) => r.patient.riskLevel === "critical")
      .length,
    high: mockRooms.filter((r) => r.patient.riskLevel === "high").length,
    medium: mockRooms.filter((r) => r.patient.riskLevel === "medium").length,
    low: mockRooms.filter((r) => r.patient.riskLevel === "low").length,
  };

  // If patient selected, show PatientDetail instead of dashboard
  if (selectedRoom) {
    return (
      <div style={{ minHeight: '100vh', padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <PatientDetail
          patient={{
            patientId: selectedRoom.patient.mrn,
            room: selectedRoom.id,
            demographics: {
              name: selectedRoom.patient.name,
              age: selectedRoom.patient.age,
              sex: selectedRoom.patient.sex || "Unknown",
              history: selectedRoom.patient.diagnosis
                ? [selectedRoom.patient.diagnosis]
                : [],
              codeStatus: selectedRoom.patient.codeStatus || "Full Code",
            },
            chiefComplaint: selectedRoom.patient.condition,
            vitals: {
              temp: [selectedRoom.patient.lastVitals.temp],
              heartRate: [selectedRoom.patient.lastVitals.heartRate],
              bloodPressure: [selectedRoom.patient.lastVitals.bp],
              respRate: [selectedRoom.patient.lastVitals.respRate || "N/A"],
              oxygen: [
                selectedRoom.patient.lastVitals.o2Sat
                  ? `${selectedRoom.patient.lastVitals.o2Sat}%`
                  : "N/A",
              ],
            },
            medications: selectedRoom.patient.medications,
            allergies: selectedRoom.patient.allergies,
            tasks: selectedRoom.tasks,
          }}
          aiProvider={aiProvider}
          onBack={() => setSelectedRoom(null)}
          onUpdate={(updated) => {
            // Handle patient update if needed
            console.log("Patient updated:", updated);
          }}
        />
      </div>
    );
  }

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
          <div className="stat-card ai-provider">
            <div className="ai-provider-selector">
              <FiSettings className="icon" />
              <div className="stat-label">AI Provider</div>
              <div className="provider-buttons">
                <button
                  onClick={() => setAiProvider("claude")}
                  className={`provider-btn ${
                    aiProvider === "claude" ? "active" : ""
                  }`}
                >
                  Claude
                </button>
                <button
                  onClick={() => setAiProvider("openai")}
                  className={`provider-btn ${
                    aiProvider === "openai" ? "active" : ""
                  }`}
                >
                  OpenAI
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${view === "rooms" ? "active" : ""}`}
            onClick={() => setView("rooms")}
          >
            <FiGrid className="icon" />
            Rooms
          </button>
          <button
            className={`nav-tab ${view === "tasks" ? "active" : ""}`}
            onClick={() => setView("tasks")}
          >
            <FiList className="icon" />
            Tasks
          </button>
          <button
            className={`nav-tab ${view === "route" ? "active" : ""}`}
            onClick={() => setView("route")}
          >
            <FiMap className="icon" />
            Route
          </button>
          <button
            className={`nav-tab ${view === "schedule" ? "active" : ""}`}
            onClick={() => setView("schedule")}
          >
            <FiUsers className="icon" />
            Schedule
          </button>
          <button
            className={`nav-tab ${view === "logs" ? "active" : ""}`}
            onClick={() => setView("logs")}
          >
            Logs
          </button>
        </div>

        {view === "rooms" && (
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
        {view === "rooms" && (
          <div className="rooms-grid">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} onSelect={setSelectedRoom} />
            ))}
          </div>
        )}

        {view === "tasks" && <TaskList />}

        {view === "route" && <RouteMap />}

        {view === "schedule" && <NurseSchedule />}

        {view === "logs" && <Logs />}
      </main>
    </div>
  );
};

export default Dashboard;
