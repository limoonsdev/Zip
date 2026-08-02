/**
 * =====================================================
 * WEB SERVER - DISCORD OAUTH2 VERIFICATION
 * =====================================================
 * Handle Discord OAuth2 callback for verification
 */

const express = require('express');
const axios = require('axios');
const { getLogger } = require('../utils/logger');
const { query } = require('../database/hybridPool');

const logger = getLogger();
const app = express();

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://limoon-space.cloud/callback';
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;

/**
 * Homepage - Redirect to Discord OAuth2
 */
app.get('/', (req, res) => {
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=identify+gdm.join`;
  res.redirect(authUrl);
});

/**
 * Callback handler - Process OAuth2 code
 */
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    logger.warn('OAuth', 'Missing code parameter');
    return res.status(400).send(buildErrorPage('Code manquant'));
  }

  try {
    logger.info('OAuth', `Processing verification`, { code: code.substring(0, 10) + '***' });

    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', 
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, token_type, expires_in, scope } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `${token_type} ${access_token}`
      }
    });

    const user = userResponse.data;
    const userId = user.id;
    const username = user.username;
    const discriminator = user.discriminator;
    const avatar = user.avatar;

    logger.info('OAuth', `User verified`, {
      userId,
      username: `${username}#${discriminator}`
    });

    // Save to database
    await query(`
      INSERT INTO verified_users (user_id, username, discriminator, avatar, access_token, refresh_token, token_type, expires_at, scope, verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        avatar = EXCLUDED.avatar,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_type = EXCLUDED.token_type,
        expires_at = EXCLUDED.expires_at,
        scope = EXCLUDED.scope,
        verified_at = NOW()
    `, [
      userId,
      username,
      discriminator,
      avatar,
      access_token,
      refresh_token,
      token_type,
      new Date(Date.now() + expires_in * 1000),
      scope
    ]);

    logger.info('OAuth', `Verification saved to database`, { userId });

    // Try to assign role (if bot is in same guild)
    try {
      const bot = global.discordClient;
      if (bot && bot.guilds) {
        for (const guild of bot.guilds.cache.values()) {
          try {
            const member = await guild.members.fetch(userId);
            if (member && VERIFIED_ROLE_ID) {
              await member.roles.add(VERIFIED_ROLE_ID);
              
              // Remove "not registered" role
              const notRegisteredRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
              if (notRegisteredRole) {
                await member.roles.remove(notRegisteredRole).catch(() => {});
              }
              
              logger.info('OAuth', `Role assigned`, {
                userId,
                guildId: guild.id,
                roleId: VERIFIED_ROLE_ID
              });
            }
          } catch (err) {
            // User not in this guild, skip
          }
        }
      }
    } catch (error) {
      logger.warn('OAuth', `Failed to assign role`, { error: error.message });
    }

    // Send success page
    res.send(buildSuccessPage(username, discriminator, avatar));

  } catch (error) {
    logger.error('OAuth', `Verification failed`, {
      error: error.message,
      response: error.response?.data
    });
    res.status(500).send(buildErrorPage('Erreur lors de la vérification'));
  }
});

/**
 * Status endpoint
 */
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Get verified users (admin only - require token)
 */
app.get('/api/verified', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await query(
      'SELECT user_id, username, discriminator, avatar, verified_at, scope FROM verified_users ORDER BY verified_at DESC'
    );

    res.json({
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    logger.error('OAuth', 'Failed to fetch verified users', { error: error.message });
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Build success page
 */
function buildSuccessPage(username, discriminator, avatar) {
  const avatarUrl = avatar 
    ? `https://cdn.discordapp.com/avatars/${username}/${avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification Réussie - LS・Shop & Gen</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
      width: 100%;
      animation: slideIn 0.5s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .success-icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 30px;
      animation: scaleIn 0.5s ease-out 0.2s both;
    }
    
    @keyframes scaleIn {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }
    
    .checkmark {
      font-size: 60px;
      color: white;
    }
    
    h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 15px;
      font-weight: 700;
    }
    
    .subtitle {
      color: #666;
      font-size: 18px;
      margin-bottom: 40px;
    }
    
    .user-info {
      background: #f8f9fa;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
    }
    
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 15px;
      border: 4px solid #667eea;
    }
    
    .username {
      font-size: 22px;
      color: #333;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .discriminator {
      color: #888;
      font-size: 16px;
    }
    
    .benefits {
      text-align: left;
      margin: 30px 0;
      padding: 0 20px;
    }
    
    .benefit {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      color: #555;
      font-size: 16px;
    }
    
    .benefit-icon {
      width: 30px;
      height: 30px;
      background: #667eea;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: 15px;
      color: white;
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 40px;
      border-radius: 30px;
      text-decoration: none;
      font-size: 18px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 20px;
    }
    
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5);
    }
    
    .footer {
      margin-top: 30px;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">
      <div class="checkmark">✓</div>
    </div>
    
    <h1>Vérification Réussie!</h1>
    <p class="subtitle">Bienvenue sur LS・Shop & Gen</p>
    
    <div class="user-info">
      <img src="${avatarUrl}" alt="Avatar" class="avatar">
      <div class="username">${username}</div>
      <div class="discriminator">#${discriminator}</div>
    </div>
    
    <div class="benefits">
      <div class="benefit">
        <div class="benefit-icon">✓</div>
        <span>Accès aux panels de génération</span>
      </div>
      <div class="benefit">
        <div class="benefit-icon">🎁</div>
        <span>Génération de comptes gratuits</span>
      </div>
      <div class="benefit">
        <div class="benefit-icon">👑</div>
        <span>Accès premium disponible</span>
      </div>
      <div class="benefit">
        <div class="benefit-icon">⚡</div>
        <span>Support communautaire</span>
      </div>
    </div>
    
    <a href="https://discord.gg/lsshop" class="button">Retour sur Discord</a>
    
    <div class="footer">
      Tu peux fermer cette page en toute sécurité
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Build error page
 */
function buildErrorPage(message) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur - LS・Shop & Gen</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    
    .error-icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 30px;
    }
    
    .cross {
      font-size: 60px;
      color: white;
    }
    
    h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 15px;
    }
    
    .message {
      color: #666;
      font-size: 18px;
      margin-bottom: 40px;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 15px 40px;
      border-radius: 30px;
      text-decoration: none;
      font-size: 18px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">
      <div class="cross">✗</div>
    </div>
    
    <h1>Erreur</h1>
    <p class="message">${message}</p>
    
    <a href="/" class="button">Réessayer</a>
  </div>
</body>
</html>
  `;
}

/**
 * Start server
 */
function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info('WebServer', `✅ Server started on port ${port}`, {
        port,
        redirectUri: DISCORD_REDIRECT_URI
      });
      resolve(server);
    }).on('error', reject);
  });
}

module.exports = { startServer, app };
