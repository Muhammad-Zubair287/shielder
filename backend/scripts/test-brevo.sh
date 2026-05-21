#!/usr/bin/env bash
set -euo pipefail

# Simple Brevo REST API test script.
# Usage:
#   BREVO_API_KEY=your_key ./scripts/test-brevo.sh recipient@example.com
# If BREVO_API_KEY is not provided via env, the script will look at first arg as the key.

BREVO_API_KEY=${BREVO_API_KEY:-}
TO=${1:-}
FROM=${EMAIL_FROM_ADDRESS:-no-reply@shielder.digital}

if [ -z "$BREVO_API_KEY" ]; then
  echo "BREVO_API_KEY is empty. Set it in env or export before running."
  echo "Usage: BREVO_API_KEY=key ./scripts/test-brevo.sh recipient@example.com"
  exit 1
fi

if [ -z "$TO" ]; then
  echo "Recipient email missing. Usage: BREVO_API_KEY=key ./scripts/test-brevo.sh recipient@example.com"
  exit 1
fi

echo "Sending test email FROM: $FROM TO: $TO via Brevo REST API..."

PAYLOAD=$(cat <<JSON
{
  "sender": { "name": "Shielder Test", "email": "${FROM}" },
  "to": [ { "email": "${TO}" } ],
  "subject": "Brevo API Delivery Test",
  "htmlContent": "<p>This is a test email from Shielder (Brevo REST API).</p>",
  "textContent": "This is a test email from Shielder (Brevo REST API)."
}
JSON
)

HTTP=$(curl -s -o /tmp/brevo_response.txt -w "%{http_code}" \
  -X POST https://api.brevo.com/v3/smtp/email \
  -H "api-key: ${BREVO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "HTTP status: $HTTP"
echo "Response body:" 
cat /tmp/brevo_response.txt

if [ "$HTTP" -ge 200 ] && [ "$HTTP" -lt 300 ]; then
  echo "✅ Brevo REST API accepted the request."
  exit 0
else
  echo "❌ Brevo REST API returned non-2xx status: $HTTP"
  exit 2
fi
