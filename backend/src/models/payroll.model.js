/**
 * Payroll model — originally ported from Vibarua/Bandari
 * `Models/PayrollModel.js`, then reworked for the dual-reference design:
 * a salary assignment / payroll record belongs to either a `users` row
 * or a `security_guards` row (nullable `user_id` / `guard_id`, exactly
 * one populated) instead of a single `hr_employees` row.
 *
 * Table rename from the ported version: `employee_salary_scales` is now
 * `hr_salary_assignments` — one row per person (enforced by a UNIQUE key
 * on each of user_id/guard_id), since there's no longer an `employee`
 * row to hang a `employee_salary_scale_id` foreign key off of. This
 * replaces the ported version's two-step "insert assignment, then write
 * the assignment id back onto the employee row" — the assignment table
 * is now the single source of truth per person, so that write-back step
 * is gone (not because logic was cut, but because the row it used to
 * write back onto no longer exists).
 *
 * Salary-scale CRUD (create/update/delete a scale) and payroll
 * generation/export logic are otherwise unchanged from the ported
 * version.
 */
const DB = require("../config/hrDb");
const moment = require('moment');

const fetchSalaryScales = ({}) => {
    return new Promise((resolve,reject)=>{
        let sql = "SELECT * FROM hr_salary_scales";

        DB.query(sql,(error, data,)=>{
           if(error) return reject(error);
           return resolve(data)
        })
    })
}

const insertSalaryScale =  (connection,scleData) => {
    return new Promise(async (resolve,reject)=>{
        const dbConnection = connection || DB;

        const query = `
            INSERT INTO hr_salary_scales (
                scale_name,
                scale_amount,
                scale_increament,
                created_by
            ) VALUES (?, ?, ?, ?)
        `;

        const values = [
            scleData.scale_name,
            scleData.scale_amount,
            scleData.scale_increament,
            scleData.created_by
        ];

        dbConnection.query(query, values, (err, result) => {
            if (err) {
                return reject(err)
            }
            resolve(result.insertId);
        });
    })
}

const createSalaryScale = (scaleData) => {
    return new Promise((resolve, reject) => {
      DB.getConnection((err, connection) => {
        if (err) return reject(new Error(`Database connection failed: ${err}`));
        connection.beginTransaction(async (err) => {
          if (err) { connection.release(); return reject(new Error(`Transaction start failed: ${err}`)); }
          try {
            const response = await insertSalaryScale(connection, scaleData);
            connection.commit((err) => {
              if (err) {
                connection.rollback(() => { connection.release(); return reject(new Error(`Transaction commit failed: ${err}`)); });
              } else {
                connection.release();
                resolve({ success: true, scale_id: response });
              }
            });
          } catch (error) {
            connection.rollback(() => { connection.release(); reject(new Error(`Error in CreateSalaryScale: ${error.message}`)); });
          }
        });
      });
    });
};

/**
 * Roster of everyone with (or eligible for) a salary assignment —
 * `users` UNION `security_guards`, left joined to their current
 * assignment. Mirrors the ported `fetchEmployeeSalaryScales` (used by
 * the "Assign Salary" tab to show a full pick list, scale-assigned or not).
 */
const fetchEmployeeSalaryScales = ({}) => {
  return new Promise((resolve,reject)=>{
      const sql = `
        SELECT 'user' AS person_type, u.user_id AS person_id, u.full_name, u.email, u.mobile AS phone,
               ep.pf_number, ep.joining_date,
               ss.scale_name, ss.scale_amount,
               sa.id AS salary_assignment_id, sa.salary_amount AS assigned_amount,
               dp.name AS department_name, ds.designation_name, t.title_name
        FROM users AS u
        LEFT JOIN hr_salary_assignments AS sa ON sa.user_id = u.user_id
        LEFT JOIN hr_salary_scales      AS ss ON ss.salary_scale_id = sa.salary_scale_id
        LEFT JOIN hr_employment_profiles AS ep ON ep.user_id = u.user_id
        LEFT JOIN hr_departments  AS dp ON dp.id = ep.department_id
        LEFT JOIN hr_designations AS ds ON ds.designation_id = ep.designation_id
        LEFT JOIN hr_titles       AS t  ON t.title_id = ep.title_id
        WHERE u.status != 'inactive'

        UNION ALL

        SELECT 'guard' AS person_type, g.guard_id AS person_id, g.full_name, g.email, g.phone,
               ep.pf_number, ep.joining_date,
               ss.scale_name, ss.scale_amount,
               sa.id AS salary_assignment_id, sa.salary_amount AS assigned_amount,
               dp.name AS department_name, ds.designation_name, t.title_name
        FROM security_guards AS g
        LEFT JOIN hr_salary_assignments AS sa ON sa.guard_id = g.guard_id
        LEFT JOIN hr_salary_scales      AS ss ON ss.salary_scale_id = sa.salary_scale_id
        LEFT JOIN hr_employment_profiles AS ep ON ep.guard_id = g.guard_id
        LEFT JOIN hr_departments  AS dp ON dp.id = ep.department_id
        LEFT JOIN hr_designations AS ds ON ds.designation_id = ep.designation_id
        LEFT JOIN hr_titles       AS t  ON t.title_id = ep.title_id
        WHERE g.guard_status != 'inactive'

        ORDER BY full_name ASC
      `;

      DB.query(sql,(error, data,)=>{
          if(error) return reject(error);
          return resolve(data)
      })
  })
}

