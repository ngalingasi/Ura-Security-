const guardModel = require('../models/security-guard.model');

const getGuards    = (filters)      => guardModel.findAll(filters);
const getGuardById = (id)           => guardModel.findById(id);
const createGuard  = (body, userId) => guardModel.create(body, userId);
const updateGuard  = (id, body)     => guardModel.update(id, body);

module.exports = { getGuards, getGuardById, createGuard, updateGuard };
