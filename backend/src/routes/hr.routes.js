/**
 * HR module routes (v2 — dual-reference design).
 *
 * The v1 `/users/*` employee-CRUD and role-rights routes are gone —
 * there's no separate "employee" identity to create/edit anymore.
 * Instead:
 *   GET  /hr/roster                combined users+guards list for pickers
 *   GET  /hr/employment-profile    a person's HR profile (dept/bank/etc)
 *   POST /hr/employment-profile    create/update a person's HR profile
 *
 * `/hr/masters/*` (departments, designations, titles, banks, leaves)
 * and attendance are otherwise the same shape as before.
 *
 * Auth: URA's own JWT auth via the hrAuth() compatibility shim (see
 * middlewares/hrAuth.js).
 */
const express = require('express');
const router  = express.Router();

const hrAuth = require('../middlewares/hrAuth');

const employmentCtrl = require('../controllers/hr/employment.controller');
const departmentCtrl = require('../controllers/hr/department.controller');
const leaveCtrl       = require('../controllers/hr/leave.controller');
const attendanceCtrl = require('../controllers/hr/attendance.controller');

// ── /hr/roster, /hr/employment-profile ──────────────────────────────────────
router.get('/roster', hrAuth(), employmentCtrl.getRoster);
router.get('/employment-profile', hrAuth(), employmentCtrl.getEmploymentProfile);
router.post('/employment-profile', hrAuth(), employmentCtrl.postEmploymentProfile);

// ── /hr/attendance ───────────────────────────────────────────────────────
router.get('/attendance', hrAuth(), attendanceCtrl.getLabourerAttendance);
router.get('/attendance/range', hrAuth(), attendanceCtrl.getLabourerAttendanceByDateRange);

// ── /hr/masters/* (Departments, Designations, Titles, Banks, Leaves) ───────
const mastersRouter = express.Router();

mastersRouter.get('/departments', hrAuth(), departmentCtrl.getDepartments);
mastersRouter.post('/departments', hrAuth(), departmentCtrl.postCreateDepartment);
mastersRouter.delete('/departments', hrAuth(), departmentCtrl.deleteDepartmentCtrl);

mastersRouter.get('/designations', hrAuth(), departmentCtrl.getDesignations);
mastersRouter.post('/designations', hrAuth(), departmentCtrl.postDesignation);
mastersRouter.delete('/designations', hrAuth(), departmentCtrl.deleteDesignationCtrl);

mastersRouter.get('/titles', hrAuth(), departmentCtrl.getTtitles);
mastersRouter.post('/titles', hrAuth(), departmentCtrl.postTitle);
mastersRouter.delete('/titles', hrAuth(), departmentCtrl.deleteTitleCtrl);

mastersRouter.get('/banks', hrAuth(), departmentCtrl.getBanks);
mastersRouter.post('/banks', hrAuth(), departmentCtrl.postBank);
mastersRouter.delete('/banks', hrAuth(), departmentCtrl.deleteBankCtrl);

mastersRouter.get('/leaves-types', hrAuth(), leaveCtrl.getLeavesTypes);
mastersRouter.post('/leaves-types', hrAuth(), leaveCtrl.postLeaveTypes);
mastersRouter.post('/leaves-applications', hrAuth(), leaveCtrl.postLeaveApplications);
mastersRouter.get('/leaves-applications', hrAuth(), leaveCtrl.getLeaveApplications);
mastersRouter.post('/leaves-applications/approve', hrAuth(), leaveCtrl.ApproveLeaveApplications);
mastersRouter.post('/leaves-applications/reject', hrAuth(), leaveCtrl.RejectionLeaveApplications);

router.use('/masters', mastersRouter);

module.exports = router;
