const assignmentModel = require('../models/assignment.model');

const getAssignments   = (filters)             => assignmentModel.findAll(filters);
const getAssignmentById = (id)                 => assignmentModel.findById(id);
const createAssignment  = (body, userId)       => assignmentModel.create(body, userId);
const endAssignment     = (id, userId, notes)  => assignmentModel.endAssignment(id, userId, notes);
const cancelAssignment  = (id, userId, notes)  => assignmentModel.cancelAssignment(id, userId, notes);

module.exports = { getAssignments, getAssignmentById, createAssignment, endAssignment, cancelAssignment };
