#!/bin/bash
set -e

# Sandbox Setup Script for reserve-rec-admin
# Creates isolated SSM configs and secrets for sandbox environments

SANDBOX_NAME="${1:?Usage: ./sandbox-setup.sh <sandbox-name> [base-env]}"
BASE_ENV="${2:-dev}"
DEPLOYMENT_NAME="${BASE_ENV}-${SANDBOX_NAME}"
APP_NAME="reserveRecAdmin"
REGION="ca-central-1"

echo "========================================="
echo "Setting up sandbox: ${DEPLOYMENT_NAME}"
echo "Base environment: ${BASE_ENV}"
echo "========================================="
echo ""

# Define stacks that need config (admin only has distributionStack)
STACKS=(
  "distributionStack"
)

echo "Step 1: Copying SSM config parameters..."
echo "----------------------------------------"

for STACK in "${STACKS[@]}"; do
  SOURCE_PATH="/${APP_NAME}/${BASE_ENV}/${STACK}/config"
  TARGET_PATH="/${APP_NAME}/${DEPLOYMENT_NAME}/${STACK}/config"
  
  echo "  ${STACK}: ${SOURCE_PATH} -> ${TARGET_PATH}"
  
  CONFIG=$(aws ssm get-parameter --region ${REGION} --name "${SOURCE_PATH}" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
  
  if [ -n "${CONFIG}" ]; then
    aws ssm put-parameter --region ${REGION} \
      --name "${TARGET_PATH}" \
      --type String \
      --value "${CONFIG}" \
      --overwrite \
      --description "Sandbox config for ${SANDBOX_NAME}" >/dev/null
    echo "    ✓ Copied"
  else
    echo "    ⚠ WARNING: Source config not found, skipping"
  fi
done

echo ""
echo "Step 2: Copying Secrets Manager secrets..."
echo "-------------------------------------------"

# Define secrets needed (CloudFront header secret)
SOURCE_PATH="/${APP_NAME}/${BASE_ENV}/distributionStack/cloudFrontSecretHeaderValue"
TARGET_PATH="/${APP_NAME}/${DEPLOYMENT_NAME}/distributionStack/cloudFrontSecretHeaderValue"

echo "  CloudFront Secret Header"
SECRET_VALUE=$(aws secretsmanager get-secret-value --region ${REGION} \
  --secret-id "${SOURCE_PATH}" --query 'SecretString' --output text 2>/dev/null || echo "")

if [ -n "${SECRET_VALUE}" ]; then
  aws secretsmanager create-secret --region ${REGION} \
    --name "${TARGET_PATH}" \
    --description "Sandbox CloudFront secret for ${SANDBOX_NAME}" \
    --secret-string "${SECRET_VALUE}" >/dev/null 2>&1 || \
  aws secretsmanager put-secret-value --region ${REGION} \
    --secret-id "${TARGET_PATH}" \
    --secret-string "${SECRET_VALUE}" >/dev/null
  echo "    ✓ Copied"
else
  echo "    ⚠ WARNING: Source secret not found, skipping"
fi

echo ""
echo "========================================="
echo "Sandbox setup complete: ${DEPLOYMENT_NAME}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Deploy sandbox:"
echo "     SANDBOX_NAME=${SANDBOX_NAME} yarn sandbox:deploy"
echo ""
echo "  2. When done, tear down:"
echo "     ./scripts/sandbox-teardown.sh ${SANDBOX_NAME}"
echo ""
