const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/expense.controller');
const schemas  = require('../validations/schemas');
const auth     = require('../middlewares/auth');
const { validate } = require('../middlewares/index');

router.route('/')
  .get( auth('getUsers'),    ctrl.getExpenses)
  .post(auth('manageUsers'), validate(schemas.createExpense), ctrl.createExpense);

router.route('/:expenseId')
  .get(   auth('getUsers'),    ctrl.getExpense)
  .patch( auth('manageUsers'), validate(schemas.updateExpense), ctrl.updateExpense)
  .delete(auth('manageUsers'), ctrl.deleteExpense);

module.exports = router;
