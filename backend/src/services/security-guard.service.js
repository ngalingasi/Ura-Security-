const guardModel = require('../models/security-guard.model');

const getGuards          = (filters)      => guardModel.findAll(filters);
const getGuardById       = (id)           => guardModel.findById(id);
const createGuard        = (body, userId) => guardModel.create(body, userId);
const updateGuard        = (id, body)     => guardModel.update(id, body);
const getEducationLevels = ()             => guardModel.getEducationLevels();
const upsertEducation    = (guardId, recs) => guardModel.upsertEducation(guardId, recs);
const upsertSkills       = (guardId, recs) => guardModel.upsertSkills(guardId, recs);

module.exports = {
  getGuards, getGuardById, createGuard, updateGuard,
  getEducationLevels, upsertEducation, upsertSkills,
};
