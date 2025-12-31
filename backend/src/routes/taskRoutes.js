const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addComment
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes protected
router.use(protect);

// Routes
router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

router.route('/:id/status')
  .patch(updateTaskStatus);

router.route('/:id/comments')
  .post(addComment);

module.exports = router;