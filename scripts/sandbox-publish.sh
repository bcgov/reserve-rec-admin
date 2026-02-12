#!/usr/bin/env bash
set -e

# sandbox-publish.sh for reserve-rec-admin
# Complete deployment workflow: wire -> deploy infrastructure -> build -> upload -> invalidate cache
#
# Usage: SANDBOX_NAME=<name> ./scripts/sandbox-publish.sh
#    or: ./scripts/sandbox-publish.sh <sandbox-name>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Get sandbox name from argument or environment variable
SANDBOX_NAME="${1:-$SANDBOX_NAME}"
if [ -z "${SANDBOX_NAME}" ]; then
  echo "ERROR: SANDBOX_NAME is required"
  echo ""
  echo "Usage: SANDBOX_NAME=<name> ./scripts/sandbox-publish.sh"
  echo "   or: ./scripts/sandbox-publish.sh <sandbox-name>"
  exit 1
fi

BASE_ENV="${2:-dev}"
DEPLOYMENT_NAME="${BASE_ENV}-${SANDBOX_NAME}"
REGION="${AWS_REGION:-ca-central-1}"
APP_NAME="reserve-rec-admin"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           SANDBOX PUBLISH - ${APP_NAME}                  ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Sandbox:    ${DEPLOYMENT_NAME}"
echo "║  Region:     ${REGION}"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd "$PROJECT_DIR"

# ============================================================================
# STEP 1: Wire to sandbox API
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1/5: Wiring to sandbox API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash ./scripts/sandbox-wire.sh "${SANDBOX_NAME}" "${BASE_ENV}"
echo ""

# ============================================================================
# STEP 2: Deploy CDK infrastructure
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2/5: Deploying CDK infrastructure..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx cdk deploy -c @context=dev -c sandboxName="${SANDBOX_NAME}" --all --require-approval never
echo ""

# ============================================================================
# STEP 3: Build Angular application
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3/5: Building Angular application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Generate env.js from template with configEndpoint = true
# This makes the app fetch config from the API instead of using hardcoded localhost values
echo "  Generating env.js from template..."
GH_HASH="${GH_HASH:-sandbox-$(date +%Y%m%d%H%M%S)}"
sed 's@localConfigEndpoint@'true'@g' src/env.js.template | sed 's@localGHHash@'"$GH_HASH"'@g' > src/env.js
echo "  Generated env.js with configEndpoint=true, GH_HASH=${GH_HASH}"

yarn build
echo ""

# ============================================================================
# STEP 4: Upload to S3
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4/5: Uploading to S3..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Construct bucket name (CDK uses lowercase stack name)
BUCKET_NAME="reserverecadmin-${BASE_ENV}-${SANDBOX_NAME}-distributionstack-distbucket"
S3_PATH="s3://${BUCKET_NAME}/latest/${APP_NAME}/browser"

echo "  Bucket: ${BUCKET_NAME}"
echo "  Path:   ${S3_PATH}"
echo ""

# Check if dist folder exists
if [ ! -d "dist/${APP_NAME}/browser" ]; then
  echo "ERROR: Build output not found at dist/${APP_NAME}/browser"
  echo "The build may have failed or output to a different location."
  exit 1
fi

# Sync to S3
aws s3 sync "dist/${APP_NAME}/browser" "${S3_PATH}" \
  --region "${REGION}" \
  --delete

echo "  Upload complete!"
echo ""

# ============================================================================
# STEP 5: Invalidate CloudFront cache
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5/5: Invalidating CloudFront cache..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get distribution ID from SSM
DISTRIBUTION_ID=$(aws ssm get-parameter \
  --region "${REGION}" \
  --name "/reserveRecAdmin/${DEPLOYMENT_NAME}/distributionStack/distributionId" \
  --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -z "${DISTRIBUTION_ID}" ]; then
  echo "WARNING: Could not find CloudFront distribution ID in SSM"
  echo "Skipping cache invalidation. You may need to invalidate manually."
else
  echo "  Distribution ID: ${DISTRIBUTION_ID}"
  
  # Create invalidation
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' --output text)
  
  echo "  Invalidation ID: ${INVALIDATION_ID}"
  echo "  Waiting for invalidation to complete..."
  
  # Wait for invalidation to complete
  aws cloudfront wait invalidation-completed \
    --distribution-id "${DISTRIBUTION_ID}" \
    --id "${INVALIDATION_ID}"
  
  echo "  Cache invalidation complete!"
fi

echo ""

# ============================================================================
# DONE
# ============================================================================
# Get the CloudFront domain
CLOUDFRONT_DOMAIN=$(aws ssm get-parameter \
  --region "${REGION}" \
  --name "/reserveRecAdmin/${DEPLOYMENT_NAME}/distributionStack/distributionDomainName" \
  --query 'Parameter.Value' --output text 2>/dev/null || echo "unknown")

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    PUBLISH COMPLETE!                          ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Admin URL: https://${CLOUDFRONT_DOMAIN}"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
