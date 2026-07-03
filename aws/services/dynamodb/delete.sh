#!/bin/bash
TABLE=shortener-dynamodb
REGION=ap-southeast-1

KEYS=$(aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" \
  --query "Table.KeySchema[].AttributeName" --output text | tr '\t' ',')

aws dynamodb scan --table-name "$TABLE" --region "$REGION" \
  --projection-expression "$KEYS" --output json |
jq -c '.Items[]' |
while read -r item; do
  aws dynamodb delete-item --table-name "$TABLE" --region "$REGION" --key "$item"
done