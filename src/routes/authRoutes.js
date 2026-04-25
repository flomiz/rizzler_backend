const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post('/request-otp', ctrl.requestOtp);
router.post('/verify-otp', ctrl.verifyOtp);
router.get('/me', auth, ctrl.me);
router.patch('/profile', auth, ctrl.updateProfile);
router.delete('/data', auth, ctrl.deleteMyData);
router.delete('/account', auth, ctrl.deleteAccount);

module.exports = router;
