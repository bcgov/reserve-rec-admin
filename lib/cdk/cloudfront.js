/**
 * Builds the CloudFront resources for the Reserve Rec ADMIN stack.
 */

const s3 = require('aws-cdk-lib/aws-s3');
const iam = require('aws-cdk-lib/aws-iam');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const { PolicyStatement } = require('aws-cdk-lib/aws-iam');

const CLOUDFRONT_CERTIFICATE_ARN = 'arn:aws:acm:ca-central-1:637423314715:certificate/b6db5428-4b0c-4f03-8f54-815901e79977';

function cloudFrontSetup(scope, props) {
  console.log('Setting up CloudFront resources...');

  // Origin Access Identity
  const reserveRecOAC = new cloudfront.S3OriginAccessControl(scope, 'ReserveRecOAC', {
    description: 'Reserve Rec Origin Access Control (CDK)',
  });

  // API Origin Name
  // TODO: Add API Origin Name to env vars - update to have vanity domain
  // const apiOriginName = `${props.api.restApiId.restApiId}.execute-api.${props.env.region}.amazonaws.com`;
  // console.log('apiOriginNAme:', props.api.url);

  // CloudFront DISTRIBUTION

  const reserveRecAdminDistribution = new cloudfront.Distribution(scope, 'ReserveRecAdminDistribution', {
    enabled: true,
    httpVersion: cloudfront.HttpVersion.HTTP2,
    defaultBehavior: {
      origin: origins.S3BucketOrigin.withOriginAccessControl(props.reserveRecAdminDistBucket, {
        originPath: 'latest/reserve-rec-admin/browser',
        originAccessControl: reserveRecOAC,
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      responseHeadersPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    },
    comment: 'Reserve Rec Admin Distribution (CDK)',
    compress: true,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    additionalBehaviors: {
      'api/*': {
        origin: new origins.RestApiOrigin(props.api),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      },
      // '/*': {
      //   origin: new origins.S3StaticWebsiteOrigin(props.reserveRecAdminDistBucket, {
      //     originPath: 'latest/reserve-rec-admin/browser',
      //   }),
      //   compress: true,
      //   allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      //   cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      //   viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      //   responseHeadersPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      // }
    },
    // TODO: Add ACM Cert
    // certificate: acm.Certificate.fromCertificateArn(scope, 'ReserveRecAdminCertificate', CLOUDFRONT_CERTIFICATE_ARN),
    /**
     * Belarus, Central African Republic, China, Democratic Republic of the Congo, Iran, Iraq, Democratic
     * People's Republic of Korea, Lebanon, Libya, Mali, Myanmar, Nicaragua, Russia, Somalia, South Sudan,
     * Sudan, Syria, Ukraine, Venezuela, Yemen, Zimbabwe
     */
    geoRestriction: cloudfront.GeoRestriction.blacklist(
      'BY', 'CF', 'CN', 'CD', 'IR', 'IQ', 'KP', 'LB', 'LY', 'ML', 'MM', 'NI', 'RU', 'SO', 'SS', 'SD', 'SY', 'UA', 'VE', 'YE', 'ZW'
    ),
    defaultRootObject: 'index.html',
    errorResponses: [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      },
    ],
    logBucket: props.reserveRecAdminLogBucket,
    logIncludesCookies: false,
  });

  // S3 BUCKET POLICIES
  // for (const bucket of [props.reserveRecAdminDistBucket, props.reserveRecAdminLogBucket]) {
  //   bucket.addToResourcePolicy(new PolicyStatement({
  //     actions: ['s3:GetObject'],
  //     resources: [`${bucket.bucketArn}/*`],
  //     effects: [iam.Effect.ALLOW],
  //     // TODO: Reduce principals scope
  //     principals: [new iam.AnyPrincipal()],
  //   }));
  // }

  return {
    reserveRecAdminDistribution: reserveRecAdminDistribution,
  };
}

module.exports = {
  cloudFrontSetup
};