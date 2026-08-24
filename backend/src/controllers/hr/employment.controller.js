/**
 * HR employment controller — NEW code (not ported), exposing:
 *   GET  /roster              combined users+guards list for pickers
 *   GET  /employment-profile  a single person's HR profile
 *   POST /employment-profile  create/update a person's HR profile
 */
const {
  fetchRoster, findEmploymentProfile, upsertEmploymentProfile,
} = require('../../models/hr/employment.model');

const getRoster = async (req, res) => {
  try {
    const { search, department_id, person_type } = req.query;
    const data = await fetchRoster({ search, department_id, person_type });
    res.status(200).json({ status: true, message: 'Fetched successfully', data });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message || error });
  }
};

const getEmploymentProfile = async (req, res) => {
  try {
    const { user_id, guard_id } = req.query;
    if (!user_id && !guard_id) {
      return res.status(400).json({ status: false, message: 'user_id or guard_id is required' });
    }
    const profile = await findEmploymentProfile({ user_id, guard_id });
    res.status(200).json({ status: true, message: 'Fetched successfully', data: profile });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message || error });
  }
};

const postEmploymentProfile = async (req, res) => {
  const { payload } = req.body;
  if (!payload) {
    return res.status(400).json({ status: false, message: 'Employment profile data is required' });
  }
  try {
    const profile = await upsertEmploymentProfile(payload, req.userid);
    res.status(200).json({ status: true, message: 'Saved successfully', data: profile });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message || error });
  }
};

module.exports = { getRoster, getEmploymentProfile, postEmploymentProfile };
