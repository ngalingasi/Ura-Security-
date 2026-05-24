const httpStatus      = require('http-status');
const { catchAsync }  = require('../utils/helpers');
const clientService   = require('../services/client.service');

const getClients = catchAsync(async (req, res) => {
  res.send(await clientService.getClients(req.query));
});

const getClient = catchAsync(async (req, res) => {
  res.send(await clientService.getClientById(req.params.clientId));
});

const createClient = catchAsync(async (req, res) => {
  const client = await clientService.createClient(req.body, req.user.user_id);
  res.status(httpStatus.CREATED).send(client);
});

const updateClient = catchAsync(async (req, res) => {
  res.send(await clientService.updateClient(req.params.clientId, req.body));
});

const deleteClient = catchAsync(async (req, res) => {
  await clientService.deleteClient(req.params.clientId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getMeta = catchAsync(async (req, res) => {
  const [regions, serviceTypes] = await Promise.all([
    clientService.getRegions(),
    clientService.getServiceTypes(),
  ]);
  res.send({ regions, service_types: serviceTypes });
});

module.exports = { getClients, getClient, createClient, updateClient, deleteClient, getMeta };
