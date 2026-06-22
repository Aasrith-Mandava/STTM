"""LiteLlm subclass that unwraps markdown-fenced JSON from model output.

ADK agents that declare ``output_schema=...`` parse the model's text as strict
JSON. Gemini honors structured output natively, but non-Gemini models (Groq/
OpenAI-style via litellm) frequently wrap the JSON in a ```json … ``` fence,
which breaks ADK's parse. This subclass strips a single surrounding code fence
from each response so those agents work across providers — no agent-code changes.
"""

from __future__ import annotations

import re
from typing import AsyncGenerator

from google.adk.models.lite_llm import LiteLlm
from google.adk.models.llm_response import LlmResponse
from google.adk.models.llm_request import LlmRequest

def _strip_fence(text: str) -> str:
    """Best-effort: return the bare JSON from a model response that may be wrapped
    in a ```json fence, a leading 'json' language tag, or surrounding prose."""
    if not isinstance(text, str):
        return text
    t = text.strip()
    # drop a leading code fence ``` optionally followed by a language tag
    t = re.sub(r"^```[ \t]*[A-Za-z0-9_+-]*[ \t]*\r?\n?", "", t)
    # drop a trailing code fence
    t = re.sub(r"\r?\n?```[ \t]*$", "", t)
    t = t.strip()
    # drop a leading bare language tag line (e.g. 'json' / 'JSON')
    t = re.sub(r"^(?:json|JSON)\b[ \t]*\r?\n", "", t).strip()
    # final fallback: slice to the outermost JSON object/array
    if t and t[0] not in "{[":
        starts = [i for i in (t.find("{"), t.find("[")) if i != -1]
        if starts:
            start = min(starts)
            end = max(t.rfind("}"), t.rfind("]"))
            if end > start:
                t = t[start : end + 1]
    return t.strip()


class FenceStrippingLiteLlm(LiteLlm):
    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        async for resp in super().generate_content_async(llm_request, stream=stream):
            try:
                content = getattr(resp, "content", None)
                if content and getattr(content, "parts", None):
                    for part in content.parts:
                        if getattr(part, "text", None):
                            part.text = _strip_fence(part.text)
            except Exception:  # noqa: BLE001 - never break the stream over cleanup
                pass
            yield resp
