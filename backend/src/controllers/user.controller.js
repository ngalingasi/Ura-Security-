const httpStatus   = require('http-status');
const { catchAsync }  = require('../utils/helpers');
const userService  = require('../services/user.service');

const createUser = catchAsync(async (req, res) => {
  const body = { ...req.body };
  // Non-super-admin cannot create super_admin accounts
  if (req.user.role !== 'super_admin' && body.role === 'super_admin') {
    body.role = 'user';
  }
  const user = await userService.createUser(body, req.user.user_id);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const result = await userService.getUsers(req.query);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUser(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deactivateUser(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getSkills = catchAsync(async (req, res) => {
  const skills = await userService.getSkills();
  res.send(skills);
});

const updateSkills = catchAsync(async (req, res) => {
  await userService.updateSkills(req.params.userId, req.body.skill_ids ?? []);
  const user = await userService.getUserById(req.params.userId);
  res.send(user);
});

module.exports = { createUser, getUsers, getUser, updateUser, deleteUser, getSkills, updateSkills };
