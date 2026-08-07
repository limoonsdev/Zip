const { getLogger } = require('../utils/logger');
const logger = getLogger();

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY';

const AI_PROMPT = `Tu es PrimeBot, l'IA de PrimeGen (vente/génération comptes).
- Très CONCIS, PROFESSIONNEL, direct. Max 2 phrases.
- PrimeGen = générateurs free/premium, Shop, Panels (Free, Premium, Prime).
- Support = dis d'ouvrir un ticket.
- RÈGLE ABSOLUE : Si on te parle de n'importe quel autre sujet que PrimeGen ou ses services, tu DOIS répondre EXACTEMENT ET UNIQUEMENT par le mot : Flemme
- Ne mentionne jamais @everyone ou @here.`;

const userCooldowns = new Map();

async function handleMessageCreate(message) {
  // Ignore bots, system messages, or @everyone / @here pings
  if (message.author.bot || message.mentions.everyone) return;

  // Only reply if the bot is directly mentioned
  if (message.mentions.has(message.client.user)) {
    
    // Anti-spam cooldown (5 seconds per user)
    const now = Date.now();
    if (userCooldowns.has(message.author.id)) {
      const lastTime = userCooldowns.get(message.author.id);
      if (now - lastTime < 5000) return; 
    }
    userCooldowns.set(message.author.id, now);

    try {
      await message.channel.sendTyping();
      
      const userText = message.content.replace(`<@${message.client.user.id}>`, '').trim();

      // Ignore if empty text
      if (!userText || userText.length < 2) return;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: AI_PROMPT },
            { role: 'user', content: userText }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      await message.reply(reply);
    } catch (error) {
      logger.error('MessageHandlers', 'AI response failed', { error: error.message });
      // On spam/error silently drop to avoid spamming the chat
    }
  }
}

module.exports = {
  handleMessageCreate
};
