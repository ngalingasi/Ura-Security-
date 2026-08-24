/**
 * HR department/designation/title/bank model — originally ported from
 * Vibarua/Bandari `Models/MasterModel.js`, then reworked for the
 * dual-reference design:
 *   - `tpa_department_id` / `tpa_department_name` columns dropped —
 *     these existed to sync department records to the Tanzania Ports
 *     Authority, which no longer applies now that there's no separate
 *     `hr_employees` table pushing data to TPA.
 *   - `fetchDepartments`'s "who created this" join now points at URA's
 *     real `users` table (departments are set up by admins, who are
 *     always `users` rows), and its "how many people" count now counts
 *     `hr_employment_profiles` rows instead of a (no-longer-existing)
 *     `hr_employees` table.
 */
const DB = require("../../config/hrDb");

const InsertDepartment = (keyData) => {
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
                        INSERT INTO hr_departments (
                            name,
                            region,
                            created_by
                        ) VALUES (?, ?, ?)
                    `;

                    const values = [keyData.name, keyData?.region, keyData.created_by];

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
                      reject(new Error(`Error in Create Department: ${error.message}`));
                  });
              }
          });
      });
  });
};

const fetchDepartments = ({}) => {
  return new Promise((resolve,reject)=>{
      let sql = `
        SELECT d.*, u.full_name AS createdby,
        (SELECT COUNT(*) FROM hr_employment_profiles ep WHERE ep.department_id = d.id) AS usercount
        FROM hr_departments AS d
        LEFT JOIN users AS u ON u.user_id = d.created_by
      `;

      DB.query(sql,(error, data,)=>{
         if(error) return reject(error);
         return resolve(data)
      })
  })
}

const updateDepartmentDetails = (department_id, departmentDetails) => {
  return new Promise((resolve, reject) => {
    if (department_id) {

      let sql = `UPDATE hr_departments SET `;
      let updates = [];
      let values = [];

      if (departmentDetails?.name) {
        updates.push('name = ?');
        values.push(departmentDetails.name);
      }

      if (departmentDetails?.region) {
        updates.push('region = ?');
        values.push(departmentDetails.region);
      }

      sql += updates.join(', ');
      sql += ` WHERE id = ?`;
      values.push(department_id);

      DB.query(sql, values, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            success: true,
            department_id: departmentDetails?.id
          });
        }
      });

    } else {
      reject(new Error('Invalid department ID'));
    }
  });
};


const fetchDesignations = ({}) => {
    return new Promise((resolve,reject)=>{
        let sql = `
          SELECT d.*,
          (SELECT COUNT(*) FROM hr_employment_profiles ep WHERE ep.designation_id = d.designation_id) AS usercount
          FROM hr_designations AS d
        `;

        DB.query(sql,(error, data,)=>{
           if(error) return reject(error);
           return resolve(data)
        })
    })
}

const insertDesignation = ({ designation_name }) => {
  return new Promise((resolve, reject) => {
    DB.query(
      `INSERT INTO hr_designations (designation_name) VALUES (?)`,
      [designation_name],
      (error, result) => {
        if (error) return reject(error);
        resolve({ success: true, designation_id: result.insertId });
      }
    );
  });
};

const updateDesignation = (designation_id, { designation_name }) => {
  return new Promise((resolve, reject) => {
    if (!designation_id) return reject(new Error('Invalid designation ID'));
    DB.query(
      `UPDATE hr_designations SET designation_name = ? WHERE designation_id = ?`,
      [designation_name, designation_id],
      (error) => {
        if (error) return reject(error);
        resolve({ success: true, designation_id });
      }
    );
  });
};

const deleteDesignation = ({ designation_id }) => {
  return new Promise((resolve, reject) => {
    if (!designation_id) return reject(new Error('Designation ID is required'));
    DB.query(
      `SELECT COUNT(*) AS count FROM hr_employment_profiles WHERE designation_id = ?`,
      [designation_id],
      (checkError, checkResults) => {
        if (checkError) return reject(checkError);
        const referenceCount = checkResults[0].count;
        if (referenceCount > 0) {
          return reject(new Error(`Cannot delete — assigned to ${referenceCount} employee(s).`));
        }
        DB.query(`DELETE FROM hr_designations WHERE designation_id = ?`, [designation_id], (deleteError, deleteResults) => {
          if (deleteError) return reject(deleteError);
          resolve(deleteResults);
        });
      }
    );
  });
};

const fetchTitles = ({}) => {
    return new Promise((resolve,reject)=>{
        let sql = `
          SELECT t.*,
          (SELECT COUNT(*) FROM hr_employment_profiles ep WHERE ep.title_id = t.title_id) AS usercount
          FROM hr_titles AS t
        `;

        DB.query(sql,(error, data,)=>{
           if(error) return reject(error);
           return resolve(data)
        })
    })
}

const insertTitle = ({ title_name }) => {
  return new Promise((resolve, reject) => {
    DB.query(
      `INSERT INTO hr_titles (title_name) VALUES (?)`,
      [title_name],
      (error, result) => {
        if (error) return reject(error);
        resolve({ success: true, title_id: result.insertId });
      }
    );
  });
};

const updateTitle = (title_id, { title_name }) => {
  return new Promise((resolve, reject) => {
    if (!title_id) return reject(new Error('Invalid title ID'));
    DB.query(
      `UPDATE hr_titles SET title_name = ? WHERE title_id = ?`,
      [title_name, title_id],
      (error) => {
        if (error) return reject(error);
        resolve({ success: true, title_id });
      }
    );
  });
};

const deleteTitle = ({ title_id }) => {
  return new Promise((resolve, reject) => {
    if (!title_id) return reject(new Error('Title ID is required'));
    DB.query(
      `SELECT COUNT(*) AS count FROM hr_employment_profiles WHERE title_id = ?`,
      [title_id],
      (checkError, checkResults) => {
        if (checkError) return reject(checkError);
        const referenceCount = checkResults[0].count;
        if (referenceCount > 0) {
          return reject(new Error(`Cannot delete — assigned to ${referenceCount} employee(s).`));
        }
        DB.query(`DELETE FROM hr_titles WHERE title_id = ?`, [title_id], (deleteError, deleteResults) => {
          if (deleteError) return reject(deleteError);
          resolve(deleteResults);
        });
      }
    );
  });
};

const fetchBanks = ({}) => {
    return new Promise((resolve,reject)=>{
        let sql = `
          SELECT b.*,
          (SELECT COUNT(*) FROM hr_employment_profiles ep WHERE ep.bank_id = b.bank_id) AS usercount
          FROM hr_banks AS b
        `;

        DB.query(sql,(error, data,)=>{
           if(error) return reject(error);
           return resolve(data)
        })
    })
}

const insertBank = ({ bank_name }) => {
  return new Promise((resolve, reject) => {
    DB.query(
      `INSERT INTO hr_banks (bank_name) VALUES (?)`,
      [bank_name],
      (error, result) => {
        if (error) return reject(error);
        resolve({ success: true, bank_id: result.insertId });
      }
    );
  });
};

const updateBank = (bank_id, { bank_name }) => {
  return new Promise((resolve, reject) => {
    if (!bank_id) return reject(new Error('Invalid bank ID'));
    DB.query(
      `UPDATE hr_banks SET bank_name = ? WHERE bank_id = ?`,
      [bank_name, bank_id],
      (error) => {
        if (error) return reject(error);
        resolve({ success: true, bank_id });
      }
    );
  });
};

const deleteBank = ({ bank_id }) => {
  return new Promise((resolve, reject) => {
    if (!bank_id) return reject(new Error('Bank ID is required'));
    DB.query(
      `SELECT COUNT(*) AS count FROM hr_employment_profiles WHERE bank_id = ?`,
      [bank_id],
      (checkError, checkResults) => {
        if (checkError) return reject(checkError);
        const referenceCount = checkResults[0].count;
        if (referenceCount > 0) {
          return reject(new Error(`Cannot delete — assigned to ${referenceCount} employee(s).`));
        }
        DB.query(`DELETE FROM hr_banks WHERE bank_id = ?`, [bank_id], (deleteError, deleteResults) => {
          if (deleteError) return reject(deleteError);
          resolve(deleteResults);
        });
      }
    );
  });
};

const deleteDepartment = ({ department_id }) => {
  return new Promise((resolve, reject) => {
    if (!department_id) return reject(new Error('Department ID is required'));
    DB.query(
      `SELECT COUNT(*) AS count FROM hr_employment_profiles WHERE department_id = ?`,
      [department_id],
      (checkError, checkResults) => {
        if (checkError) return reject(checkError);
        const referenceCount = checkResults[0].count;
        if (referenceCount > 0) {
          return reject(new Error(`Cannot delete — assigned to ${referenceCount} employee(s).`));
        }
        DB.query(`DELETE FROM hr_departments WHERE id = ?`, [department_id], (deleteError, deleteResults) => {
          if (deleteError) return reject(deleteError);
          resolve(deleteResults);
        });
      }
    );
  });
};

module.exports = {
  InsertDepartment, fetchDepartments, updateDepartmentDetails, deleteDepartment,
  fetchDesignations, insertDesignation, updateDesignation, deleteDesignation,
  fetchTitles, insertTitle, updateTitle, deleteTitle,
  fetchBanks, insertBank, updateBank, deleteBank,
};