/**
 * Only people who already have a salary assignment. Mirrors the ported
 * `fetchEmployeeSalaryList` (INNER JOIN semantics — used by the
 * "Salary List" tab).
 */
const fetchEmployeeSalaryList = ({}) => {
  return new Promise((resolve,reject)=>{
      const sql = `
        SELECT 'user' AS person_type, u.user_id AS person_id, u.full_name, u.email, u.mobile AS phone,
               ep.pf_number, ep.joining_date,
               ss.scale_name, ss.scale_amount,
               sa.id AS salary_assignment_id, sa.salary_amount AS assigned_amount,
               dp.name AS department_name, ds.designation_name, t.title_name
        FROM users AS u
        INNER JOIN hr_salary_assignments AS sa ON sa.user_id = u.user_id
        INNER JOIN hr_salary_scales      AS ss ON ss.salary_scale_id = sa.salary_scale_id
        LEFT JOIN hr_employment_profiles AS ep ON ep.user_id = u.user_id
        LEFT JOIN hr_departments  AS dp ON dp.id = ep.department_id
        LEFT JOIN hr_designations AS ds ON ds.designation_id = ep.designation_id
        LEFT JOIN hr_titles       AS t  ON t.title_id = ep.title_id

        UNION ALL

        SELECT 'guard' AS person_type, g.guard_id AS person_id, g.full_name, g.email, g.phone,
               ep.pf_number, ep.joining_date,
               ss.scale_name, ss.scale_amount,
               sa.id AS salary_assignment_id, sa.salary_amount AS assigned_amount,
               dp.name AS department_name, ds.designation_name, t.title_name
        FROM security_guards AS g
        INNER JOIN hr_salary_assignments AS sa ON sa.guard_id = g.guard_id
        INNER JOIN hr_salary_scales      AS ss ON ss.salary_scale_id = sa.salary_scale_id
        LEFT JOIN hr_employment_profiles AS ep ON ep.guard_id = g.guard_id
        LEFT JOIN hr_departments  AS dp ON dp.id = ep.department_id
        LEFT JOIN hr_designations AS ds ON ds.designation_id = ep.designation_id
        LEFT JOIN hr_titles       AS t  ON t.title_id = ep.title_id
      `;

      DB.query(sql,(error, data,)=>{
          if(error) return reject(error);
          return resolve(data)
      })
  })
}

/**
 * Create or update the salary assignment for exactly one person
 * (person_type + person_id). Replaces the ported
 * insertEmployeeSalaryScale + updateEmployeeScaleDetails pair — see
 * file header for why the write-back step is gone.
 */
