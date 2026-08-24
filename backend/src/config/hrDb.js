/**
 * HR / Payroll module — legacy-style DB connection.
 *
 * The HR and Payroll modules were ported from the Vibarua/Bandari system,
 * whose model layer talks to MySQL through the callback-based `mysql`
 * package (`DB.query(sql, params, cb)`, `DB.getConnection(cb)`,
 * `connection.beginTransaction(cb)`, etc.) rather than promises.
 *
 * To copy that model code over WITHOUT rewriting its logic, this file
 * exposes a `mysql2` pool created in its callback mode (not
 * `mysql2/promise`), which implements the same callback API as `mysql`.
 * It points at the same database URA already uses — the ported tables
 * are namespaced with an `hr_` prefix (see the hr/payroll migration SQL)
 * specifically so they cannot collide with URA's own `users`,
 * `user_skills`, etc.
 */
const mysql  = require('mysql2');
const config = require('../config/config');
const logger = require('../config/logger');

let pool;

const getHrPool = () => {
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
    logger.info('HR/Payroll (legacy-style) MySQL pool created');
  }
  return pool;
};

module.exports = getHrPool();
