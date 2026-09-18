const invoiceModel = require('../models/invoice.model');

const getInvoices    = (filters)               => invoiceModel.findAll(filters);
const getInvoiceById = (id)                    => invoiceModel.findById(id);
const createInvoice  = (body, userId)          => invoiceModel.create(body, userId);
const updateInvoice  = (id, body, userId)      => invoiceModel.update(id, body, userId);
const approveInvoice = (id, userId)            => invoiceModel.approve(id, userId);
const cancelInvoice  = (id, userId, reason)    => invoiceModel.cancel(id, userId, reason);
const recordPayment  = (id, body, userId)      => invoiceModel.recordPayment(id, body, userId);
const getPayments    = (filters)               => invoiceModel.findPayments(filters);

module.exports = { getInvoices, getInvoiceById, createInvoice, updateInvoice, approveInvoice, cancelInvoice, recordPayment, getPayments };
