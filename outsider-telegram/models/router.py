"""
Multi-model AI router — April 2026 edition.

Tier system:
  FAST    — High-volume, cheap/free. News filtering, alert formatting.
  MEDIUM  — Daily briefs, structured analysis. Balance quality vs cost.
  SMART   — Deep dives, trade setups, reasoning. Best available model.

Model priority within each tier:
  First model with a configured API key wins.
  Graceful fallback to next model on error.

Free models used (when keys are available):
  - Gemma 4 26B A4B (Google AI Studio, free 15 RPM)
  - Gemma 4 31B (OpenRouter :free)
  - Llama 4 Maverick (OpenRouter :free, 1M ctx)
  - Qwen 3.6 Plus (OpenRouter :free, 1M ctx)
  - DeepSeek R1 (OpenRouter :free)
  - Gemini 2.5 Flash (Google AI Studio, free 500 RPD)
  - Groq Llama 4 Scout (free 30 RPM)
  - Cerebras Llama 3.3 70B (free 1M tokens/day)
"""

import os
import logging
import litellm
from config import settings

logger = logging.getLogger(__name__)
litellm.set_verbose = False

# ─── INJECT API KEYS ───────────────────────────────────────────────────────

os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key

_key_map = {
    "DEEPSEEK_API_KEY":   settings.deepseek_api_key,
    "GROQ_API_KEY":       settings.groq_api_key,
    "GEMINI_API_KEY":     settings.gemini_api_key,
    "CEREBRAS_API_KEY":   settings.cerebras_api_key,
    "OPENROUTER_API_KEY": settings.openrouter_api_key,
    "TOGETHER_API_KEY":   settings.together_api_key,
}
for env_var, value in _key_map.items():
    if value:
        os.environ[env_var] = value


# ─── MODEL TIERS ───────────────────────────────────────────────────────────
# Each entry: (litellm_model_id, api_key_value, optional_api_base)
# litellm resolves provider from model prefix automatically.

FAST_MODELS = [
    # Gemma 4 26B MoE — Google AI Studio free (15 RPM, private data)
    ("gemini/gemma-4-26b-a4b-it",              settings.gemini_api_key,     None),
    # Gemma 4 31B — OpenRouter free
    ("openrouter/google/gemma-4-31b-it:free",  settings.openrouter_api_key, None),
    # Llama 4 Scout — Groq free (30 RPM)
    ("groq/meta-llama/llama-4-scout",          settings.groq_api_key,       None),
    # Cerebras Llama 3.3 70B — free 1M tokens/day
    ("cerebras/llama-3.3-70b",                 settings.cerebras_api_key,   None),
    # Llama 3.1 8B — Groq free (highest rate limit fallback)
    ("groq/llama-3.1-8b-instant",              settings.groq_api_key,       None),
]

MEDIUM_MODELS = [
    # Gemini 2.5 Flash — Google AI Studio free 500 RPD
    ("gemini/gemini-2.5-flash",                settings.gemini_api_key,     None),
    # Qwen 3.6 Plus — OpenRouter free, 1M context
    ("openrouter/qwen/qwen3.6-plus:free",      settings.openrouter_api_key, None),
    # Llama 4 Maverick — OpenRouter free, 1M context, strong writing
    ("openrouter/meta-llama/llama-4-maverick:free", settings.openrouter_api_key, None),
    # Gemma 4 31B — OpenRouter paid fallback
    ("openrouter/google/gemma-4-31b-it",       settings.openrouter_api_key, None),
    # DeepSeek V3.2 — cheap at scale ($0.27/$1.10 per 1M)
    ("deepseek/deepseek-chat",                 settings.deepseek_api_key,   None),
    # Mistral Small 4 — fast, cheap ($0.15/$0.60 per 1M)
    ("openrouter/mistralai/mistral-small-2603", settings.openrouter_api_key, None),
]

SMART_MODELS = [
    # Claude Opus 4.6 — best quality, primary for deep analysis
    ("claude-opus-4-6",                        settings.anthropic_api_key,  None),
    # DeepSeek R1 — strong reasoning, ~96% cheaper than o1
    ("deepseek/deepseek-reasoner",             settings.deepseek_api_key,   None),
    # Qwen 3 235B A22B — strong reasoning via OpenRouter
    ("openrouter/qwen/qwen3-235b-a22b",        settings.openrouter_api_key, None),
    # Kimi K2.5 — agentic reasoning fallback
    ("openrouter/moonshotai/kimi-k2.5",        settings.openrouter_api_key, None),
    # DeepSeek R1 — OpenRouter free (rate limited, last resort)
    ("openrouter/deepseek/deepseek-r1:free",   settings.openrouter_api_key, None),
]

TIER_MAP = {
    "fast":   FAST_MODELS,
    "medium": MEDIUM_MODELS,
    "smart":  SMART_MODELS,
}


# ─── ROUTER ────────────────────────────────────────────────────────────────

async def generate(
    prompt: str,
    tier: str = "medium",
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.7,
) -> str:
    """
    Generate text using the best available model for the given tier.
    Tries models in priority order, falls back on error.

    Args:
        prompt:      User message
        tier:        "fast" | "medium" | "smart"
        system:      Optional system prompt
        max_tokens:  Max output tokens
        temperature: Sampling temperature

    Returns:
        Generated text string
    """
    models = TIER_MAP.get(tier, MEDIUM_MODELS)

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    last_error: Exception | None = None

    for model_id, api_key, api_base in models:
        if not api_key:
            continue  # skip models with no configured key

        try:
            kwargs: dict = {
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if api_base:
                kwargs["api_base"] = api_base

            response = await litellm.acompletion(**kwargs)
            text = response.choices[0].message.content.strip()
            logger.debug(f"[router] tier={tier} model={model_id} tokens={response.usage.total_tokens}")
            return text

        except Exception as e:
            logger.warning(f"[router] {model_id} failed: {e}. Trying next model...")
            last_error = e
            continue

    raise RuntimeError(
        f"All models failed for tier '{tier}'. Last error: {last_error}"
    )
