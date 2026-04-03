"""
Google Vertex AI Imagen service for AI image generation
"""

import base64
import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

VERTEX_PROJECT_ID = os.getenv("VERTEX_PROJECT_ID", "")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")
VERTEX_MODEL = os.getenv("VERTEX_IMAGE_MODEL", "imagen-3.0-generate-001")


def _load_credentials():
    """
    Load GCP credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON env var (raw JSON string).
    Falls back to GOOGLE_APPLICATION_CREDENTIALS file path if set.
    Returns a google.oauth2.service_account.Credentials object, or None.
    """
    raw = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON", "").strip()
    if not raw:
        return None

    try:
        from google.oauth2 import service_account
        # Support both base64-encoded and raw JSON
        try:
            decoded = base64.b64decode(raw).decode("utf-8")
            info = json.loads(decoded)
        except Exception:
            info = json.loads(raw)

        return service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    except Exception as e:
        logger.error(f"Failed to load GCP credentials: {e}")
    return None


class VertexImageService:
    def __init__(self):
        self.enabled = bool(VERTEX_PROJECT_ID)
        self._client = None

        if not self.enabled:
            logger.warning("VERTEX_PROJECT_ID not set — AI image generation disabled")
            return

        try:
            import vertexai
            credentials = _load_credentials()
            vertexai.init(
                project=VERTEX_PROJECT_ID,
                location=VERTEX_LOCATION,
                credentials=credentials,  # None = use GOOGLE_APPLICATION_CREDENTIALS file or ADC
            )
            logger.info(f"Vertex AI initialised: project={VERTEX_PROJECT_ID} location={VERTEX_LOCATION} model={VERTEX_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialise Vertex AI: {e}")
            self.enabled = False

    def generate_image(self, prompt: str, aspect_ratio: str = "1:1", count: int = 1) -> list[str]:
        """
        Generate image(s) from a text prompt using Vertex AI Imagen 3.

        Returns a list of base64-encoded PNG data URIs.
        aspect_ratio: "1:1" | "4:3" | "3:4" | "16:9" | "9:16"
        """
        if not self.enabled:
            raise RuntimeError(
                "Vertex AI is not configured. Set VERTEX_PROJECT_ID in your environment."
            )

        try:
            from vertexai.preview.vision_models import ImageGenerationModel

            model = ImageGenerationModel.from_pretrained(VERTEX_MODEL)
            response = model.generate_images(
                prompt=prompt,
                number_of_images=min(count, 4),
                aspect_ratio=aspect_ratio,
                safety_filter_level="block_some",
                person_generation="allow_adult",
            )

            results = []
            for image in response.images:
                b64 = base64.b64encode(image._image_bytes).decode("utf-8")
                results.append(f"data:image/png;base64,{b64}")

            return results

        except Exception as e:
            logger.error(f"Vertex AI image generation failed: {e}")
            raise


vertex_image_service = VertexImageService()
