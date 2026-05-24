const httpStatus        = require('http-status');
const { catchAsync }    = require('../utils/helpers');
const guardService      = require('../services/security-guard.service');

const getGuards = catchAsync(async (req, res) => {
  res.send(await guardService.getGuards(req.query));
});

const getGuard = catchAsync(async (req, res) => {
  res.send(await guardService.getGuardById(req.params.guardId));
});

const createGuard = catchAsync(async (req, res) => {
  const guard = await guardService.createGuard(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(guard);
});

const updateGuard = catchAsync(async (req, res) => {
  res.send(await guardService.updateGuard(req.params.guardId, req.body));
});

module.exports = { getGuards, getGuard, createGuard, updateGuard };
