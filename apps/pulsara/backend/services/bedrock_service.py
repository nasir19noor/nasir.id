"""
AWS Bedrock Service for AI-powered content creation
"""

import boto3
import json
import os
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BedrockService:
    def __init__(self):
        self.region = os.getenv('BEDROCK_REGION', 'us-east-1')
        self.model_id = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
        
        # Initialize Bedrock client
        try:
            # Check if credentials are available
            aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            
            if not aws_access_key or not aws_secret_key:
                logger.warning("AWS credentials not found in environment variables")
                self.bedrock_client = None
                return
            
            self.bedrock_client = boto3.client(
                'bedrock-runtime',
                region_name=self.region,
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            
            # Test the connection
            logger.info(f"Bedrock client initialized for region: {self.region}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {e}")
            self.bedrock_client = None

    def _check_client(self) -> Dict:
        """Check if Bedrock client is available"""
        if not self.bedrock_client:
            return {
                "error": "AWS Bedrock is not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
            }
        return None

    async def generate_content(self, prompt: str, tone: str = "casual", max_length: int = 500) -> Dict:
        """Generate content using AWS Bedrock"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            # Construct the prompt for content generation
            system_prompt = f"""You are a social media content creator specializing in Threads posts. 
            Create engaging, authentic content that follows these guidelines:
            - Keep posts under {max_length} characters
            - Use a {tone} tone
            - Include relevant hashtags when appropriate
            - Make content engaging and conversation-starting
            - Follow Threads best practices
            """

            user_prompt = f"Create a Threads post about: {prompt}"

            # Prepare the request body for Claude
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }

            # Call Bedrock
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json'
            )

            # Parse response
            response_body = json.loads(response['body'].read())
            generated_content = response_body['content'][0]['text']

            return {
                "content": generated_content,
                "character_count": len(generated_content),
                "tone": tone,
                "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating content: {e}")
            return {"error": f"Failed to generate content: {str(e)}"}

    async def optimize_content(self, content: str, target_audience: str = "general") -> Dict:
        """Optimize existing content for better engagement"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            system_prompt = f"""You are a social media optimization expert. 
            Analyze and improve the given Threads post for better engagement.
            Target audience: {target_audience}
            
            Provide:
            1. An optimized version of the post
            2. Specific improvements made
            3. Engagement score (1-10)
            4. Suggested hashtags
            """

            user_prompt = f"Optimize this Threads post: {content}"

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }

            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json'
            )

            response_body = json.loads(response['body'].read())
            optimization_result = response_body['content'][0]['text']

            return {
                "original_content": content,
                "optimization_result": optimization_result,
                "optimized_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error optimizing content: {e}")
            return {"error": f"Failed to optimize content: {str(e)}"}

    async def generate_hashtags(self, content: str, max_hashtags: int = 5) -> Dict:
        """Generate relevant hashtags for content"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            system_prompt = f"""You are a hashtag expert for social media.
            Generate {max_hashtags} relevant, trending hashtags for the given content.
            Focus on:
            - Relevance to the content
            - Current trends
            - Engagement potential
            - Mix of popular and niche hashtags
            
            Return only the hashtags, one per line, with # symbol.
            """

            user_prompt = f"Generate hashtags for this content: {content}"

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 200,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }

            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json'
            )

            response_body = json.loads(response['body'].read())
            hashtags_text = response_body['content'][0]['text']
            
            # Parse hashtags from response
            hashtags = [
                line.strip() for line in hashtags_text.split('\n') 
                if line.strip().startswith('#')
            ]

            return {
                "hashtags": hashtags[:max_hashtags],
                "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating hashtags: {e}")
            return {"error": f"Failed to generate hashtags: {str(e)}"}

    async def suggest_posting_time(self, content: str, target_audience: str = "general") -> Dict:
        """Suggest optimal posting times based on content and audience"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            system_prompt = f"""You are a social media timing expert.
            Based on the content and target audience ({target_audience}), suggest the best times to post on Threads.
            Consider:
            - Content type and topic
            - Target audience demographics
            - General social media best practices
            - Time zones (assume US Eastern Time)
            
            Provide 3 optimal posting times with brief explanations.
            """

            user_prompt = f"Suggest posting times for this content: {content}"

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }

            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json'
            )

            response_body = json.loads(response['body'].read())
            timing_suggestions = response_body['content'][0]['text']

            return {
                "suggestions": timing_suggestions,
                "target_audience": target_audience,
                "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error suggesting posting time: {e}")
            return {"error": f"Failed to suggest posting time: {str(e)}"}

    async def analyze_sentiment(self, content: str) -> Dict:
        """Analyze sentiment and tone of content"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            system_prompt = """You are a sentiment analysis expert.
            Analyze the given content and provide:
            1. Overall sentiment (positive, negative, neutral)
            2. Tone (professional, casual, humorous, serious, etc.)
            3. Emotional impact score (1-10)
            4. Potential audience reaction
            5. Suggestions for improvement if needed
            
            Be concise and specific.
            """

            user_prompt = f"Analyze this content: {content}"

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }

            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json'
            )

            response_body = json.loads(response['body'].read())
            analysis_result = response_body['content'][0]['text']

            return {
                "content": content,
                "analysis": analysis_result,
                "analyzed_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return {"error": f"Failed to analyze sentiment: {str(e)}"}

# Singleton instance
bedrock_service = BedrockService()