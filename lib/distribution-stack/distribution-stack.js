const { logger, StackPrimer, resolveParameterFromSSM } = require("../helpers/utils");
const { BaseStack } = require('../helpers/base-stack');
const { RemovalPolicy } = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');
const iam = require('aws-cdk-lib/aws-iam');
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

    // Grant CloudFront permission to decrypt KMS-encrypted S3 objects.
    // Without this, CloudFront OAC can authenticate to S3 (via the bucket policy) but
    // cannot decrypt the object bytes — S3 returns 403 AccessDenied at the KMS layer.
    // Uses the same wildcard distribution ARN pattern as the bucket policy below to avoid
    // a circular dependency (the distribution ARN is not available at bucket-creation time).
    this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowCloudFrontKMSDecrypt',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['kms:Decrypt'],
      resources: ['*'],
      conditions: {
        StringLike: {
          'aws:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`,
        },
      },
    }));

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

    // Manually add OAC bucket policy statement using a wildcard distribution ARN.
    //
    // Why: when S3BucketOrigin.withOriginAccessControl() is used with a concrete bucket,
    // CDK auto-generates an AWS::S3::BucketPolicy statement whose condition references the
    // specific distribution ARN (Ref: 'AdminDistribution'). This creates a circular dependency:
    // the bucket policy can only be created AFTER the distribution, which takes ~3 minutes.
    // In the BCGov LZA (Landing Zone Accelerator) environment, LZA automatically adds its own
    // SSL-enforcement bucket policy within ~10 seconds of bucket creation. By the time CDK's
    // bucket policy is ready to be created, LZA has already set the policy, and CloudFormation
    // fails with "The bucket policy already exists."
    //
    // Fix: add the OAC statement immediately after bucket creation using StringLike with a
    // wildcard distribution ARN (`arn:aws:cloudfront::${account}:distribution/*`). This only
    // depends on AWS::AccountId (a pseudo-parameter available immediately), not on the
    // distribution resource, so the bucket policy can be created in the same early wave as the
    // bucket itself — before LZA fires.
    //
    // The CloudFront origin uses an imported bucket reference (below) so CDK does not add the
    // auto-generated specific-ARN statement that would re-introduce the circular dependency.
    this.distBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowCloudFrontOACRead',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [this.distBucket.arnForObjects('*')],
      conditions: {
        StringLike: {
          'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`,
        },
      },
    }));

    // Imported bucket reference used as the CloudFront S3 origin.
    // CDK cannot add bucket policies to imported buckets (logs a warning and skips), which is
    // intentional here — it prevents CDK from generating a second, specific-ARN OAC statement
    // that would reintroduce the circular dependency. The actual distBucket uses the
    // wildcard OAC statement added above.
    const distBucketForOrigin = s3.Bucket.fromBucketAttributes(this, 'DistBucketForOrigin', {
      bucketArn: this.distBucket.bucketArn,
      bucketName: this.distBucket.bucketName,
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
        origin: origins.S3BucketOrigin.withOriginAccessControl(distBucketForOrigin, {
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
        // Only handle 404 for client-side routing (Angular app)
        // Do NOT handle 403 to allow API authentication errors to pass through
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

    // Export References

    this.exportReference(this, 'distributionId', this.adminDistribution.distributionId, `ID of the Admin CloudFront Distribution in ${this.stackId}`);

    this.exportReference(this, 'distributionDomainName', this.adminDistribution.domainName, `Domain name of the Admin CloudFront Distribution in ${this.stackId}`);

  }
}

module.exports = {
  createDistributionStack
};