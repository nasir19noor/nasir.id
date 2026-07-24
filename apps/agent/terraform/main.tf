terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# A dedicated IAM user for the agent running on the VPS (not on EC2, so we use
# access keys). Keep its permissions minimal and read-only.
resource "aws_iam_user" "agent" {
  name = "nasir-agent"
}

resource "aws_iam_access_key" "agent" {
  user = aws_iam_user.agent.name
}

data "aws_iam_policy_document" "agent" {
  statement {
    sid    = "InvokeBedrock"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
      "bedrock:Converse",
      "bedrock:ConverseStream",
    ]
    # Tighten to the specific model / inference-profile ARN in production.
    resources = ["*"]
  }

  statement {
    sid    = "ReadOnlyInfra"
    effect = "Allow"
    actions = [
      "ec2:Describe*",
      "s3:ListAllMyBuckets",
      "s3:GetBucketLocation",
      "logs:Describe*",
      "logs:GetLogEvents",
      "logs:FilterLogEvents",
      "cloudwatch:GetMetricData",
      "cloudwatch:ListMetrics",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_user_policy" "agent" {
  name   = "nasir-agent-policy"
  user   = aws_iam_user.agent.name
  policy = data.aws_iam_policy_document.agent.json
}
