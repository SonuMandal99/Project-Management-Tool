import React, { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../services/AuthContext';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => 
        u._id === userId ? { ...u, role: newRole } : u
      ));
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center mt-20">
        <h3>Access Denied</h3>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <h3>Admin Panel</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '10px', background: '#f0f0f0' }}>
            User Management
          </li>
          <li style={{ padding: '10px' }}>Projects</li>
          <li style={{ padding: '10px' }}>Settings</li>
          <li style={{ padding: '10px' }}>Analytics</li>
        </ul>
      </div>

      <div className="admin-content">
        <h2>User Management</h2>
        <p>Manage user accounts and permissions</p>

        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userItem) => (
              <tr key={userItem._id}>
                <td>
                  <div className="d-flex align-center gap-10">
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#1a237e',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {userItem.name.charAt(0)}
                    </div>
                    {userItem.name}
                  </div>
                </td>
                <td>{userItem.email}</td>
                <td>
                  <select
                    value={userItem.role}
                    onChange={(e) => handleRoleChange(userItem._id, e.target.value)}
                    className="form-control"
                    style={{ width: '120px' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="member">Member</option>
                  </select>
                </td>
                <td>
                  {new Date(userItem.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div className="d-flex gap-10">
                    <button
                      className="btn"
                      onClick={() => setEditingUser(userItem)}
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteUser(userItem._id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20">
          <h4>Statistics</h4>
          <div className="d-flex gap-20">
            <div className="stat-card">
              <h3>{users.length}</h3>
              <p>Total Users</p>
            </div>
            <div className="stat-card">
              <h3>{users.filter(u => u.role === 'admin').length}</h3>
              <p>Admins</p>
            </div>
            <div className="stat-card">
              <h3>{users.filter(u => u.role === 'manager').length}</h3>
              <p>Managers</p>
            </div>
            <div className="stat-card">
              <h3>{users.filter(u => u.role === 'member').length}</h3>
              <p>Members</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;