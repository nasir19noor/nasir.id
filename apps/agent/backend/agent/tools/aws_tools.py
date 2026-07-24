"""Read-only AWS inspection. These map 1:1 to the IAM policy in deploy/iam.tf."""
import boto3
from config import AWS_REGION
from agent.tools.base import Tool


class ListEC2Tool(Tool):
    name = "list_ec2_instances"
    description = "List EC2 instances with id, Name tag, type and state."
    input_schema = {"type": "object", "properties": {}}

    def run(self) -> str:
        ec2 = boto3.client("ec2", region_name=AWS_REGION)
        lines = []
        for res in ec2.describe_instances().get("Reservations", []):
            for i in res.get("Instances", []):
                name = next(
                    (t["Value"] for t in i.get("Tags", []) if t["Key"] == "Name"), ""
                )
                lines.append(
                    f"{i['InstanceId']} | {name} | {i['InstanceType']} | "
                    f"{i['State']['Name']}"
                )
        return "\n".join(lines) or "No EC2 instances found."


class ListS3Tool(Tool):
    name = "list_s3_buckets"
    description = "List all S3 bucket names in the account."
    input_schema = {"type": "object", "properties": {}}

    def run(self) -> str:
        s3 = boto3.client("s3", region_name=AWS_REGION)
        return "\n".join(b["Name"] for b in s3.list_buckets().get("Buckets", [])) or "None."


class TailLogsTool(Tool):
    name = "tail_cloudwatch_logs"
    description = (
        "Return the most recent events from a CloudWatch Logs group. "
        "Use for Lambda or application log debugging."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "log_group": {"type": "string", "description": "Log group name."},
            "limit": {"type": "integer", "description": "Max events, default 20."},
        },
        "required": ["log_group"],
    }

    def run(self, log_group: str, limit: int = 20) -> str:
        logs = boto3.client("logs", region_name=AWS_REGION)
        events = logs.filter_log_events(logGroupName=log_group, limit=limit).get(
            "events", []
        )
        return "\n".join(e["message"].rstrip() for e in events)[:4000] or "No events."
