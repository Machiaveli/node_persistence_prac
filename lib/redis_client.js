const redis = require('redis');

// This section will change for Cloud Services
const redisClient = redis.createClient();
redisClient.on('error', (err) => {
 console.log("Error " + err);
});

module.exports = redisClient;