#!/bin/bash

# NotWhat HLS Staging Deployment Verification Script
# Run this to verify AWS setup and backend readiness before deploying

set -e

echo "🔍 NotWhat HLS Deployment Verification"
echo "======================================"
echo ""

BACKEND_DIR="/Users/vedant.tiwari/Downloads/NotWhat-ios-main/backend"
SUCCESS_COUNT=0
FAIL_COUNT=0

# Helper functions
check_pass() {
  echo "  ✅ $1"
  ((SUCCESS_COUNT++))
}

check_fail() {
  echo "  ❌ $1"
  ((FAIL_COUNT++))
}

check_warning() {
  echo "  ⚠️  $1"
}

# Check 1: Node.js version
echo "📌 Checking Node.js..."
NODE_VERSION=$(node -v | grep -oE 'v[0-9]+' | sed 's/v//')
if [ "$NODE_VERSION" -ge 16 ]; then
  check_pass "Node.js version: $(node -v)"
else
  check_fail "Node.js version too old: $(node -v) (require v16+)"
fi
echo ""

# Check 2: Backend directory
echo "📌 Checking backend directory..."
if [ -d "$BACKEND_DIR" ]; then
  check_pass "Backend directory exists: $BACKEND_DIR"
else
  check_fail "Backend directory not found: $BACKEND_DIR"
  exit 1
fi
echo ""

