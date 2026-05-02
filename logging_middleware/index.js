const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ALLOWED_STACKS = ['backend', 'frontend'];
const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const ALLOWED_PACKAGES = [
  'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service', // Backend only
  'api', 'component', 'hook', 'page', 'state', 'style', // Frontend only
  'auth', 'config', 'middleware', 'utils' // Both
];

/**
 * Reusable Logging Middleware for Campus Hiring Evaluation
 * @param {string} stack 
 * @param {string} level 
 * @param {string} package
 * @param {string} message
 */
async function Log(stack, level, package, message) {
  try {
    if (!ALLOWED_STACKS.includes(stack)) {
      console.warn(`[Local Warn] Invalid stack: ${stack}. Allowed: ${ALLOWED_STACKS.join(', ')}`);
      return;
    }
    if (!ALLOWED_LEVELS.includes(level)) {
      console.warn(`[Local Warn] Invalid level: ${level}. Allowed: ${ALLOWED_LEVELS.join(', ')}`);
      return;
    }
    if (!ALLOWED_PACKAGES.includes(package)) {
      console.warn(`[Local Warn] Invalid package: ${package}. Allowed: ${ALLOWED_PACKAGES.join(', ')}`);
      return;
    }
    const token = process.env.EVAL_TOKEN;
    if (!token) {
      console.error('[Local Error] EVAL_TOKEN is missing in environment variables. Cannot send log.');
      return;
    }

    const baseUrl = process.env.BASE_URL || 'http://20.207.122.201/evaluation-service';
    const logEndpoint = `${baseUrl}/logs`;
    
    const safeMessage = message.length > 48 ? message.substring(0, 45) + '...' : message;

    
    const response = await axios.post(
      logEndpoint,
      { stack, level, package, message: safeMessage },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('[Local Error] Logging failed: Unauthorized. Token may be expired.');

    } else {
      const serverDetails = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[Local Error] Logging failed gracefully: ${serverDetails}`);
    }
  }
}

module.exports = { Log };
