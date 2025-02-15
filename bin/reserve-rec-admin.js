#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ReserveRecAdminStack } = require('../lib/reserve-rec-admin-stack');

const app = new cdk.App();
new ReserveRecAdminStack(app, 'ReserveRecAdminStack', {
  env: {
    //AWS account variables
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,

    // Custom environment variables
    ENVIRONMENT: process.env.ENVIRONMENT || 'dev',
    S3_BUCKET_ADMIN: process.env.S3_BUCKET_ADMIN || 'reserve-rec-admin-cdk',
    API_STAGE: process.env.API_STAGE || 'api',
    RESERVE_REC_API_ID: process.env.RESERVE_REC_API_ID || 'reserve-rec-api-id',
    RESERVE_REC_API_ROOT_ID: process.env.RESERVE_REC_API_ROOT_ID || 'reserve-rec-api-root-id',
  }
});
