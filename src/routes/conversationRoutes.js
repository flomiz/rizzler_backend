const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', conversationController.create);
router.get('/', conversationController.list);
router.get('/:id', conversationController.getById);
router.put('/:id', conversationController.update);
router.delete('/:id', conversationController.remove);

module.exports = router;
