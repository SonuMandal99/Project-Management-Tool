const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes protected
router.use(protect);

// Routes accessible to all authenticated users
router.route('/')
  .get(getProjects)
  .post(createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

router.route('/:id/members')
  .post(addMember);

router.route('/:id/members/:memberId')
  .delete(removeMember);

module.exports = router;