const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');

router.post('/sessions', coachController.createSession);
router.get('/sessions', coachController.getSessions);
router.get('/sessions/:id', coachController.getSession);
router.post('/sessions/:id/message', coachController.sendMessage);
router.delete('/sessions/:id', coachController.deleteSession);

module.exports = router;
