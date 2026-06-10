const express          = require('express');
const router           = express.Router();
const authRoutes       = require('./auth.routes');
const userRoutes       = require('./user.routes');
const clientRoutes     = require('./client.routes');
const postSiteRoutes   = require('./post-site.routes');
const guardRoutes      = require('./security-guard.routes');
const assignmentRoutes = require('./assignment.routes');
const erp = require("./erp.route");

router.use('/v1/auth',             authRoutes);
router.use('/v1/users',            userRoutes);
router.use('/v1/clients',          clientRoutes);
router.use('/v1/post-sites',       postSiteRoutes);
router.use('/v1/security-guards',  guardRoutes);
router.use('/v1/assignments',      assignmentRoutes);
router.use("/v1/erp", erp);

router.get('/', (req, res) => res.json({
  name:    'Ura Security API',
  version: 'v1',
  endpoints: {
    auth:             '/api/v1/auth',
    users:            '/api/v1/users',
    clients:          '/api/v1/clients',
    post_sites:       '/api/v1/post-sites',
    security_guards:  '/api/v1/security-guards',
    assignments:      '/api/v1/assignments',
    erp:              '/api/v1/erp',
  },
}));

module.exports = router;
