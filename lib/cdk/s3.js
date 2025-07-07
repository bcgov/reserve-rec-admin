/**
 * Builds the S3 resources for the Reserve Rec ADMIN stack.
 */
const s3 = require('aws-cdk-lib/aws-s3');
const { CfnOutput, RemovalPolicy } = require('aws-cdk-lib');

function s3Setup(scope, props) {
  console.log('Setting up S3 resources...');

  // S3 BUCKETS

  const reserveRecAdminDistBucket = new s3.Bucket(scope, 'ReserveRecAdminDistBucket', {
    bucketName: props.env.S3_BUCKET_ADMIN,
    accessControl: s3.BucketAccessControl.BUCKET_OWNER_PREFERRED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
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
    accessControl: s3.BucketAccessControl.BUCKET_OWNER_PREFERRED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
  });

  // Outputs
  new CfnOutput(scope, 'ReserveRecAdminDistBucketName', {
    value: reserveRecAdminDistBucket.bucketName,
    description: 'Reserve Rec Admin Distribution Bucket',
    exportName: 'ReserveRecAdminDistBucketName'
  });
  new CfnOutput(scope, 'ReserveRecAdminLogBucketName', {
    value: reserveRecAdminLogBucket.bucketName,
    description: 'Reserve Rec Admin Log Bucket',
    exportName: 'ReserveRecAdminLogBucketName'
  });

  return {
    reserveRecAdminDistBucket: reserveRecAdminDistBucket,
    reserveRecAdminLogBucket: reserveRecAdminLogBucket,
  };
}

module.exports = {
  s3Setup,
}