const deepseekService = require('./deepseekService');

async function generateReplies(message, emotion, conversationHistory = []) {
  const replies = await deepseekService.generateReplies(message, emotion, conversationHistory);
  return { responses: replies, provider: 'deepseek' };
}

async function generatePunchline(topic, category) {
  const result = await deepseekService.generatePunchline(topic, category);
  return { ...result, provider: 'deepseek' };
}

async function generateCoachResponse(userMessage, conversationHistory = []) {
  const reply = await deepseekService.generateCoachResponse(userMessage, conversationHistory);
  return { response: reply, provider: 'deepseek' };
}

module.exports = { generateReplies, generatePunchline, generateCoachResponse };
