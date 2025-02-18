/**
 * Builds the S3 resources for the Reserve Rec ADMIN stack.
 */

const s3 = require('aws-cdk-lib/aws-s3');
const { RemovalPolicy } = require('aws-cdk-lib');

function s3Setup(scope, props) {
  console.log('Setting up S3 resources...');

  // S3 BUCKETS

  const reserveRecAdminDistBucket = new s3.Bucket(scope, 'ReserveRecAdminDistBucket', {
    bucketName: props.env.S3_BUCKET_ADMIN,
    blockPublicAccess: {
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    },
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

  const reserveRecAdminLogBucket = new s3.Bucket(scope, 'ReserveRecAdminLogBucket', {
    bucketName: `${props.env.S3_BUCKET_ADMIN}-logs`,
    blockPublicAccess: {
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    },
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
  });

  return {
    reserveRecAdminDistBucket: reserveRecAdminDistBucket,
    reserveRecAdminLogBucket: reserveRecAdminLogBucket,
  };
}

module.exports = {
  s3Setup,
}