/**
 * HR department/designation/title/bank controller — originally ported
 * from Vibarua/Bandari `Controllers/MasterCtrl.js` (departments only —
 * that's all the source exposed), then extended with matching create/
 * delete endpoints for Designations, Titles, and Banks, which the
 * source never had a management UI for (read-only lookups only).
 */
const {
  InsertDepartment, fetchDepartments, updateDepartmentDetails, deleteDepartment,
  fetchDesignations, insertDesignation, updateDesignation, deleteDesignation,
  fetchTitles, insertTitle, updateTitle, deleteTitle,
  fetchBanks, insertBank, updateBank, deleteBank,
} = require('../../models/hr/department.model');

// ── Departments ──────────────────────────────────────────────────────────

const postCreateDepartment = async (req, res) => {
    const { payload } = req.body;

    try {

        let response = {};

        if(payload.id){
            response = await updateDepartmentDetails(payload?.id, payload)
        }else{
            response = await InsertDepartment({...payload,created_by: req.userid,});
        }

        if (response.success) {
            res.status(200).json({
                status: true,
                message: `${payload?.id? 'Updated':'Saved'} successfully`,
                data: response
            });
        } else {
            res.status(404).json({
                status: false,
                message: 'No API Key Added'
            });
        }

    } catch (error) {
        res.status(400).json({
            status: false,
            message: error.message || error
        });
    }
};

const getDepartments = async (req, res) => {

    try {
        // An empty list is a valid, successful response (e.g. no
        // departments created yet) — it must not 404, since that breaks
        // any caller that fetches multiple master-data lists together
        // (one empty list would otherwise fail the whole batch).
        const response = await fetchDepartments(req.query);

        res.status(200).json({
            status: true,
            message: 'Fetched successfully',
            data: response
        });

    } catch (error) {
        res.status(400).json({
            status: false,
            message: error.message || error
        });
    }
};

const deleteDepartmentCtrl = async (req, res) => {
    const { department_id } = req.query;
    if (!department_id) {
        return res.status(400).json({ status: false, message: 'Department ID is required' });
    }
    try {
        const result = await deleteDepartment({ department_id });
        if (result.affectedRows > 0) {
            return res.status(200).json({ status: true, message: 'Deleted successfully', data: result });
        }
        return res.status(404).json({ status: false, message: 'Department not found' });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message || error });
    }
};

// ── Designations ─────────────────────────────────────────────────────────

const getDesignations = async(req,res)=>{
    try {
        // Empty list = valid response, not an error — see getDepartments comment.
        const response = await fetchDesignations({});

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

const postDesignation = async (req, res) => {
    const { payload } = req.body;
    if (!payload?.designation_name) {
        return res.status(400).json({ status: false, message: 'Designation name is required' });
    }
    try {
        const response = payload.designation_id
            ? await updateDesignation(payload.designation_id, payload)
            : await insertDesignation(payload);

        res.status(200).json({
            status: true,
            message: `${payload.designation_id ? 'Updated' : 'Saved'} successfully`,
            data: response
        });
    } catch (error) {
        res.status(400).json({ status: false, message: error.message || error });
    }
};

const deleteDesignationCtrl = async (req, res) => {
    const { designation_id } = req.query;
    if (!designation_id) {
        return res.status(400).json({ status: false, message: 'Designation ID is required' });
    }
    try {
        const result = await deleteDesignation({ designation_id });
        if (result.affectedRows > 0) {
            return res.status(200).json({ status: true, message: 'Deleted successfully', data: result });
        }
        return res.status(404).json({ status: false, message: 'Designation not found' });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message || error });
    }
};

// ── Titles ───────────────────────────────────────────────────────────────

const getTtitles = async(req,res)=>{
    try {
        // Empty list = valid response, not an error — see getDepartments comment.
        const response = await fetchTitles({});

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

const postTitle = async (req, res) => {
    const { payload } = req.body;
    if (!payload?.title_name) {
        return res.status(400).json({ status: false, message: 'Title name is required' });
    }
    try {
        const response = payload.title_id
            ? await updateTitle(payload.title_id, payload)
            : await insertTitle(payload);

        res.status(200).json({
            status: true,
            message: `${payload.title_id ? 'Updated' : 'Saved'} successfully`,
            data: response
        });
    } catch (error) {
        res.status(400).json({ status: false, message: error.message || error });
    }
};

const deleteTitleCtrl = async (req, res) => {
    const { title_id } = req.query;
    if (!title_id) {
        return res.status(400).json({ status: false, message: 'Title ID is required' });
    }
    try {
        const result = await deleteTitle({ title_id });
        if (result.affectedRows > 0) {
            return res.status(200).json({ status: true, message: 'Deleted successfully', data: result });
        }
        return res.status(404).json({ status: false, message: 'Title not found' });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message || error });
    }
};

// ── Banks ────────────────────────────────────────────────────────────────

const getBanks = async(req,res)=>{
    try {
        // Empty list = valid response, not an error — see getDepartments comment.
        const response = await fetchBanks({});

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

const postBank = async (req, res) => {
    const { payload } = req.body;
    if (!payload?.bank_name) {
        return res.status(400).json({ status: false, message: 'Bank name is required' });
    }
    try {
        const response = payload.bank_id
            ? await updateBank(payload.bank_id, payload)
            : await insertBank(payload);

        res.status(200).json({
            status: true,
            message: `${payload.bank_id ? 'Updated' : 'Saved'} successfully`,
            data: response
        });
    } catch (error) {
        res.status(400).json({ status: false, message: error.message || error });
    }
};

const deleteBankCtrl = async (req, res) => {
    const { bank_id } = req.query;
    if (!bank_id) {
        return res.status(400).json({ status: false, message: 'Bank ID is required' });
    }
    try {
        const result = await deleteBank({ bank_id });
        if (result.affectedRows > 0) {
            return res.status(200).json({ status: true, message: 'Deleted successfully', data: result });
        }
        return res.status(404).json({ status: false, message: 'Bank not found' });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message || error });
    }
};

module.exports = {
  postCreateDepartment, getDepartments, deleteDepartmentCtrl,
  getDesignations, postDesignation, deleteDesignationCtrl,
  getTtitles, postTitle, deleteTitleCtrl,
  getBanks, postBank, deleteBankCtrl,
};
