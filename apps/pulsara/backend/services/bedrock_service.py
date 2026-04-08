"""
AWS Bedrock Service for AI-powered content creation
"""

import boto3
import json
import os
import time
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

    def _is_throttling_error(self, error: Exception) -> bool:
        """Detect throttling/rate-limit errors"""
        err_str = str(error).lower()
        return (
            'throttling' in err_str or
            'toomanyrequests' in err_str or
            'rate exceeded' in err_str or
            'throttledexception' in err_str
        )

    def _is_access_error(self, error: Exception) -> bool:
        """Detect permanent access/permission errors that should not be retried"""
        err_str = str(error).lower()
        return (
            'use case details' in err_str or
            'accessdeniedexception' in err_str or
            ('resourcenotfoundexception' in err_str and 'use case' in err_str)
        )

    def _invoke_with_retry(self, model_id: str, body: dict, max_retries: int = 5) -> dict:
        """Invoke a single model ID with exponential backoff on throttling"""
        delay = 5
        for attempt in range(max_retries):
            try:
                response = self.bedrock_client.invoke_model(
                    modelId=model_id,
                    body=json.dumps(body),
                    contentType='application/json'
                )
                return json.loads(response['body'].read())
            except Exception as e:
                if self._is_access_error(e):
                    logger.error(f"Access denied — model not enabled or use case form not submitted: {e}")
                    raise
                if self._is_throttling_error(e) and attempt < max_retries - 1:
                    logger.warning(f"Throttled on attempt {attempt + 1}/{max_retries}, retrying in {delay}s...")
                    time.sleep(delay)
                    delay = min(delay * 2, 60)
                    continue
                raise

    def _invoke_model(self, body: dict) -> dict:
        """Invoke model with proper handling for inference profiles"""
        try:
            if self.use_inference_profile:
                failed_attempts = []

                # Priority 1: Use configured inference profile ARN if available
                if self.inference_profile_arn:
                    try:
                        logger.info(f"Attempting configured inference profile ARN: {self.inference_profile_arn}")
                        result = self._invoke_with_retry(self.inference_profile_arn, body)
                        logger.info(f"SUCCESS: Used inference profile ARN: {self.inference_profile_arn}")
                        return result
                    except Exception as e:
                        err = str(e)
                        logger.error(f"FAILED with configured ARN {self.inference_profile_arn}: {err}")
                        failed_attempts.append(f"ARN '{self.inference_profile_arn}': {err}")

                # Priority 2: Use configured inference profile ID if available
                if self.inference_profile_id:
                    try:
                        logger.info(f"Attempting configured inference profile ID: {self.inference_profile_id}")
                        result = self._invoke_with_retry(self.inference_profile_id, body)
                        logger.info(f"SUCCESS: Used inference profile ID: {self.inference_profile_id}")
                        return result
                    except Exception as e:
                        err = str(e)
                        logger.error(f"FAILED with configured ID {self.inference_profile_id}: {err}")
                        failed_attempts.append(f"ID '{self.inference_profile_id}': {err}")

                # Priority 3: If the model_id is already an inference profile ID or ARN, use it directly
                if (self.model_id.startswith('apac.') or
                    self.model_id.startswith('us.') or
                    self.model_id.startswith('eu.') or
                    self.model_id.startswith('arn:aws:bedrock')):

                    try:
                        logger.info(f"Attempting model_id as inference profile: {self.model_id}")
                        result = self._invoke_with_retry(self.model_id, body)
                        logger.info(f"SUCCESS: Used model_id as inference profile: {self.model_id}")
                        return result
                    except Exception as e:
                        err = str(e)
                        logger.error(f"FAILED with model_id {self.model_id}: {err}")
                        failed_attempts.append(f"model_id '{self.model_id}': {err}")

                if failed_attempts:
                    raise Exception(
                        f"Configured inference profile(s) failed in region {self.region}. "
                        f"Errors: {' | '.join(failed_attempts)}"
                    )

                raise Exception(
                    f"No inference profile configured. Set BEDROCK_INFERENCE_PROFILE_ID or "
                    f"BEDROCK_INFERENCE_PROFILE_ARN in environment variables."
                )
            else:
                return self._invoke_with_retry(self.model_id, body)

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

    async def analyze_personality(self, posts: list) -> Dict:
        """Analyze user's writing personality from their Threads posts"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            posts_text = "\n---\n".join(p.get("text", p) if isinstance(p, dict) else p for p in posts[:25])

            system_prompt = """You are a social media personality analyst.
            Analyze the provided Threads posts and extract the user's authentic writing personality.

            Return ONLY a valid JSON object with exactly these fields:
            {
                "tone": "dominant tone (e.g. casual, witty, inspirational, technical, conversational)",
                "writing_style": "1-2 sentences describing their writing style",
                "common_topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
                "personality_summary": "2-3 sentences capturing their voice and what makes their content unique"
            }
            """

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 600,
                "system": system_prompt,
                "messages": [{"role": "user", "content": f"Analyze these Threads posts:\n\n{posts_text}"}],
            }

            response_body = self._invoke_model(body)
            result_text = response_body["content"][0]["text"].strip()

            try:
                personality_data = json.loads(result_text)
            except json.JSONDecodeError:
                import re
                m = re.search(r"\{.*\}", result_text, re.DOTALL)
                personality_data = json.loads(m.group()) if m else {"personality_summary": result_text}

            personality_data["analyzed_posts_count"] = len(posts)

            return {"personality": personality_data, "analyzed_at": datetime.now().isoformat()}

        except Exception as e:
            logger.error(f"Error analyzing personality: {e}")
            return {"error": f"Failed to analyze personality: {str(e)}"}

    async def get_trending_topics(self, category: str = None, region: str = None) -> Dict:
        """Get currently trending topics suitable for Threads content"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            from datetime import date
            today = date.today().strftime("%B %d, %Y")
            category_context = f" in the {category} niche" if category else ""
            region_context = f" Focus on trends specific to {region}." if region else " Focus on global trends."

            system_prompt = f"""You are a social media trends analyst.
            Today is {today}.

            Generate 6 trending topics{category_context} that would perform well on Threads right now.
            {region_context}
            Consider tech, culture, wellness, AI, lifestyle, and current events relevant to the specified location.

            Return ONLY a valid JSON array:
            [
                {{
                    "topic": "Topic name",
                    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
                    "why_trending": "One sentence on why this topic is hot right now in the specified region"
                }}
            ]
            """

            region_label = region or "Global"
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 800,
                "system": system_prompt,
                "messages": [{"role": "user", "content": f"Generate 6 trending topics for Threads{category_context} in {region_label} as of {today}"}],
            }

            response_body = self._invoke_model(body)
            result_text = response_body["content"][0]["text"].strip()

            try:
                topics = json.loads(result_text)
            except json.JSONDecodeError:
                import re
                m = re.search(r"\[.*\]", result_text, re.DOTALL)
                topics = json.loads(m.group()) if m else []

            return {"topics": topics, "category": category, "region": region or "Global", "generated_at": datetime.now().isoformat()}

        except Exception as e:
            logger.error(f"Error getting trending topics: {e}")
            return {"error": f"Failed to get trending topics: {str(e)}"}

    async def generate_personalized_content(
        self,
        prompt: str,
        personality_summary: str = None,
        trending_topics: list = None,
        tone: str = "casual",
        max_length: int = 500,
    ) -> Dict:
        """Generate content that matches the user's personality and weaves in trending topics"""
        error_check = self._check_client()
        if error_check:
            return error_check

        try:
            personality_context = (
                f"\n\nUser's writing personality to match:\n{personality_summary}" if personality_summary else ""
            )
            trending_context = (
                f"\n\nCurrently trending topics (weave in naturally if relevant): {', '.join(trending_topics)}"
                if trending_topics else ""
            )

            system_prompt = f"""You are a ghostwriter who perfectly mimics the user's authentic social media voice.

            Create a Threads post that:
            - Sounds genuinely like the user, not AI-generated
            - Stays under {max_length} characters
            - Uses a {tone} tone
            - Includes 2-3 relevant hashtags
            {personality_context}
            {trending_context}

            Write ONLY the post text. No explanations, no quotes around it.
            """

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": [{"role": "user", "content": f"Write a Threads post about: {prompt}"}],
            }

            response_body = self._invoke_model(body)
            generated_content = response_body["content"][0]["text"].strip()

            return {
                "content": generated_content,
                "character_count": len(generated_content),
                "tone": tone,
                "used_personality": bool(personality_summary),
                "used_trending": bool(trending_topics),
                "generated_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error generating personalized content: {e}")
            return {"error": f"Failed to generate personalized content: {str(e)}"}

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