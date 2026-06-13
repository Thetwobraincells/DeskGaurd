const catchAsync = require('../utils/catchAsync');
const seatService = require('../services/seat.service');

const registerUser = catchAsync(async (req, res) => {
  const { userId, name, email } = req.body;
  const user = await seatService.registerGuestUser(userId, name, email);
  res.status(201).json({
    status: 'success',
    data: { user },
  });
});

module.exports = {
  registerUser,
};
