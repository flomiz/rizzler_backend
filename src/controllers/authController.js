const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');

const MOBILE_REGEX = /^\+91\d{10}$/;

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '60d',
  });
}

exports.requestOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Valid +91 mobile number required (e.g. +919876543210)',
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(otp, 10);

    await Otp.deleteMany({ mobile });
    await Otp.create({ mobile, codeHash });

    const mobileNumber = mobile.replace(/^\+91/, '');
    const message = encodeURIComponent(
      `Your OTP for Flomiz is ${otp}. Valid for 10 minutes. Do not share it with anyone. - Flomiz`
    );
    const smsUrl = `https://sms.flomiz.com/SMSSend.aspx?UserName=${process.env.SMS_USERNAME}&Password=${process.env.SMS_PASSWORD}&SenderId=${process.env.SMS_SENDER_ID}&MobileNo=${mobileNumber}&Templateid=${process.env.SMS_TEMPLATE_ID}&Message=${message}&Unicode=no`;

    try {
      const smsRes = await fetch(smsUrl);
      const smsBody = await smsRes.text();
      console.log(`[OTP] Sent to ${mobile} (mobile: ${mobileNumber}), OTP: ${otp}, SMS response: ${smsBody}`);
    } catch (smsErr) {
      console.error('[OTP] SMS send failed:', smsErr);
    }

    const payload = { success: true, message: 'OTP sent successfully' };
    if (process.env.OTP_DEV_MODE === 'true') payload.devOtp = otp;
    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !MOBILE_REGEX.test(mobile) || !otp) {
      return res.status(400).json({ success: false, error: 'mobile and otp are required' });
    }

    const record = await Otp.findOne({ mobile }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(400).json({ success: false, error: 'OTP expired or not requested' });
    }

    if (record.attempts >= 5) {
      await Otp.deleteMany({ mobile });
      return res.status(429).json({ success: false, error: 'Too many attempts. Request a new OTP.' });
    }

    const ok = await bcrypt.compare(String(otp), record.codeHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    await Otp.deleteMany({ mobile });

    let user = await User.findOne({ mobile });
    let isNewUser = false;
    if (!user) {
      user = await User.create({ mobile });
      isNewUser = true;
    }
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id);

    res.json({
      success: true,
      data: {
        token,
        isNewUser,
        user: {
          id: user._id,
          mobile: user.mobile,
          name: user.name,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    data: {
      id: u._id,
      mobile: u.mobile,
      name: u.name,
      createdAt: u.createdAt,
    },
  });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = req.user;
    if (typeof name === 'string') user.name = name.trim();
    await user.save();
    res.json({
      success: true,
      data: {
        id: user._id,
        mobile: user.mobile,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteMyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const Chat = require('../models/Chat');
    const Conversation = require('../models/Conversation');
    const CoachSession = require('../models/CoachSession');
    const Punchline = require('../models/Punchline');

    await Promise.all([
      Chat.deleteMany({ userId }),
      Conversation.deleteMany({ userId }),
      CoachSession.deleteMany({ userId }),
      Punchline.deleteMany({ userId }),
    ]);

    res.json({ success: true, message: 'All data cleared' });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const Chat = require('../models/Chat');
    const Conversation = require('../models/Conversation');
    const CoachSession = require('../models/CoachSession');
    const Punchline = require('../models/Punchline');

    await Promise.all([
      Chat.deleteMany({ userId }),
      Conversation.deleteMany({ userId }),
      CoachSession.deleteMany({ userId }),
      Punchline.deleteMany({ userId }),
      Otp.deleteMany({ mobile: req.user.mobile }),
    ]);
    await User.deleteOne({ _id: userId });

    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};
