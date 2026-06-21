# src/lambda_function.py
import json
import os
import secrets
import string

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])
BASE_URL = os.environ.get("BASE_URL", "")

ALPHABET = string.ascii_letters + string.digits  # base62
CODE_LENGTH = 7


def _response(status, body=None, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    return {"statusCode": status, "headers": h,
            "body": json.dumps(body) if body is not None else ""}


def create_short_url(event):
    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON body"})

    long_url = payload.get("url")
    if not long_url:
        return _response(400, {"error": "Missing 'url' field"})

    for _ in range(5):  # retry on the rare collision
        code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
        try:
            table.put_item(
                Item={"shortCode": code, "longUrl": long_url},
                ConditionExpression="attribute_not_exists(shortCode)",
            )
            return _response(201, {
                "shortCode": code,
                "shortUrl": f"{BASE_URL}/{code}" if BASE_URL else code,
                "longUrl": long_url,
            })
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                continue
            raise
    return _response(500, {"error": "Could not generate a unique code"})


def redirect(event):
    code = (event.get("pathParameters") or {}).get("code")
    if not code:
        return _response(400, {"error": "Missing short code"})

    item = table.get_item(Key={"shortCode": code}).get("Item")
    if not item:
        return _response(404, {"error": "Short code not found"})

    return _response(301, headers={"Location": item["longUrl"]})


def lambda_handler(event, context):
    method = event.get("httpMethod", "")
    if method == "POST":
        return create_short_url(event)
    if method == "GET":
        return redirect(event)
    return _response(405, {"error": "Method not allowed"})