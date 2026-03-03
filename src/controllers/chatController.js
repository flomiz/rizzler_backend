const Chat = require('../models/Chat');
const { EMOTIONS } = require('../models/Chat');
const Conversation = require('../models/Conversation');
const Punchline = require('../models/Punchline');
const aiService = require('../services/aiService');

exports.generateReplies = async (req, res, next) => {
  try {
    const { message, emotion, conversationId } = req.body;

    if (!message || !emotion) {
      return res.status(400).json({
        success: false,
        error: 'Both "message" and "emotion" fields are required',
      });
    }

    if (!EMOTIONS.includes(emotion)) {
      return res.status(400).json({
        success: false,
        error: `Invalid emotion. Must be one of: ${EMOTIONS.join(', ')}`,
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    const previousChats = await Chat.find({ conversationId })
      .sort({ createdAt: 1 })
      .select('message responses selectedResponse')
      .lean();

    const conversationHistory = previousChats
      .filter((chat) => chat.selectedResponse != null)
      .map((chat) => ({
        userMessage: chat.message,
        selectedReply: chat.responses[chat.selectedResponse],
      }));

    const { responses, provider } = await aiService.generateReplies(
      message,
      emotion,
      conversationHistory
    );

    const chat = await Chat.create({
      conversationId,
      message,
      emotion,
      responses,
      aiProvider: provider,
    });

    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    res.status(200).json({
      success: true,
      data: {
        id: chat._id,
        conversationId: chat.conversationId,
        message: chat.message,
        emotion: chat.emotion,
        responses: chat.responses,
        selectedResponse: chat.selectedResponse,
        provider: chat.aiProvider,
        createdAt: chat.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.selectResponse = async (req, res, next) => {
  try {
    const { responseIndex } = req.body;

    if (responseIndex == null || responseIndex < 0 || responseIndex > 2) {
      return res.status(400).json({
        success: false,
        error: 'responseIndex must be 0, 1, or 2',
      });
    }

    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      { selectedResponse: responseIndex },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: chat._id,
        selectedResponse: chat.selectedResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const chats = await Chat.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('message emotion responses aiProvider createdAt');

    res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (error) {
    next(error);
  }
};

exports.generatePunchline = async (req, res, next) => {
  try {
    const { topic, category } = req.body;
    const result = await aiService.generatePunchline(topic || '', category || '');

    const saved = await Punchline.create({
      punchline: result.punchline,
      category: result.category,
      topic: topic || '',
      aiProvider: result.provider,
    });

    res.status(200).json({
      success: true,
      data: {
        id: saved._id,
        punchline: saved.punchline,
        category: saved.category,
        provider: saved.aiProvider,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPunchlineHistory = async (req, res, next) => {
  try {
    const punchlines = await Punchline.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: punchlines.map((p) => ({
        id: p._id,
        punchline: p.punchline,
        category: p.category,
        provider: p.aiProvider,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmotions = (_req, res) => {
  res.status(200).json({
    success: true,
    data: EMOTIONS,
  });
};
