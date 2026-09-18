const express  = require('express');
const router   = express.Router();
const { catchAsync } = require('../utils/helpers');
const invoiceService  = require('../services/invoice.service');
const auth     = require('../middlewares/auth');

router.get('/', auth('getUsers'), catchAsync(async (req, res) => {
  res.send(await invoiceService.getPayments(req.query));
}));

module.exports = router;
