const express    = require('express');
const router     = express.Router();
const { lookupUser, health, getLogs, getMe } = require('../controllers/erp.controller');
const erpSecret  = require('../middlewares/erpSecret');

router.use(erpSecret);

router.post('/lookup-user',      lookupUser);
router.post('/me',               getMe);
router.get('/health',            health);
router.get('/integration-logs',  getLogs);

module.exports = router;
