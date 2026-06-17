'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  defaultLang: process.env.DEFAULT_LANG || 'en',

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.PHONE_NUMBER_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    verifyToken: process.env.VERIFY_TOKEN || '',
  },

  // Public base URL where lesson images are hosted (e.g. https://cdn.example.com).
  // Lesson `image` paths like "/img/passwords.png" are resolved against this when
  // sending on real WhatsApp. Leave empty to send text only (e.g. for SVG assets,
  // which WhatsApp does not accept — rasterise to PNG/JPEG and host them).
  mediaBaseUrl: process.env.MEDIA_BASE_URL || '',
};

config.whatsapp.isConfigured = Boolean(
  config.whatsapp.token && config.whatsapp.phoneNumberId
);

module.exports = config;
