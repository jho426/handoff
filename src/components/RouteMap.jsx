import { useState, useRef, useEffect, useCallback } from 'react';
import { FiNavigation, FiTrendingUp, FiMove, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import './RouteMap.css';

const RouteMap = () => {
  const [selectedRoute, setSelectedRoute] = useState('optimized');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedRoom, setDraggedRoom] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floorPlanRef = useRef(null);
  const draggedRoomRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const GRID_SIZE = 100; // pixels per grid cell
  const GRID_COLS = 7;
  const GRID_ROWS = 5;

  // Fetch rooms and tasks from Supabase
  useEffect(() => {
    fetchRooms();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('route-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        () => {
          console.log('Rooms changed, refreshing...');
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          console.log('Tasks changed, refreshing...');
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
      
      // Fetch rooms with patient data
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
          if (!room.patients) return null;

          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('patient_id', room.patients.id)
            .order('time', { ascending: true });

          return {
            id: room.id,
            patient: {
              name: room.patients.name,
              age: room.patients.age,
              mrn: room.patients.mrn,
              diagnosis: room.patients.diagnosis,
              condition: room.patients.condition,
              riskLevel: room.patients.risk_level,
            },
            tasks: (tasks || []).map(task => ({
              id: task.id,
              time: task.time,
              type: task.type,
              description: task.description,
              priority: task.priority,
            })),
            position: {
              gridX: room.grid_x || 1,
              gridY: room.grid_y || 1,
            }
          };
        })
      );

      setRooms(roomsWithTasks.filter(room => room !== null));
      setError(null);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Risk level priority order (higher number = higher priority)
  const getRiskPriority = (riskLevel) => {
    const priorityMap = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    return priorityMap[riskLevel] || 0;
  };

  // Calculate priority-based route (most critical to least)
  const calculatePriorityRoute = () => {
    const roomsWithTasks = rooms.filter(room => room.tasks.length > 0);
    if (roomsWithTasks.length === 0) return [];

    // Sort by risk level (critical -> high -> medium -> low)
    // Within same risk level, sort by number of high-priority tasks, then total tasks
    return [...roomsWithTasks].sort((a, b) => {
      const riskDiff = getRiskPriority(b.patient.riskLevel) - getRiskPriority(a.patient.riskLevel);
      if (riskDiff !== 0) return riskDiff;

      // If same risk level, prioritize by high-priority tasks
      const aHighPriorityTasks = a.tasks.filter(t => t.priority === 'high').length;
      const bHighPriorityTasks = b.tasks.filter(t => t.priority === 'high').length;
      if (aHighPriorityTasks !== bHighPriorityTasks) {
        return bHighPriorityTasks - aHighPriorityTasks;
      }

      // Then by total number of tasks
      return b.tasks.length - a.tasks.length;
    });
  };

  // Calculate optimized route using simple nearest-neighbor algorithm
  const calculateOptimizedRoute = () => {
    const roomsWithTasks = rooms.filter(room => room.tasks.length > 0);
    if (roomsWithTasks.length === 0) return [];

    const startRoom = roomsWithTasks[0];
    const route = [startRoom];
    const visited = new Set([startRoom.id]);

    let currentRoom = startRoom;
    
    while (visited.size < roomsWithTasks.length) {
      let nearestRoom = null;
      let minDistance = Infinity;

      roomsWithTasks.forEach(room => {
        if (!visited.has(room.id)) {
          const dx = room.position.gridX - currentRoom.position.gridX;
          const dy = room.position.gridY - currentRoom.position.gridY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            minDistance = distance;
            nearestRoom = room;
          }
        }
      });

      if (nearestRoom) {
        route.push(nearestRoom);
        visited.add(nearestRoom.id);
        currentRoom = nearestRoom;
      } else {
        break;
      }
    }

    return route;
  };

  const optimizedRoute = calculateOptimizedRoute();
  const sequentialRoute = rooms.filter(room => room.tasks.length > 0);
  const priorityRoute = calculatePriorityRoute();
  
  const currentRoute = 
    selectedRoute === 'optimized' ? optimizedRoute :
    selectedRoute === 'priority' ? priorityRoute :
    sequentialRoute;

  const handleMouseDown = (e, room) => {
    e.preventDefault();
    if (!floorPlanRef.current) return;
    
    const rect = floorPlanRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const roomX = room.position.gridX * GRID_SIZE;
    const roomY = room.position.gridY * GRID_SIZE;
    
    dragOffsetRef.current = {
      x: x - roomX,
      y: y - roomY
    };
    draggedRoomRef.current = room;
    setDragOffset(dragOffsetRef.current);
    setDraggedRoom(room);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggedRoomRef.current || !floorPlanRef.current) return;

    const rect = floorPlanRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffsetRef.current.x;
    const y = e.clientY - rect.top - dragOffsetRef.current.y;

    // Snap to grid
    const gridX = Math.max(1, Math.min(GRID_COLS, Math.round(x / GRID_SIZE)));
    const gridY = Math.max(1, Math.min(GRID_ROWS, Math.round(y / GRID_SIZE)));

    setRooms(prevRooms =>
      prevRooms.map(room =>
        room.id === draggedRoomRef.current.id
          ? {
              ...room,
              position: {
                ...room.position,
                gridX,
                gridY
              }
            }
          : room
      )
    );
  }, []);

  const handleMouseUp = useCallback(async () => {
    if (draggedRoomRef.current) {
      const room = draggedRoomRef.current;
      
      // Save new position to Supabase
      try {
        const { error } = await supabase
          .from('rooms')
          .update({
            grid_x: room.position.gridX,
            grid_y: room.position.gridY
          })
          .eq('id', room.id);

        if (error) throw error;
        console.log('Room position saved:', room.id);
      } catch (err) {
        console.error('Error saving room position:', err);
      }
    }

    draggedRoomRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
    setDraggedRoom(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (draggedRoom) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedRoom, handleMouseMove, handleMouseUp]);

  const isInRoute = (roomId) => {
    return currentRoute.some(room => room.id === roomId);
  };

  const getRouteIndex = (roomId) => {
    return currentRoute.findIndex(room => room.id === roomId);
  };

  if (loading) {
    return (
      <div className="route-map-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading floor plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-map-container">
        <div className="error-state">
          <p>Error loading floor plan: {error}</p>
          <button onClick={fetchRooms} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="route-map-container">
      <div className="route-header">
        <div>
          <h2>Floor Plan Route Map</h2>
          <p className="subtitle">Drag rooms to rearrange. AI-optimized path updates automatically.</p>
        </div>
        <div className="route-controls">
          <button 
            className={`route-btn ${selectedRoute === 'priority' ? 'active' : ''}`}
            onClick={() => setSelectedRoute('priority')}
          >
            <FiAlertCircle className="icon" />
            Priority
          </button>
          <button 
            className={`route-btn ${selectedRoute === 'optimized' ? 'active' : ''}`}
            onClick={() => setSelectedRoute('optimized')}
          >
            <FiTrendingUp className="icon" />
            Optimized
          </button>
          <button 
            className={`route-btn ${selectedRoute === 'sequential' ? 'active' : ''}`}
            onClick={() => setSelectedRoute('sequential')}
          >
            <FiNavigation className="icon" />
            Sequential
          </button>
        </div>
      </div>

      <div className="floor-plan-container">
        <div 
          ref={floorPlanRef}
          className="floor-plan"
          style={{
            width: `${GRID_COLS * GRID_SIZE}px`,
            height: `${GRID_ROWS * GRID_SIZE}px`
          }}
        >
          {/* Draw hallways */}
          <div className="hallway horizontal" style={{ top: `${2 * GRID_SIZE}px`, left: 0, width: '100%' }} />
          <div className="hallway vertical" style={{ left: `${2 * GRID_SIZE}px`, top: 0, height: '100%' }} />
          <div className="hallway vertical" style={{ left: `${4 * GRID_SIZE}px`, top: 0, height: '100%' }} />

          {/* Draw route connections */}
          {currentRoute.map((room, index) => {
            if (index === currentRoute.length - 1) return null;
            const nextRoom = currentRoute[index + 1];
            const x1 = room.position.gridX * GRID_SIZE + GRID_SIZE / 2;
            const y1 = room.position.gridY * GRID_SIZE + GRID_SIZE / 2;
            const x2 = nextRoom.position.gridX * GRID_SIZE + GRID_SIZE / 2;
            const y2 = nextRoom.position.gridY * GRID_SIZE + GRID_SIZE / 2;
            
            return (
              <svg
                key={`route-${index}`}
                className="route-line"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#445031"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                  markerEnd={`url(#arrowhead-${index})`}
                  opacity="0.6"
                />
                <defs>
                  <marker
                    id={`arrowhead-${index}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#445031" opacity="0.6" />
                  </marker>
                </defs>
              </svg>
            );
          })}

          {/* Draw room squares */}
          {rooms.map(room => {
            const routeIndex = getRouteIndex(room.id);
            const inRoute = isInRoute(room.id);
            const isDragging = draggedRoom?.id === room.id;
            
            return (
              <div
                key={room.id}
                className={`room-square ${room.patient.riskLevel} ${inRoute ? 'in-route' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${room.position.gridX * GRID_SIZE}px`,
                  top: `${room.position.gridY * GRID_SIZE}px`,
                  cursor: 'move',
                  zIndex: isDragging ? 1000 : (inRoute ? 10 : 5)
                }}
                onMouseDown={(e) => handleMouseDown(e, room)}
              >
                <div className="room-square-header">
                  <span className="room-number">{room.id}</span>
                  {inRoute && (
                    <span className="route-number">{routeIndex + 1}</span>
                  )}
                </div>
                <div className="room-patient-name">{room.patient.name.split(' ')[0]}</div>
                <div className="room-drag-hint">
                  <FiMove className="icon" />
                </div>
                {room.patient.riskLevel === 'critical' && (
                  <div className="critical-indicator">!</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="route-list">
        <h3>Route Sequence</h3>
        {currentRoute.length > 0 ? (
          <div className="route-steps">
            {currentRoute.map((room, index) => (
              <div key={room.id} className="route-step">
                <div className="step-number">{index + 1}</div>
                <div className="step-content">
                  <div className="step-header">
                    <span className="step-room">Room {room.id}</span>
                    <span className={`step-risk ${room.patient.riskLevel}`}>
                      {room.patient.riskLevel} risk
                    </span>
                  </div>
                  <div className="step-patient">{room.patient.name}</div>
                  <div className="step-tasks">
                    {room.tasks.slice(0, 2).map(task => (
                      <span key={task.id} className="step-task">
                        {task.time} - {task.description}
                      </span>
                    ))}
                    {room.tasks.length > 2 && (
                      <span className="step-task-more">+{room.tasks.length - 2} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No rooms with tasks. Add tasks to patients to generate a route.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteMap;