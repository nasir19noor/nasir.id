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
        self.model_id = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
        self.inference_profile_id = os.getenv('BEDROCK_INFERENCE_PROFILE_ID')
        self.inference_profile_arn = os.getenv('BEDROCK_INFERENCE_PROFILE_ARN')
        
        # Check if this is a Claude 4 model that needs inference profile
        self.use_inference_profile = (
            'claude-4' in self.model_id or 
            'claude-sonnet-4' in self.model_id or
            bool(self.inference_profile_id) or
            bool(self.inference_profile_arn) or
            self.model_id.startswith('apac.') or
            self.model_id.startswith('us.') or
            self.model_id.startswith('eu.') or
            self.model_id.startswith('arn:aws:bedrock')
        )
        
        # Initialize Bedrock client
        try:
            # Check if credentials are available
            aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            
            logger.info(f"AWS_ACCESS_KEY_ID present: {bool(aws_access_key)}")
            logger.info(f"AWS_SECRET_ACCESS_KEY present: {bool(aws_secret_key)}")
            logger.info(f"Bedrock region: {self.region}")
            logger.info(f"Bedrock model: {self.model_id}")
            logger.info(f"Inference profile ID: {self.inference_profile_id}")
            logger.info(f"Inference profile ARN: {self.inference_profile_arn}")
            logger.info(f"Use inference profile: {self.use_inference_profile}")
            
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

    def _invoke_model(self, body: dict) -> dict:
        """Invoke model with proper handling for inference profiles"""
        try:
            if self.use_inference_profile:
                # Priority 1: Use configured inference profile ARN if available
                if self.inference_profile_arn:
                    try:
                        logger.info(f"Using configured inference profile ARN: {self.inference_profile_arn}")
                        response = self.bedrock_client.invoke_model(
                            modelId=self.inference_profile_arn,
                            body=json.dumps(body),
                            contentType='application/json'
                        )
                        logger.info(f"SUCCESS: Used inference profile ARN: {self.inference_profile_arn}")
                        return json.loads(response['body'].read())
                    except Exception as e:
                        logger.warning(f"Failed with configured ARN {self.inference_profile_arn}: {str(e)[:100]}...")
                
                # Priority 2: Use configured inference profile ID if available
                if self.inference_profile_id:
                    try:
                        logger.info(f"Using configured inference profile ID: {self.inference_profile_id}")
                        response = self.bedrock_client.invoke_model(
                            modelId=self.inference_profile_id,
                            body=json.dumps(body),
                            contentType='application/json'
                        )
                        logger.info(f"SUCCESS: Used inference profile ID: {self.inference_profile_id}")
                        return json.loads(response['body'].read())
                    except Exception as e:
                        logger.warning(f"Failed with configured ID {self.inference_profile_id}: {str(e)[:100]}...")
                
                # Priority 3: If the model_id is already an inference profile ID or ARN, use it directly
                if (self.model_id.startswith('apac.') or 
                    self.model_id.startswith('us.') or 
                    self.model_id.startswith('eu.') or 
                    self.model_id.startswith('arn:aws:bedrock')):
                    
                    try:
                        logger.info(f"Using model_id as inference profile: {self.model_id}")
                        response = self.bedrock_client.invoke_model(
                            modelId=self.model_id,
                            body=json.dumps(body),
                            contentType='application/json'
                        )
                        logger.info(f"SUCCESS: Used model_id as inference profile: {self.model_id}")
                        return json.loads(response['body'].read())
                    except Exception as e:
                        logger.warning(f"Failed with model_id {self.model_id}: {str(e)[:100]}...")
                
                # Priority 4: Try common inference profile patterns as fallback
                inference_profiles = [
                    # APAC profiles (for Asia-Pacific region)
                    "apac.anthropic.claude-4-sonnet-20250514-v1:0",
                    "apac.anthropic.claude-sonnet-4-20250514-v1:0", 
                    # Cross-region profiles
                    "us.anthropic.claude-4-sonnet-20250514-v1:0",
                    "us.anthropic.claude-sonnet-4-20250514-v1:0", 
                    "cross-region.anthropic.claude-4-sonnet-20250514-v1:0",
                    "cross-region.anthropic.claude-sonnet-4-20250514-v1:0",
                    # Regional profiles
                    f"us-east-1.anthropic.claude-4-sonnet-20250514-v1:0",
                    f"us-west-2.anthropic.claude-4-sonnet-20250514-v1:0",
                    # Generic patterns
                    "us.anthropic.claude-4-sonnet-v1:0",
                    "us.anthropic.claude-sonnet-4-v1:0",
                ]
                
                for profile_id in inference_profiles:
                    try:
                        logger.info(f"Trying fallback inference profile: {profile_id}")
                        response = self.bedrock_client.invoke_model(
                            modelId=profile_id,
                            body=json.dumps(body),
                            contentType='application/json'
                        )
                        logger.info(f"SUCCESS: Used fallback inference profile: {profile_id}")
                        return json.loads(response['body'].read())
                    except Exception as e:
                        logger.warning(f"Failed with profile {profile_id}: {str(e)[:100]}...")
                        continue
                
                # If all inference profiles fail, provide helpful error message
                raise Exception(f"No valid inference profile found. Please check BEDROCK_INFERENCE_PROFILE_ID or BEDROCK_INFERENCE_PROFILE_ARN in environment variables, or verify available profiles in AWS Bedrock console for region {self.region}")
            else:
                # For older models, use direct model ID
                response = self.bedrock_client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body),
                    contentType='application/json'
                )
                return json.loads(response['body'].read())
                
        except Exception as e:
            logger.error(f"Error invoking model: {e}")
            raise e

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
            response_body = self._invoke_model(body)
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

            response_body = self._invoke_model(body)
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

            response_body = self._invoke_model(body)
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

            response_body = self._invoke_model(body)
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

            response_body = self._invoke_model(body)
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