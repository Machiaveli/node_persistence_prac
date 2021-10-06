const express = require('express');
const logger = require('morgan');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');
const path = require('path');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

// Init app
const app = express();
const hostname = '127.0.0.1';
const port = 3000;

//Load views engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// This section will change for Cloud Services
const redisClient = redis.createClient();
redisClient.on('error', (err) => {
 console.log("Error " + err);
});

// Load required files
app.use(logger('tiny'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(responseTime());

//aws config
AWS.config.update({region: 'ap-southeast-2'});
AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: '901444280953_CAB432-STUDENT'});

app.get('/api/search', (req, res) => {
    const query = (req.query.query).trim();

    // Construct the wiki URL and key
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
    const redisKey = `wikipedia:${query}`;
   // Try the cache
    return redisClient.get(redisKey, (err, result) => {
   
        if (result) {
            // Serve from Cache
            const resultJSON = JSON.parse(result);
            return res.status(200).json(resultJSON);
        } else {
            // Serve from Wikipedia API and store in cache
            return axios.get(searchUrl)
                .then(response => {
                    const responseJSON = response.data;
                    redisClient.setex(redisKey, 3600, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
                    return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
                })
                .catch(err => {
                    return res.json(err);
                });
        }
    });
});

// Start server
app.listen(port, function () {
    console.log(`Express app listening at http://${hostname}:${port}/`);
});