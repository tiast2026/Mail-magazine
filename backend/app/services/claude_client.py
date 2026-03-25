import asyncio
import logging

import anthropic

from app.config import get_settings

logger = logging.getLogger(__name__)


class ClaudeClient:
    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate(
        self, system_prompt: str, user_prompt: str, max_tokens: int = 4096
    ) -> str:
        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries):
            try:
                response = await asyncio.to_thread(
                    self.client.messages.create,
                    model="claude-sonnet-4-20250514",
                    max_tokens=max_tokens,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                if response.content and len(response.content) > 0:
                    return response.content[0].text
                return ""
            except anthropic.RateLimitError:
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(
                        f"Rate limited, retrying in {delay}s (attempt {attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(delay)
                else:
                    raise
            except anthropic.APIError as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(
                        f"API error: {e}, retrying in {delay}s (attempt {attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(delay)
                else:
                    raise

        return ""
