const { Stack, Duration } = require('aws-cdk-lib');

// PROJECT RESOURCES

// CDK RESOURCES
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
    const s3 = s3Setup(this, {
      env: props.env,
    });

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'ReserveRecAdminQueue', {
    //   visibilityTimeout: Duration.seconds(300)
    // });
  }
}

module.exports = { ReserveRecAdminStack }
