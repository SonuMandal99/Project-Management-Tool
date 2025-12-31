import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiUser, FiHome, FiSettings } from 'react-icons/fi';
import { useAuth } from '../services/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="nav-link">
          Project Management
        </Link>
      </div>

      <div className="navbar-nav">
        {user ? (
          <>
            <Link to="/dashboard" className="nav-link">
              <FiHome /> Dashboard
            </Link>
            
            {user.role === 'admin' && (
              <Link to="/admin" className="nav-link">
                <FiSettings /> Admin
              </Link>
            )}
            
            <span className="nav-link">
              <FiUser /> {user.name}
            </span>
            
            <button onClick={handleLogout} className="btn btn-danger">
              <FiLogOut /> Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-link">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;