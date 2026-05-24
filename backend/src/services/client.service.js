const clientModel = require('../models/client.model');

const getClients     = (filters)      => clientModel.findAll(filters);
const getClientById  = (id)           => clientModel.findById(id);
const createClient   = (body, userId) => clientModel.create(body, userId);
const updateClient   = (id, body)     => clientModel.update(id, body);
const deleteClient   = (id)           => clientModel.remove(id);
const getRegions     = ()             => clientModel.getRegions();
const getServiceTypes = ()            => clientModel.getServiceTypes();

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient, getRegions, getServiceTypes };
