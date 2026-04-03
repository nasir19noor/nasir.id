"""
S3 Service for media uploads
"""

import boto3
import base64
import logging
import os
import uuid
from datetime import datetime
from typing import List, Optional

logger = logging.getLogger(__name__)

BUCKET = os.getenv("AWS_BUCKET_NAME", "assets.pulsara.nasir.id")
REGION = os.getenv("AWS_REGION", "ap-southeast-1")


class S3Service:
    def __init__(self):
        try:
            self.client = boto3.client(
                "s3",
                region_name=REGION,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            )
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.client = None

    def upload_base64_image(self, data_uri: str, folder_prefix: str) -> Optional[str]:
        """
        Upload a base64-encoded data URI image to S3.
        Returns the public HTTPS URL, or None on failure.

        folder_prefix example: "uploads/20240401_153000"
        """
        if not self.client:
            logger.warning("S3 client not initialised — skipping image upload")
            return None

        try:
            # Parse data URI:  data:<mime>;base64,<data>
            if "," in data_uri:
                header, encoded = data_uri.split(",", 1)
                mime = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
            else:
                encoded = data_uri
                mime = "image/jpeg"

            ext = mime.split("/")[-1].replace("jpeg", "jpg")
            key = f"{folder_prefix}/{uuid.uuid4().hex}.{ext}"

            self.client.put_object(
                Bucket=BUCKET,
                Key=key,
                Body=base64.b64decode(encoded),
                ContentType=mime,
                ACL="public-read",
            )

            url = f"https://{BUCKET}/{key}"
            logger.info(f"Uploaded image to s3://{BUCKET}/{key}")
            return url

        except Exception as e:
            logger.error(f"Failed to upload image to S3: {e}")
            return None

    def upload_images(self, images: List[str]) -> List[str]:
        """
        Upload a list of base64 data URIs to S3 under uploads/<datetime>/.
        Returns list of S3 HTTPS URLs (skipping any that fail).
        """
        if not images:
            return []

        folder = f"uploads/{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        urls = []
        for img in images:
            url = self.upload_base64_image(img, folder)
            if url:
                urls.append(url)
        return urls


s3_service = S3Service()
