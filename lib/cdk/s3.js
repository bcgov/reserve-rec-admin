/**
 * Builds the S3 resources for the Reserve Rec ADMIN stack.
 */

const s3 = require('aws-cdk-lib/aws-s3');
const { RemovalPolicy } = require('aws-cdk-lib');

function s3Setup(scope, props) {
  console.log('Setting up S3 resources...');

  // S3 BUCKETS

  const reserveRecAdminEnvBucket = new s3.Bucket(scope, 'ReserveRecAdminBucket', {
    bucketName: props.env.S3_BUCKET_ADMIN,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryptionKey: props.env.KMS_KEY,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    cors: [
      {
        allowedOrigins: ['*'],
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE],
        allowedHeaders: ['*'],
      }
    ],
  });

  return {
    reserveRecAdminEnvBucket: reserveRecAdminEnvBucket,
  };
}

module.exports = {
  s3Setup,
}