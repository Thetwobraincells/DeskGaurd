const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

const overrideSchema = {
  body: Joi.object().keys({
    seatId: Joi.string().required(),
  }),
};

// GET /api/admin/dashboard - Session logs, metadata, seat list
router.get('/dashboard', adminController.getDashboard);

// POST /api/admin/override - Force-free seat override
router.post('/override', validate(overrideSchema), adminController.overrideSeat);

module.exports = router;
