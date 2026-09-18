const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/catalogItem.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

router.route('/')
  .get( auth('getUsers'),    ctrl.getCatalogItems)
  .post(auth('manageUsers'), validate(schemas.createCatalogItem), ctrl.createCatalogItem);

router.route('/:itemId')
  .patch( auth('manageUsers'), validate(schemas.updateCatalogItem), ctrl.updateCatalogItem)
  .delete(auth('manageUsers'), ctrl.deactivateCatalogItem);

module.exports = router;
