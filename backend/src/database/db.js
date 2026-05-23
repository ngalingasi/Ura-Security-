const mysql  = require('mysql2/promise');
const config = require('../config/config');
const logger = require('../config/logger');

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host:               config.db.host,
      port:               config.db.port,
      user:               config.db.user,
      password:           config.db.password,
      database:           config.db.database,
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      timezone:           process.env.DB_TIMEZONE || '+03:00',
      charset:            'utf8mb4',
    });
    logger.info('MySQL connection pool created');
  }
  return pool;
};

const testConnection = async () => {
  const conn = await getPool().getConnection();
  logger.info('Connected to MySQL database');
  conn.release();
};

/**
 * Sanitize params — mysql2 rejects undefined and NaN
 */
const sanitize = (params) =>
  params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'number' && isNaN(p)) return null;
    return p;
  });

/**
 * Execute a query using pool.query() (non-prepared statement).
 * pool.query() avoids LIMIT/OFFSET placeholder issues on some MySQL versions.
 * All user-supplied values are still parameterised — no SQL injection risk.
 */
const query = async (sql, params = []) => {
  const [rows] = await getPool().query(sql, sanitize(params));
  return rows;
};

/**
 * Execute within a transaction.
 */
const transaction = async (fn) => {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Run a query on a transaction connection.
 */
const connQuery = async (conn, sql, params = []) => {
  const [rows] = await conn.query(sql, sanitize(params));
  return rows;
};

module.exports = { getPool, testConnection, query, transaction, connQuery };
