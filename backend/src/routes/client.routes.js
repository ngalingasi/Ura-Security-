const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/client.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

// Meta (regions + service types) — must be before /:clientId
router.get('/meta', auth(), ctrl.getMeta);

// Post sites for a specific client
router.get('/:clientId/sites', auth(), ctrl.getPostSitesByClient_Stub || ((req, res, next) => {
  // Delegated to post-sites router — handled inline here for convenience
  require('../services/post-site.service')
    .getPostSitesByClient(req.params.clientId)
    .then((data) => res.send(data))
    .catch(next);
}));

router.route('/')
  .get( auth('getUsers'),    ctrl.getClients)
  .post(auth('manageUsers'), validate(schemas.createClient), ctrl.createClient);

router.route('/:clientId')
  .get(   auth('getUsers'),    ctrl.getClient)
  .patch( auth('manageUsers'), validate(schemas.updateClient), ctrl.updateClient)
  .delete(auth('manageUsers'), ctrl.deleteClient);

module.exports = router;
