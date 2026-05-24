const httpStatus        = require('http-status');
const { catchAsync }    = require('../utils/helpers');
const assignmentService = require('../services/assignment.service');

const getAssignments = catchAsync(async (req, res) => {
  res.send(await assignmentService.getAssignments(req.query));
});

const getAssignment = catchAsync(async (req, res) => {
  res.send(await assignmentService.getAssignmentById(req.params.assignmentId));
});

const createAssignment = catchAsync(async (req, res) => {
  const a = await assignmentService.createAssignment(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(a);
});

const endAssignment = catchAsync(async (req, res) => {
  const a = await assignmentService.endAssignment(
    req.params.assignmentId,
    req.user.user_id,
    req.body.notes
  );
  res.send(a);
});

const cancelAssignment = catchAsync(async (req, res) => {
  const a = await assignmentService.cancelAssignment(
    req.params.assignmentId,
    req.user.user_id,
    req.body.notes
  );
  res.send(a);
});

module.exports = { getAssignments, getAssignment, createAssignment, endAssignment, cancelAssignment };
