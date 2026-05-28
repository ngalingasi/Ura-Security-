const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/security-guard.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');
const { handleGuardPhotoUpload, handleGuardDocUpload } = require('../middlewares/upload');

// Meta
router.get('/meta/education-levels', auth(), ctrl.getEducationLevels);

// Guard CRUD
router.route('/')
  .get( auth('getUsers'),    ctrl.getGuards)
  .post(auth('manageUsers'), validate(schemas.createGuard), ctrl.createGuard);

router.route('/:guardId')
  .get(   auth('getUsers'),    ctrl.getGuard)
  .patch( auth('manageUsers'), validate(schemas.updateGuard), ctrl.updateGuard);

// Photo
router.post('/:guardId/photo', auth('manageUsers'), handleGuardPhotoUpload, ctrl.uploadPhoto);

// Education (bulk upsert + single file upload)
router.post('/:guardId/education',         auth('manageUsers'), ctrl.upsertEducation);
router.post('/education/:educationId/attachment',
  auth('manageUsers'), handleGuardDocUpload, ctrl.uploadEducationAttachment);

// Skills (bulk upsert + single file upload)
router.post('/:guardId/skills',            auth('manageUsers'), ctrl.upsertSkills);
router.post('/skills/:skillId/attachment',
  auth('manageUsers'), handleGuardDocUpload, ctrl.uploadSkillAttachment);

module.exports = router;
