/**
 * Payroll routes — ported from Vibarua/Bandari `Routes/PayrollRt.js`.
 * Same paths and HTTP methods as the source; auth wiring swapped for
 * URA's own JWT auth (via the hrAuth compatibility shim).
 */
const Express = require('express');
const Router = Express.Router();

const PayrollCtrl = require('../controllers/payroll.controller');
const hrAuth = require('../middlewares/hrAuth');

Router.get('/salary-scale', hrAuth(), PayrollCtrl.getSalaryScale);
Router.post('/salary-scale', hrAuth(), PayrollCtrl.postSalaryScale);
Router.post('/edit-employee-salary', hrAuth(), PayrollCtrl.postEditSalary);
Router.get('/employee-salary-scale', hrAuth(), PayrollCtrl.getEmployeeSalaryScale);
Router.post('/employee-salary-scale', hrAuth(), PayrollCtrl.postEmployeeSalaryScale);
Router.get('/employee-salary-list', hrAuth(), PayrollCtrl.getEmployeeSalaryList);
Router.delete('/employee-salary-list', hrAuth(), PayrollCtrl.deleteEmployeeSalary);
Router.delete('/salary-scale', hrAuth(), PayrollCtrl.deleteSalaryScale);
Router.post('/generate-payroll', hrAuth(), PayrollCtrl.generatePayroll);
Router.get('/generated-payrolls', hrAuth(), PayrollCtrl.getGeneratedPayrolls);
Router.post('/generate-payroll-sheet', hrAuth(), PayrollCtrl.getGeneratedPayrollsSheet);

// Payroll components (allowances & deductions catalog)
Router.get('/components', hrAuth(), PayrollCtrl.getPayrollComponents);
Router.post('/components', hrAuth(), PayrollCtrl.postPayrollComponent);
Router.put('/components/:componentId', hrAuth(), PayrollCtrl.putPayrollComponent);
Router.post('/components/:componentId/deactivate', hrAuth(), PayrollCtrl.deactivateComponent);

// Per-person component assignment (dual-reference: ?person_type=user|guard&person_id=N)
Router.get('/employee-components', hrAuth(), PayrollCtrl.getEmployeePayrollComponents);
Router.post('/employee-components', hrAuth(), PayrollCtrl.postEmployeePayrollComponent);
Router.delete('/employee-components/:componentId', hrAuth(), PayrollCtrl.deleteEmployeePayrollComponent);

// Line items for a specific generated payroll (itemized slip breakdown)
Router.get('/line-items/:payrollId', hrAuth(), PayrollCtrl.getPayrollLineItems);

module.exports = Router;
