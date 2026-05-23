const axios  = require('axios');
const config = require('../config/config');

const formatNumber = (num) => {
  let f = String(num).replace(/\s+/g, '').replace(/^\+/, '');
  if (f.startsWith('255')) return f;
  if (f.startsWith('0'))   return '255' + f.slice(1);
  if (f.length === 9)      return '255' + f;
  return '255' + f;
};

const isValidNumber = (num) => /^255\d{9}$/.test(num);

/**
 * Send SMS via BrandBox Bulk API with retry logic.
 */
const sendSms = async (message, phoneNumbers, maxRetries = 3) => {
  const settings = config.sms.brandbox;
  if (!settings?.apiKey)    throw new Error('BrandBox API key not configured');
  if (!settings?.apiSecret) throw new Error('BrandBox API secret not configured');

  const numbers = (Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers])
    .map(formatNumber)
    .filter(isValidNumber);

  if (!numbers.length) throw new Error('No valid phone numbers after formatting');

  const results = [];
  const failed  = [];

  for (const phone of numbers) {
    let sent = false;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data } = await axios.post(
          'https://smsbulkapi.brandbox.co.tz/api/sms/v1/text/single',
          { from: settings.senderName, to: phone, text: message.trim() },
          {
            headers: {
              'api-key':      settings.apiKey,
              'api-secret':   settings.apiSecret,
              'Content-Type': 'application/json',
            },
            timeout: 30_000,
          }
        );
        const msg = data?.messages?.[0];
        results.push({ phone, messageId: msg?.messageId || null, status: msg?.status?.name || 'SENT' });
        sent = true;
        break;
      } catch (err) {
        lastError = err;
        const code = err?.response?.status;
        if ([401, 403].includes(code)) throw new Error('BrandBox authentication failed');
        if (code === 400)              throw new Error(`BrandBox bad request: ${err?.response?.data?.message}`);
        if (code === 429)              throw new Error('BrandBox rate limit exceeded');
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * 2 ** (attempt - 1) + Math.random() * 500, 10_000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (!sent) failed.push({ phone, error: `Failed after ${maxRetries} attempts: ${lastError?.message}` });
  }

  return { success: failed.length === 0, sent: results.length, failed_count: failed.length, results, failed };
};

module.exports = { sendSms };
