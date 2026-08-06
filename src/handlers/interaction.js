/**
 * =====================================================
 * INTERACTION EVENT HANDLER
 * =====================================================
 * Handles slash commands, buttons, select menus, and modals.
 */

const { getLogger } = require('../utils/logger');
const { logAuditEvent } = require('../database/models');

const logger = getLogger();

/**
 * Handle interaction
 */
async function handleInteraction(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // Log audit event
    if (guildId) {
      try {
        const ipAddress = interaction.member?.user?.id || '';
        await logAuditEvent(
          userId,
          `interaction_${interaction.type}`,
          'interaction',
          `${interaction.commandName || interaction.customId || 'unknown'}`,
          { type: interaction.type },
          ipAddress
        );
      } catch (error) {
        logger.debug('Interaction', 'Failed to log audit event', { error: error.message });
      }
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      return await handleSlashCommand(interaction);
    }

    // Handle autocomplete
    if (interaction.isAutocomplete()) {
      return await handleAutocomplete(interaction);
    }

    // Handle button clicks
    if (interaction.isButton()) {
      return await handleButton(interaction);
    }

    // Handle select menus
    if (interaction.isStringSelectMenu()) {
      return await handleSelectMenu(interaction);
    }

    // Handle role select menus
    if (interaction.isRoleSelectMenu()) {
      return await handleRoleSelectMenu(interaction);
    }

    // Handle modals
    if (interaction.isModalSubmit()) {
      return await handleModalSubmit(interaction);
    }

    logger.warn('Interaction', 'Unknown interaction type', { 
      type: interaction.type 
    });
  } catch (error) {
    logger.error('Interaction', 'Error handling interaction', { 
      error: error.message 
    });

    // Try to respond to user
    try {
      if (interaction.replied) {
        await interaction.followUp({ 
          content: '❌ An error occurred while processing your request.',
          ephemeral: true 
        });
      } else if (interaction.deferred) {
        await interaction.editReply({ 
          content: '❌ An error occurred while processing your request.'
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred while processing your request.',
          ephemeral: true 
        });
      }
    } catch (replyError) {
      logger.error('Interaction', 'Failed to send error response', { 
        error: replyError.message 
      });
    }
  }
}

/**
 * Handle slash command
 */
async function handleSlashCommand(interaction) {
  const command = interaction.client.commands?.get(interaction.commandName);

  if (!command) {
    logger.warn('Interaction', `Command not found: ${interaction.commandName}`);
    await interaction.reply({ 
      content: '❌ Command not found.',
      ephemeral: true 
    });
    return;
  }

  try {
    logger.debug('Interaction', `Executing command: ${interaction.commandName}`, {
      user: interaction.user.tag,
      guild: interaction.guild?.name
    });

    await command.execute(interaction);
  } catch (error) {
    logger.error('Interaction', `Error executing command: ${interaction.commandName}`, {
      error: error.message
    });

    const errorMessage = '❌ An error occurred while executing this command.';
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      logger.error('Interaction', 'Failed to send command error', { 
        error: replyError.message 
      });
    }
  }
}

/**
 * Handle autocomplete
 */
async function handleAutocomplete(interaction) {
  const command = interaction.client.commands?.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error('Interaction', `Error executing autocomplete: ${interaction.commandName}`, {
      error: error.message
    });
  }
}

/**
 * Handle button click
 */
async function handleButton(interaction) {
  // Import button handler
  const { handleButton: buttonHandler } = require('./buttonHandlers');
  
  try {
    logger.debug('Interaction', `Handling button: ${interaction.customId}`);
    await buttonHandler(interaction);
  } catch (error) {
    logger.error('Interaction', `Error handling button: ${interaction.customId}`, {
      error: error.message
    });

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred.',
          flags: 64
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred.',
          flags: 64
        });
      }
    } catch (replyError) {
      logger.error('Interaction', 'Failed to send button error', { 
        error: replyError.message 
      });
    }
  }
}

/**
 * Handle select menu
 */
async function handleSelectMenu(interaction) {
  const handler = interaction.client.selectHandlers?.get(interaction.customId);

  if (!handler) {
    logger.warn('Interaction', `Select handler not found: ${interaction.customId}`);
    return;
  }

  try {
    logger.debug('Interaction', `Handling select menu: ${interaction.customId}`, {
      values: interaction.values
    });
    await handler(interaction);
  } catch (error) {
    logger.error('Interaction', `Error handling select: ${interaction.customId}`, {
      error: error.message
    });

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred.',
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred.',
          ephemeral: true 
        });
      }
    } catch (replyError) {
      logger.error('Interaction', 'Failed to send select error', { 
        error: replyError.message 
      });
    }
  }
}

/**
 * Handle role select menu
 */
async function handleRoleSelectMenu(interaction) {
  const handler = interaction.client.roleSelectHandlers?.get(interaction.customId);

  if (!handler) {
    logger.warn('Interaction', `Role select handler not found: ${interaction.customId}`);
    return;
  }

  try {
    logger.debug('Interaction', `Handling role select: ${interaction.customId}`, {
      roles: interaction.roles?.map(r => r.name) || []
    });
    await handler(interaction);
  } catch (error) {
    logger.error('Interaction', `Error handling role select: ${interaction.customId}`, {
      error: error.message
    });

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred.',
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred.',
          ephemeral: true 
        });
      }
    } catch (replyError) {
      logger.error('Interaction', 'Failed to send role select error', { 
        error: replyError.message 
      });
    }
  }
}

/**
 * Handle modal submit
 */
async function handleModalSubmit(interaction) {
  const staticModals = ['suggestion_modal', 'announce_modal'];
  if (interaction.customId.startsWith('config_modal_')) {
    const config = require('../commands/config');
    return await config.handleModalSubmit(interaction);
  }
  if (staticModals.includes(interaction.customId)) {
    return;
  }

  const handler = interaction.client.modalHandlers?.get(interaction.customId);

  if (!handler) {
    logger.warn('Interaction', `Modal handler not found: ${interaction.customId}`);
    return;
  }

  try {
    logger.debug('Interaction', `Handling modal: ${interaction.customId}`);
    await handler(interaction);
  } catch (error) {
    logger.error('Interaction', `Error handling modal: ${interaction.customId}`, {
      error: error.message
    });

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred.',
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred.',
          ephemeral: true 
        });
      }
    } catch (replyError) {
      logger.error('Interaction', 'Failed to send modal error', { 
        error: replyError.message 
      });
    }
  }
}

module.exports = { handleInteraction };
