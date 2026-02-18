#!/bin/bash
set -e

# Sandbox Teardown Script for reserve-rec-admin

SANDBOX_NAME="${1:?Usage: ./sandbox-teardown.sh <sandbox-name> [base-env]}"
BASE_ENV="${2:-dev}"
DEPLOYMENT_NAME="${BASE_ENV}-${SANDBOX_NAME}"
APP_NAME="reserveRecAdmin"
REGION="ca-central-1"

echo "========================================="
echo "TEARING DOWN SANDBOX: ${DEPLOYMENT_NAME}"
echo "========================================="
echo ""
read -p "Are you sure? Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "Step 1: Destroying CDK stacks..."
echo "---------------------------------"
cdk destroy -c @context=${BASE_ENV} -c sandboxName=${SANDBOX_NAME} --all --force

echo ""
echo "Step 2: Deleting SSM parameters..."
echo "-----------------------------------"
PARAMS=$(aws ssm get-parameters-by-path --region ${REGION} \
  --path "/${APP_NAME}/${DEPLOYMENT_NAME}" \
  --recursive --query 'Parameters[].Name' --output text 2>/dev/null || echo "")

if [ -n "${PARAMS}" ]; then
  echo "${PARAMS}" | tr '\t' '\n' | while read param; do
    if [ -n "$param" ]; then
      echo "  Deleting: $param"
      aws ssm delete-parameter --region ${REGION} --name "$param" 2>/dev/null || true
    fi
  done
  echo "  ✓ SSM parameters deleted"
else
  echo "  No SSM parameters found"
fi

echo ""
echo "Step 3: Deleting Secrets Manager secrets..."
echo "---------------------------------------------"
SECRETS=$(aws secretsmanager list-secrets --region ${REGION} \
  --filter Key=name,Values="/${APP_NAME}/${DEPLOYMENT_NAME}" \
  --query 'SecretList[].Name' --output text 2>/dev/null || echo "")

if [ -n "${SECRETS}" ]; then
  echo "${SECRETS}" | tr '\t' '\n' | while read secret; do
    if [ -n "$secret" ]; then
      echo "  Deleting: $secret"
      aws secretsmanager delete-secret --region ${REGION} \
        --secret-id "$secret" --force-delete-without-recovery 2>/dev/null || true
    fi
  done
  echo "  ✓ Secrets deleted"
else
  echo "  No secrets found"
fi

echo ""
echo "========================================="
echo "Sandbox ${SANDBOX_NAME} fully destroyed!"
echo "========================================="
