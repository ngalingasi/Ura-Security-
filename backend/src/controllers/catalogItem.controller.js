const httpStatus         = require('http-status');
const { catchAsync }     = require('../utils/helpers');
const catalogItemService = require('../services/catalogItem.service');

const getCatalogItems = catchAsync(async (req, res) => {
  res.send(await catalogItemService.getCatalogItems(req.query));
});

const createCatalogItem = catchAsync(async (req, res) => {
  const item = await catalogItemService.createCatalogItem(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(item);
});

const updateCatalogItem = catchAsync(async (req, res) => {
  res.send(await catalogItemService.updateCatalogItem(req.params.itemId, req.body));
});

const deactivateCatalogItem = catchAsync(async (req, res) => {
  await catalogItemService.deactivateCatalogItem(req.params.itemId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { getCatalogItems, createCatalogItem, updateCatalogItem, deactivateCatalogItem };
