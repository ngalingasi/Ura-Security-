/**
 * HR leave controller — originally ported from Vibarua/Bandari
 * `Controllers/MasterCtrl.js` (leave section only), reworked for the
 * dual-reference (users/security_guards) design. Approve/reject logic
 * and fare handling are unchanged from the ported version.
 */
const {
  fetchLeaveTypes, InsertLeaveType, updateLeaveType,
  InsertLeaveApplication, updateLeaveApplication,
  getAllLeaveApplications, updateLeaveApplicationStatus,
} = require('../../models/hr/leave.model');

const getLeavesTypes = async(req,res)=>{
    try {
        const response = await fetchLeaveTypes({});

        if(response.length > 0){
            res.status(200).json({
                status:true,
                message:'Fetched successfully',
                data:response})
        }else{
            res.status(404).json({
                status:false,
                message:'No designation records'})
        }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const postLeaveTypes = async (req, res) => {
    const { payload } = req.body;

    try {

        let response = {};

        if(payload.id){
            response = await updateLeaveType(payload?.id, payload)
        }else{
            response = await InsertLeaveType({...payload,created_by: req.userid,});
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


const postLeaveApplications = async (req, res) => {
    const { payload } = req.body;

    try {

        let response = {};

        if(payload.id){
            response = await updateLeaveApplication(payload?.id, payload)
        }else{
            // Self-service default: if the caller didn't specify who this
            // leave is for (no user_id/guard_id), it's for themselves —
            // always a `users` row, since guards don't log in and can't
            // self-apply. HR/admin explicitly pass user_id or guard_id to
            // apply leave on someone else's (e.g. a guard's) behalf.
            const applicant = (payload.user_id || payload.guard_id)
                ? { user_id: payload.user_id || null, guard_id: payload.guard_id || null }
                : { user_id: req.userid, guard_id: null };

            response = await InsertLeaveApplication({...payload, ...applicant, created_by: req.userid,});
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

const getLeaveApplications = async(req,res)=>{
    try {
        const {status,isForOwner,guard_id} = req.query;
        const response = await getAllLeaveApplications({
            status,
            user_id:  isForOwner === 'true' ? req.userid : undefined,
            guard_id: guard_id || undefined,
        });

        if(response.length > 0){
            res.status(200).json({
                status:true,
                message:'Fetched successfully',
                data:response})
        }else{
            res.status(404).json({
                status:false,
                message:'No designation records'})
        }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const ApproveLeaveApplications = async (req, res) => {
  const { payload } = req.body;

  try {
    const {
      id,
      fare_region_to_region,
      fare_district_to_village,
      fare_miscellaneous,       // single shared value
      total_fare,
      relatives = [],
    } = payload;

    if (!id) {
      return res.status(400).json({ status: false, message: 'Leave application ID is required' });
    }

    const result = await updateLeaveApplicationStatus(id, 'approved', req.userid, {
      fare_region_to_region:    parseFloat(fare_region_to_region    || 0),
      fare_district_to_village: parseFloat(fare_district_to_village || 0),
      fare_miscellaneous:       parseFloat(fare_miscellaneous       || 0),
      total_fare:               parseFloat(total_fare               || 0),
      relatives,
    });

    res.status(200).json({ status: true, message: 'Leave application approved successfully', data: result });

  } catch (error) {
    res.status(400).json({ status: false, message: error.message || error });
  }
};

const RejectionLeaveApplications = async (req, res) => {
  const { payload } = req.body;

  try {
    const { id, rejection_reason } = payload;

    if (!id) {
      return res.status(400).json({ status: false, message: 'Leave application ID is required' });
    }

    const result = await updateLeaveApplicationStatus(id, 'rejected', req.userid, {
      rejectionReason: rejection_reason || null,
    });

    res.status(200).json({
      status:  true,
      message: 'Leave application rejected',
      data:    result,
    });

  } catch (error) {
    res.status(400).json({ status: false, message: error.message || error });
  }
};

module.exports = {
  getLeavesTypes, postLeaveTypes, postLeaveApplications,
  getLeaveApplications, ApproveLeaveApplications, RejectionLeaveApplications,
};
