/**
 * HR leave model — originally ported from Vibarua/Bandari
 * `Models/MasterModel.js`, then reworked to the dual-reference design:
 * a leave application belongs to either a `users` row or a
 * `security_guards` row (via nullable `user_id` / `guard_id`, exactly
 * one populated) instead of a separate `hr_employees` row.
 *
 * The core control flow (insert + relatives in one transaction, status
 * transitions, fare tracking) is unchanged from the ported version —
 * only the person-reference columns and the display-name joins changed.
 */
const DB = require("../../config/hrDb");

const fetchLeaveTypes = ({}) => {
    return new Promise((resolve,reject)=>{
        let sql = "SELECT * FROM hr_leave_types";

        DB.query(sql,(error, data,)=>{
           if(error) return reject(error);
           return resolve(data)
        })
    })
}


const InsertLeaveType = (keyData) => {
  return new Promise((resolve, reject) => {
      DB.getConnection((err, connection) => {
          if (err) {
              return reject(new Error(`Database connection failed: ${err}`));
          }

          connection.beginTransaction(async (err) => {
              if (err) {
                  connection.release();
                  return reject(new Error(`Transaction start failed: ${err}`));
              }

              try {
                  const response_master = new Promise((resolve, reject) => {
                    const query = `
                        INSERT INTO hr_leave_types (
                            name,
                            days,
                            created_by
                        ) VALUES (?, ?, ?)
                    `;

                    const values = [keyData.name, keyData?.days, keyData.created_by];

                    connection.query(query, values, (err, result) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve({ insertId: result.insertId });
                    });
                });

                const { insertId: api_key_id } = response_master;

                  connection.commit((err) => {
                      if (err) {
                          connection.rollback(() => {
                              connection.release();
                              return reject(new Error(`Transaction commit failed: ${err}`));
                          });
                      } else {
                          connection.release();
                          resolve({ success: true, api_key_id });
                      }
                  });

              } catch (error) {
                  connection.rollback(() => {
                      connection.release();
                      reject(new Error(`Error in Create API Key: ${error.message}`));
                  });
              }
          });
      });
  });
};

const updateLeaveType = (id, details) => {
  return new Promise((resolve, reject) => {
    if (id) {

      let sql = `UPDATE hr_leave_types SET `;
      let updates = [];
      let values = [];

      if (details?.name) {
        updates.push('name = ?');
        values.push(details.name);
      }

      if (details?.days) {
        updates.push('days = ?');
        values.push(details.days);
      }

      sql += updates.join(', ');
      sql += ` WHERE id = ?`;
      values.push(id);

      DB.query(sql, values, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            success: true,
            id: details?.id
          });
        }
      });

    } else {
      reject(new Error('Invalid user ID'));
    }
  });
};


/**
 * Insert a leave application for exactly one person (user_id XOR guard_id)
 * plus its relatives, in one transaction.
 */
