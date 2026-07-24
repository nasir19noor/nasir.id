"""Only place that talks to Bedrock. Swapping model or region is one line."""
import boto3
from config import AWS_REGION, BEDROCK_MODEL_ID, MAX_TOKENS


class BedrockClient:
    def __init__(self, region: str = AWS_REGION, model_id: str = BEDROCK_MODEL_ID):
        self.client = boto3.client("bedrock-runtime", region_name=region)
        self.model_id = model_id

    def converse(self, messages: list, system: str, tool_config: dict) -> dict:
        kwargs = {
            "modelId": self.model_id,
            "messages": messages,
            "inferenceConfig": {"maxTokens": MAX_TOKENS, "temperature": 0.2},
        }
        if system:
            kwargs["system"] = [{"text": system}]
        if tool_config:
            kwargs["toolConfig"] = tool_config
        return self.client.converse(**kwargs)
