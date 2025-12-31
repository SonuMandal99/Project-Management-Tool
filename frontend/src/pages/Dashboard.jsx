import React, { useState, useEffect } from 'react';
import { FiPlus, FiFilter, FiDownload } from 'react-icons/fi';
import KanbanBoard from '../components/KanbanBoard';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../services/AuthContext';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignee: '',
    tags: [],
  });
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]._id);
      }
    } catch (error) {
      toast.error('Failed to fetch projects');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', {
        ...taskForm,
        project: selectedProject,
        status: 'todo',
      });
      toast.success('Task created successfully');
      setShowTaskForm(false);
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignee: '',
        tags: [],
      });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const stats = [
    { label: 'Total Tasks', value: 45, color: '#1a237e' },
    { label: 'Completed', value: 12, color: '#2e7d32' },
    { label: 'In Progress', value: 8, color: '#ff9800' },
    { label: 'Overdue', value: 5, color: '#d32f2f' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Project Dashboard</h1>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="form-control"
            style={{ width: '300px', marginTop: '10px' }}
          >
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="d-flex gap-10">
          <button className="btn" onClick={() => setShowTaskForm(true)}>
            <FiPlus /> New Task
          </button>
          <button className="btn">
            <FiFilter /> Filter
          </button>
          <button className="btn">
            <FiDownload /> Export
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <h3 style={{ color: stat.color }}>{stat.value}</h3>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>

      {showTaskForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                />
              </div>
              
              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-control"
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, dueDate: e.target.value })
                  }
                />
              </div>
              
              <div className="form-group">
                <label>Assignee</label>
                <select
                  className="form-control"
                  value={taskForm.assignee}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, assignee: e.target.value })
                  }
                >
                  <option value="">Select assignee</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="d-flex justify-between mt-20">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowTaskForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <KanbanBoard projectId={selectedProject} />
    </div>
  );
};

export default Dashboard;