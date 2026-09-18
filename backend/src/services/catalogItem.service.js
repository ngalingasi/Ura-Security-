const catalogItemModel = require('../models/catalogItem.model');

const getCatalogItems   = (filters)          => catalogItemModel.findAll(filters);
const getCatalogItemById = (id)              => catalogItemModel.findById(id);
const createCatalogItem = (body, userId)     => catalogItemModel.create(body, userId);
const updateCatalogItem = (id, body)         => catalogItemModel.update(id, body);
const deactivateCatalogItem = (id)           => catalogItemModel.deactivate(id);

module.exports = { getCatalogItems, getCatalogItemById, createCatalogItem, updateCatalogItem, deactivateCatalogItem };
