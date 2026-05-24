const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/security-guard.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

router.route('/')
  .get( auth('getUsers'),    ctrl.getGuards)
  .post(auth('manageUsers'), validate(schemas.createGuard), ctrl.createGuard);

router.route('/:guardId')
  .get(   auth('getUsers'),    ctrl.getGuard)
  .patch( auth('manageUsers'), validate(schemas.updateGuard), ctrl.updateGuard);

module.exports = router;
