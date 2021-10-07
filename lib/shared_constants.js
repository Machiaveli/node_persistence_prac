//Collection of constants used by the application
module.exports = Object.freeze({
    //AWS
    AWS_REGION:                'ap-southeast-2',
    AWS_PROFILE_NAME:          '901444280953_CAB432-STUDENT',

    //S3
    S3_DEFAULT_BUCKET_NAME:    'kse-wikipedia-store',
    S3_API_VERSION:            '2006-03-01',
    WIKIPEDIA_S3_PREFIX:       'wikipedia-',

    //WIKIPEDIA
    WIKIPEDIA_API_URL:         'https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=',

    //REDIS
    WIKIPEDIA_REDIS_KEY_PREFIX: 'Wikipedia:',
});