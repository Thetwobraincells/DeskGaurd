const catchAsync = require('../utils/catchAsync');
const seatService = require('../services/seat.service');

const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await seatService.getAdminDashboard();
  res.status(200).json({
    status: 'success',
    data: { dashboard },
  });
});

const overrideSeat = catchAsync(async (req, res) => {
  const { seatId } = req.body;
  const seat = await seatService.adminOverride(seatId);
  res.status(200).json({
    status: 'success',
    message: `Seat ${seatId} was force-freed by admin override.`,
    data: { seat },
  });
});

module.exports = {
  getDashboard,
  overrideSeat,
};
