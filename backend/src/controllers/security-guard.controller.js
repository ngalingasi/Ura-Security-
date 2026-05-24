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

const uploadPhoto = require('../utils/helpers').catchAsync(async (req, res) => {
  const { guardId } = req.params;
  if (!req.file) {
    const httpStatus = require('http-status');
    throw new (require('../utils/ApiError'))(httpStatus.BAD_REQUEST, 'No image file provided');
  }

  // Build public URL — served via /uploads/guards/<filename>
  const photo_url = `/uploads/guards/${req.file.filename}`;

  // Remove old photo file if it exists
  const { query } = require('../database/db');
  const [existing] = await query('SELECT photo_url FROM security_guards WHERE guard_id = ?', [guardId]);
  if (existing?.photo_url) {
    const fs   = require('fs');
    const path = require('path');
    const old  = path.join(process.cwd(), existing.photo_url.replace(/^\//, ''));
    if (fs.existsSync(old)) fs.unlink(old, () => {});
  }

  await query('UPDATE security_guards SET photo_url = ? WHERE guard_id = ?', [photo_url, guardId]);
  const guardService = require('../services/security-guard.service');
  const updated = await guardService.getGuardById(Number(guardId));
  res.json(updated);
});

module.exports = Object.assign(module.exports, { uploadPhoto });
