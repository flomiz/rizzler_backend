const Conversation = require('../models/Conversation');
const Chat = require('../models/Chat');

exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Conversation name is required',
      });
    }

    const conversation = await Conversation.create({
      name: name.trim(),
      userId: req.userId,
    });

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .lean();

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await Chat.countDocuments({ conversationId: conv._id });
        const lastChat = await Chat.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 })
          .select('message createdAt')
          .lean();

        return {
          ...conv,
          messageCount,
          lastMessage: lastChat?.message || null,
          lastActivity: lastChat?.createdAt || conv.updatedAt,
        };
      })
    );

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const messages = await Chat.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .select('message emotion responses selectedResponse aiProvider createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: { ...conversation, messages },
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name: name.trim() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    await Chat.deleteMany({ conversationId: req.params.id });

    res.status(200).json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    next(error);
  }
};
