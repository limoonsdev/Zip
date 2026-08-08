/**
 * =====================================================
 * /CONFIG COMMAND - Complete Bot Configuration
 * =====================================================
 * Interactive configuration system for all bot settings
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const { getLogger } = require('../utils/logger');
const { isAdmin } = require('../utils/roles');
const { parseTime, formatTime } = require('../utils/timeParser');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configure bot settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

/**
 * Execute command
 */
async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return await interaction.reply({
      content: '❌ You need Administrator permission to use this command.',
      ephemeral: true
    });
  }

  await showConfigMenu(interaction);
}

/**
 * Show main config menu
 */
async function showConfigMenu(interaction, isUpdate = false) {
  const { getOrCreateGuildConfig } = require('../database/models');
  const guildConfig = await getOrCreateGuildConfig(interaction.guild.id);
  const config = guildConfig.config_data || {};

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ Bot Configuration Panel')
    .setDescription('**Current Configuration:**')
    .addFields(
      {
        name: '⏱️ Cooldowns',
        value: 
          `Free: ${formatTime(config.cooldown_free || 600000)}\n` +
          `Premium: ${formatTime(config.cooldown_premium || 60000)}`,
        inline: true
      },
      {
        name: '📊 Daily Limits',
        value: 
          `Free: ${config.daily_limit_free || 10} gen/day\n` +
          `Premium: ${config.daily_limit_premium || 50} gen/day`,
        inline: true
      },
      {
        name: '🎭 Roles',
        value:
          `Free: ${config.role_free ? `<@&${config.role_free}>` : 'Not set'}\n` +
          `Premium: ${config.role_premium ? `<@&${config.role_premium}>` : 'Not set'}`,
        inline: true
      },
      {
        name: '✅ Verification',
        value: config.verification_enabled ? '✅ Enabled' : '❌ Disabled',
        inline: true
      },
      {
        name: '🔒 Security',
        value: `Anti-raid: ${config.antiraid_enabled ? '✅' : '❌'}\nVPN Check: ${config.vpn_check ? '✅' : '❌'}`,
        inline: true
      },
      {
        name: '📝 Logs',
        value: config.log_channel ? `<#${config.log_channel}>` : 'Not set',
        inline: true
      }
    )
    .setFooter({ text: 'Select a category to configure' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('config_select_category')
    .setPlaceholder('Choose a configuration category')
    .addOptions([
      {
        label: 'Cooldowns',
        description: 'Configure generation cooldowns',
        value: 'cooldowns',
        emoji: '⏱️'
      },
      {
        label: 'Daily Limits',
        description: 'Set daily generation limits',
        value: 'limits',
        emoji: '📊'
      },
      {
        label: 'Roles',
        description: 'Configure required roles',
        value: 'roles',
        emoji: '🎭'
      },
      {
        label: 'Verification',
        description: 'Setup verification system',
        value: 'verification',
        emoji: '✅'
      },
      {
        label: 'Security',
        description: 'Anti-raid and security settings',
        value: 'security',
        emoji: '🔒'
      },
      {
        label: 'Logs',
        description: 'Configure logging channel',
        value: 'logs',
        emoji: '📝'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  if (isUpdate) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
}

/**
 * Handle category selection
 */
async function handleCategorySelection(interaction) {
  const category = interaction.values[0];

  switch (category) {
  case 'cooldowns':
    await showCooldownsConfig(interaction);
    break;
  case 'limits':
    await showLimitsConfig(interaction);
    break;
  case 'roles':
    await showRolesConfig(interaction);
    break;
  case 'verification':
    await showVerificationConfig(interaction);
    break;
  case 'security':
    await showSecurityConfig(interaction);
    break;
  case 'logs':
    await showLogsConfig(interaction);
    break;
  }
}

/**
 * Show cooldowns configuration
 */
async function showCooldownsConfig(interaction) {
  const { getOrCreateGuildConfig } = require('../database/models');
  const { formatTime } = require('../utils/timeParser');
  
  const config = await getOrCreateGuildConfig(interaction.guild.id);
  const confData = config.config_data || {};
  
  let rolesText = '';
  if (confData.cooldown_roles && Object.keys(confData.cooldown_roles).length > 0) {
    for (const [roleId, time] of Object.entries(confData.cooldown_roles)) {
      rolesText += `• <@&${roleId}> : **${formatTime(time)}**\n`;
    }
  } else {
    rolesText = 'No custom rules.\nSelect a role below to add one.';
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⏱️ Cooldown Configuration')
    .setDescription(
      'Configure how long users must wait between generations.\n\n' +
      '**Format examples:**\n' +
      '• `30s` or `30` = 30 seconds\n' +
      '• `1m` or `60s` = 1 minute\n' +
      '• `1h` or `60m` = 1 hour\n' +
      '• `2h 30m` = 2.5 hours'
    )
    .addFields(
      {
        name: 'Current Settings',
        value: `Free: **${formatTime(confData.cooldown_free ?? 600000)}**\nPremium: **${formatTime(confData.cooldown_premium ?? 60000)}**`,
        inline: false
      },
      {
        name: 'Custom Roles',
        value: rolesText,
        inline: false
      }
    );

  const { RoleSelectMenuBuilder } = require('discord.js');
  const roleRow = new ActionRowBuilder()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_cooldown_role_select')
        .setPlaceholder('Select a role to add/edit a custom cooldown')
    );

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_cooldown_free')
        .setLabel('Free')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🆓'),
      new ButtonBuilder()
        .setCustomId('config_cooldown_premium')
        .setLabel('Premium')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👑'),
      new ButtonBuilder()
        .setCustomId('config_cooldown_clear')
        .setLabel('Clear Rules')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  if (interaction.isMessageComponent()) {
    await interaction.update({ embeds: [embed], components: [roleRow, row] });
  } else {
    await interaction.editReply({ embeds: [embed], components: [roleRow, row] });
  }
}

/**
 * Show limits configuration
 */
async function showLimitsConfig(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📊 Daily Limits Configuration')
    .setDescription(
      'Set how many times users can generate per day.\n\n' +
      '**Examples:**\n' +
      '• `10` = 10 generations per day\n' +
      '• `0` = unlimited\n' +
      '• `-1` = disabled'
    );

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_limit_free')
        .setLabel('Free Limit')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🆓'),
      new ButtonBuilder()
        .setCustomId('config_limit_premium')
        .setLabel('Premium Limit')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👑'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  await interaction.update({ embeds: [embed], components: [row] });
}

/**
 * Show roles configuration
 */
async function showRolesConfig(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎭 Roles Configuration')
    .setDescription('Configure which roles are required to use Free and Premium generators.');

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_role_free')
        .setLabel('Free Role')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🆓'),
      new ButtonBuilder()
        .setCustomId('config_role_premium')
        .setLabel('Premium Role')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👑'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  await interaction.update({ embeds: [embed], components: [row] });
}

/**
 * Show verification configuration
 */
async function showVerificationConfig(interaction) {
  const { getOrCreateGuildConfig } = require('../database/models');
  const guildConfig = await getOrCreateGuildConfig(interaction.guild.id);
  const config = guildConfig.config_data || {};

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('✅ Verification Configuration')
    .setDescription('Manage verification system and security features.')
    .addFields(
      {
        name: 'Status',
        value: config.verification_enabled ? '✅ Enabled' : '❌ Disabled',
        inline: true
      },
      {
        name: 'Verified Role',
        value: config.verified_role ? `<@&${config.verified_role}>` : 'Not set',
        inline: true
      }
    );

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_verification_toggle')
        .setLabel(config.verification_enabled ? 'Disable' : 'Enable')
        .setStyle(config.verification_enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(config.verification_enabled ? '❌' : '✅'),
      new ButtonBuilder()
        .setCustomId('config_verification_role')
        .setLabel('Set Verified Role')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎭')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_verification_cleanup')
        .setLabel('Pull Left Members')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

/**
 * Show security configuration
 */
async function showSecurityConfig(interaction) {
  const { getOrCreateGuildConfig } = require('../database/models');
  const guildConfig = await getOrCreateGuildConfig(interaction.guild.id);
  const config = guildConfig.config_data || {};

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🔒 Security Configuration')
    .setDescription('Advanced security features to protect your server.')
    .addFields(
      {
        name: 'Anti-Raid',
        value: config.antiraid_enabled ? '✅ Enabled' : '❌ Disabled',
        inline: true
      },
      {
        name: 'VPN Detection',
        value: config.vpn_check ? '✅ Enabled' : '❌ Disabled',
        inline: true
      }
    );

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_security_antiraid')
        .setLabel('Toggle Anti-Raid')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId('config_security_vpn')
        .setLabel('Toggle VPN Check')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  await interaction.update({ embeds: [embed], components: [row] });
}

/**
 * Show logs configuration
 */
async function showLogsConfig(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📝 Logs Configuration')
    .setDescription('Configure where bot logs should be sent.');

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_logs_channel')
        .setLabel('Set Log Channel')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  await interaction.update({ embeds: [embed], components: [row] });
}

/**
 * Show modal for cooldown input
 */
async function showCooldownModal(interaction, tier) {
  const modal = new ModalBuilder()
    .setCustomId(`config_modal_cooldown_${tier}`)
    .setTitle(`Configure ${tier === 'free' ? 'Free' : 'Premium'} Cooldown`);

  const input = new TextInputBuilder()
    .setCustomId('cooldown_value')
    .setLabel('Cooldown Duration')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Examples: 30s, 1m, 1h, 2h 30m')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Show modal for limit input
 */
async function showLimitModal(interaction, tier) {
  const modal = new ModalBuilder()
    .setCustomId(`config_modal_limit_${tier}`)
    .setTitle(`Configure ${tier === 'free' ? 'Free' : 'Premium'} Daily Limit`);

  const input = new TextInputBuilder()
    .setCustomId('limit_value')
    .setLabel('Daily Limit')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Examples: 10, 50, 0 (unlimited)')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Show modal for role ID input
 */
async function showRoleModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`config_modal_role_${type}`)
    .setTitle(`Configure ${type.charAt(0).toUpperCase() + type.slice(1)} Role`);

  const input = new TextInputBuilder()
    .setCustomId('role_id_value')
    .setLabel('Role ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the Discord Role ID (e.g. 123456789012345678)')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Show modal for channel ID input
 */
async function showChannelModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`config_modal_channel_${type}`)
    .setTitle(`Configure ${type.charAt(0).toUpperCase() + type.slice(1)} Channel`);

  const input = new TextInputBuilder()
    .setCustomId('channel_id_value')
    .setLabel('Channel ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the Discord Channel ID')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Toggle a boolean config setting
 */
async function toggleConfigSetting(interaction, settingKey) {
  const { getOrCreateGuildConfig, updateGuildConfig } = require('../database/models');
  const guildConfig = await getOrCreateGuildConfig(interaction.guild.id);
  const config = guildConfig.config_data || {};
  
  const newValue = !config[settingKey];
  await updateGuildConfig(interaction.guild.id, { [settingKey]: newValue });
  
  await interaction.reply({
    content: `✅ **${settingKey.replace('_', ' ')}** has been ${newValue ? 'enabled' : 'disabled'}.`,
    ephemeral: true
  });
  
  // Refresh menu
  await showConfigMenu(interaction, true).catch(() => {});
}

/**
 * Handle modal submit
 */
async function handleModalSubmit(interaction) {
  const [, , type, tier] = interaction.customId.split('_');
  const { updateGuildConfig } = require('../database/models');

  if (type === 'cooldown') {
    const value = interaction.fields.getTextInputValue('cooldown_value');
    const ms = parseTime(value);

    if (!ms) {
      return await interaction.reply({
        content: '❌ Invalid time format. Use: 30s, 1m, 1h, etc.',
        ephemeral: true
      });
    }

    const key = `cooldown_${tier}`;
    await updateGuildConfig(interaction.guild.id, { [key]: ms });

    await interaction.reply({
      content: `✅ ${tier === 'free' ? 'Free' : 'Premium'} cooldown set to **${formatTime(ms)}**`,
      ephemeral: true
    });

    logger.info('Config', `Cooldown updated: ${tier} = ${formatTime(ms)}`, {
      guild: interaction.guild.name,
      user: interaction.user.tag
    });
  } else if (type === 'limit') {
    const value = parseInt(interaction.fields.getTextInputValue('limit_value'));

    if (isNaN(value) || value < -1) {
      return await interaction.reply({
        content: '❌ Invalid number. Use a positive number or 0 for unlimited.',
        ephemeral: true
      });
    }

    const key = `daily_limit_${tier}`;
    await updateGuildConfig(interaction.guild.id, { [key]: value });

    await interaction.reply({
      content: `✅ ${tier === 'free' ? 'Free' : 'Premium'} daily limit set to **${value}** ${value === 0 ? '(unlimited)' : 'generations/day'}`,
      ephemeral: true
    });

    logger.info('Config', `Daily limit updated: ${tier} = ${value}`, {
      guild: interaction.guild.name,
      user: interaction.user.tag
    });
  } else if (type === 'role') {
    const value = interaction.fields.getTextInputValue('role_id_value');
    if (!/^\d{17,20}$/.test(value)) {
      return await interaction.reply({ content: '❌ Invalid Role ID.', ephemeral: true });
    }
    let key = `role_${tier}`;
    if (tier === 'verified') key = 'verified_role';
    
    await updateGuildConfig(interaction.guild.id, { [key]: value });
    await interaction.reply({ content: '✅ Role set successfully!', ephemeral: true });
  } else if (type === 'cd' && tier === 'role') {
    const roleId = interaction.customId.split('_')[4];
    const value = interaction.fields.getTextInputValue('cooldown_value');
    const { parseTime, formatTime } = require('../utils/timeParser');
    const ms = parseTime(value);

    if (ms === null) {
      return await interaction.reply({
        content: '❌ Invalid time format. Use: 30s, 1m, 1h, etc.',
        ephemeral: true
      });
    }

    const { getOrCreateGuildConfig } = require('../database/models');
    const existing = await getOrCreateGuildConfig(interaction.guild.id);
    const confData = existing.config_data || {};
    const cdRoles = confData.cooldown_roles || {};
    
    if (ms === 0) {
      delete cdRoles[roleId];
    } else {
      cdRoles[roleId] = ms;
    }

    await updateGuildConfig(interaction.guild.id, { cooldown_roles: cdRoles });
    
    await interaction.reply({
      content: ms === 0 ? `✅ Custom cooldown removed for <@&${roleId}>` : `✅ Custom cooldown for <@&${roleId}> set to **${formatTime(ms)}**`,
      ephemeral: true
    });
  } else if (type === 'channel') {
    const value = interaction.fields.getTextInputValue('channel_id_value');
    if (!/^\d{17,20}$/.test(value)) {
      return await interaction.reply({ content: '❌ Invalid Channel ID.', ephemeral: true });
    }
    const key = 'log_channel'; // since logs is the only one for now
    await updateGuildConfig(interaction.guild.id, { [key]: value });
    await interaction.reply({ content: '✅ Channel set successfully!', ephemeral: true });
  }
}

/**
 * Pull members who left the server using OAuth2
 */
async function pullLeftMembers(interaction) {
  await interaction.reply({ content: '🔄 Starting the recovery of members (Pull Members)... This may take a few minutes.', flags: 64 });
  
  try {
    const { query } = require('../database/hybridPool');
    const axios = require('axios');
    const { getLogger } = require('../utils/logger');
    const logger = getLogger();

    const result = await query('SELECT user_id, access_token, username FROM verified_users');
    const users = result.rows;

    let pulledCount = 0;
    let failedCount = 0;
    let alreadyInServerCount = 0;

    for (const user of users) {
      try {
        const member = await interaction.guild.members.fetch(user.user_id).catch(() => null);
        if (member) {
          alreadyInServerCount++;
          continue;
        }

        const response = await axios.put(
          `https://discord.com/api/v10/guilds/${interaction.guild.id}/members/${user.user_id}`,
          { 
            access_token: user.access_token,
            roles: ['1532346852203040768', '1532391228040282232']
          },
          {
            headers: {
              Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === 201 || response.status === 204) {
          pulledCount++;
        } else {
          failedCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Respect Discord rate limits
      } catch (err) {
        failedCount++;
      }
    }

    await interaction.followUp({
      content: `✅ **Recovery completed!**\n\n📊 **Results:**\n- 🔄 Members recovered: **${pulledCount}**\n- 🏠 Already in the server: **${alreadyInServerCount}**\n- ❌ Failures (Expired/Invalid tokens): **${failedCount}**\n- 👥 Total in the database: **${users.length}**`,
      flags: 64
    });

    logger.info('Config', `Oauth Pull finished: ${pulledCount} pulled, ${failedCount} failed.`, { guild: interaction.guild.id });

  } catch (error) {
    await interaction.followUp({ content: `❌ Error during recovery: ${error.message}`, flags: 64 });
  }
}

/**
 * Handle config buttons
 */
async function handleConfigButton(interaction) {
  const customId = interaction.customId;
  
  if (customId === 'config_cooldown_free') return await showCooldownModal(interaction, 'free');
  if (customId === 'config_cooldown_premium') return await showCooldownModal(interaction, 'premium');
  if (customId === 'config_cooldown_clear') {
    const { updateGuildConfig } = require('../database/models');
    await updateGuildConfig(interaction.guild.id, { cooldown_roles: {} });
    await interaction.reply({ content: '✅ All custom role cooldowns cleared.', ephemeral: true });
    return;
  }
  if (customId === 'config_limit_free') return await showLimitModal(interaction, 'free');
  if (customId === 'config_limit_premium') return await showLimitModal(interaction, 'premium');
  if (customId === 'config_role_free') return await showRoleModal(interaction, 'free');
  if (customId === 'config_role_premium') return await showRoleModal(interaction, 'premium');
  if (customId === 'config_verification_role') return await showRoleModal(interaction, 'verified');
  if (customId === 'config_logs_channel') return await showChannelModal(interaction, 'logs');
  
  if (customId === 'config_verification_toggle') return await toggleConfigSetting(interaction, 'verification_enabled');
  if (customId === 'config_verification_cleanup') return await pullLeftMembers(interaction);
  if (customId === 'config_security_antiraid') return await toggleConfigSetting(interaction, 'antiraid_enabled');
  if (customId === 'config_security_vpn') return await toggleConfigSetting(interaction, 'vpn_check');
  
  if (customId === 'config_back') return await showConfigMenu(interaction, true);
  
  await interaction.reply({ content: '⚙️ This setting is coming soon or handled elsewhere.', ephemeral: true });
}


async function showCustomRoleCooldownModal(interaction, roleId) {
  const modal = new ModalBuilder()
    .setCustomId(`config_modal_cd_role_${roleId}`)
    .setTitle('Custom Cooldown (Role)');

  const input = new TextInputBuilder()
    .setCustomId('cooldown_value')
    .setLabel('Cooldown Duration (e.g. 5m, 0 for none)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('5m')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

module.exports = {
  command,
  execute,
  showConfigMenu,
  handleCategorySelection,
  showCooldownModal,
  showCustomRoleCooldownModal,
  showLimitModal,
  showRoleModal,
  showChannelModal,
  toggleConfigSetting,
  handleModalSubmit,
  handleConfigButton,
  pullLeftMembers
};
