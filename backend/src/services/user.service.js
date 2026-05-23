const crypto       = require('crypto');
const userModel    = require('../models/user.model');
const emailService = require('./email.service');

const createUser = async (body, creatorId) => {
  const autoPassword = !body.password;
  if (autoPassword) {
    body.password = crypto.randomBytes(8).toString('hex');
  }

  const user = await userModel.create(body, creatorId);

  if (autoPassword && user.email) {
    emailService
      .sendWelcomeEmail(user.email, user.full_name, user.username, body.password)
      .catch(() => {});
  }

  return user;
};

const getUsers        = (filters)       => userModel.findAll(filters);
const getUserById     = (id)            => userModel.findById(id);
const updateUser      = (id, body)      => userModel.update(id, body);
const deactivateUser  = (id)            => userModel.deactivate(id);
const updateSkills    = (userId, ids)   => userModel.updateSkills(userId, ids);
const getSkills       = ()              => userModel.getAllSkills();

module.exports = {
  createUser, getUsers, getUserById, updateUser,
  deactivateUser, updateSkills, getSkills,
};
