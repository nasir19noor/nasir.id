import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["USERS_TABLE"])


def _claims(event):
    # The JWT authorizer validates the token at the gateway and passes
    # the verified claims through here. We trust these, never a client body.
    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )


def handler(event, context):
    claims = _claims(event)
    user_id = claims.get("sub")
    email = claims.get("email", "")

    if not user_id:
        return _response(401, {"message": "Unauthorized"})

    try:
        result = table.get_item(Key={"userId": user_id})
    except Exception as e:
        print(f"DynamoDB error: {e}")
        return _response(500, {"message": "Internal error"})

    item = result.get("Item")
    fallback_name = email.split("@")[0] if email else user_id[:8]

    if item is None:
        # First-time user — hand back an empty profile instead of a 404,
        # so the dashboard renders zeros rather than erroring.
        profile = {
            "username": fallback_name,
            "streak": 0,
            "totalGames": 0,
            "bestScores": {},
        }
    else:
        profile = {
            "username": item.get("username", fallback_name),
            "streak": int(item.get("streak", 0)),
            "totalGames": int(item.get("totalGames", 0)),
            # DynamoDB returns numbers as Decimal, which json can't serialize
            "bestScores": {k: int(v) for k, v in item.get("bestScores", {}).items()},
        }

    return _response(200, profile)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }