/**
 * Payroll controller — originally ported from Vibarua/Bandari
 * `Controllers/PayrollCtrl.js`, reworked for the dual-reference
 * (users/security_guards) design. Salary scale CRUD, payroll
 * generation, and the Excel export are otherwise unchanged from the
 * ported version — only the "which person is this for" plumbing
 * changed (person_type + person_id instead of a single employee id;
 * salary_assignment_id instead of employee_salary_scale_id).
 */
const { fetchSalaryScales, createSalaryScale, fetchEmployeeSalaryScales, createEmployeeSalaryScale, fetchEmployeeSalaryList, hardDeleteScale, updateSalaryScaleDetails, generatePayrollForCurrentMonth, fetchGeneratedPayrolls, hardDeleteEmployeeSalary, updateSalaryDetails } = require("../models/payroll.model");
const ExcelJS = require('exceljs');
const moment = require('moment');


const getSalaryScale = async(req,res)=>{
    try {
        // Empty list = valid response (no scales created yet), not an
        // error — a 404 here would break a fresh install's "Assign
        // Salary" scale dropdown.
        const response = await fetchSalaryScales({});

        res.status(200).json({
            status:true,
            message:'Fetched successfully',
            data:response})

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error.message || error})
    }
}

const postSalaryScale = async(req,res)=>{
    const {payload} = req.body;

    try {
        payload.created_by = req.userid;

        let response = {};

        if(payload.salary_scale_id){
            response = await updateSalaryScaleDetails(payload.salary_scale_id, payload)

            if(response.success){
                res.status(200).json({
                    status:true,
                    message:'Edited successfully',
                    data:response})
            }else{
                res.status(404).json({
                    status:false,
                    message:'No Scale Edited'})
            }

        }else{
            response = await createSalaryScale(payload);

            if(response.success){
                res.status(200).json({
                    status:true,
                    message:'Saved successfully',
                    data:response})
            }else{
                res.status(404).json({
                    status:false,
                    message:'No Scale Added'})
            }
        }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const postEditSalary = async(req,res)=>{
    const {payload} = req.body;

    if (!payload) {
        return res.status(400).json({
            status: false,
            message: 'Data is required'
        });
    }

    try {
        const response = await updateSalaryDetails(payload.salary_assignment_id, payload)

        if(response.success){
            res.status(200).json({
                status:true,
                message:'Edited successfully',
                data:response})
        }else{
            res.status(404).json({
                status:false,
                message:'No salary Edited'})
        }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const getEmployeeSalaryScale = async(req,res)=>{
    try {
        // Empty list = valid response, not an error — see getSalaryScale comment.
        const response = await fetchEmployeeSalaryScales({});

        res.status(200).json({
            status:true,
            message:'Fetched successfully',
            data:response})

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error.message || error})
    }
}

const postEmployeeSalaryScale = async(req,res)=>{
    const {payload} = req.body;
    try {
        payload.created_by = req.userid;

        const response = await createEmployeeSalaryScale(payload);

        if(response.success){
            res.status(200).json({
                status:true,
                message:'Saved successfully',
                data:response})
        }else{
            res.status(404).json({
                status:false,
                message:'No Scale Added'})
        }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const getEmployeeSalaryList = async(req,res)=>{
    try {
        // Empty list = valid response, not an error — see getSalaryScale comment.
        const response = await fetchEmployeeSalaryList({});

        res.status(200).json({
            status:true,
            message:'Fetched successfully',
            data:response})

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const deleteSalaryScale = async (req, res) => {
    const { scale_id } = req.query;

    if (!scale_id) {
        return res.status(400).json({
            status: false,
            message: 'Scale ID is required'
        });
    }

    try {
        const deleteResult = await hardDeleteScale({ scale_id });

        if (deleteResult.affectedRows > 0) {
            return res.status(200).json({
                status: true,
                message: 'Deleted successfully',
                data: deleteResult
            });
        } else {
            return res.status(404).json({
                status: false,
                message: 'Scale not found or already deleted'
            });
        }

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message || 'An error occurred while deleting the scale',
            error: error.message
        });
    }
};

const generatePayroll = async (req,res)=>{
    const {payload} = req.body;

     if (!payload || !Array.isArray(payload) || payload.length === 0) {
        return res.status(400).json({
            status: false,
            message: 'Employee data is required and must be an array of employees',
        });
    }

    try {

        const response = await generatePayrollForCurrentMonth(payload,req.userid);

        return res.status(200).json({
            status: true,
            message: 'Payroll generated successfully',
            data: response,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message || 'An error occurred while generating salary',
            error: error.message
        });
    }
}

const getGeneratedPayrolls = async (req,res)=>{
    try {
        // Empty list = valid response (no payroll generated yet), not an error.
        const response = await fetchGeneratedPayrolls({});

        res.status(200).json({
            status:true,
            message:'Fetched successfully',
            data:response})

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error.message || error})
    }
}

const getGeneratedPayrollsSheet = async (req,res)=>{
    const {payload} = req.body;

    if (!payload) {
        return res.status(400).json({
            status: false,
            message: 'Required data',
        });
    }

    try {
        const response = await fetchGeneratedPayrolls(payload);

        if (response.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const formattedMonth = moment(payload.salary_month).format('MMMM YYYY');
            const worksheet = workbook.addWorksheet(`Payroll Sheet for the Month of ${formattedMonth}`);

            worksheet.columns = [
              { header: 'Full Name', key: 'full_name', width: 25 },
              { header: 'Type', key: 'person_type', width: 10 },
              { header: 'Department', key: 'department_name', width: 25 },
              { header: 'Designation', key: 'designation_name', width: 25 },
              { header: 'Title', key: 'title_name', width: 20 },
              { header: 'Scale Name', key: 'scale_name', width: 20 },
              { header: 'Bank Name', key: 'bank_name', width: 25 },
              { header: 'Gross Salary', key: 'gross_salary', width: 15 },
              { header: 'Deductions', key: 'deductions', width: 15 },
              { header: 'Net Salary', key: 'net_salary', width: 15 },
              { header: 'Salary Month', key: 'salary_month', width: 15 },
            ];

            response.forEach((payroll) => {
              worksheet.addRow({
                full_name: payroll.full_name,
                person_type: payroll.person_type === 'guard' ? 'Guard' : 'Staff',
                department_name: payroll.department_name,
                designation_name: payroll.designation_name,
                title_name: payroll.title_name,
                scale_name: payroll.scale_name,
                bank_name: payroll.bank_name,
                gross_salary: payroll.gross_salary,
                deductions: payroll.deductions,
                net_salary: payroll.net_salary,
                salary_month: payroll.salary_month,
              });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=payroll.xlsx');

            await workbook.xlsx.write(res);
            res.end();
          } else {
            return res.status(404).json({
              status: false,
              message: 'No payroll records found',
            });
          }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }

}

const deleteEmployeeSalary = async (req, res) => {
    const { salary_assignment_id } = req.query;

    if (!salary_assignment_id) {
        return res.status(400).json({
            status: false,
            message: 'Salary assignment ID is required'
        });
    }

    try {
        const deleteResult = await hardDeleteEmployeeSalary({ salary_assignment_id });

        if (deleteResult.affectedRows > 0) {
            return res.status(200).json({
                status: true,
                message: 'Deleted successfully',
                data: deleteResult
            });
        } else {
            return res.status(404).json({
                status: false,
                message: 'Salary assignment not found or already deleted'
            });
        }

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message || 'An error occurred while deleting the salary assignment',
            error: error.message
        });
    }
};

module.exports = {
    getSalaryScale,
    postSalaryScale,
    getEmployeeSalaryScale,
    postEmployeeSalaryScale,
    getEmployeeSalaryList,
    deleteSalaryScale,
    generatePayroll,
    getGeneratedPayrolls,
    getGeneratedPayrollsSheet,
    deleteEmployeeSalary,
    postEditSalary
}
