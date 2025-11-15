import { useState, useRef, useEffect, useCallback } from 'react';
import { FiMapPin, FiNavigation, FiClock, FiTrendingUp, FiMove } from 'react-icons/fi';
import { mockRooms, getAllTasks } from '../data/mockData';
import './RouteMap.css';

const RouteMap = () => {
  const [selectedRoute, setSelectedRoute] = useState('optimized');
  const [rooms, setRooms] = useState(() => 
    mockRooms.map(room => ({
      ...room,
      position: { ...room.location }
    }))
  );
  const [draggedRoom, setDraggedRoom] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floorPlanRef = useRef(null);
  const draggedRoomRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const GRID_SIZE = 100; // pixels per grid cell
  const GRID_COLS = 7;
  const GRID_ROWS = 5;

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
  const currentRoute = selectedRoute === 'optimized' ? optimizedRoute : sequentialRoute;

  const calculateTotalDistance = (route) => {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const dx = route[i + 1].position.gridX - route[i].position.gridX;
      const dy = route[i + 1].position.gridY - route[i].position.gridY;
      total += Math.sqrt(dx * dx + dy * dy) * GRID_SIZE;
    }
    return Math.round(total);
  };


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

  const handleMouseUp = useCallback(() => {
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

  const totalDistance = calculateTotalDistance(currentRoute);
  const timeEstimate = Math.round(totalDistance / 50); // ~50 pixels per minute

  const isInRoute = (roomId) => {
    return currentRoute.some(room => room.id === roomId);
  };

  const getRouteIndex = (roomId) => {
    return currentRoute.findIndex(room => room.id === roomId);
  };

  return (
    <div className="route-map-container">
      <div className="route-header">
        <div>
          <h2>Floor Plan Route Map</h2>
          <p className="subtitle">Drag rooms to rearrange. AI-optimized path updates automatically.</p>
        </div>
        <div className="route-controls">
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

      <div className="route-stats">
        <div className="route-stat">
          <FiMapPin className="icon" />
          <div>
            <div className="stat-value">{currentRoute.length}</div>
            <div className="stat-label">Stops</div>
          </div>
        </div>
        <div className="route-stat">
          <FiNavigation className="icon" />
          <div>
            <div className="stat-value">{totalDistance}m</div>
            <div className="stat-label">Total Distance</div>
          </div>
        </div>
        <div className="route-stat">
          <FiClock className="icon" />
          <div>
            <div className="stat-value">{timeEstimate} min</div>
            <div className="stat-label">Est. Time</div>
          </div>
        </div>
        {selectedRoute === 'optimized' && sequentialRoute.length > 0 && (
          <div className="route-stat optimized">
            <FiTrendingUp className="icon" />
            <div>
              <div className="stat-value">
                {Math.max(0, Math.round(((calculateTotalDistance(sequentialRoute) - totalDistance) / calculateTotalDistance(sequentialRoute)) * 100))}%
              </div>
              <div className="stat-label">Time Saved</div>
            </div>
          </div>
        )}
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
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray="8,4"
                  markerEnd="url(#arrowhead)"
                />
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
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
        <div className="route-steps">
          {currentRoute.map((room, index) => (
            <div key={room.id} className="route-step">
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <div className="step-header">
                  <span className="step-room">Room {room.id}</span>
                  <span className="step-risk">
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
      </div>
    </div>
  );
};

export default RouteMap;
