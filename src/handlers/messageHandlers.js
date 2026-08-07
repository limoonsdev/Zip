const { getLogger } = require('../utils/logger');
const logger = getLogger();

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY';

const AI_PROMPT = `Tu es PrimeBot, l'assistant IA de PrimeGen, un serveur Discord dédié à la vente et génération de comptes (Fortnite, Netflix, Spotify, etc.).
Ton rôle est d'aider les membres.
- Sois très PROFESSIONNEL, CLAIR et CONCIS. Fais des phrases courtes et directes. Pas de longs paragraphes.
- PrimeGen propose des générateurs gratuits et premiums.
- Shop : Les membres peuvent acheter du premium ou des services via le salon Shop ou les admins.
- Panels : Il y a un panel Free (gratuit), un panel Premium (payant, cooldown très court), et un panel Prime (très haute qualité).
- Support : En cas de problème de paiement ou question complexe, dis-leur d'ouvrir un ticket.
- Tu ne dois JAMAIS mentionner @everyone ou @here.
- Tu réponds principalement en français, de manière experte.`;

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
          max_tokens: 300,
          temperature: 0.5
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
