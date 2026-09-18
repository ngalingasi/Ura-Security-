const expenseModel = require('../models/expense.model');

const getExpenses    = (filters)          => expenseModel.findAll(filters);
const getExpenseById = (id)               => expenseModel.findById(id);
const createExpense  = (body, userId)     => expenseModel.create(body, userId);
const updateExpense  = (id, body, userId) => expenseModel.update(id, body, userId);
const deleteExpense  = (id)               => expenseModel.remove(id);

module.exports = { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };
