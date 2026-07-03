import boto3

REGION = "ap-southeast-1"
TABLE_NAME = "shortener-dynamodb"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

# Get key schema automatically
key_names = [k["AttributeName"] for k in table.key_schema]

scan_kwargs = {"ProjectionExpression": ", ".join(key_names)}
deleted = 0

while True:
    response = table.scan(**scan_kwargs)
    items = response.get("Items", [])

    with table.batch_writer() as batch:
        for item in items:
            key = {k: item[k] for k in key_names}
            batch.delete_item(Key=key)
            deleted += 1

    print(f"Deleted so far: {deleted}")

    if "LastEvaluatedKey" in response:
        scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
    else:
        break

print(f"Done. Total deleted: {deleted}")