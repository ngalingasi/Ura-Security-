const httpStatus  = require('http-status');
const path        = require('path');
const fs          = require('fs');
const { catchAsync } = require('../utils/helpers');
const ApiError    = require('../utils/ApiError');
const guardService = require('../services/security-guard.service');
const { query }   = require('../database/db');
const { deleteFile } = require('../middlewares/upload');

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

// ── Photo upload ───────────────────────────────────────────────────────────────
const uploadPhoto = catchAsync(async (req, res) => {
  const { guardId } = req.params;
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'No image file provided');

  const photo_url = `/uploads/guards/${req.file.filename}`;

  const [existing] = await query(
    'SELECT photo_url FROM security_guards WHERE guard_id = ?', [guardId]
  );
  if (existing?.photo_url) deleteFile(existing.photo_url);

  await query('UPDATE security_guards SET photo_url = ? WHERE guard_id = ?', [photo_url, guardId]);
  const updated = await guardService.getGuardById(Number(guardId));
  res.json(updated);
});

// ── Education levels meta ──────────────────────────────────────────────────────
const getEducationLevels = catchAsync(async (req, res) => {
  const levels = await guardService.getEducationLevels();
  res.json(levels.map(l => l.name));
});

// ── Education CRUD ─────────────────────────────────────────────────────────────
const upsertEducation = catchAsync(async (req, res) => {
  const { guardId } = req.params;
  // body.records is JSON array
  const records = JSON.parse(req.body.records || '[]');
  await guardService.upsertEducation(guardId, records);
  const guard = await guardService.getGuardById(Number(guardId));
  res.json(guard.education);
});

// Upload a single education attachment
const uploadEducationAttachment = catchAsync(async (req, res) => {
  const { educationId } = req.params;
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'No file provided');

  const attachment_url = `/uploads/guards/docs/${req.file.filename}`;

  // Delete old attachment
  const [row] = await query(
    'SELECT attachment_url FROM guard_education WHERE education_id = ?', [educationId]
  );
  if (row?.attachment_url) deleteFile(row.attachment_url);

  await query(
    'UPDATE guard_education SET attachment_url = ? WHERE education_id = ?',
    [attachment_url, educationId]
  );
  res.json({ attachment_url });
});

// ── Skills CRUD ────────────────────────────────────────────────────────────────
const upsertSkills = catchAsync(async (req, res) => {
  const { guardId } = req.params;
  const records = JSON.parse(req.body.records || '[]');
  await guardService.upsertSkills(guardId, records);
  const guard = await guardService.getGuardById(Number(guardId));
  res.json(guard.skills);
});

// Upload a single skill attachment
const uploadSkillAttachment = catchAsync(async (req, res) => {
  const { skillId } = req.params;
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'No file provided');

  const attachment_url = `/uploads/guards/docs/${req.file.filename}`;

  const [row] = await query(
    'SELECT attachment_url FROM guard_skills WHERE skill_id = ?', [skillId]
  );
  if (row?.attachment_url) deleteFile(row.attachment_url);

  await query(
    'UPDATE guard_skills SET attachment_url = ? WHERE skill_id = ?',
    [attachment_url, skillId]
  );
  res.json({ attachment_url });
});

module.exports = {
  getGuards, getGuard, createGuard, updateGuard, uploadPhoto,
  getEducationLevels,
  upsertEducation, uploadEducationAttachment,
  upsertSkills, uploadSkillAttachment,
};
