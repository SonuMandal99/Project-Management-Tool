const Task = require('../models/Task');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { project, status, assignee, priority, search } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build query
    let query = {};

    // Filter by project
    if (project) {
      // Check if user has access to this project
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check project access
      const hasAccess = projectDoc.owner.toString() === userId || 
                       projectDoc.members.some(m => m.user.toString() === userId) ||
                       userRole === 'admin';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project'
        });
      }

      query.project = project;
    } else {
      // If no project specified, get tasks from all accessible projects
      const accessibleProjects = await Project.find({
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      }).select('_id');

      const projectIds = accessibleProjects.map(p => p._id);
      query.project = { $in: projectIds };
    }

    // Apply other filters
    if (status) query.status = status;
    if (assignee) query.assignee = assignee;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    // Get statistics
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.isOverdue).length
    };

    res.json({
      success: true,
      count: tasks.length,
      stats,
      data: tasks
    });

  } catch (error) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name description')
      .populate('comments.user', 'name avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const project = await Project.findById(task.project);
    const hasAccess = project.owner.toString() === req.user.id || 
                     project.members.some(m => m.user.toString() === req.user.id) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Get Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, project, priority, dueDate, assignee, tags } = req.body;

    // Check project access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const isProjectMember = projectDoc.owner.toString() === req.user.id || 
                           projectDoc.members.some(m => m.user.toString() === req.user.id) ||
                           req.user.role === 'admin';

    if (!isProjectMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tasks in this project'
      });
    }

    // Check if assignee is project member
    if (assignee) {
      const isAssigneeMember = assignee.toString() === projectDoc.owner.toString() || 
                              projectDoc.members.some(m => m.user.toString() === assignee.toString());
      if (!isAssigneeMember && req.user.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be a project member'
        });
      }
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      project,
      priority: priority || 'medium',
      dueDate,
      assignee,
      tags,
      createdBy: req.user.id,
      status: 'todo'
    });

    // Populate and return
    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask
    });

  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check project access
    const project = await Project.findById(task.project);
    const isProjectOwner = project.owner.toString() === req.user.id;
    const isTaskAssignee = task.assignee?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check update permissions
    const allowedUpdates = ['title', 'description', 'priority', 'dueDate', 'tags'];
    
    if (req.body.status) {
      // Only project owner, task assignee, or admin can change status
      if (!isProjectOwner && !isTaskAssignee && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to change task status'
        });
      }
      allowedUpdates.push('status');
    }

    if (req.body.assignee) {
      // Only project owner or admin can change assignee
      if (!isProjectOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to change assignee'
        });
      }
      allowedUpdates.push('assignee');
    }

    // Filter updates
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('assignee', 'name email');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });

  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions - only project owner or admin can delete
    const project = await Project.findById(task.project);
    if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['todo', 'inprogress', 'review', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const project = await Project.findById(task.project);
    const isTaskAssignee = task.assignee?.toString() === req.user.id;
    const isProjectOwner = project.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isTaskAssignee && !isProjectOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update task status'
      });
    }

    task.status = status;
    await task.save();

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: task
    });

  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check project access
    const project = await Project.findById(task.project);
    const hasAccess = project.owner.toString() === req.user.id || 
                     project.members.some(m => m.user.toString() === req.user.id) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task'
      });
    }

    task.comments.push({
      user: req.user.id,
      text: text.trim()
    });

    await task.save();

    // Populate the new comment
    const updatedTask = await Task.findById(task._id)
      .populate('comments.user', 'name avatar');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: updatedTask.comments
    });

  } catch (error) {
    console.error('Add Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};