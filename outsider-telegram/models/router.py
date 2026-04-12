"""
Multi-model AI router.

Tier system:
  FAST   — Cerebras / Groq  (free, high volume, simple tasks)
  MEDIUM — Gemini Flash / DeepSeek V3  (balanced, daily briefs)
  SMART  — Claude Opus / DeepSeek R1   (deep analysis, trade setups)
"""

import os
import litellm
from config import settings

litellm.set_verbose = False

# Inject API keys so litellm can find them
os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
if settings.deepseek_api_key:
    os.environ["DEEPSEEK_API_KEY"] = settings.deepseek_api_key
if settings.groq_api_key:
    os.environ["GROQ_API_KEY"] = settings.groq_api_key
if settings.gemini_api_key:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
if settings.cerebras_api_key:
    os.environ["CEREBRAS_API_KEY"] = settings.cerebras_api_key
if settings.openrouter_api_key:
    os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key


# Model chains per tier (first available key wins)
FAST_MODELS = [
    ("cerebras/llama-3.3-70b", settings.cerebras_api_key),
    ("groq/llama-3.1-8b-instant", settings.groq_api_key),
    ("openrouter/meta-llama/llama-3.3-70b-instruct:free", settings.openrouter_api_key),
]

MEDIUM_MODELS = [
    ("gemini/gemini-2.5-flash", settings.gemini_api_key),
    ("deepseek/deepseek-chat", settings.deepseek_api_key),
    ("groq/llama-3.3-70b-versatile", settings.groq_api_key),
]

SMART_MODELS = [
    ("claude-opus-4-6", settings.anthropic_api_key),
    ("deepseek/deepseek-reasoner", settings.deepseek_api_key),
    ("openrouter/deepseek/deepseek-r1:free", settings.openrouter_api_key),
]


def _pick_model(tier_list: list[tuple[str, str]]) -> str:
    for model, key in tier_list:
        if key:
            return model
    raise RuntimeError("No API key configured for any model in this tier.")


async def generate(prompt: str, tier: str = "medium", system: str = "") -> str:
    """
    tier: "fast" | "medium" | "smart"
    Returns the model's text response.
    """
    tier_map = {
        "fast": FAST_MODELS,
        "medium": MEDIUM_MODELS,
        "smart": SMART_MODELS,
    }
    model = _pick_model(tier_map[tier])

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await litellm.acompletion(
        model=model,
        messages=messages,
        max_tokens=2048,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()
