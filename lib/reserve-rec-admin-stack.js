const { Stack, Duration } = require('aws-cdk-lib');

const apigateway = require('aws-cdk-lib/aws-apigateway');

// PROJECT RESOURCES

// CDK RESOURCES
const {cloudFrontSetup} = require('./cdk/cloudfront');
const { s3Setup } = require('./cdk/s3');

class ReserveRecAdminStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

   // Import API Gateway
   const restApiResources = apigateway.RestApi.fromRestApiAttributes(this, 'ReserveRecApi', {
    restApiId: props.env.RESERVE_REC_API_ID,
   });

   const deployment = new apigateway.Deployment(this, 'ReserveRecAdminDeployment', {
    api: restApiResources,
    description: 'Reserve Rec Admin API Deployment (CDK)',
    retainDeployments: true,
   });

   deployment.resource.stageName = props.env.API_STAGE;
   restApiResources.deploymentStage = deployment.api.deploymentStage;



    // if offline, merge env vars
    if (props.env.IS_OFFLINE === 'true') {
      console.log('Running offline...');
      props.env = {
        ...process.env,
        ...props.env,
      };
      delete props.env.AWS_REGION;
      delete props.env.AWS_ACCESS_KEY_ID;
      delete props.env.AWS_SECRET_ACCESS_KEY;
    }

    // S3
    const s3Resources = s3Setup(this, {
      env: props.env,
    });

    // CLOUDFRONT
    const cloudFrontResources = cloudFrontSetup(this, {
      env: props.env,
      api: restApiResources,
      reserveRecAdminDistBucket: s3Resources.reserveRecAdminDistBucket,
      reserveRecAdminLogBucket: s3Resources.reserveRecAdminLogBucket,
    });
  }
}

module.exports = { ReserveRecAdminStack }
