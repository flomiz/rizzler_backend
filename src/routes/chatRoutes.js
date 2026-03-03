const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/generate', chatController.generateReplies);
router.post('/punchline', chatController.generatePunchline);
router.get('/punchline/history', chatController.getPunchlineHistory);
router.put('/:id/select', chatController.selectResponse);
router.get('/history', chatController.getHistory);
router.get('/emotions', chatController.getEmotions);

module.exports = router;
