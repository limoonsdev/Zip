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
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=identify+guilds.join`;
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
    logger.info('OAuth', 'Processing verification', { code: code.substring(0, 10) + '***' });

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
    const discriminator = user.discriminator || '0';
    const avatar = user.avatar || null;

    logger.info('OAuth', 'User verified', {
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

    logger.info('OAuth', 'Verification saved to database', { userId });

    // Try to assign role (if bot is in same guild)
    try {
      const bot = global.discordClient;
      if (bot && bot.guilds) {
        for (const guild of bot.guilds.cache.values()) {
          try {
            const member = await guild.members.fetch(userId);
            if (member && VERIFIED_ROLE_ID) {
              await member.roles.add(VERIFIED_ROLE_ID).catch(() => {});
              
              // Add membres role
              const membresRoleId = '1532391228040282232';
              await member.roles.add(membresRoleId).catch(() => {});
              
              // Remove "not registered" role
              const notRegisteredRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
              if (notRegisteredRole) {
                await member.roles.remove(notRegisteredRole).catch(() => {});
              }
              
              logger.info('OAuth', 'Role assigned', {
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
      logger.warn('OAuth', 'Failed to assign role', { error: error.message });
    }

    // Send success page
    res.send(buildSuccessPage(username, discriminator, avatar));

  } catch (error) {
    logger.error('OAuth', 'Verification failed', {
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
  const bannerUrl = 'https://i.goopics.net/2eukvn.gif';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification Réussie • PrimeGen</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #090a0f;
      background-image: 
        radial-gradient(at 0% 0%, rgba(88, 101, 242, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(255, 215, 0, 0.12) 0px, transparent 50%);
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 16px;
    }
    
    .card {
      background: rgba(18, 20, 29, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      overflow: hidden;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(88, 101, 242, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .banner-container {
      width: 100%;
      height: 160px;
      position: relative;
      overflow: hidden;
      background: #141622;
    }
    
    .banner {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    .banner-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(to top, rgba(18, 20, 29, 1), transparent);
    }
    
    .content {
      padding: 0 32px 36px 32px;
      text-align: center;
      position: relative;
    }
    
    .avatar-wrapper {
      position: relative;
      display: inline-block;
      margin-top: -50px;
      margin-bottom: 16px;
    }
    
    .avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      border: 4px solid #12141d;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(87, 242, 135, 0.3);
      object-fit: cover;
    }
    
    .status-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 24px;
      height: 24px;
      background: #57F287;
      border: 3px solid #12141d;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      font-size: 12px;
      font-weight: bold;
    }
    
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 6px;
    }
    
    .subtitle {
      color: #949ba4;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
    }
    
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 215, 0, 0.1);
      border: 1px solid rgba(255, 215, 0, 0.25);
      color: #FFD700;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    
    .user-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .username-text {
      font-weight: 700;
      font-size: 16px;
      color: #ffffff;
    }
    
    .discriminator-text {
      color: #949ba4;
      font-size: 14px;
    }
    
    .benefits-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 28px;
      text-align: left;
    }
    
    .benefit-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 12px 14px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #dbdee1;
      font-weight: 500;
    }
    
    .benefit-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    
    .btn-discord {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #5865F2 0%, #4752C4 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 24px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 8px 20px rgba(88, 101, 242, 0.35);
      transition: all 0.2s ease;
    }
    
    .btn-discord:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(88, 101, 242, 0.5);
    }
    
    .footer-note {
      margin-top: 18px;
      font-size: 12px;
      color: #5c626d;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="banner-container">
      <img src="${bannerUrl}" alt="PrimeGen Banner" class="banner">
      <div class="banner-overlay"></div>
    </div>
    
    <div class="content">
      <div class="avatar-wrapper">
        <img src="${avatarUrl}" alt="Avatar" class="avatar">
        <div class="status-badge">✓</div>
      </div>
      
      <div class="brand-pill">✨ PrimeGen Verified</div>
      <h1>Vérification Réussie !</h1>
      <p class="subtitle">Compte Discord identifié et vérifié avec succès.</p>
      
      <div class="user-card">
        <span class="username-text">${username}</span>
        <span class="discriminator-text">#${discriminator}</span>
      </div>
      
      <div class="benefits-grid">
        <div class="benefit-item">
          <span class="benefit-icon">👑</span>
          <span>Role Vérifié attribué</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">🎁</span>
          <span>Accès aux Générateurs</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">⚡</span>
          <span>Livraison Instantanée</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">💎</span>
          <span>Services Prime</span>
        </div>
      </div>
      
      <a href="https://discord.gg/primegen" class="btn-discord">
        🎮 Retourner sur Discord (.gg/primegen)
      </a>
      
      <div class="footer-note">
        🔒 Vous pouvez fermer cette fenêtre en toute sécurité.
      </div>
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
  const bannerUrl = 'https://i.goopics.net/2eukvn.gif';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur • PrimeGen</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #090a0f;
      background-image: radial-gradient(at 50% 0%, rgba(237, 66, 69, 0.15) 0px, transparent 60%);
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 16px;
    }
    .card {
      background: rgba(18, 20, 29, 0.85);
      border: 1px solid rgba(237, 66, 69, 0.25);
      border-radius: 24px;
      overflow: hidden;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      backdrop-filter: blur(16px);
      text-align: center;
    }
    .banner-container {
      width: 100%;
      height: 140px;
      position: relative;
    }
    .banner {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .content { padding: 32px 28px; }
    .error-icon {
      width: 70px;
      height: 70px;
      background: rgba(237, 66, 69, 0.15);
      border: 2px solid #ED4245;
      color: #ED4245;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: -60px auto 20px;
      position: relative;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ED4245;
      margin-bottom: 10px;
    }
    .message {
      color: #949ba4;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .btn-retry {
      display: block;
      width: 100%;
      background: #ED4245;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-retry:hover { background: #c03537; }
  </style>
</head>
<body>
  <div class="card">
    <div class="banner-container">
      <img src="${bannerUrl}" alt="PrimeGen Banner" class="banner">
    </div>
    <div class="content">
      <div class="error-icon">✕</div>
      <h1>Erreur de Vérification</h1>
      <p class="message">${message}</p>
      <a href="/" class="btn-retry">🔄 Réessayer la vérification</a>
    </div>
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
