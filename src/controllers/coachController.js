const CoachSession = require('../models/CoachSession');
const aiService = require('../services/aiService');

exports.createSession = async (req, res, next) => {
  try {
    const { title } = req.body;
    const session = await CoachSession.create({
      title: title || 'New Session',
      messages: [],
    });

    res.status(201).json({
      success: true,
      data: {
        id: session._id,
        title: session.title,
        messages: [],
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSessions = async (_req, res, next) => {
  try {
    const sessions = await CoachSession.find()
      .sort({ updatedAt: -1 })
      .select('title messages createdAt updatedAt')
      .lean();

    const data = sessions.map((s) => ({
      id: s._id,
      title: s.title,
      messageCount: s.messages.length,
      lastMessage: s.messages.length > 0
        ? s.messages[s.messages.length - 1].content.substring(0, 80)
        : null,
      lastActivity: s.updatedAt || s.createdAt,
      createdAt: s.createdAt,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const session = await CoachSession.findById(req.params.id).lean();
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: session._id,
        title: session.title,
        messages: session.messages.map((m) => ({
          id: m._id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: '"message" field is required',
      });
    }

    const session = await CoachSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    session.messages.push({ role: 'user', content: message.trim() });

    const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { response, provider } = await aiService.generateCoachResponse(
      message.trim(),
      history.slice(0, -1),
    );

    session.messages.push({ role: 'coach', content: response });
    session.aiProvider = provider;

    if (session.messages.length === 2 && session.title === 'New Session') {
      session.title = message.trim().substring(0, 50);
    }

    await session.save();

    const userMsg = session.messages[session.messages.length - 2];
    const coachMsg = session.messages[session.messages.length - 1];

    res.status(200).json({
      success: true,
      data: {
        userMessage: {
          id: userMsg._id,
          role: 'user',
          content: userMsg.content,
          createdAt: userMsg.createdAt,
        },
        coachMessage: {
          id: coachMsg._id,
          role: 'coach',
          content: coachMsg.content,
          createdAt: coachMsg.createdAt,
        },
        provider,
        sessionTitle: session.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const session = await CoachSession.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.status(200).json({ success: true, data: { id: session._id } });
  } catch (error) {
    next(error);
  }
};
