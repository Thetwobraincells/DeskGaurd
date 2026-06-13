const express = require('express');
const userRoute = require('./user.routes');
const seatRoute = require('./seat.routes');
const adminRoute = require('./admin.routes');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/seat',
    route: seatRoute,
  },
  {
    path: '/seats', // Maps GET /api/seats to retrieve all seat states
    route: seatRoute,
  },
  {
    path: '/admin',
    route: adminRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
