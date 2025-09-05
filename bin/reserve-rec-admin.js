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
    ENVIRONMENT: process.env.ENVIRONMENT,
    S3_BUCKET: process.env.S3_BUCKET,
    API_STAGE: process.env.API_STAGE,
  }
});