const InsertLeaveApplication = (keyData) => {
    return new Promise((resolve, reject) => {
        const { user_id, guard_id } = keyData;
        if ((user_id && guard_id) || (!user_id && !guard_id)) {
            return reject(new Error('Exactly one of user_id or guard_id is required'));
        }

        DB.getConnection((err, connection) => {
            if (err) return reject(new Error(`Database connection failed: ${err}`));

            connection.beginTransaction(async (err) => {
                if (err) {
                    connection.release();
                    return reject(new Error(`Transaction start failed: ${err}`));
                }

                try {
                    const { insertId: leave_application_id } = await new Promise((res, rej) => {
                        const query = `
                            INSERT INTO hr_leave_applications (
                                user_id, guard_id, leave_type_id, start_date, end_date,
                                leave_days, reason,
                                region_id, region_name,
                                district_id, district_name, village,
                                fare_region_to_region, fare_district_to_village, total_fare,
                                status, created_by
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        const values = [
                            user_id || null,
                            guard_id || null,
                            keyData.leave_type_id,
                            keyData.start_date,
                            keyData.end_date,
                            keyData.leave_days,
                            keyData.reason,
                            keyData.region_id    || null,
                            keyData.region_name  || null,
                            keyData.district_id  || null,
                            keyData.district_name || null,
                            keyData.village      || null,
                            keyData.fare_region_to_region    || 0,
                            keyData.fare_district_to_village || 0,
                            keyData.total_fare   || 0,
                            'pending',
                            keyData.created_by,
                        ];
                        connection.query(query, values, (err, result) => {
                            if (err) return rej(err);
                            res({ insertId: result.insertId });
                        });
                    });

                    if (keyData.relatives?.length > 0) {
                        await InsertLeaveRelatives(connection, leave_application_id, keyData.relatives);
                    }

                    connection.commit((err) => {
                        if (err) {
                            connection.rollback(() => {
                                connection.release();
                                return reject(new Error(`Transaction commit failed: ${err}`));
                            });
                        } else {
                            connection.release();
                            resolve({ success: true, leave_application_id });
                        }
                    });

                } catch (error) {
                    connection.rollback(() => {
                        connection.release();
                        reject(new Error(`Error in Create Leave Application: ${error.message}`));
                    });
                }
            });
        });
    });
};

const FetchLeaveRelativesByApplicationIds = (ids) => {
    if (!ids || ids.length === 0) return Promise.resolve({});

    return new Promise((resolve, reject) => {
        const placeholders = ids.map(() => '?').join(',');
        const sql = `
            SELECT *
            FROM hr_leave_application_relatives
            WHERE leave_application_id IN (${placeholders})
            ORDER BY id ASC
        `;
        DB.query(sql, ids, (err, rows) => {
            if (err) return reject(err);

            const map = {};
            rows.forEach(row => {
                if (!map[row.leave_application_id]) map[row.leave_application_id] = [];
                map[row.leave_application_id].push(row);
            });
            resolve(map);
        });
    });
};


const InsertLeaveRelatives = (connection, leave_application_id, relatives) => {
    if (!Array.isArray(relatives) || relatives.length === 0) return Promise.resolve([]);

    const promises = relatives.map(({ full_name, relationship }) =>
        new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO hr_leave_application_relatives
                    (leave_application_id, full_name, relationship)
                VALUES (?, ?, ?)
            `;
            connection.query(
                sql,
                [leave_application_id, full_name, relationship?.value || relationship],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result.insertId);
                }
            );
        })
    );

    return Promise.all(promises);
};


const DeleteLeaveRelatives = (connection, leave_application_id) => {
    new Promise((resolve, reject) => {
        connection.query(
            `DELETE FROM hr_leave_application_relatives WHERE leave_application_id = ?`,
            [leave_application_id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
}


const updateLeaveApplication = (id, details) => {
    return new Promise((resolve, reject) => {
        if (!id) return reject(new Error('Invalid leave application ID'));

        DB.getConnection((err, connection) => {
            if (err) return reject(new Error(`Database connection failed: ${err}`));

            connection.beginTransaction(async (err) => {
                if (err) {
                    connection.release();
                    return reject(new Error(`Transaction start failed: ${err}`));
                }

                try {
                    let sql = `UPDATE hr_leave_applications SET `;
                    const updates = [];
                    const values  = [];

                    const add = (col, val) => { updates.push(`${col} = ?`); values.push(val); };

                    if (details?.leave_type_id !== undefined)        add('leave_type_id',          details.leave_type_id);
                    if (details?.start_date)                         add('start_date',              details.start_date);
                    if (details?.end_date)                           add('end_date',                details.end_date);
                    if (details?.leave_days !== undefined)           add('leave_days',              details.leave_days);
                    if (details?.reason)                             add('reason',                  details.reason);
                    if (details?.region_id !== undefined)            add('region_id',               details.region_id    || null);
                    if (details?.region_name !== undefined)          add('region_name',             details.region_name  || null);
                    if (details?.district_id !== undefined)          add('district_id',             details.district_id  || null);
                    if (details?.district_name !== undefined)        add('district_name',           details.district_name || null);
                    if (details?.village !== undefined)              add('village',                 details.village      || null);
                    if (details?.fare_region_to_region !== undefined)    add('fare_region_to_region',    details.fare_region_to_region    || 0);
                    if (details?.fare_district_to_village !== undefined) add('fare_district_to_village', details.fare_district_to_village || 0);
                    if (details?.total_fare !== undefined)           add('total_fare',              details.total_fare   || 0);
                    if (details?.status)                             add('status',                  details.status);
                    if (details?.updated_by)                         add('updated_by',              details.updated_by);

                    updates.push('updated_at = CURRENT_TIMESTAMP');

                    if (updates.length === 1) throw new Error('No fields to update');

                    sql += updates.join(', ') + ' WHERE id = ?';
                    values.push(id);

                    await new Promise((res, rej) => {
                        connection.query(sql, values, (err, data) => {
                            if (err) return rej(err);
                            if (data.affectedRows === 0) return rej(new Error('Leave application not found'));
                            res(data);
                        });
                    });

                    await DeleteLeaveRelatives(connection, id);

                    if (details?.relatives?.length > 0) {
                        await InsertLeaveRelatives(connection, id, details.relatives);
                    }

                    connection.commit((err) => {
                        if (err) {
                            connection.rollback(() => {
                                connection.release();
                                return reject(new Error(`Transaction commit failed: ${err}`));
                            });
                        } else {
                            connection.release();
                            resolve({ success: true, id, affectedRows: 1 });
                        }
                    });

                } catch (error) {
                    connection.rollback(() => {
                        connection.release();
                        reject(error);
                    });
                }
            });
        });
    });
};


/**
 * List leave applications, with each row's applicant name/email/avatar
 * resolved from `users` OR `security_guards` depending on which
 * reference is set. `filters.user_id` restricts to a self-service view
 * for a logged-in URA user (guards never view their own list — HR views
 * it for them).
 */
const getAllLeaveApplications = (filters = {}) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT
                la.*,
                lt.name        AS leave_type_name,
                lt.days        AS leave_type_days,
                lt.allow_fare,
                CASE WHEN la.user_id IS NOT NULL THEN 'user' ELSE 'guard' END AS applicant_type,
                COALESCE(u.full_name, g.full_name)   AS requested_by_name,
                COALESCE(u.email, g.email)           AS user_email,
                COALESCE(u.avatar, g.photo_url)       AS image,
                CASE
                    WHEN la.approved_by IS NOT NULL THEN approver.full_name
                    ELSE NULL
                END            AS approved_by_name
            FROM hr_leave_applications la
            LEFT JOIN hr_leave_types lt        ON lt.id       = la.leave_type_id
            LEFT JOIN users          u         ON u.user_id   = la.user_id
            LEFT JOIN security_guards g        ON g.guard_id  = la.guard_id
            LEFT JOIN users          approver  ON approver.user_id = la.approved_by
            WHERE la.deleted_at IS NULL
        `;

        const conditions = [];
        const values     = [];

        if (filters.user_id)       { conditions.push('la.user_id = ?');        values.push(filters.user_id); }
        if (filters.guard_id)      { conditions.push('la.guard_id = ?');       values.push(filters.guard_id); }
        if (filters.leave_type_id) { conditions.push('la.leave_type_id = ?'); values.push(filters.leave_type_id); }
        if (filters.status)        { conditions.push('la.status = ?');         values.push(filters.status); }
        if (filters.start_date)    { conditions.push('la.start_date >= ?');    values.push(filters.start_date); }
        if (filters.end_date)      { conditions.push('la.end_date <= ?');      values.push(filters.end_date); }

        if (conditions.length) query += ' AND ' + conditions.join(' AND ');

        query += ' ORDER BY la.created_at DESC';

        if (filters.limit) { query += ' LIMIT ?'; values.push(parseInt(filters.limit)); }

        DB.query(query, values, async (error, results) => {
            if (error) return reject(error);
            if (results.length === 0) return resolve([]);

            try {
                const ids         = results.map(r => r.id);
                const relativesMap = await FetchLeaveRelativesByApplicationIds(ids);

                const enriched = results.map(row => ({
                    ...row,
                    relatives: relativesMap[row.id] || [],
                }));

                resolve(enriched);
            } catch (err) {
                reject(err);
            }
        });
    });
};

const updateLeaveApplicationStatus = (id, status, approvedBy, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return reject(new Error('Invalid status'));
    }

    DB.getConnection((err, connection) => {
      if (err) return reject(new Error(`DB connection failed: ${err}`));

      connection.beginTransaction(async (err) => {
        if (err) { connection.release(); return reject(err); }

        try {
          let sql = `
            UPDATE hr_leave_applications
            SET status      = ?,
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP,
                updated_at  = CURRENT_TIMESTAMP
          `;
          const values = [status, approvedBy];

          if (status === 'rejected' && options.rejectionReason) {
            sql += ', rejection_reason = ?';
            values.push(options.rejectionReason);
          }

          if (status === 'approved') {
            if (options.fare_region_to_region    !== undefined) { sql += ', fare_region_to_region = ?';    values.push(options.fare_region_to_region    || 0); }
            if (options.fare_district_to_village !== undefined) { sql += ', fare_district_to_village = ?'; values.push(options.fare_district_to_village || 0); }
            if (options.fare_miscellaneous       !== undefined) { sql += ', fare_miscellaneous = ?';       values.push(options.fare_miscellaneous       || 0); }
            if (options.total_fare               !== undefined) { sql += ', total_fare = ?';               values.push(options.total_fare               || 0); }
          }

          sql += ' WHERE id = ? AND deleted_at IS NULL';
          values.push(id);

          await new Promise((res, rej) => {
            connection.query(sql, values, (err, data) => {
              if (err) return rej(err);
              if (data.affectedRows === 0) return rej(new Error('Leave application not found'));
              res(data);
            });
          });

          if (status === 'approved' && Array.isArray(options.relatives) && options.relatives.length > 0) {
            await Promise.all(
              options.relatives.map(rel =>
                new Promise((res, rej) => {
                  if (!rel.id) return res();
                  connection.query(
                    `UPDATE hr_leave_application_relatives
                     SET fare_region_to_region    = ?,
                         fare_district_to_village = ?
                     WHERE id = ? AND leave_application_id = ?`,
                    [
                      parseFloat(rel.fare_region_to_region    || 0),
                      parseFloat(rel.fare_district_to_village || 0),
                      rel.id,
                      id,
                    ],
                    (err) => { if (err) return rej(err); res(); }
                  );
                })
              )
            );
          }

          connection.commit(err => {
            if (err) {
              connection.rollback(() => { connection.release(); reject(err); });
            } else {
              connection.release();
              resolve({ success: true, id, status });
            }
          });

        } catch (error) {
          connection.rollback(() => { connection.release(); reject(error); });
        }
      });
    });
  });
};

module.exports = {
  fetchLeaveTypes, InsertLeaveType, updateLeaveType,
  InsertLeaveApplication, updateLeaveApplication,
  getAllLeaveApplications, updateLeaveApplicationStatus,
};
