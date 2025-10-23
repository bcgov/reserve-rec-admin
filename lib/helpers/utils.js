const { createLogger, format, transports } = require("winston");
const { combine, timestamp } = format;
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const ssm = require('aws-cdk-lib/aws-ssm');
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { CfnOutput } = require('aws-cdk-lib');

// Default region if not set in environment
const CDK_DEFAULT_REGION = process.env.CDK_DEFAULT_REGION || 'ca-central-1';

// Initialize Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || CDK_DEFAULT_REGION });

// Initialize SSM client
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || CDK_DEFAULT_REGION });

// Logger configuration
const LEVEL = process.env.LOG_LEVEL || "error";

const logger = createLogger({
  level: LEVEL,
  format: combine(
    timestamp(),
    format.printf((info) => {
      let meta = "";
      let symbols = Object.getOwnPropertySymbols(info);
      if (symbols.length == 2) {
        meta = JSON.stringify(info[symbols[1]]);
      }
      let levelText = [info.level.toUpperCase()];
      switch (info.level) {
        case 'info':
          levelText = '\x1b[36m' + levelText + '\x1b[0m'; // cyan
          break;
        case 'debug':
          levelText = '\x1b[35m' + levelText + '\x1b[0m'; // magenta
          break;
        default:
          break;
      }
      let message = `${info.timestamp} ${levelText}: ${info.message
        } ${meta}`;
      if (info.level === 'error') {
        message = `\n\x1b[31m${message}\x1b[0m\n`;
      }
      if (info.level === 'warn') {
        message = `\x1b[33m${message}\x1b[0m`;
      }
      return message;
    })
  ),
  transports: [new transports.Console()],
});

async function getSyncSecretFromSM(scope, secret) {
  try {
    logger.debug(`Fetching Secrets Manager secret: ${secret.path}`);
    if (scope.getDeploymentName() !== 'prod') {
      const command = new GetSecretValueCommand({ SecretId: secret.path });
      const retrievedSecret = await secretsClient.send(command);
      return retrievedSecret.SecretString;
    } else {
      throw 'Synchronous secret retrieval is not implemented for prod';
    }
  } catch (error) {
    // If running offline, just return the secret name for local testing
    if (scope.isOffline()) {
      logger.warn(`Error retrieving secret ${secret.path} from Secrets Manager:\n ${error}`);
    }
    return secret.id;
  }
}

function setSSMParameter(scope, paramName, paramValue, description = null) {
  if (!description) {
    description = `Parameter ${paramName} for ${scope.getAppName()} - ${scope.getDeploymentName()} environment`;
  }
  return new ssm.StringParameter(scope, `${paramName}-SSMParameter`, {
    parameterName: paramName,
    stringValue: paramValue,
    description: description
  })
}

function getAsyncSecretFromSM(scope, secretsecretPath) {
  try {
    logger.debug(`Fetching Secrets Manager secret: ${secretPath}`);
    const secret = Secret.fromSecretNameV2(scope, constructNamer(secretName, context), secretPath);
    if (context?.ENVIRONMENT_NAME !== 'prod') {
      return secret.secretValue;
    }
  } catch (error) {
    // If running offline, just return the secret name for local testing
    if (context.IS_OFFLINE !== 'true') {
      logger.warn(`Error retrieving secret ${secretPath} from Secrets Manager:\n ${error}`);
    }
    return secretName;
  }
}


// Function to get context parameters from SSM Parameter Store
async function getParameterFromSSM(paramName) {
  logger.debug(`Fetching SSM env parameter: ${paramName}`);
  const command = new GetParameterCommand({ Name: paramName, WithDecryption: true });
  try {
    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    throw `SSM GET error.\n ${error}`;
  }
}

function resolveParameterFromSSM(scope, paramName) {
  logger.debug(`Fetching SSM parameter: ${paramName}`);
  return ssm.StringParameter.valueForStringParameter(scope, paramName);

}

function constructNamer(refName, { appName, deploymentName, stackName } = {}) {
  const parts = [appName, deploymentName, stackName, refName];
  if (parts.some(part => !part)) {
    throw new Error(`Missing required parts to construct name: ${JSON.stringify(parts)}`);
  }
  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1).join(''));
}

