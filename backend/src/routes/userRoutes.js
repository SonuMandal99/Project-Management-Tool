const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getUserDashboard
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes protected
router.use(protect);

// Admin-only routes
router.route('/')
  .get(authorize('admin'), getUsers);

router.route('/:id')
  .get(getUser)
  .delete(authorize('admin'), deleteUser);

router.route('/:id/role')
  .put(authorize('admin'), updateUserRole);

router.route('/:id/status')
  .put(authorize('admin'), updateUserStatus);

router.route('/:id/dashboard')
  .get(getUserDashboard);

module.exports = router;