# Check 3: Environment file
echo "📌 Checking .env file..."
if [ -f "$BACKEND_DIR/.env" ]; then
  check_pass ".env file exists"
  
  # Check required variables
  if grep -q "ENABLE_HLS_TRANSCODING=" "$BACKEND_DIR/.env"; then
    HLS_ENABLED=$(grep "ENABLE_HLS_TRANSCODING=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
    if [ "$HLS_ENABLED" = "true" ]; then
      check_pass "ENABLE_HLS_TRANSCODING=true"
    else
      check_warning "ENABLE_HLS_TRANSCODING=$HLS_ENABLED (should be 'true' for staging)"
    fi
  else
    check_fail "ENABLE_HLS_TRANSCODING not found in .env"
  fi
  
  if grep -q "AWS_ACCOUNT_ID=" "$BACKEND_DIR/.env"; then
    AWS_ACCOUNT=$(grep "AWS_ACCOUNT_ID=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
    if [ -z "$AWS_ACCOUNT" ] || [ "$AWS_ACCOUNT" = "123456789012" ]; then
      check_fail "AWS_ACCOUNT_ID not set or default (got: '$AWS_ACCOUNT')"
    else
      check_pass "AWS_ACCOUNT_ID set: $AWS_ACCOUNT"
    fi
  else
    check_fail "AWS_ACCOUNT_ID not found in .env"
  fi
  
  if grep -q "AWS_MEDIACONVERT_ROLE_ARN=" "$BACKEND_DIR/.env"; then
    ROLE_ARN=$(grep "AWS_MEDIACONVERT_ROLE_ARN=" "$BACKEND_DIR/.env" | cut -d'=' -f2 | head -c 50)
    if [ -n "$ROLE_ARN" ] && [ "$ROLE_ARN" != "arn:aws:iam::ACCOUNT_ID" ]; then
      check_pass "AWS_MEDIACONVERT_ROLE_ARN configured"
    else
      check_fail "AWS_MEDIACONVERT_ROLE_ARN not configured properly"
    fi
  else
    check_fail "AWS_MEDIACONVERT_ROLE_ARN not found in .env"
  fi
  
  if grep -q "AWS_S3_BUCKET=" "$BACKEND_DIR/.env"; then
    S3_BUCKET=$(grep "AWS_S3_BUCKET=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
    if [ -n "$S3_BUCKET" ] && [ "$S3_BUCKET" != "notwhat-bucket--use2-az2--x-s3" ]; then
      check_warning "S3 bucket set to: $S3_BUCKET (if not staging, verify this is correct)"
    else
      check_pass "AWS S3 bucket configured"
    fi
  fi
else
  check_fail ".env file not found at $BACKEND_DIR/.env"
fi
echo ""

# Check 4: AWS credentials
echo "📌 Checking AWS credentials..."
if grep -q "^AWS_ACCESS_KEY_ID=" "$BACKEND_DIR/.env"; then
  AWS_KEY=$(grep "^AWS_ACCESS_KEY_ID=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
  if [ -z "$AWS_KEY" ]; then
    check_fail "AWS_ACCESS_KEY_ID is empty"
  elif [ ${#AWS_KEY} -lt 10 ]; then
    check_fail "AWS_ACCESS_KEY_ID appears invalid (too short)"
  else
    check_pass "AWS_ACCESS_KEY_ID is set"
  fi
else
  check_fail "AWS_ACCESS_KEY_ID not found"
fi

if grep -q "^AWS_SECRET_ACCESS_KEY=" "$BACKEND_DIR/.env"; then
  AWS_SECRET=$(grep "^AWS_SECRET_ACCESS_KEY=" "$BACKEND_DIR/.env" | cut -d'=' -f2 | head -c 10)
  if [ -z "$AWS_SECRET" ]; then
    check_fail "AWS_SECRET_ACCESS_KEY is empty"
  else
    check_pass "AWS_SECRET_ACCESS_KEY is set"
  fi
else
  check_fail "AWS_SECRET_ACCESS_KEY not found"
fi
echo ""

# Check 5: Dependencies
echo "📌 Checking npm dependencies..."
cd "$BACKEND_DIR"

if npm list sharp >/dev/null 2>&1; then
  SHARP_VERSION=$(npm list sharp 2>/dev/null | grep sharp | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  check_pass "sharp installed (v$SHARP_VERSION)"
else
  check_fail "sharp not installed (run: npm install sharp)"
fi

if npm list @aws-sdk/client-mediaconvert >/dev/null 2>&1; then
  check_pass "@aws-sdk/client-mediaconvert installed"
else
  check_fail "@aws-sdk/client-mediaconvert not installed (run: npm install @aws-sdk/client-mediaconvert)"
fi

if npm list @aws-sdk/s3-request-presigner >/dev/null 2>&1; then
  check_pass "@aws-sdk/s3-request-presigner installed"
else
  check_fail "@aws-sdk/s3-request-presigner not installed (run: npm install @aws-sdk/s3-request-presigner)"
fi
echo ""

# Check 6: Implementation files
echo "📌 Checking implementation files..."
IMPL_FILES=(
  "src/utils/mediaTranscoding.js"
  "src/utils/imageOptimization.js"
  "src/modules/uploads/mediaTranscoding.model.js"
  "src/modules/uploads/uploadHLS.service.js"
  "src/modules/uploads/uploadHLS.controller.js"
  "src/modules/uploads/uploadHLS.routes.js"
  "src/modules/webhooks/mediaconvert.webhook.js"
  "src/modules/webhooks/webhook.routes.js"
)

for file in "${IMPL_FILES[@]}"; do
  if [ -f "$BACKEND_DIR/$file" ]; then
    check_pass "$file exists"
  else
    check_fail "$file missing"
  fi
done
echo ""

# Check 7: Routes integration
echo "📌 Checking routes integration..."
if grep -q "uploadHLSRoutes" "$BACKEND_DIR/src/routes/index.js"; then
  check_pass "uploadHLSRoutes imported in routes/index.js"
else
  check_fail "uploadHLSRoutes not imported in routes/index.js"
fi

if grep -q "webhookRoutes" "$BACKEND_DIR/src/routes/index.js"; then
  check_pass "webhookRoutes imported in routes/index.js"
else
  check_fail "webhookRoutes not imported in routes/index.js"
fi
echo ""

# Check 8: Syntax validation
echo "📌 Checking JavaScript syntax..."
SYNTAX_OK=true
for file in "${IMPL_FILES[@]}"; do
  if ! node -c "$BACKEND_DIR/$file" 2>/dev/null; then
    check_fail "Syntax error in $file"
    SYNTAX_OK=false
  fi
done

if [ "$SYNTAX_OK" = true ]; then
  check_pass "All implementation files have valid syntax"
fi
echo ""

# Check 9: MongoDB (optional check)
echo "📌 Checking MongoDB (optional)..."
if mongosh --eval "db.version()" >/dev/null 2>&1; then
  check_pass "MongoDB is running"
else
  check_warning "MongoDB not running (needed for production, optional for initial setup)"
fi
echo ""

# Check 10: AWS CLI installed
echo "📌 Checking AWS CLI..."
if command -v aws &> /dev/null; then
  AWS_CLI_VERSION=$(aws --version | cut -d' ' -f1)
  check_pass "AWS CLI installed (v$AWS_CLI_VERSION)"
else
  check_warning "AWS CLI not installed (optional, for AWS verification steps)"
fi
echo ""

# Summary
echo "======================================"
echo "✅ PASSED: $SUCCESS_COUNT checks"
echo "❌ FAILED: $FAIL_COUNT checks"
echo "======================================"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo "⚠️  Fix the failures above before deploying to staging"
  exit 1
else
  echo "✅ All checks passed! Ready for staging deployment."
  echo ""
  echo "📋 Next steps:"
  echo "  1. If not done: Configure MediaConvert role in AWS"
  echo "     Follow: docs/AWS_MEDIACONVERT_SETUP.md (Phase 1-4)"
  echo ""
  echo "  2. Start local server:"
  echo "     npm run dev"
  echo ""
  echo "  3. Test locally (optional):"
  echo "     curl -X POST http://localhost:5001/api/uploads/product-images \\"
  echo "       -H 'Authorization: Bearer YOUR_JWT' \\"
  echo "       -F 'images=@test.jpg'"
  echo ""
  echo "  4. Deploy to staging:"
  echo "     git push origin main"
  echo "     (Deploy script runs on staging server)"
  echo ""
  exit 0
fi
