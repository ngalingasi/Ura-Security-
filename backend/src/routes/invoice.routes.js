const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/invoice.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');
const { handlePaymentEvidenceUpload } = require('../middlewares/upload');

router.route('/')
  .get( auth('getUsers'),    ctrl.getInvoices)
  .post(auth('manageUsers'), validate(schemas.createInvoice), ctrl.createInvoice);

router.route('/:invoiceId')
  .get(  auth('getUsers'),    ctrl.getInvoice)
  .patch(auth('manageUsers'), validate(schemas.updateInvoice), ctrl.updateInvoice);

router.post('/:invoiceId/approve', auth('manageUsers'), ctrl.approveInvoice);
router.post('/:invoiceId/cancel',  auth('manageUsers'), validate(schemas.cancelInvoice), ctrl.cancelInvoice);

router.post('/:invoiceId/payments',
  auth('manageUsers'), handlePaymentEvidenceUpload, validate(schemas.recordPayment), ctrl.recordPayment);

module.exports = router;
