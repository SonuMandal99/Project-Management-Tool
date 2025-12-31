const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');

// Import middleware
const errorMiddleware = require('./middleware/errorMiddleware');

// Initialize Express app
const app = express();

// Connect to MongoDB with graceful failure handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/project_management';
    
    console.log('🔗 Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log('✅ MongoDB Connected Successfully');
    
    // Create default admin user if not exists
    await createDefaultAdmin();
    
  } catch (error) {
    console.log('⚠️  MongoDB Connection Error:', error.message);
    console.log('💡 Running in Mock Data Mode - Some features limited');
    console.log('   To enable full features:');
    console.log('   1. Install MongoDB from: https://www.mongodb.com/try/download/community');
    console.log('   2. Run: mongod');
    console.log('   3. Or use MongoDB Atlas (cloud)');
    
    // Don't exit process, continue with mock data
  }
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      console.log('👑 Default admin user created');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: admin123');
    }
  } catch (error) {
    console.log('⚠️  Could not create default admin:', error.message);
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.get('/api', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    message: 'Project Management API',
    version: '1.0.0',
    database: dbStatus,
    mode: dbStatus === 'connected' ? 'Full Mode' : 'Mock Data Mode',
    endpoints: {
      auth: '/api/auth',
      tasks: '/api/tasks',
      projects: '/api/projects',
      users: '/api/users',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    server: 'running',
    uptime: process.uptime()
  });
});

// Mock data for when MongoDB is not available
const mockData = {
  users: [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      avatar: ''
    },
    {
      id: 2,
      name: 'Test Manager',
      email: 'manager@example.com',
      role: 'manager',
      avatar: ''
    },
    {
      id: 3,
      name: 'Test Member',
      email: 'member@example.com',
      role: 'member',
      avatar: ''
    }
  ],
  projects: [
    {
      id: 1,
      name: 'Default Project',
      description: 'Welcome to Project Management Tool',
      owner: 1,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Website Redesign',
      description: 'Redesign company website',
      owner: 1,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: 1,
      title: 'Welcome Task',
      description: 'Complete the setup and explore features',
      status: 'todo',
      priority: 'medium',
      projectId: 1,
      assignee: 1,
      createdBy: 1,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Design Homepage',
      description: 'Create new homepage design',
      status: 'inprogress',
      priority: 'high',
      projectId: 2,
      assignee: 2,
      createdBy: 1,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Implement Login',
      description: 'Implement user authentication',
      status: 'review',
      priority: 'high',
      projectId: 2,
      assignee: 3,
      createdBy: 1,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 4,
      title: 'Write Documentation',
      description: 'Document API endpoints',
      status: 'done',
      priority: 'low',
      projectId: 1,
      assignee: 1,
      createdBy: 1,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ]
};

// Mock endpoints when MongoDB is not available
const setupMockEndpoints = () => {
  console.log('🔄 Setting up mock endpoints...');
  
  // Mock auth endpoint
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Simple mock auth - accept any email with password "password123"
    const mockUser = mockData.users.find(user => user.email === email);
    
    if (mockUser && password === 'password123') {
      res.json({
        success: true,
        token: 'mock-jwt-token-for-development',
        user: {
          _id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          avatar: mockUser.avatar
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  });
  
  // Mock register endpoint
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    
    const newUser = {
      id: mockData.users.length + 1,
      name,
      email,
      role: 'member',
      avatar: ''
    };
    
    mockData.users.push(newUser);
    
    res.status(201).json({
      success: true,
      token: 'mock-jwt-token-for-development',
      user: {
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  });
  
  // Mock tasks endpoint
  app.get('/api/tasks', (req, res) => {
    const { project, status } = req.query;
    
    let tasks = [...mockData.tasks];
    
    if (project) {
      tasks = tasks.filter(task => task.projectId == project);
    }
    
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length
    };
    
    res.json({
      success: true,
      count: tasks.length,
      stats,
      data: tasks
    });
  });
  
  // Mock projects endpoint
  app.get('/api/projects', (req, res) => {
    const projectsWithStats = mockData.projects.map(project => {
      const projectTasks = mockData.tasks.filter(task => task.projectId === project.id);
      return {
        ...project,
        taskCount: projectTasks.length,
        completedCount: projectTasks.filter(task => task.status === 'done').length
      };
    });
    
    res.json({
      success: true,
      count: projectsWithStats.length,
      data: projectsWithStats
    });
  });
  
  // Mock users endpoint (admin only)
  app.get('/api/users', (req, res) => {
    res.json({
      success: true,
      count: mockData.users.length,
      data: mockData.users
    });
  });
  
  // Mock create task
  app.post('/api/tasks', (req, res) => {
    const { title, description, project, priority } = req.body;
    
    const newTask = {
      id: mockData.tasks.length + 1,
      title,
      description,
      status: 'todo',
      priority: priority || 'medium',
      projectId: project || 1,
      assignee: 1,
      createdBy: 1,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    mockData.tasks.push(newTask);
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });
  });
  
  // Mock update task status
  app.patch('/api/tasks/:id/status', (req, res) => {
    const taskId = parseInt(req.params.id);
    const { status } = req.body;
    
    const taskIndex = mockData.tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    mockData.tasks[taskIndex].status = status;
    
    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: mockData.tasks[taskIndex]
    });
  });
  
  console.log('✅ Mock endpoints ready');
};

// Routes - Use real routes if DB connected, otherwise use mock
connectDB().then(() => {
  if (mongoose.connection.readyState === 1) {
    // MongoDB is connected - use real routes
    console.log('🎯 Using real database routes');
    app.use('/api/auth', authRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/users', userRoutes);
  } else {
    // MongoDB not connected - use mock routes
    setupMockEndpoints();
  }
});

// Error handling middleware
app.use(errorMiddleware);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n💡 Test Credentials:`);
  console.log(`   Email: admin@example.com`);
  console.log(`   Password: password123`);
  console.log(`\n📊 Database Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Mock Mode'}`);
  
  // Periodic check for MongoDB connection
  setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      console.log('💾 MongoDB: Connected');
    }
  }, 30000); // Check every 30 seconds
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`⚠️  Unhandled Rejection: ${err.message}`);
  // Don't exit - keep server running
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});