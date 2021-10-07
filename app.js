const express = require('express');
const logger = require('morgan');
const responseTime = require('response-time')
const axios = require('axios');
const path = require('path');
const apiRouter = require('./routes/api');
var bodyParser = require('body-parser');
var s3Manager = require('./lib/s3_manager');
var constants = require('./lib/shared_constants');
var AWS = require("aws-sdk");

// Init app
const app = express();
const hostname = '127.0.0.1';
const port = 3000;

//Load views engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Load required files
app.use(logger('tiny'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(responseTime());

//aws config
AWS.config.update({region: constants.AWS_REGION});
AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: constants.AWS_PROFILE_NAME});

//Init bucket
new s3Manager().initBucket(constants.S3_DEFAULT_BUCKET_NAME);

//Set router(s)
app.use('/api', apiRouter); 

// Start server
app.listen(port, function () {
    console.log(`Express app listening at http://${hostname}:${port}/`);
});