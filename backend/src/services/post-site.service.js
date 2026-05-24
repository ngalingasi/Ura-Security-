const postSiteModel = require('../models/post-site.model');

const getPostSites     = (filters)      => postSiteModel.findAll(filters);
const getPostSiteById  = (id)           => postSiteModel.findById(id);
const getPostSitesByClient = (clientId) => postSiteModel.findByClient(clientId);
const createPostSite   = (body, userId) => postSiteModel.create(body, userId);
const updatePostSite   = (id, body)     => postSiteModel.update(id, body);
const deletePostSite   = (id)           => postSiteModel.remove(id);

module.exports = { getPostSites, getPostSiteById, getPostSitesByClient, createPostSite, updatePostSite, deletePostSite };
