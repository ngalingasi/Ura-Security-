const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/assignment.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

router.route('/')
  .get( auth('getUsers'),    ctrl.getAssignments)
  .post(auth('manageUsers'), validate(schemas.createAssignment), ctrl.createAssignment);

router.route('/:assignmentId')
  .get(auth('getUsers'), ctrl.getAssignment);

// End / cancel assignment
router.patch('/:assignmentId/end',    auth('manageUsers'), validate(schemas.endAssignment), ctrl.endAssignment);
router.patch('/:assignmentId/cancel', auth('manageUsers'), validate(schemas.endAssignment), ctrl.cancelAssignment);

module.exports = router;
