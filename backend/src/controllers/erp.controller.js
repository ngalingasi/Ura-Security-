const httpStatus     = require('http-status');
const catchAsync     = require('../utils/helpers').catchAsync || require('../utils/catchAsync');
const { query }      = require('../database/db');
const tokenService   = require('../services/token.service');
const authService    = require('../services/auth.service');
const os             = require('os');

// ── lookup-user ───────────────────────────────────────────────────────────────
const lookupUser = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status:  false,
      message: 'email is required',
    });
  }

  const rows = await query(
    `SELECT user_id, full_name, username, email, mobile, gender, avatar,
            role, status, must_change_password
     FROM users
     WHERE email = ? AND status = 'active'
     LIMIT 1`,
    [email]
  );

  if (!rows.length) {
    return res.status(httpStatus.NOT_FOUND).json({
      status:  false,
      message: 'User not found in this system',
    });
  }

  const user   = rows[0];
  const tokens = await tokenService.generateAuthTokens(user);

  res.status(httpStatus.OK).json({
    status:  true,
    message: 'User found',
    user:    authService.sanitizeUser(user),
    tokens,
  });
});

// ── health ────────────────────────────────────────────────────────────────────
const health = catchAsync(async (req, res) => {
  const startTime = process.hrtime.bigint();

  // DB ping
  let dbStatus = 'ok';
  let dbLatencyMs = null;
  try {
    const t0 = Date.now();
    await query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch (e) {
    dbStatus = 'error';
  }

  // User stats
  let stats = { total_users: 0, active_users: 0 };
  try {
    const rows = await query(
      `SELECT
         COUNT(*) AS total_users,
         SUM(status = 'active') AS active_users
       FROM users`
    );
    stats = rows[0];
  } catch { /* skip */ }

  // Recent errors — last 24h from tokens table failures or use process uptime
  let recentErrors = 0;
  // URA doesn't have a system_logs table, use 0 as default
  // Child systems with integration_logs will override this

  const uptimeSeconds = Math.floor(process.uptime());

  res.status(httpStatus.OK).json({
    status:      true,
    system:      'URA Security System',
    environment: process.env.NODE_ENV ?? 'unknown',
    uptime_seconds: uptimeSeconds,
    uptime_human:   formatUptime(uptimeSeconds),
    db: {
      status:     dbStatus,
      latency_ms: dbLatencyMs,
    },
    users: {
      total:  Number(stats.total_users  ?? 0),
      active: Number(stats.active_users ?? 0),
    },
    errors_last_24h: recentErrors,
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node_version: process.version,
    timestamp: new Date().toISOString(),
  });
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

module.exports = { lookupUser, health };


// ── integration-logs ──────────────────────────────────────────────────────────
const getLogs = catchAsync(async (req, res) => {
  const {
    integration, status, fromDate, toDate,
    search, page = 1, limit = 50,
  } = req.query;

  const conditions = [];
  const params     = [];

  if (integration) { conditions.push('integration = ?');        params.push(integration); }
  if (status)      { conditions.push('status = ?');             params.push(status); }
  if (fromDate)    { conditions.push('DATE(created_at) >= ?');  params.push(fromDate); }
  if (toDate)      { conditions.push('DATE(created_at) <= ?');  params.push(toDate); }
  if (search) {
    conditions.push('(correlation_id LIKE ? OR url LIKE ? OR context LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim    = Math.min(Number(limit), 200);
  const offset = (Number(page) - 1) * lim;

  let total = 0;
  let rows  = [];
  try {
    const countRows = await query(`SELECT COUNT(*) AS total FROM integration_logs ${where}`, params);
    total = countRows[0].total;
    rows  = await query(
      `SELECT id, correlation_id, integration, method, url,
              response_status, error_message, duration_ms,
              triggered_by, context, status, created_at
       FROM integration_logs ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, lim, offset]
    );
  } catch { /* table may not exist yet */ }

  res.status(httpStatus.OK).json({
    status: true, message: 'Fetched successfully',
    total, page: Number(page), limit: lim, data: rows,
  });
});



// ── me — return current user profile via ERP secret ──────────────────────────
// Called by ERP portal ProfilePage — avoids needing Bearer + /auth/me
const getMe = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: false, message: 'email is required',
    });
  }

  const rows = await query(
    `SELECT user_id, full_name, username, email, mobile, gender,
            avatar, role, status, must_change_password
     FROM users WHERE email = ? AND status = 'active' LIMIT 1`,
    [email]
  );

  if (!rows.length) {
    return res.status(httpStatus.NOT_FOUND).json({
      status: false, message: 'User not found',
    });
  }

  const u = rows[0];
  res.status(httpStatus.OK).json({
    status: true,
    user: {
      user_id:              u.user_id,
      full_name:            u.full_name,
      username:             u.username,
      email:                u.email,
      mobile:               u.mobile   ?? null,
      gender:               u.gender   ?? null,
      avatar:               u.avatar   ?? null,
      role:                 u.role,
      status:               'active',
      must_change_password: u.must_change_password ?? 0,
    },
  });
});

module.exports = { lookupUser, health, getLogs, getMe };
