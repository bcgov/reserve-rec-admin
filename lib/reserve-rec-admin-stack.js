const { Stack, Duration, Fn } = require('aws-cdk-lib');

const apigateway = require('aws-cdk-lib/aws-apigateway');

// PROJECT RESOURCES

// CDK RESOURCES
const { cloudFrontSetup } = require('./cdk/cloudfront');
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

    // Import existing API Gateway
    const reserveRecApiGatewayId = Fn.importValue('ReserveRecApiGatewayId');

    const reserveRecApiRootResourceId = Fn.importValue('ReserveRecApiRootResourceId');

    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ReserveRecAdminApi', {
      restApiId: reserveRecApiGatewayId,
      rootResourceId: reserveRecApiRootResourceId
    });

    // const deployment = new apigateway.Deployment(this, 'ReserveRecAdminApiDeployment', { api });

    const stage = apigateway.Stage.fromStageAttributes(this, `ReserveRecAdminApiStage-${props.env.API_STAGE}`, {
      restApi: api,
      stageName: props.env.API_STAGE
    });

    api.deploymentStage = stage;

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
      api: api,
      reserveRecAdminDistBucket: s3Resources.reserveRecAdminDistBucket,
      reserveRecAdminLogBucket: s3Resources.reserveRecAdminLogBucket,
    });
  }
}

module.exports = { ReserveRecAdminStack };
