const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { buildShopPanel } = require('./src/commands/deploy');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on('ready', async () => {
  try {
    const channel = await client.channels.fetch('1533222371102556361');
    const panel = await buildShopPanel();
    await channel.send(panel);
    console.log('Success!');
  } catch (e) {
    console.error(e);
  }
  client.destroy();
});
client.login(process.env.DISCORD_TOKEN);
