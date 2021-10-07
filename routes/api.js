const express = require('express');
const axios = require("axios");
const router = express.Router();
const constants = require('../lib/shared_constants');
const redisClient = require('../lib/redis_client');
var AWS = require("aws-sdk");

router.get('/search', (req, res) => {
    const query = (req.query.query).trim();

    console.log(`** Search Query Received: ${query} **`);

    // Construct the wiki URL and keys
    const searchUrl = `${constants.WIKIPEDIA_API_URL}${query}`;
    const redisKey = `${constants.WIKIPEDIA_REDIS_KEY_PREFIX}${query}`;
    const s3Key = `${constants.WIKIPEDIA_S3_PREFIX}${query}`;

    // Try the cache
    console.log(`Querying cache for key ${redisKey}.`);
    return redisClient.get(redisKey, (err, redisResult) => {
        if (redisResult) {
            // Serve from Cache
            console.log(`Key found in cache. Serving from cache.`);
            const resultJSON = JSON.parse(redisResult);
            return res.status(200).json(resultJSON);
        } else {
            console.log(`Key not found in cache.`);

            //Check S3
            console.log(`Querying S3 for ${constants.S3_DEFAULT_BUCKET_NAME}/${s3Key}`);
            const params = { Bucket: constants.S3_DEFAULT_BUCKET_NAME, Key: s3Key};
            return new AWS.S3({apiVersion: constants.S3_API_VERSION}).getObject(params, (err, s3Result) => {
                if (s3Result) {
                    //Store in cache and serve
                    console.log(`Key found in S3. Storing in Cache and serving from S3.`);
                    const resultJSON = JSON.parse(s3Result.Body);
                    storeInCache(redisKey, resultJSON.parse)
                        .then(() => {
                            return res.status(200).json(resultJSON);
                        });
                } else {
                    // Serve from Wikipedia API and store in S3 and cache
                    console.log(`Key not found in S3. Querying Wikipedia API.`);
                    return axios.get(searchUrl)
                    .then(apiResponse => {
                        console.log(`Result found in Wikipedia API. Storing in Cache and S3.`);
                        const jsonData = apiResponse.data;
                        storeInCache(redisKey, jsonData)
                        .then(() => {
                            storeInS3(s3Key, jsonData)
                            .then(() => {
                                return res.status(200).json({ source: 'Wikipedia API', ...jsonData, });
                            });
                        })
                    })
                    .catch(err => {
                        return res.json(err);
                    });
                }
            });
        }
    });
});

router.get('/store', (req, res) => {
    const key = (req.query.key).trim();
   
    console.log(`** Store Request Received: ${key} **`);

    // Construct the wiki URL and S3 key
    const searchUrl = `${constants.WIKIPEDIA_API_URL}${key}`;
    const s3Key = `${constants.WIKIPEDIA_S3_PREFIX}${key}`;
   
    // Check S3
    const params = { Bucket: constants.S3_DEFAULT_BUCKET_NAME, Key: s3Key};
   
    return new AWS.S3({apiVersion: constants.S3_API_VERSION}).getObject(params, (err, result) => {
        if (result) {
            // Serve from S3
            console.log(`Key already exists in S3. Serving from S3.`);
            console.log(result);
            const resultJSON = JSON.parse(result.Body);
            return res.status(200).json(resultJSON);
        } else {
            // Serve from Wikipedia API and store in S3
            console.log(`Key not found in S3. Querying Wikipedia API and storing response in S3.`);
            return axios.get(searchUrl)
            .then(response => {
                const jsonData = response.data;
                storeInS3(s3Key, jsonData)
                .then(() => {
                    return res.status(200).json({ source: 'Wikipedia API', ...jsonData, });
                });
            })
            .catch(err => {
                return res.json(err);
            });
        }
    });
});

function storeInCache(key, jsonData) {
    return new Promise((resolve) => {
        redisClient.setex(key, 3600, JSON.stringify({ source: 'Redis Cache', ...jsonData, }));
        console.log(`Succesfully stored data in cache under key: ${key}`);
        resolve(jsonData);
    });
}

function storeInS3(key, jsonData) {
    const body = JSON.stringify({ source: 'S3 Bucket', ...jsonData});
    const objectParams = {Bucket: constants.S3_DEFAULT_BUCKET_NAME, Key: key, Body: body};
    const uploadPromise = new AWS.S3({apiVersion: constants.S3_API_VERSION}).putObject(objectParams).promise();
    return uploadPromise.then(function(data) {
        console.log(`Successfully uploaded data to S3 under ${constants.S3_DEFAULT_BUCKET_NAME}/${key}`);
        return jsonData;
    });
}

module.exports = router;