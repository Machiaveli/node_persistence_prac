var AWS = require("aws-sdk");
const constants = require('./shared_constants');

module.exports = class s3_manager {

    //initialises a new S3 Bucket using the provided bucket name
    initBucket(bucketName) {
        console.log(`Preparing to create bucket: ${bucketName}`);
        
        // Create a promise on S3 service object
        const bucketPromise = new AWS.S3({apiVersion: constants.S3_API_VERSION}).createBucket({Bucket: bucketName}).promise();
        bucketPromise.then(function(data) {
            console.log("Successfully created " + bucketName);
        })
        .catch(function(err) {
            if (err.code === 'BucketAlreadyOwnedByYou')
                console.log(`Bucket ${bucketName} already exists and is owned by you`);
            else
                console.error(err, err.stack);
        });
    }
}