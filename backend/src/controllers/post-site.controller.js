const httpStatus        = require('http-status');
const { catchAsync }    = require('../utils/helpers');
const postSiteService   = require('../services/post-site.service');

const getPostSites = catchAsync(async (req, res) => {
  res.send(await postSiteService.getPostSites(req.query));
});

const getPostSite = catchAsync(async (req, res) => {
  res.send(await postSiteService.getPostSiteById(req.params.siteId));
});

const getPostSitesByClient = catchAsync(async (req, res) => {
  res.send(await postSiteService.getPostSitesByClient(req.params.clientId));
});

const createPostSite = catchAsync(async (req, res) => {
  const site = await postSiteService.createPostSite(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(site);
});

const updatePostSite = catchAsync(async (req, res) => {
  res.send(await postSiteService.updatePostSite(req.params.siteId, req.body));
});

const deletePostSite = catchAsync(async (req, res) => {
  await postSiteService.deletePostSite(req.params.siteId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { getPostSites, getPostSite, getPostSitesByClient, createPostSite, updatePostSite, deletePostSite };
