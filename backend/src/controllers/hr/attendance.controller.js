/**
 * HR attendance controller — originally ported from Vibarua/Bandari
 * `Controllers/userCtrl.js` (read endpoints only), reworked for the
 * dual-reference design.
 */
const {
  fetchLabourerAttendance, fetchAttendanceByDateRange,
} = require('../../models/hr/attendance.model');

const getLabourerAttendance = async(req,res)=>{
    const {attendance_date, person_type} = req.query;

    try {

        let filter = {fromDate:attendance_date, toDate:attendance_date, person_type};
        const response = await fetchLabourerAttendance(filter);

        if(response.length > 0){
            res.status(200).json({
                status:true,
                message:'Fetched successfully',
                data:response})
        }else{
            res.status(404).json({
                status:false,
                message:'No attendance records'})
        }

    } catch (error) {
        res.status(400).json({
            status:false,
            message:error})
    }
}

const getLabourerAttendanceByDateRange = async (req, res) => {
  try {
    const { fromDate, toDate, person_type } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        status: false,
        message: "Both 'fromDate' and 'toDate' are required",
      });
    }

    const filter = { fromDate, toDate, person_type };
    const response = await fetchAttendanceByDateRange(filter);

    if (response && Object.keys(response).length > 0) {
      return res.status(200).json({
        status: true,
        message: "Fetched successfully",
        data: response,
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "No attendance records found",
        data: [],
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Server error occurred",
      error: error.message,
    });
  }
};

module.exports = { getLabourerAttendance, getLabourerAttendanceByDateRange };
