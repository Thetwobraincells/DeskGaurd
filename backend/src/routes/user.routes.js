const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const userController = require('../controllers/user.controller');

const router = express.Router();

const registerSchema = {
  body: Joi.object().keys({
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().required().email(),
  }),
};

router.post('/register', validate(registerSchema), userController.registerUser);

module.exports = router;
