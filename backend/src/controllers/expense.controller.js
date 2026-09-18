const httpStatus       = require('http-status');
const { catchAsync }   = require('../utils/helpers');
const expenseService   = require('../services/expense.service');

const getExpenses = catchAsync(async (req, res) => {
  res.send(await expenseService.getExpenses(req.query));
});

const getExpense = catchAsync(async (req, res) => {
  res.send(await expenseService.getExpenseById(req.params.expenseId));
});

const createExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.createExpense(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(expense);
});

const updateExpense = catchAsync(async (req, res) => {
  res.send(await expenseService.updateExpense(req.params.expenseId, req.body, req.user.user_id));
});

const deleteExpense = catchAsync(async (req, res) => {
  await expenseService.deleteExpense(req.params.expenseId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { getExpenses, getExpense, createExpense, updateExpense, deleteExpense };
