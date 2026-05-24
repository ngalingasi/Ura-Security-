const express  = require('express');
const path     = require('path');
const router   = express.Router();
const ctrl     = require('../controllers/security-guard.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');
const { handleGuardPhotoUpload } = require('../middlewares/upload');

router.route('/')
  .get( auth('getUsers'),    ctrl.getGuards)
  .post(auth('manageUsers'), validate(schemas.createGuard), ctrl.createGuard);

router.route('/:guardId')
  .get(   auth('getUsers'),    ctrl.getGuard)
  .patch( auth('manageUsers'), validate(schemas.updateGuard), ctrl.updateGuard);

// Photo upload — multipart/form-data, field name: "photo"
router.post(
  '/:guardId/photo',
  auth('manageUsers'),
  handleGuardPhotoUpload,
  ctrl.uploadPhoto
);

module.exports = router;
