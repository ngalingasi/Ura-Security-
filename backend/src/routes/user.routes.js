const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/user.controller');
const schemas = require('../validations/schemas');
const auth    = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

// Skills meta — must come before /:userId to avoid param conflict
router.get('/meta/skills', auth(), ctrl.getSkills);

// User CRUD
router.route('/')
  .get( auth('getUsers'),    ctrl.getUsers)
  .post(auth('manageUsers'), validate(schemas.createUser), ctrl.createUser);

router.route('/:userId')
  .get(   auth('getUsers'),    ctrl.getUser)
  .patch( auth('manageUsers'), validate(schemas.updateUser), ctrl.updateUser)
  .delete(auth('manageUsers'), ctrl.deleteUser);

// Skills assignment
router.put('/:userId/skills', auth('manageUsers'), ctrl.updateSkills);

module.exports = router;
