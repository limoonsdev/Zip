const { getLogger } = require('../utils/logger');
const logger = getLogger();

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY';

const AI_PROMPT = `Tu es l'assistant IA de PrimeGen, un serveur Discord dédié à la vente et génération de comptes (Fortnite, Netflix, Spotify, etc.).
Ton rôle est de répondre aux questions des membres, les orienter et les aider.
Voici les informations du serveur:
- PrimeGen propose des générateurs gratuits et premiums.
- Shop : Les membres peuvent acheter du premium ou des services via le salon Shop ou les admins.
- Panels : Il y a un panel Free (gratuit), un panel Premium (payant, avec moins de cooldown), et un panel Prime (très haute qualité).
- Cooldowns : Les utilisateurs normaux ont un temps d'attente entre chaque génération, les premiums ont un temps réduit.
- Support : En cas de problème de paiement ou question complexe, dis-leur d'ouvrir un ticket.
- Tu dois être courtois, dynamique, utiliser des emojis et répondre principalement en français (ou dans la langue de l'utilisateur).
- Ton modèle sous-jacent est LLaMA-3.3-70b-versatile, mais tu es "PrimeBot".`;

async function handleMessageCreate(message) {
  if (message.author.bot) return;

  // Only reply if the bot is mentioned
  if (message.mentions.has(message.client.user)) {
    try {
      await message.channel.sendTyping();
      
      const userText = message.content.replace(`<@${message.client.user.id}>`, '').trim();

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
            { role: 'user', content: userText || 'Bonjour !' }
          ],
          max_tokens: 500,
          temperature: 0.7
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
      await message.reply("Désolé, je suis un peu surchargé pour le moment ! Réessaie plus tard. 🤖");
    }
  }
}

module.exports = {
  handleMessageCreate
};
