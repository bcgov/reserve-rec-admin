const { logger, StackPrimer, resolveParameterFromSSM } = require("../helpers/utils");
const { BaseStack } = require('../helpers/base-stack');
const { RemovalPolicy } = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');
const { Key } = require('aws-cdk-lib/aws-kms');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const { Duration, Fn } = require('aws-cdk-lib');

const defaults = {
  config: {
    logLevel: process.env.LOG_LEVEL || 'info',
    distBucketRemovalPolicyDestroy: true,
    encryptionKeySSMPath: '',
    adminApiUrlSSMPath: '',
    kmsKeyAlias: null,
    kmsKeyRemovalPolicyDestroy: true,
  },
  constructs: {
    distBucket: {
      name: 'DistBucket',
    },
    logBucket: {
      name: 'LogBucket',
    },
    encryptionKey: {
      name: 'EncryptionKey',
    },
    cloudFrontS3OAC: {
      name: 'CloudFrontS3OAC',
    },
    cloudFrontCachePolicy: {
      name: 'CloudFrontCachePolicy',
    },
    adminDistribution: {
      name: 'AdminDistribution',
    },
    kmsKey: {
      name: 'KmsKey',
    }
  },
  secrets: {
    cloudFrontSecretHeaderValue: {
      name: 'cloudFrontSecretHeaderValue',
    }
  }
};

async function createDistributionStack(scope, stackKey) {
  try {
    const primer = new StackPrimer(scope, stackKey, defaults);
    await primer.prime();
    return new DistributionStack(scope, primer);
  } catch (error) {
    throw new Error(`Error creating Distribution Stack: ${error}`);
  }
}

class DistributionStack extends BaseStack {
  constructor(scope, primer) {
    super(scope, primer, defaults);

    logger.info(`Creating Distribution Stack: ${this.stackId}`);

    // Get Admin API URL from SSM
    try {
      logger.debug('Retrieving Admin API URL from SSM');
      this.adminApiUrl = resolveParameterFromSSM(this, this.getConfigValue('adminApiUrlSSMPath'));
      this.adminApiDomain = Fn.select(2, Fn.split('/', this.adminApiUrl)); // Extract domain from URL
      if (!this.adminApiDomain) {
        throw new Error('Admin API Domain could not be extracted from URL');
      }
      if (!this.adminApiUrl) {
        throw new Error('Admin API URL not found in SSM');
      }
    } catch (error) {
      throw new Error(`Error retrieving Admin API URL from SSM: ${error}`);
    }

    // Create KMS Key
    if (this.getConfigValue('kmsKeyAlias')) {
      // A key already exists and we are just importing it.
      this.kmsKey = Key.fromLookup(this, this.getConstructId('kmsKey'), {
        aliasName: this.getConfigValue('kmsKeyAlias')  // Should be like 'alias/my-key'
      });
    } else {
      // Create a new key
      this.kmsKey = new Key(this, this.getConstructId('kmsKey'), {
        enableKeyRotation: true,
        alias: this.getConstructId('kmsKey'),
        description: `KMS Key for ${this.stackId}`,
        removalPolicy: this.getConfigValue('kmsKeyRemovalPolicyDestroy') === 'true' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      });
    }

    // Define S3 Distribution Bucket
    this.distBucket = new s3.Bucket(this, this.getConstructId('distBucket'), {
      bucketName: this.getConstructId('distBucket').toLowerCase(),
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_PREFERRED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      encryptionKey: this.kmsKey,
      removalPolicy: this.getConfigValue('distBucketRemovalPolicyDestroy') === 'true' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: true,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE
          ],
          allowedHeaders: ['*'],
          maxAge: 3000,
        }
      ]
    });

    // Define S3 Log Bucket
    this.logBucket = new s3.Bucket(this, this.getConstructId('logBucket'), {
      bucketName: `${this.getConstructId('logBucket').toLowerCase()}-logs`,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_PREFERRED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
    });

    // OAC
    this.originAccessControl = new cloudfront.S3OriginAccessControl(this, this.getConstructId('cloudFrontS3OAC'), {
      description: 'Origin Access Policy'
    });

    // TODO: review if cache policy settings are appropriate. Because of fine-grained authorization, caching may need to remain disabled.
    // Cache Policy for CloudFront
    // this.cachePolicy = new cloudfront.CachePolicy(this, this.getConstructId('cloudFrontCachePolicy'), {
    //   cachePolicyName: this.getConstructId('cloudFrontCachePolicy'),
    //   comment: 'Cache policy for CloudFront distribution',
    //   headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization'),
    //   queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    //   cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    //   defaultTtl: Duration.minutes(0),
    //   maxTtl: Duration.minutes(0),
    //   minTtl: Duration.minutes(0),
    //   enableAcceptEncodingBrotli: true,
    //   enableAcceptEncodingGzip: true,
    // });

    // CloudFront Distribution
    this.adminDistribution = new cloudfront.Distribution(this, this.getConstructId('adminDistribution'), {
      distributionName: this.getConstructId('adminDistribution'),
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.distBucket, {
          originPath: 'latest/reserve-rec-admin/browser',
          originAccessControl: this.originAccessControl,
          customHeaders: {
            'X-CloudFront-Secret': this.getSecretValue('cloudFrontSecretHeaderValue'),
          }
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,

      },
      comment: `Reserve Rec Admin CloudFront Distribution (${this.getDeploymentName()})`,
      compress: true,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(this.adminApiDomain, {
            originPath: '',
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
          }),
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_AND_SECURITY_HEADERS,
        },
      },
      /**
           * Belarus, Central African Republic, China, Democratic Republic of the Congo, Iran, Iraq, Democratic
           * People's Republic of Korea, Lebanon, Libya, Mali, Myanmar, Nicaragua, Russia, Somalia, South Sudan,
           * Sudan, Syria, Ukraine, Venezuela, Yemen, Zimbabwe
           */
      geoRestriction: cloudfront.GeoRestriction.blacklist(
        'BY', 'CF', 'CN', 'CD', 'IR', 'IQ', 'KP', 'LB', 'LY', 'ML', 'MM', 'NI', 'RU', 'SO', 'SS', 'SD', 'SY', 'UA', 'VE', 'YE', 'ZW'
      ),
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
      ],
      defaultRootObject: 'index.html',
      logBucket: this.logBucket,
      logIncludesCookies: false,
    });
  }
}

module.exports = {
  createDistributionStack
};