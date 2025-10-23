const { Stack, CfnOutput, CustomResource } = require('aws-cdk-lib');
const { Provider } = require('aws-cdk-lib/custom-resources');
const ssm = require('aws-cdk-lib/aws-ssm');
const lambda = require('aws-cdk-lib/aws-lambda');
const { logger, setSSMParameter } = require('./utils');

class BaseStack extends Stack {
  constructor(appScope, primer, props = {}) {

    super(appScope.app, primer?.stackId, {
      ...props,
      env: primer?.env
    });

    this.appScope = appScope;

    // Initialize stack properties
    this.stackKey = primer.stackKey || 'DEFAULT_STACK';
    this._stackId = primer?.stackId;
    this.configPath = primer.createConstructSSMPath('config');
    this.config = primer?.config || {};
    this.constructs = primer?.constructs || {};
    this.secrets = primer?.secrets || {};
    this.overrides = primer?.config?.overrides || {};
    this.exports = {};
    this.stackScope = {};

    // imported references
    this.importedRefs = new Map();

    // bind this to the app scope
    this.appScope.bindStackScope(this.stackKey, this);

    // bind some methods for convenience
    this.getDeploymentName = appScope.getDeploymentName.bind(appScope);
    this.isOffline = appScope.isOffline.bind(appScope);
    this.getAppName = appScope.getAppName.bind(appScope);
    this.getConstructId = appScope.getConstructId.bind(this);
    this.getConstructName = appScope.getConstructName.bind(this);
    this.getConfigValue = appScope.getConfigValue.bind(this);
    this.setConfigValue = appScope.setConfigValue.bind(this);
    this.getSecretValue = appScope.getSecretValue.bind(this);
    this.createScopedId = appScope.createScopedId.bind(appScope);
    this.getCfnPath = primer.getCfnPath.bind(this);
    this.createConstructSSMPath = primer.createConstructSSMPath.bind(this);
    this.createConstructCfnOutputPath = primer.createConstructCfnOutputPath.bind(this);
  }

  get stackId() {
    return this._stackId;
  }

  getConstructName(constructKey) {
    return this.constructs?.[constructKey]?.name;
  }

  getConstructByKey(constructKey) {
    return this.constructs?.[constructKey] || null;
  }

  getStackIdByKey(constructKey) {
    return this.constructs?.[constructKey]?._stackId || null;
  }

  getStackConfigByKey(valueKey) {
    return this.config?.[valueKey] || null;
  }

  getConstructName(constructKey) {
    return this.constants?.constructs?.[constructKey]?.name || constructKey;
  }

  setStackRef(stack) {
    this.stackRef = stack;
  }

  exportToSSM(scope, key, value, description = null) {
    if (!this.exports[key]) {
      this.exports[key] = {
        key: key,
      };
    }
    let ssmPath = this.createConstructSSMPath(key);
    setSSMParameter(scope, ssmPath, value, description);
    this.exports[key].ssmPath = ssmPath;
    logger.debug(`Exported ${key} to SSM path ${ssmPath}`);
  }

  exportToCfnOutput(scope, key, value, description = null) {
    if (!this.exports[key]) {
      this.exports[key] = {
        key: key,
      };
    }
    let cfnPath = this.createConstructCfnOutputPath(key);
    new CfnOutput(scope, `${this.stackId}-${key}-CfnOutput`, {
      value: value,
      exportName: cfnPath,
      description: description || `Cfn Output for ${key} in stack ${this.stackId}`
    });
    this.exports[key].cfnPath = cfnPath;
    logger.debug(`Exported ${key} to CloudFormation Output ${cfnPath}`);
  }

  exportReference(scope, key, value, description = null) {
    this.exportToSSM(scope, key, value, description);
    this.exportToCfnOutput(scope, key, value, description);
  }

  getExportSSMPath(key) {
    return this.exports?.[key]?.ssmPath || null;
  }

  resolveReference(scope, key) {
    const value = ssm.StringParameter.valueForStringParameter(scope, key);
    // Add trigger tag - changes to the parameter can trigger redeploys of consumer stacks.
    this.addTriggerTag(scope, key, value);
    return value;
  }

  // Provide a way to add a tag that triggers redeploys when SSM values change
  // This tagger creates a no-op custom resource that depends on the SSM parameter value.
  addTriggerTag(scope, tagKey, tagValue) {
    const uniqueTagKey = `${tagKey}-${this.getDeploymentName()}`;
    const provider = new Provider(scope, `${uniqueTagKey}-NoOpProvider`, {
      onEventHandler: new lambda.Function(scope, `${uniqueTagKey}-NoOpFunction`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`exports.handler = async () => ({})`)
      })
    });

    new CustomResource(scope, `${uniqueTagKey}-NoOpResource`, {
      serviceToken: provider.serviceToken,
      properties: {
        TriggerValue: tagValue
      }
    });
  }

}

module.exports = {
  BaseStack,
};