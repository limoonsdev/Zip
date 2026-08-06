/**
 * =====================================================
 * PAYPAL SERVICE
 * =====================================================
 * Handles PayPal REST API interactions for Auto Order.
 */

const { getLogger } = require('../utils/logger');
const logger = getLogger();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_PAYPAL_CLIENT_SECRET';

// Use sandbox in development, production in prod
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get an access token from PayPal
 */
async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error('PayPal', 'Authentication failed', { error: error.message });
    throw error;
  }
}

/**
 * Create a PayPal Order
 * @param {number} amount - The amount to charge
 * @param {string} currency - e.g., 'EUR' or 'USD'
 * @param {string} description - Order description
 * @returns {object} - { orderId, approveLink }
 */
async function createOrder(amount, currency = 'EUR', description = 'Discord Boosts') {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: description,
            amount: {
              currency_code: currency,
              value: parseFloat(amount).toFixed(2)
            }
          }
        ],
        application_context: {
          brand_name: 'PrimeGen',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: 'https://discord.com',
          cancel_url: 'https://discord.com'
        }
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      logger.error('PayPal', 'Create order failed', { details: errData });
      throw new Error(`Failed to create order: ${response.statusText}`);
    }

    const data = await response.json();
    const approveLink = data.links.find(link => link.rel === 'approve')?.href;

    return {
      orderId: data.id,
      approveLink
    };
  } catch (error) {
    logger.error('PayPal', 'Order creation failed', { error: error.message });
    throw error;
  }
}

/**
 * Capture a PayPal Order (Verify Payment)
 * @param {string} orderId - The PayPal Order ID
 * @returns {object} - The capture result
 */
async function capturePayment(orderId) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('PayPal', 'Capture failed', { details: data });
      return { success: false, status: data.name || response.statusText, details: data };
    }

    return {
      success: data.status === 'COMPLETED',
      status: data.status,
      details: data
    };
  } catch (error) {
    logger.error('PayPal', 'Payment capture failed', { error: error.message });
    return { success: false, status: 'ERROR', message: error.message };
  }
}

module.exports = {
  createOrder,
  capturePayment
};
