const { createClient } = require('redis');
const { redisUrl } = require('./env');

const client = createClient({
  url: redisUrl,
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('Redis client connecting...');
});

client.on('ready', () => {
  console.log('Redis client successfully connected and ready to use.');
});

/**
 * Connect to Redis instance.
 */
async function connectRedis() {
  if (!client.isOpen) {
    await client.connect();
  }
}

/**
 * Get session TTL key pattern
 * @param {string} seatId 
 * @returns {string}
 */
const getSessionKey = (seatId) => `desk:${seatId}:session`;

/**
 * Set seat session with specified TTL
 * @param {string} seatId 
 * @param {string} userId 
 * @param {number} ttlSeconds 
 */
async function setSession(seatId, userId, ttlSeconds) {
  const key = getSessionKey(seatId);
  await client.set(key, userId, {
    EX: ttlSeconds,
  });
}

/**
 * Get active seat session user
 * @param {string} seatId 
 * @returns {Promise<string|null>}
 */
async function getSession(seatId) {
  const key = getSessionKey(seatId);
  return await client.get(key);
}

/**
 * Delete seat session (e.g. checkout, override)
 * @param {string} seatId 
 */
async function deleteSession(seatId) {
  const key = getSessionKey(seatId);
  await client.del(key);
}

module.exports = {
  client,
  connectRedis,
  setSession,
  getSession,
  deleteSession,
};
