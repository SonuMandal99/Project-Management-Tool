const Project = require('../models/Project');
const Task = require('../models/Task');

// Middleware to check if user is project owner
exports.isProjectOwner = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.project;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is the project owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Only project owner can perform this action'
      });
    }

    req.project = project;
    next();
  } catch (error) {
    console.error('Project Owner Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to check if user is project member
exports.isProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.project;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is project owner, member, or admin
    const isOwner = project.owner.toString() === req.user.id;
    const isMember = project.members.some(m => m.user.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. You are not a member of this project'
      });
    }

    req.project = project;
    next();
  } catch (error) {
    console.error('Project Member Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to check if user can manage tasks in project
exports.canManageTasks = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const userRole = req.user.role;
    const isOwner = project.owner.toString() === req.user.id;
    const isManager = project.members.some(
      m => m.user.toString() === req.user.id && m.role === 'manager'
    );

    // Check permissions based on project settings
    if (userRole === 'admin' || isOwner) {
      return next();
    }

    if (isManager) {
      return next();
    }

    // Check if regular members can create tasks
    if (req.method === 'POST' && project.settings.allowMemberTaskCreation) {
      const isMember = project.members.some(m => m.user.toString() === req.user.id);
      if (isMember) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage tasks in this project'
    });

  } catch (error) {
    console.error('Task Management Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to check if user can assign tasks
exports.canAssignTasks = async (req, res, next) => {
  try {
    const projectId = req.body.project || req.params.projectId;
    
    if (!projectId) {
      return next(); // Skip if no project specified
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const userRole = req.user.role;
    const isOwner = project.owner.toString() === req.user.id;
    const isManager = project.members.some(
      m => m.user.toString() === req.user.id && m.role === 'manager'
    );

    // Admins, owners, and managers can always assign tasks
    if (userRole === 'admin' || isOwner || isManager) {
      return next();
    }

    // Check project settings for member task assignment
    if (project.settings.allowMemberTaskAssignment) {
      const isMember = project.members.some(m => m.user.toString() === req.user.id);
      if (isMember) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to assign tasks'
    });

  } catch (error) {
    console.error('Task Assignment Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to check if user can update task status
exports.canUpdateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const userRole = req.user.role;
    const isTaskAssignee = task.assignee?.toString() === req.user.id;
    const isProjectOwner = project.owner.toString() === req.user.id;
    const isProjectManager = project.members.some(
      m => m.user.toString() === req.user.id && m.role === 'manager'
    );

    // Allow if user is admin, project owner, project manager, or task assignee
    if (userRole === 'admin' || isProjectOwner || isProjectManager || isTaskAssignee) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to update task status'
    });

  } catch (error) {
    console.error('Task Status Update Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to check if user can delete task
exports.canDeleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const userRole = req.user.role;
    const isProjectOwner = project.owner.toString() === req.user.id;
    const isTaskCreator = task.createdBy.toString() === req.user.id;

    // Only admin, project owner, or task creator can delete tasks
    if (userRole === 'admin' || isProjectOwner || isTaskCreator) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this task'
    });

  } catch (error) {
    console.error('Task Delete Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to check if user can manage users (admin only)
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Middleware to check if user can manage projects
exports.canManageProjects = (req, res, next) => {
  const allowedRoles = ['admin', 'manager'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Manager or admin access required'
    });
  }
  next();
};

// Dynamic role check middleware
exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized`
      });
    }

    next();
  };
};

// Resource ownership check
exports.isResourceOwner = (model, paramId = 'id', ownerField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramId];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      const resource = await model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user is the owner or admin
      const isOwner = resource[ownerField].toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized. You do not own this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource Owner Check Error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};