class StackPrimer {
  constructor(scope, stackKey, defaults = {}) {

    // Bind some methods for convenience
    this.getDeploymentName = scope.getDeploymentName.bind(scope);
    this.getAppName = scope.getAppName.bind(scope);
    this.isOffline = scope.isOffline.bind(scope);

    this.stackKey = stackKey;
    this.stackId = scope.createStackId(stackKey);
    this.scope = scope;
    this.configPath = this.createConstructSSMPath('config');
    this.config = defaults?.config || {};
    this.constructs = defaults?.constructs || {};
    this.secrets = defaults?.secrets || {};
    this.env = {
      account: scope.context.DEFAULT_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '000000000000',
      region: scope.context.DEFAULT_REGION || process.env.CDK_DEFAULT_REGION || 'ca-central-1'
    }
  }

  async prime() {
    this.nameConstructs();
    await this.getDeploymentConfig();
    await this.getSecrets(this.appScope);
  }

  nameConstructs() {
    for (const [key, construct] of Object.entries(this.constructs)) {
      if (construct.hasOwnProperty('name')) {
        construct.key = key;
        construct.name = construct?.name || 'Construct';
        construct.id = this.createConstructId(construct);
        construct.ssmPath = this.createConstructSSMPath(key);
        construct.cfnOutput = this.createConstructCfnOutputPath(key);
      } else {
        throw new Error(`Construct ${key} is missing a 'name' property.`);
      }
    }
  }

  async getDeploymentConfig() {
    try {
      if (this.getDeploymentName() === 'local' || this.isOffline()) {
        logger.debug('Loading local/offline context from env.json');
        // Local or offline environment
        const localContext = require('../env.json');
        if (!localContext?.stackContexts?.[this.stackKey]) {
          logger.warn(`Local context for stack ${this.stackKey} not found in env.json`);
        } else {
          this.config = Object.assign(this.config, localContext?.stackContexts?.[this.stackKey]);
        }
      } else {
        logger.debug('Loading context from SSM Parameter Store');
        // Production or other environments
        const retrievedConfig = await getParameterFromSSM(this.configPath);
        this.config = { ...this.config, ...JSON.parse(retrievedConfig) };
      }
      logger.debug('Loaded config:', this.config);
    } catch (error) {
      throw new Error(`Error retrieving deployment context for stack ${this.stackKey}: ${error}`);
    }
  }


  async getSecrets() {
    for (const [key, secret] of Object.entries(this.secrets)) {
      if (secret.hasOwnProperty('name')) {
        secret.key = key;
        secret.id = this.createConstructId(secret);
        secret.path = this.createConstructSSMPath(key);
        const value = await getSyncSecretFromSM(this, secret);
        secret.value = value || key;
      } else {
        throw new Error(`Secret ${key} is missing a 'name' property.`);
      }
    }
  }

  createConstructId(construct) {
    if (construct?.strictName) {
      return construct.name;
    }
    return this.stackId + '-' + construct.name.charAt(0).toUpperCase() + construct.name.slice(1);
  }

  createConstructCfnOutputPath(constructKey, delimiter = '-') {
    const parts = [this.getAppName(), this.getDeploymentName(), this.stackKey, constructKey];
    if (parts.some(part => !part)) {
      throw new Error(`Missing required parts to construct SSM path: ${JSON.stringify(parts)}`);
    }
    return parts.map(part => part.charAt(0).toLowerCase() + part.slice(1)).join(delimiter);
  }

  createConstructSSMPath(constructKey) {
    return '/' + this.createConstructCfnOutputPath(constructKey, '/');
  }

  getCfnPath(constructKey) {
    return this.constructs?.[constructKey]?.cfnOutput;
  }

  createCfnOutput(constructKey, construct, propertyName='') {
    // bind this to the stack context
    // get output id
    const constructPath = this.constructs?.[constructKey]?.cfnOutput;
    const outputId = `${constructPath}-cfnOutput` || `${constructKey}-cfnOutput`;

    return new CfnOutput(this, outputId, {
      value: propertyName ? construct[propertyName] : construct,
      exportName: propertyName ? `${constructPath}-${propertyName}` : construct.name,
    });
  }
}

module.exports = {
  StackPrimer,
  constructNamer,
  getParameterFromSSM,
  getSyncSecretFromSM,
  setSSMParameter,
  resolveParameterFromSSM,
  logger
};