const OpenAI = require('openai');

let client;

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

const EMOTION_EMOJIS = {
  romantic: '❤️ 💕 😘 🥰 💖 💗 🌹 💞',
  funny: '😂 🤣 😜 😆 🤪 😅 💀 😏',
  flirty: '😉 😏 💋 🔥 😍 ✨ 💫 😘',
  sarcastic: '🙄 😏 💅 🤷 😒 👀 🤡 😤',
  professional: '👔 📊 🤝 💼 ✅ 📌 🎯 💡',
  caring: '🤗 💛 🫂 😊 💚 🙏 💝 ☺️',
  friendly: '😊 👋 🎉 😄 🤙 ✌️ 💪 🙌',
  witty: '😎 🧠 💡 ⚡ 🎭 🪄 🔮 ✨',
};

function buildPrompt(message, emotion, conversationHistory = []) {
  const emojis = EMOTION_EMOJIS[emotion] || '😊 ✨';
  let systemContent = `You are a reply-crafting assistant. Given a message someone received, generate exactly 3 distinct reply suggestions that match the "${emotion}" tone/emotion. Each reply should feel natural, be 1-3 sentences, and clearly reflect the ${emotion} style.

IMPORTANT: Naturally sprinkle relevant emojis throughout each reply to make them expressive and match the ${emotion} vibe. Use emojis from this set: ${emojis}. Place 2-4 emojis per reply — at natural points within or at the end of sentences, not all bunched together.

Return ONLY a valid JSON array of 3 strings, no extra text.`;

  if (conversationHistory.length > 0) {
    systemContent += `\n\nIMPORTANT: This is an ongoing conversation. Consider the previous exchanges to generate contextually relevant replies that maintain conversational flow. Here is the conversation so far:`;
  }

  const messages = [{ role: 'system', content: systemContent }];

  for (const turn of conversationHistory) {
    messages.push({
      role: 'user',
      content: `They said: "${turn.userMessage}"`,
    });
    messages.push({
      role: 'assistant',
      content: `I replied: "${turn.selectedReply}"`,
    });
  }

  messages.push({
    role: 'user',
    content: `Now they said: "${message}"\n\nGenerate 3 ${emotion} replies as a JSON array, keeping the conversation context in mind.`,
  });

  return messages;
}

async function generateReplies(message, emotion, conversationHistory = []) {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: buildPrompt(message, emotion, conversationHistory),
    temperature: 0.8,
    max_tokens: 512,
  });

  const content = response.choices[0].message.content.trim();

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('OpenAI response was not valid JSON');
  }

  const replies = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(replies) || replies.length !== 3) {
    throw new Error('OpenAI did not return exactly 3 replies');
  }

  return replies.map(String);
}

async function generatePunchline(topic, category) {
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const categoryHint = category ? ` The punchline MUST be in the "${category}" style.` : '';

  const prompt = topic
    ? `Generate one killer punchline or one-liner about "${topic}".${categoryHint} It should be clever, witty, and memorable. Include 1-2 relevant emojis. [Seed: ${seed}] Return ONLY a valid JSON object with two fields: "punchline" (the punchline text) and "category" (one of: savage, witty, romantic, motivational, funny). No extra text.`
    : `Generate one random killer punchline or one-liner.${categoryHint} Pick a random theme from: life, love, hustle, attitude, confidence, success, heartbreak, sarcasm, ambition, friendship. It should be witty, sharp, and memorable. Include 1-2 relevant emojis. [Seed: ${seed}] Return ONLY a valid JSON object with two fields: "punchline" (the punchline text) and "category" (one of: savage, witty, romantic, motivational, funny). No extra text.`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a legendary punchline writer known for sharp, memorable one-liners. Every time you are asked, you MUST generate a completely new and unique punchline. Never repeat yourself.' },
      { role: 'user', content: prompt },
    ],
    temperature: 1.0,
    max_tokens: 256,
  });

  const content = response.choices[0].message.content.trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('OpenAI punchline response was not valid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

const COACH_SYSTEM_PROMPT = `You are "Rizz Coach" — a chill texting & dating coach. Help users text better.

LANGUAGE RULE (MOST IMPORTANT):
- ALWAYS reply in the SAME language the user is writing in.
- If they write in Hinglish (Hindi + English mix like "bhai uska reply nahi aa raha"), you MUST reply in Hinglish too.
- If they write in Gujlish (Gujarati + English mix like "yaar ena msg no reply nathi aavto"), reply in Gujlish.
- If they write in pure Hindi, reply in Hindi. Pure English = English.
- Match their exact vibe and slang. If they say "bro", "yaar", "bhai" — use those words back.
- The example messages you suggest MUST also be in the user's language so they can directly copy-paste.

OTHER RULES:
- Keep it SHORT. Max 3-5 sentences total. No essays.
- Jump straight to the point — no intros, no filler.
- Give 1-2 example messages they can copy-paste, in quotes.
- Add a one-liner WHY it works (just one line, not a paragraph).
- Use 1-2 emojis max per response.
- Talk like a cool friend, not a professor.
- NEVER use bullet-point lists or numbered lists.
- NEVER repeat what they told you back to them.

If they paste a convo, give a quick read + a ready-to-send reply. That's it.`;

function buildCoachMessages(conversationHistory = []) {
  const messages = [{ role: 'system', content: COACH_SYSTEM_PROMPT }];

  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role === 'coach' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  return messages;
}

async function generateCoachResponse(userMessage, conversationHistory = []) {
  const messages = buildCoachMessages(conversationHistory);
  messages.push({ role: 'user', content: userMessage });

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.85,
    max_tokens: 300,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { generateReplies, generatePunchline, generateCoachResponse };
