const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/post-site.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

router.route('/')
  .get( auth('getUsers'),    ctrl.getPostSites)
  .post(auth('manageUsers'), validate(schemas.createPostSite), ctrl.createPostSite);

router.route('/:siteId')
  .get(   auth('getUsers'),    ctrl.getPostSite)
  .patch( auth('manageUsers'), validate(schemas.updatePostSite), ctrl.updatePostSite)
  .delete(auth('manageUsers'), ctrl.deletePostSite);

module.exports = router;
