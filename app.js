const express = require('express');
const logger = require('morgan');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');
const path = require('path');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
// const defaultRouter = require('./routes/default');

// Init app
const app = express();
const hostname = '127.0.0.1';
const port = 3000;
const aws_profile = '901444280953_CAB432-STUDENT';

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

var credentials = new AWS.SharedIniFileCredentials({profile: aws_profile});
AWS.config.credentials = credentials;
console.log(AWS.config.credentials.accessKeyId);

// app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
// app.use('/css', express.static(path.join(__dirname, 'public/css')));
// app.use('/scss', express.static(path.join(__dirname, 'node_modules/bootstrap/scss')));
// app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
// app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
// app.use('/js', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/js')));
// app.use('/js', express.static(path.join(__dirname, 'public/js')));


// app.use('/', defaultRouter); 

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