const httpStatus       = require('http-status');
const { catchAsync }   = require('../utils/helpers');
const invoiceService   = require('../services/invoice.service');

const getInvoices = catchAsync(async (req, res) => {
  res.send(await invoiceService.getInvoices(req.query));
});

const getInvoice = catchAsync(async (req, res) => {
  res.send(await invoiceService.getInvoiceById(req.params.invoiceId));
});

const createInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(invoice);
});

const updateInvoice = catchAsync(async (req, res) => {
  res.send(await invoiceService.updateInvoice(req.params.invoiceId, req.body, req.user.user_id));
});

const approveInvoice = catchAsync(async (req, res) => {
  res.send(await invoiceService.approveInvoice(req.params.invoiceId, req.user.user_id));
});

const cancelInvoice = catchAsync(async (req, res) => {
  res.send(await invoiceService.cancelInvoice(req.params.invoiceId, req.user.user_id, req.body?.reason));
});

// Evidence file itself is handled by multer upstream (handlePaymentEvidenceUpload);
// req.file.path/originalname passed through here if present.
const recordPayment = catchAsync(async (req, res) => {
  const payload = {
    amount: req.body.amount,
    notes:  req.body.notes,
    evidence_path: req.file ? req.file.path : undefined,
    evidence_name: req.file ? req.file.originalname : undefined,
  };
  res.send(await invoiceService.recordPayment(req.params.invoiceId, payload, req.user.user_id));
});

const getPayments = catchAsync(async (req, res) => {
  res.send(await invoiceService.getPayments(req.query));
});

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, approveInvoice, cancelInvoice, recordPayment, getPayments };
