const express = require('express');
const axios = require("axios");
const router = express.Router();
var AWS = require("aws-sdk");
const constants = require('../lib/shared_constants');

router.get('/search', (req, res) => {
    const query = (req.query.query).trim();

    // Construct the wiki URL and key
    const searchUrl = `${constants.WIKIPEDIA_API_URL}${query}`;
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

router.get('/store', (req, res) => {
    const key = (req.query.key).trim();
   
    // Construct the wiki URL and S3 key
    const searchUrl = `${constants.WIKIPEDIA_API_URL}${key}`;
    const s3Key = `wikipedia-${key}`;
   
    // Check S3
    const params = { Bucket: constants.S3_DEFAULT_BUCKET_NAME, Key: s3Key};
   
    return new AWS.S3({apiVersion: constants.S3_API_VERSION}).getObject(params, (err, result) => {
        if (result) {
            // Serve from S3
            console.log(result);
            const resultJSON = JSON.parse(result.Body);
            return res.status(200).json(resultJSON);
        } else {
            // Serve from Wikipedia API and store in S3
            return axios.get(searchUrl)
                .then(response => {
                    const responseJSON = response.data;
                    const body = JSON.stringify({ source: 'S3 Bucket', ...responseJSON});
                    const objectParams = {Bucket: constants.S3_DEFAULT_BUCKET_NAME, Key: s3Key, Body: body};
                    const uploadPromise = new AWS.S3({apiVersion: constants.S3_API_VERSION}).putObject(objectParams).promise();
                    uploadPromise.then(function(data) {
                        console.log("Successfully uploaded data to " + constants.S3_DEFAULT_BUCKET_NAME + "/" + s3Key);
                    });
                    return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
                })
                .catch(err => {
                    return res.json(err);
                });
        }
    });
});

module.exports = router;