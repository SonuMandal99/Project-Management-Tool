import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiClock, FiUser, FiFlag } from 'react-icons/fi';
import { format } from 'date-fns';

const TaskCard = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-low';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      <div className="task-header">
        <span className={`task-priority ${getPriorityColor(task.priority)}`}>
          <FiFlag /> {task.priority}
        </span>
        <h4 className="task-title">{task.title}</h4>
      </div>
      
      <p className="task-description">{task.description}</p>
      
      <div className="task-footer">
        <div className="task-meta">
          <span className="task-assignee">
            <FiUser /> {task.assignee?.name || 'Unassigned'}
          </span>
          <span className="task-due-date">
            <FiClock /> {format(new Date(task.dueDate), 'MMM dd')}
          </span>
        </div>
        
        <div className="task-tags">
          {task.tags?.map((tag, index) => (
            <span key={index} className="task-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;