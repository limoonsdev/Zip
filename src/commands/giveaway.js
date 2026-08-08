const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { parseTime } = require('../utils/timeParser');

const command = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('🎉 Start a basic giveaway')
  .setDefaultMemberPermissions('8')
  .addStringOption(option =>
    option.setName('lot')
      .setDescription('What is up for grabs')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('duree')
      .setDescription('The duration (e.g., 1h, 24h)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('gagnants')
      .setDescription('Number of winners')
      .setRequired(false));

async function execute(interaction) {
  const lot = interaction.options.getString('lot');
  const duree = interaction.options.getString('duree');
  const gagnants = interaction.options.getInteger('gagnants') || 1;
  
  const msDuration = parseTime(duree);
  if (!msDuration) {
    return interaction.reply({ content: '❌ Invalid duration format (e.g., 1m, 1h, 24h).', ephemeral: true });
  }

  const endTime = Math.floor((Date.now() + msDuration) / 1000);

  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY PRIMEGEN')
    .setDescription(
      '**Participate for a chance to win:**\n\n' +
      `> 🎁 **Prize:** ${lot}\n` +
      `> ⏱️ **Ends:** <t:${endTime}:R>\n` +
      `> 🏆 **Winner(s):** ${gagnants}\n\n` +
      '**To participate:**\n' +
      'React with 🎉 under this message!'
    )
    .setColor(COLORS.PREMIUM)
    .setImage(PANEL_BANNER_URL)
    .setTimestamp();
    
  const message = await interaction.reply({ content: '@everyone 🎉 **NEW GIVEAWAY**', embeds: [embed], fetchReply: true });
  await message.react('🎉');

  // Wait for the giveaway to end
  setTimeout(async () => {
    try {
      const fetchedMessage = await interaction.channel.messages.fetch(message.id);
      const reaction = fetchedMessage.reactions.cache.get('🎉');
      
      if (!reaction) return;
      
      const users = await reaction.users.fetch();
      // Exclude bots
      const validParticipants = users.filter(u => !u.bot).map(u => u);
      
      if (validParticipants.length === 0) {
        return interaction.channel.send({ content: `🥲 No one participated in the giveaway for **${lot}**...` });
      }

      // Pick random winners
      const winners = [];
      const numToPick = Math.min(gagnants, validParticipants.length);
      
      for (let i = 0; i < numToPick; i++) {
        const randomIndex = Math.floor(Math.random() * validParticipants.length);
        winners.push(validParticipants[randomIndex]);
        validParticipants.splice(randomIndex, 1);
      }

      const winnersMention = winners.map(w => `<@${w.id}>`).join(', ');

      const endEmbed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY ENDED')
        .setDescription(`> 🎁 **Prize:** ${lot}\n> 🏆 **Winners:** ${winnersMention}`)
        .setColor(COLORS.SUCCESS)
        .setTimestamp();

      await interaction.channel.send({ content: `Congratulations ${winnersMention}! You won the **${lot}**! 🎊`, embeds: [endEmbed] });
    } catch (error) {
      console.error('Error ending giveaway:', error);
    }
  }, msDuration);
}

module.exports = { command, execute };
