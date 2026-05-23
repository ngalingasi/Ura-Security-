const express    = require('express');
const router     = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');

router.use('/v1/auth',  authRoutes);
router.use('/v1/users', userRoutes);

router.get('/', (req, res) => res.json({
  name:    'Ura Security API',
  version: 'v1',
  endpoints: { auth: '/api/v1/auth', users: '/api/v1/users' },
}));

module.exports = router;
