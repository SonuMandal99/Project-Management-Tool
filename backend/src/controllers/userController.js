const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Users can view their own profile or admin can view any
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }

    // Get user statistics
    const ownedProjects = await Project.countDocuments({ owner: user._id });
    const memberProjects = await Project.countDocuments({ 
      'members.user': user._id 
    });
    
    const assignedTasks = await Task.countDocuments({ assignee: user._id });
    const completedTasks = await Task.countDocuments({ 
      assignee: user._id, 
      status: 'done' 
    });

    const userWithStats = {
      ...user.toObject(),
      stats: {
        ownedProjects,
        memberProjects,
        totalProjects: ownedProjects + memberProjects,
        assignedTasks,
        completedTasks,
        completionRate: assignedTasks > 0 ? 
          Math.round((completedTasks / assignedTasks) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: userWithStats
    });

  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin only)
exports.updateUserRole = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { role } = req.body;

    if (!['admin', 'manager', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot change your own role
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user status (active/inactive)
// @route   PUT /api/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot deactivate yourself
    if (req.user.id === req.params.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });

  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot delete yourself
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Transfer ownership of projects owned by this user
    const projectsOwned = await Project.find({ owner: user._id });
    
    if (projectsOwned.length > 0) {
      // Transfer to admin or delete projects (implementation depends on requirements)
      // For now, we'll delete the projects and their tasks
      for (const project of projectsOwned) {
        await Task.deleteMany({ project: project._id });
        await project.deleteOne();
      }
    }

    // Remove user from project memberships
    await Project.updateMany(
      { 'members.user': user._id },
      { $pull: { members: { user: user._id } } }
    );

    // Reassign or remove tasks assigned to this user
    await Task.updateMany(
      { assignee: user._id },
      { $unset: { assignee: 1 } }
    );

    // Delete the user
    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user dashboard stats
// @route   GET /api/users/:id/dashboard
// @access  Private
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can view their own dashboard or admin can view any
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this dashboard'
      });
    }

    // Get projects
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    })
    .select('name description status owner')
    .populate('owner', 'name')
    .limit(5);

    // Get tasks
    const tasks = await Task.find({ assignee: userId })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(10);

    // Get statistics
    const totalTasks = await Task.countDocuments({ assignee: userId });
    const completedTasks = await Task.countDocuments({ 
      assignee: userId, 
      status: 'done' 
    });
    const overdueTasks = await Task.find({ assignee: userId })
      .then(tasks => tasks.filter(t => t.isOverdue).length);

    const stats = {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      overdueTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate: totalTasks > 0 ? 
        Math.round((completedTasks / totalTasks) * 100) : 0
    };

    res.json({
      success: true,
      data: {
        stats,
        recentProjects: projects,
        upcomingTasks: tasks
      }
    });

  } catch (error) {
    console.error('Get Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};