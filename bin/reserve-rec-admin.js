#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ReserveRecAdminStack } = require('../lib/reserve-rec-admin-stack');

const app = new cdk.App();
new ReserveRecAdminStack(app, process.env.STACK_NAME, {
  env: process.env
});
