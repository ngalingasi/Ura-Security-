const express    = require('express');
const helmet     = require('helmet');
const xss        = require('xss-clean');
const compression = require('compression');
const cors       = require('cors');
const passport   = require('passport');
const httpStatus = require('http-status');
const path       = require('path');
const fs         = require('fs');

const config     = require('./config/config');
const morgan     = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const routes     = require('./routes/index');
const ApiError   = require('./utils/ApiError');
const { authLimiter, errorConverter, errorHandler } = require('./middlewares/index');

const app = express();
app.disable('etag');

// ── Logging ───────────────────────────────────────────────────────────────────
if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy:      false,
  crossOriginEmbedderPolicy:  false,
  crossOriginOpenerPolicy:    true,
  crossOriginResourcePolicy:  { policy: 'cross-origin' },
  dnsPrefetchControl:         { allow: false },
  frameguard:                 { action: 'DENY' },
  hidePoweredBy:              true,
  hsts:                       { maxAge: 63_072_000, includeSubDomains: true, preload: true },
  ieNoOpen:                   true,
  noSniff:                    true,
  referrerPolicy:             { policy: 'no-referrer' },
  xssFilter:                  true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(xss());
app.use(compression());

// ── CORS ──────────────────────────────────────────────────────────────────────
const rawOrigins  = (process.env.ALLOWED_ORIGINS || '').trim();
const corsOrigin  = rawOrigins === '*'
  ? '*'
  : rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

const corsOptions = {
  origin:         corsOrigin.length ? corsOrigin : false,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    rawOrigins !== '*',
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// ── Rate limiting on auth endpoints in production ─────────────────────────────
if (config.env === 'production') {
  app.use('/api/v1/auth', authLimiter);
}

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', system: 'Ura Security', env: config.env, ts: new Date().toISOString() })
);

// ── Serve built React frontend from /dist ─────────────────────────────────────
const distPath = [
  path.join(process.cwd(), '..', 'dist'),
  path.join(process.cwd(), 'dist'),
].find(fs.existsSync);

if (distPath) {
  app.use(express.static(distPath, {
    maxAge: config.env === 'production' ? '1y' : '0',
    etag:   false,
  }));
  app.get(/^(?!\/api).*$/, (req, res) =>
    res.sendFile(path.join(distPath, 'index.html'))
  );
} else {
  app.get('/', (req, res) =>
    res.json({ message: 'Ura Security API is running.', api: '/api/v1' })
  );
}

// ── 404 for unmatched API routes ──────────────────────────────────────────────
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
