import { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiFilter, FiPlus, FiUser } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import AddPatientModal from './AddPatientModal';
import './TaskList.css';

const TaskList = () => {
  const [filter, setFilter] = useState('all');
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [currentNurseId, setCurrentNurseId] = useState(null);

  // Get current nurse ID on mount
  useEffect(() => {
    const getCurrentNurse = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get nurse record
          const { data: nurseData } = await supabase
            .from('nurses')
            .select('id')
            .or(`email.eq.${session.user.email},auth_user_id.eq.${session.user.id}`)
            .single();
          
          if (nurseData) {
            setCurrentNurseId(nurseData.id);
          }
        }
      } catch (err) {
        console.error('Error getting current nurse:', err);
      }
    };
    
    getCurrentNurse();
  }, []);

  // Fetch tasks from Supabase
  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Task changed:', payload);
          fetchTasks();
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
          console.log('Room assignments changed, refreshing tasks...');
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          patients (
            name,
            patient_id
          ),
          rooms (
            id,
            room_assignments (
              nurse_id
            )
          )
        `)
        .order('time', { ascending: true });

      if (tasksError) throw tasksError;

      // Transform to match expected format
      const formattedTasks = tasksData.map(task => ({
        id: task.id,
        time: task.time,
        type: task.type,
        description: task.description,
        priority: task.priority,
        completed: task.completed,
        roomId: task.rooms?.id || task.room_id,
        patientName: task.patients?.name || 'Unknown Patient',
        assignedNurseId: task.rooms?.room_assignments?.[0]?.nurse_id || null
      }));

      setAllTasks(formattedTasks);
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId) => {
    try {
      // Find the task
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      // Update in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state immediately for responsive UI
      setAllTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (err) {
      console.error('Error toggling task:', err);
      alert('Failed to update task: ' + err.message);
    }
  };

  const handlePatientAdded = (newPatient) => {
    console.log('New patient added:', newPatient);
    // Refresh tasks since new patient may have tasks
    fetchTasks();
  };

  // Filter by assigned nurse if filter is active
  const tasksByAssignment = showAssignedOnly && currentNurseId
    ? allTasks.filter(task => task.assignedNurseId === currentNurseId)
    : allTasks;

  // Filter by priority
  const filteredTasks = filter === 'all' 
    ? tasksByAssignment 
    : tasksByAssignment.filter(task => task.priority === filter);

  const sortedTasks = filteredTasks.sort((a, b) => {
    // Sort by priority first, then by time
    if (a.priority === 'critical' && b.priority !== 'critical') return -1;
    if (a.priority !== 'critical' && b.priority === 'critical') return 1;
    if (a.priority === 'high' && b.priority === 'medium') return -1;
    if (a.priority === 'medium' && b.priority === 'high') return 1;
    return a.time.localeCompare(b.time);
  });

  const getPriorityIcon = (priority) => {
    if (priority === 'critical') {
      return <FiAlertCircle className="priority-icon critical" />;
    }
    return null;
  };

  // Calculate counts based on filtered tasks (by assignment)
  const taskCounts = {
    all: tasksByAssignment.length,
    critical: tasksByAssignment.filter(t => t.priority === 'critical').length,
    high: tasksByAssignment.filter(t => t.priority === 'high').length,
    medium: tasksByAssignment.filter(t => t.priority === 'medium').length,
  };

  const completedCount = tasksByAssignment.filter(t => t.completed).length;
  const remainingCount = tasksByAssignment.length - completedCount;

  if (loading) {
    return (
      <div className="task-list-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list-container">
        <div className="error-state">
          <p>Error loading tasks: {error}</p>
          <button onClick={fetchTasks} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <div>
          <h2>Time-Ordered Task List</h2>
          <p className="subtitle">All tasks organized by time and priority for efficient workflow</p>
        </div>
        <div className="task-stats">
          <div className="stat-item">
            <span className="stat-value">{remainingCount}</span>
            <span className="stat-label">Remaining</span>
          </div>
          <div className="stat-item completed">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">Completed</span>
          </div>
          <button
            className="add-patient-btn"
            onClick={() => setShowAddPatientModal(true)}
          >
            <FiPlus className="icon" />
            Add New Patient
          </button>
        </div>
      </div>

      <div className="task-filters">
        <FiFilter className="icon" />
        <button 
          className={`filter-btn ${showAssignedOnly ? 'active' : ''}`}
          onClick={() => setShowAssignedOnly(!showAssignedOnly)}
          title={showAssignedOnly ? 'Show all tasks' : 'Show only my assigned tasks'}
        >
          <FiUser style={{ width: '14px', height: '14px', marginRight: '6px', display: 'inline-block' }} />
          My Patients
        </button>
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({taskCounts.all})
        </button>
        <button 
          className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical ({taskCounts.critical})
        </button>
        <button 
          className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
        >
          High ({taskCounts.high})
        </button>
        <button 
          className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
          onClick={() => setFilter('medium')}
        >
          Medium ({taskCounts.medium})
        </button>
      </div>

      <div className="tasks-timeline">
        {sortedTasks.map(task => {
          return (
            <div 
              key={task.id} 
              className={`task-item ${task.priority} ${task.completed ? 'completed' : ''}`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="task-checkbox">
                {task.completed ? (
                  <FiCheckCircle className="check-icon completed" />
                ) : (
                  <div className="check-circle" />
                )}
              </div>
              
              <div className="task-content">
                <div className="task-header">
                  <div className="task-time">
                    <FiClock className="icon" />
                    {task.time}
                  </div>
                  <div className={`task-priority-badge ${task.priority}`}>
                    {getPriorityIcon(task.priority)}
                    {task.priority}
                  </div>
                </div>
                
                <div className="task-description">
                  {task.description}
                </div>
                
                <div className="task-meta">
                  <span className="task-type">{task.type}</span>
                  <span className="task-separator">•</span>
                  <span className="task-room">Room {task.roomId}</span>
                  <span className="task-separator">•</span>
                  <span className="task-patient">{task.patientName}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedTasks.length === 0 && (
        <div className="empty-state">
          <p>
            {showAssignedOnly && currentNurseId
              ? 'No tasks found for your assigned patients.'
              : filter === 'all'
              ? 'No tasks available. Add tasks in Supabase to get started.'
              : 'No tasks found for the selected filter.'}
          </p>
        </div>
      )}

      <AddPatientModal
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onPatientAdded={handlePatientAdded}
        aiProvider="claude"
      />
    </div>
  );
};

export default TaskList;