const createEmployeeSalaryScale = (payload) => {
  return new Promise((resolve, reject) => {
    const { person_type, person_id, salary_scale_id, scale_amount, created_by } = payload;

    if (!person_type || !person_id) {
      return reject(new Error('person_type and person_id are required'));
    }
    const userCol  = person_type === 'user'  ? person_id : null;
    const guardCol = person_type === 'guard' ? person_id : null;

    DB.getConnection((err, connection) => {
      if (err) return reject(new Error(`Database connection failed: ${err}`));
      connection.beginTransaction(async (err) => {
        if (err) { connection.release(); return reject(new Error(`Transaction start failed: ${err}`)); }
        try {
          const existing = await new Promise((res, rej) => {
            connection.query(
              `SELECT id FROM hr_salary_assignments WHERE user_id ${userCol ? '= ?' : 'IS NULL'} AND guard_id ${guardCol ? '= ?' : 'IS NULL'}`,
              [userCol, guardCol].filter((v) => v !== null),
              (err, rows) => { if (err) return rej(err); res(rows[0] || null); }
            );
          });

          let assignmentId;
          if (existing) {
            await new Promise((res, rej) => {
              connection.query(
                `UPDATE hr_salary_assignments SET salary_scale_id = ?, salary_amount = ? WHERE id = ?`,
                [salary_scale_id, scale_amount, existing.id],
                (err) => { if (err) return rej(err); res(); }
              );
            });
            assignmentId = existing.id;
          } else {
            assignmentId = await new Promise((res, rej) => {
              connection.query(
                `INSERT INTO hr_salary_assignments (user_id, guard_id, salary_scale_id, salary_amount, created_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [userCol, guardCol, salary_scale_id, scale_amount, created_by],
                (err, result) => { if (err) return rej(err); res(result.insertId); }
              );
            });
          }

          connection.commit((err) => {
            if (err) {
              connection.rollback(() => { connection.release(); return reject(new Error(`Transaction commit failed: ${err}`)); });
            } else {
              connection.release();
              resolve({ success: true, salary_assignment_id: assignmentId });
            }
          });
        } catch (error) {
          connection.rollback(() => { connection.release(); reject(new Error(`Error in CreateEmployeeSalaryScale: ${error.message}`)); });
        }
      });
    });
  });
};

const hardDeleteScale = ({ scale_id }) => {
  return new Promise((resolve, reject) => {

      if (!scale_id) {
          return reject(new Error("Scale ID is required"));
      }

      const checkReferenceSQL = `SELECT COUNT(*) AS count FROM hr_salary_assignments WHERE salary_scale_id = ?`;

      DB.query(checkReferenceSQL, [scale_id], (checkError, checkResults) => {
          if (checkError) {
              return reject(checkError);
          }

          const referenceCount = checkResults[0].count;
          if (referenceCount > 0) {
              return reject(new Error(`Cannot delete the scale. It is referenced by ${referenceCount} employee(s).`));
          }

          const deleteSQL = `DELETE FROM hr_salary_scales WHERE salary_scale_id = ?`;

          DB.query(deleteSQL, [scale_id], (deleteError, deleteResults) => {
              if (deleteError) {
                  return reject(deleteError);
              }
              return resolve(deleteResults);
          });
      });
  });
};

const updateSalaryScaleDetails = (scale_id, payload) => {
  return new Promise((resolve, reject) => {
    if (scale_id) {

      let sql = `UPDATE hr_salary_scales SET `;
      let updates = [];
      let values = [];

      if (payload?.scale_name) {
        updates.push('scale_name = ?');
        values.push(payload.scale_name);
      }

      if (payload?.scale_amount) {
        updates.push('scale_amount = ?');
        values.push(payload.scale_amount);
      }

      if (payload?.scale_increament	) {
        updates.push('scale_increament	 = ?');
        values.push(payload.scale_increament);
      }

      sql += updates.join(', ');
      sql += ` WHERE salary_scale_id = ?`;
      values.push(scale_id);

      DB.query(sql, values, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            success: true,
            scale_id: payload?.salary_scale_id
          });
        }
      });

    } else {
      reject(new Error('Invalid scale ID'));
    }
  });
};

const updateSalaryDetails = (salary_assignment_id, payload) => {
  return new Promise((resolve, reject) => {
    if (salary_assignment_id) {

      let sql = `UPDATE hr_salary_assignments SET `;
      let updates = [];
      let values = [];

      if (payload?.salary_amount) {
        updates.push('salary_amount = ?');
        values.push(payload.salary_amount);
      }

      sql += updates.join(', ');
      sql += ` WHERE id = ?`;
      values.push(salary_assignment_id);

      DB.query(sql, values, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            success: true,
            salary_assignment_id
          });
        }
      });

    } else {
      reject(new Error('Invalid salary assignment ID'));
    }
  });
};


/**
 * Generate this month's payroll for a batch of people.
 * `employees` items: { person_type: 'user'|'guard', person_id, salary_amount, full_name }
 */
const generatePayrollForCurrentMonth = (employees,createdby) => {
  return new Promise((resolve, reject) => {
    const currentMonth = moment().format('YYYY-MM');

    const payrollPromises = employees.map((employee) => {
      return new Promise((resolve, reject) => {
        const baseSalary = parseFloat(employee.salary_amount);
        const deductions = 0;
        const netSalary = baseSalary - deductions;

        const userCol  = employee.person_type === 'user'  ? employee.person_id : null;
        const guardCol = employee.person_type === 'guard' ? employee.person_id : null;

        const checkPayrollQuery = `SELECT * FROM hr_payroll WHERE user_id ${userCol ? '= ?' : 'IS NULL'} AND guard_id ${guardCol ? '= ?' : 'IS NULL'} AND salary_month = ?`;
        const checkParams = [userCol, guardCol].filter((v) => v !== null).concat([`${currentMonth}-01`]);

        DB.query(checkPayrollQuery, checkParams, (err, result) => {
          if (err) {
            return reject(`Error checking payroll: ${err}`);
          }

          if (result.length === 0) {
            const insertPayrollQuery = `INSERT INTO hr_payroll (user_id, guard_id, salary_month, gross_salary, deductions, net_salary, created_by)
                                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
            DB.query(insertPayrollQuery, [
              userCol,
              guardCol,
              `${currentMonth}-01`,
              baseSalary,
              deductions,
              netSalary,
              createdby
            ], (err) => {
              if (err) {
                return reject(err);
              }
              return resolve(`Payroll generated for ${employee.full_name} for month ${currentMonth}`);
            });
          } else {
            return resolve(`Payroll already exists for ${employee.full_name} for month ${currentMonth}`);
          }
        });
      });
    });

    Promise.all(payrollPromises)
      .then((results) => resolve(results))
      .catch((error) => reject(error));
  });
};

const fetchGeneratedPayrolls = ({ salary_month, department_id, bank_id }) => {
  return new Promise((resolve, reject) => {
    const buildSide = (personTable, idCol, personType) => {
      let where = `WHERE p.${idCol} IS NOT NULL`;
      const sideParams = [];
      if (department_id) { where += ' AND ep.department_id = ?'; sideParams.push(department_id); }
      if (bank_id)        { where += ' AND ep.bank_id = ?';       sideParams.push(bank_id); }
      if (salary_month)   { where += ' AND p.salary_month = ?';   sideParams.push(salary_month); }

      const sql = `
        SELECT
          '${personType}' AS person_type,
          pt.${idCol} AS person_id, pt.full_name,
          ep.pf_number,
          p.id AS payroll_id,
          p.salary_month,
          p.gross_salary,
          p.deductions,
          p.net_salary,
          dp.name AS department_name,
          ds.designation_name,
          t.title_name,
          ss.scale_name,
          ss.scale_amount,
          sa.salary_amount,
          b.bank_name
        FROM hr_payroll p
        INNER JOIN ${personTable} pt ON p.${idCol} = pt.${idCol}
        LEFT JOIN hr_employment_profiles ep ON ep.${idCol} = pt.${idCol}
        LEFT JOIN hr_banks AS b ON b.bank_id = ep.bank_id
        LEFT JOIN hr_salary_assignments AS sa ON sa.${idCol} = pt.${idCol}
        LEFT JOIN hr_salary_scales AS ss ON ss.salary_scale_id = sa.salary_scale_id
        LEFT JOIN hr_departments AS dp ON dp.id = ep.department_id
        LEFT JOIN hr_designations AS ds ON ds.designation_id = ep.designation_id
        LEFT JOIN hr_titles AS t ON t.title_id = ep.title_id
        ${where}
      `;
      return { sql, params: sideParams };
    };

    const userSide  = buildSide('users', 'user_id', 'user');
    const guardSide = buildSide('security_guards', 'guard_id', 'guard');

    const sql = `${userSide.sql} UNION ALL ${guardSide.sql} ORDER BY salary_month DESC`;
    const values = [...userSide.params, ...guardSide.params];

    DB.query(sql, values, (err, results) => {
      if (err) {
        return reject(err);
      }
      return resolve(results);
    });
  });
};


const hardDeleteEmployeeSalary = ({ salary_assignment_id }) => {
  return new Promise((resolve, reject) => {

      if (!salary_assignment_id) {
          return reject(new Error("Salary assignment ID is required"));
      }

      const deleteSQL = `DELETE FROM hr_salary_assignments WHERE id = ?`;

      DB.query(deleteSQL, salary_assignment_id, (deleteError, deleteResults) => {
          if (deleteError) {
              return reject(deleteError);
          }
          return resolve(deleteResults);
      });
  });
};

module.exports={
    fetchSalaryScales,
    createSalaryScale,
    fetchEmployeeSalaryScales,
    createEmployeeSalaryScale,
    fetchEmployeeSalaryList,
    hardDeleteScale,
    updateSalaryScaleDetails,
    generatePayrollForCurrentMonth,
    fetchGeneratedPayrolls,
    hardDeleteEmployeeSalary,
    updateSalaryDetails
}
