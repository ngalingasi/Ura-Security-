/**
 * HR attendance model — originally ported from Vibarua/Bandari
 * `Models/userModel.js` (read functions only — biometric clock-in was
 * never ported, see git history / earlier PORT_NOTES for why), then
 * reworked for the dual-reference design: an attendance record belongs
 * to either a `users` row or a `security_guards` row.
 */
const DB = require("../../config/hrDb");
const moment = require('moment');

const fetchLabourerAttendance = ({ fromDate, toDate, person_type }) => {
  return new Promise((resolve, reject) => {
    const buildSide = (personTable, idCol, personType) => {
      let where = '1=1';
      if (fromDate) where += ` AND la.attendance_date >= '${fromDate}'`;
      if (toDate)   where += ` AND la.attendance_date <= '${toDate}'`;
      return `
        SELECT '${personType}' AS person_type, pt.${idCol} AS person_id,
               pt.full_name, pt.email,
               la.attendance_date, la.in_time, la.out_time
        FROM hr_attendance AS la
        INNER JOIN ${personTable} AS pt ON pt.${idCol} = la.${idCol}
        WHERE ${where}
      `;
    };

    let sql;
    if (person_type === 'user')       sql = buildSide('users', 'user_id', 'user');
    else if (person_type === 'guard') sql = buildSide('security_guards', 'guard_id', 'guard');
    else sql = `${buildSide('users', 'user_id', 'user')} UNION ALL ${buildSide('security_guards', 'guard_id', 'guard')}`;

    DB.query(sql, (error, data) => {
      if (error) return reject(error);

      const results = data.map((row) => ({
        person_type: row.person_type,
        id: row.person_id,
        name: row.full_name,
        email: row.email,
        status: 'Active',
        attendance_date: moment(row.attendance_date).format('YYYY-MM-DD'),
        in_time: row.in_time,
        out_time: row.out_time,
      }));

      resolve(results);
    });
  });
};

const fetchAttendanceByDateRange = ({ fromDate, toDate, person_type }) => {
  return new Promise((resolve, reject) => {
    const buildSide = (personTable, idCol, personType) => `
      SELECT '${personType}' AS person_type, pt.${idCol} AS person_id, pt.full_name,
             la.attendance_date, la.in_time, la.out_time
      FROM hr_attendance AS la
      INNER JOIN ${personTable} AS pt ON pt.${idCol} = la.${idCol}
      WHERE la.attendance_date BETWEEN ? AND ?
    `;

    let sql;
    let params;
    if (person_type === 'user') {
      sql = buildSide('users', 'user_id', 'user');
      params = [fromDate, toDate];
    } else if (person_type === 'guard') {
      sql = buildSide('security_guards', 'guard_id', 'guard');
      params = [fromDate, toDate];
    } else {
      sql = `${buildSide('users', 'user_id', 'user')} UNION ALL ${buildSide('security_guards', 'guard_id', 'guard')}`;
      params = [fromDate, toDate, fromDate, toDate];
    }
    sql += ' ORDER BY attendance_date ASC';

    DB.query(sql, params, (error, results) => {
      if (error) return reject(error);

      const grouped = {};
      results.forEach(row => {
        const name = row.full_name;
        const date = moment(row.attendance_date).format('YYYY-MM-DD');

        if (!grouped[name]) grouped[name] = {};
        grouped[name][date] = { in: row.in_time, out: row.out_time };
      });

      resolve(grouped);
    });
  });
};

module.exports = { fetchLabourerAttendance, fetchAttendanceByDateRange };
