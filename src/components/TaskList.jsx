import { useState } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiFilter } from 'react-icons/fi';
import { getAllTasks } from '../data/mockData';
import './TaskList.css';

const TaskList = () => {
  const [filter, setFilter] = useState('all'); // all, high, medium, critical
  const [completedTasks, setCompletedTasks] = useState(new Set());

  const allTasks = getAllTasks();
  const filteredTasks = filter === 'all' 
    ? allTasks 
    : allTasks.filter(task => task.priority === filter);

  const sortedTasks = filteredTasks.sort((a, b) => {
    if (a.priority === 'critical' && b.priority !== 'critical') return -1;
    if (a.priority !== 'critical' && b.priority === 'critical') return 1;
    return a.time.localeCompare(b.time);
  });

  const toggleTask = (taskId) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#dc2626',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
    return colors[priority] || '#6b7280';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'critical') {
      return <FiAlertCircle className="priority-icon critical" />;
    }
    return null;
  };

  const taskCounts = {
    all: allTasks.length,
    critical: allTasks.filter(t => t.priority === 'critical').length,
    high: allTasks.filter(t => t.priority === 'high').length,
    medium: allTasks.filter(t => t.priority === 'medium').length,
  };

  const completedCount = completedTasks.size;
  const remainingCount = allTasks.length - completedCount;

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
        </div>
      </div>

      <div className="task-filters">
        <FiFilter className="icon" />
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
          const isCompleted = completedTasks.has(task.id);
          
          return (
            <div 
              key={task.id} 
              className={`task-item ${task.priority} ${isCompleted ? 'completed' : ''}`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="task-checkbox">
                {isCompleted ? (
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
                  <div className="task-priority-badge" style={{ backgroundColor: getPriorityColor(task.priority) }}>
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
          <p>No tasks found for the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;

