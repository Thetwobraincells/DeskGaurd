const catchAsync = require('../utils/catchAsync');
const seatService = require('../services/seat.service');

const registerUser = catchAsync(async (req, res) => {
  const { name, email } = req.body;
  const user = await seatService.registerGuestUser(name, email);
  res.status(201).json({
    status: 'success',
    data: { user },
  });
});

module.exports = {
  registerUser,
};
