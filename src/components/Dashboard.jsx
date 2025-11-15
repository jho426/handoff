import { useState, useEffect } from "react";
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
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const Dashboard = () => {
  const [view, setView] = useState("rooms");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterRisk, setFilterRisk] = useState("all");
  const [aiProvider, setAiProvider] = useState("claude");
  
  // State for Supabase data
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rooms and patients from Supabase
  useEffect(() => {
    fetchRooms();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        () => {
          console.log('Patient data changed, refreshing...');
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        () => {
          console.log('Room data changed, refreshing...');
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      
      // Fetch rooms with patient data and tasks
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(`
          *,
          patients (*)
        `);

      if (roomsError) throw roomsError;

      // Fetch tasks for each room/patient
      const roomsWithTasks = await Promise.all(
        roomsData.map(async (room) => {
          if (!room.patients) return room;

          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('patient_id', room.patients.id)
            .order('time', { ascending: true });

          // Transform to match expected format
          return {
            id: room.id,
            patient: {
              name: room.patients.name,
              age: room.patients.age,
              mrn: room.patients.mrn,
              admissionDate: room.patients.admission_date,
              diagnosis: room.patients.diagnosis,
              condition: room.patients.condition,
              riskLevel: room.patients.risk_level,
              lastVitals: room.patients.last_vitals || {},
              medications: room.patients.medications || [],
              allergies: room.patients.allergies || [],
              codeStatus: room.patients.code_status || 'Full Code',
              handoffNotes: room.patients.handoff_notes || '',
              handoffNotesHistory: room.patients.handoff_notes_history || [],
              imageAnalysis: room.patients.image_analysis || '',
              lastHandoffUpdate: room.patients.last_handoff_update,
            },
            tasks: (tasks || []).map(task => ({
              id: task.id,
              time: task.time,
              type: task.type,
              description: task.description,
              priority: task.priority,
              completed: task.completed
            })),
            location: {
              gridX: room.grid_x,
              gridY: room.grid_y
            }
          };
        })
      );

      setRooms(roomsWithTasks.filter(room => room.patient));
      setError(null);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms =
    filterRisk === "all"
      ? rooms
      : rooms.filter((room) => room.patient?.riskLevel === filterRisk);

  const riskCounts = {
    all: rooms.length,
    critical: rooms.filter((r) => r.patient?.riskLevel === "critical").length,
    high: rooms.filter((r) => r.patient?.riskLevel === "high").length,
    medium: rooms.filter((r) => r.patient?.riskLevel === "medium").length,
    low: rooms.filter((r) => r.patient?.riskLevel === "low").length,
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
            handoffNotes: selectedRoom.patient.handoffNotes || '',
            handoffNotesHistory: selectedRoom.patient.handoffNotesHistory || [],
            imageAnalysis: selectedRoom.patient.imageAnalysis || '',
            lastHandoffUpdate: selectedRoom.patient.lastHandoffUpdate,
          }}
          aiProvider={aiProvider}
          onBack={() => setSelectedRoom(null)}
          onUpdate={(updated) => {
            console.log("Patient updated:", updated);
            fetchRooms(); // Refresh data
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
            <div className="stat-value">{rooms.length}</div>
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
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading patient data...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Error loading data: {error}</p>
            <button onClick={fetchRooms} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && view === "rooms" && (
          <div className="rooms-grid">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} onSelect={setSelectedRoom} />
              ))
            ) : (
              <div className="empty-state">
                <p>No rooms found. Add patient data in Supabase to get started.</p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && view === "tasks" && <TaskList />}

        {!loading && !error && view === "route" && <RouteMap />}

        {!loading && !error && view === "schedule" && <NurseSchedule />}

        {!loading && !error && view === "logs" && <Logs />}
      </main>
    </div>
  );
};

export default Dashboard;
