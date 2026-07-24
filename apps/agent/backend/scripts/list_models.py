"""Ask your own AWS account which Claude models are currently invocable.

    python scripts/list_models.py

Model IDs change as Anthropic releases new versions and retires old ones, so
this queries Bedrock live rather than relying on a hard-coded list.

In ap-southeast-1 most current Claude models are NOT invocable by their bare
model ID — you must use the cross-region inference profile (prefixed "apac.").
The INFERENCE PROFILES section below is usually the one you want.
"""
import sys
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

REGION = sys.argv[1] if len(sys.argv) > 1 else "ap-southeast-1"


def foundation_models(client):
    try:
        resp = client.list_foundation_models(byProvider="anthropic")
    except ClientError as e:
        print(f"  could not list models: {e.response['Error']['Message']}")
        return

    rows = []
    for m in resp.get("modelSummaries", []):
        status = m.get("modelLifecycle", {}).get("status", "?")
        modes = m.get("inferenceTypesSupported", [])
        rows.append((status, m["modelId"], ",".join(modes) or "-"))

    active = [r for r in rows if r[0] == "ACTIVE"]
    legacy = [r for r in rows if r[0] != "ACTIVE"]

    print(f"\n  ACTIVE ({len(active)})")
    for status, mid, modes in sorted(active, key=lambda r: r[1]):
        on_demand = "ON_DEMAND" in modes
        flag = "" if on_demand else "   <- needs an inference profile"
        print(f"    {mid}{flag}")

    if legacy:
        print(f"\n  LEGACY / not usable ({len(legacy)})")
        for status, mid, _ in sorted(legacy, key=lambda r: r[1]):
            print(f"    {mid}  [{status}]")


def inference_profiles(client):
    try:
        resp = client.list_inference_profiles(maxResults=100)
    except ClientError as e:
        print(f"  could not list inference profiles: {e.response['Error']['Message']}")
        return

    profiles = [
        p
        for p in resp.get("inferenceProfileSummaries", [])
        if "anthropic" in p.get("inferenceProfileId", "").lower()
        or "claude" in p.get("inferenceProfileName", "").lower()
    ]
    if not profiles:
        print("    none found")
        return

    for p in sorted(profiles, key=lambda x: x["inferenceProfileId"]):
        status = p.get("status", "?")
        mark = "" if status == "ACTIVE" else f"  [{status}]"
        print(f"    {p['inferenceProfileId']}{mark}")


def main():
    print(f"Region: {REGION}")
    try:
        client = boto3.client("bedrock", region_name=REGION)
        sts = boto3.client("sts", region_name=REGION)
        print(f"Account: {sts.get_caller_identity()['Account']}")
    except NoCredentialsError:
        print("No AWS credentials found. Check AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.")
        return 1

    print("\n" + "=" * 66)
    print("FOUNDATION MODELS (anthropic)")
    print("=" * 66)
    foundation_models(client)

    print("\n" + "=" * 66)
    print("INFERENCE PROFILES  <- use one of these as BEDROCK_MODEL_ID")
    print("=" * 66)
    inference_profiles(client)

    print(
        "\nPick an ACTIVE id above, set BEDROCK_MODEL_ID in .env, then re-upload\n"
        "to S3 and redeploy. If a model is listed but invoke returns AccessDenied,\n"
        "enable it under Bedrock -> Model access in the console.\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
