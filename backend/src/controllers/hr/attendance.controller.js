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

        // Empty list = valid response (nobody clocked in that day yet),
        // not an error — a 404 here used to make the page show a scary
        // error banner instead of a normal "no records" empty state.
        let filter = {fromDate:attendance_date, toDate:attendance_date, person_type};
        const response = await fetchLabourerAttendance(filter);

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

    // Empty object = valid response (nobody clocked in during this
    // range), not an error — see getLabourerAttendance comment.
    return res.status(200).json({
      status: true,
      message: "Fetched successfully",
      data: response || {},
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Server error occurred",
      error: error.message,
    });
  }
};

module.exports = { getLabourerAttendance, getLabourerAttendanceByDateRange };
