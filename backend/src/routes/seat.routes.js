const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const seatController = require('../controllers/seat.controller');

const router = express.Router();

const seatActionSchema = {
  body: Joi.object().keys({
    seatId: Joi.string().required(),
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
  }),
};

const scanSchema = {
  body: Joi.object().keys({
    qrToken: Joi.string().required(),
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
  }),
};

// GET /api/seats - Returns state of all seats (initial load)
router.get('/', seatController.getSeats);

// POST /api/seat/scan - Scan QR token & User UUID check-in
router.post('/scan', validate(scanSchema), seatController.scanSeat);

// POST /api/seat/away - Pause session & mark status to AWAY (20min TTL)
router.post('/away', validate(seatActionSchema), seatController.stepAwayFromSeat);

// POST /api/seat/back - Resume session & restore OCCUPIED status (2hr TTL)
router.post('/back', validate(seatActionSchema), seatController.returnToSeat);

// POST /api/seat/checkout - Voluntary checkout & release seat
router.post('/checkout', validate(seatActionSchema), seatController.checkoutSeat);

// POST /api/seat/ping - Keep alive response extending Redis session TTL
router.post('/ping', validate(seatActionSchema), seatController.pingSeatSession);

module.exports = router;
