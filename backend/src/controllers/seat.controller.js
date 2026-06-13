const catchAsync = require('../utils/catchAsync');
const seatService = require('../services/seat.service');

const getSeats = catchAsync(async (req, res) => {
  const seats = await seatService.getAllSeats();
  res.status(200).json({
    status: 'success',
    data: { seats },
  });
});

const scanSeat = catchAsync(async (req, res) => {
  const { qrToken, userId } = req.body;
  const result = await seatService.scanCheckIn(qrToken, userId);
  res.status(200).json({
    status: 'success',
    message: 'Checked in successfully.',
    data: result,
  });
});

const stepAwayFromSeat = catchAsync(async (req, res) => {
  const { seatId, userId } = req.body;
  const seat = await seatService.stepAway(seatId, userId);
  res.status(200).json({
    status: 'success',
    message: 'Seat marked as AWAY. You have 20 minutes to return.',
    data: { seat },
  });
});

const returnToSeat = catchAsync(async (req, res) => {
  const { seatId, userId } = req.body;
  const seat = await seatService.stepBack(seatId, userId);
  res.status(200).json({
    status: 'success',
    message: 'Welcome back! Seat occupancy extended.',
    data: { seat },
  });
});

const checkoutSeat = catchAsync(async (req, res) => {
  const { seatId, userId } = req.body;
  const seat = await seatService.checkout(seatId, userId);
  res.status(200).json({
    status: 'success',
    message: 'Checked out successfully.',
    data: { seat },
  });
});

const pingSeatSession = catchAsync(async (req, res) => {
  const { seatId, userId } = req.body;
  const result = await seatService.pingSeat(seatId, userId);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

module.exports = {
  getSeats,
  scanSeat,
  stepAwayFromSeat,
  returnToSeat,
  checkoutSeat,
  pingSeatSession,
};
