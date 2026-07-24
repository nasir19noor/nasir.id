"""Read-only AWS inspection via boto3. Add more Describe*/List* calls here as you
need them — they map 1:1 to the IAM policy in terraform/main.tf."""
import boto3
from config import AWS_REGION
from agent.tools.base import Tool


class ListEC2Tool(Tool):
    name = "list_ec2_instances"
    description = "List EC2 instances with their name, type, and state."
    input_schema = {"type": "object", "properties": {}}

    def run(self) -> str:
        ec2 = boto3.client("ec2", region_name=AWS_REGION)
        resp = ec2.describe_instances()
        lines = []
        for res in resp.get("Reservations", []):
            for inst in res.get("Instances", []):
                name = next(
                    (t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"),
                    "",
                )
                lines.append(
                    f"{inst['InstanceId']} | {name} | {inst['InstanceType']} | "
                    f"{inst['State']['Name']}"
                )
        return "\n".join(lines) or "No EC2 instances found."


class ListS3Tool(Tool):
    name = "list_s3_buckets"
    description = "List all S3 bucket names in the account."
    input_schema = {"type": "object", "properties": {}}

    def run(self) -> str:
        s3 = boto3.client("s3", region_name=AWS_REGION)
        resp = s3.list_buckets()
        return "\n".join(b["Name"] for b in resp.get("Buckets", [])) or "No buckets."


class TailLogsTool(Tool):
    name = "tail_cloudwatch_logs"
    description = (
        "Return the most recent log events from a CloudWatch Logs group. "
        "Useful for debugging Lambda or app logs."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "log_group": {"type": "string", "description": "The log group name."},
            "limit": {"type": "integer", "description": "Max events (default 20)."},
        },
        "required": ["log_group"],
    }

    def run(self, log_group: str, limit: int = 20) -> str:
        logs = boto3.client("logs", region_name=AWS_REGION)
        resp = logs.filter_log_events(logGroupName=log_group, limit=limit)
        events = resp.get("events", [])
        return "\n".join(e["message"].rstrip() for e in events)[:4000] or "No events."
