"""Provider-independent agent interface + adapters.

The orchestrator never talks to a vendor SDK. It only knows `AgentProvider.run`.
`MockProvider` is deterministic (offline demos, CI, evals). Real adapters speak plain HTTPS.
"""
from __future__ import annotations

import asyncio
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import httpx

from . import config


@dataclass
class AgentResult:
    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    model: str = "mock"
    raw: dict = field(default_factory=dict)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class AgentProvider(ABC):
    name = "base"

    @abstractmethod
    async def run(self, system_prompt: str, messages: list[dict], tools: list[dict], context: dict) -> AgentResult:
        ...

    def run_sync(self, *a, **kw) -> AgentResult:
        return asyncio.run(self.run(*a, **kw))


class MockProvider(AgentProvider):
    """Deterministic: returns `context['draft']` — the evidence-derived report built by the orchestrator."""
    name = "mock"

    async def run(self, system_prompt, messages, tools, context):
        text = context.get("draft", "")
        prompt_tokens = estimate_tokens(system_prompt + "".join(str(m.get("content", "")) for m in messages))
        return AgentResult(text=text, input_tokens=prompt_tokens, output_tokens=estimate_tokens(text), model="mock-deterministic")


class _HttpProvider(AgentProvider):
    env_key = ""
    model = ""

    def _key(self) -> str:
        key = os.getenv(self.env_key, "")
        if not key:
            raise RuntimeError(f"{self.env_key} is not set")
        return key

    def _user_text(self, messages: list[dict], context: dict) -> str:
        evidence = context.get("evidence_json", "")
        return "\n\n".join(str(m["content"]) for m in messages) + (f"\n\nEvidence (JSON):\n{evidence}" if evidence else "")


class OpenAIProvider(_HttpProvider):
    name, env_key = "openai", "OPENAI_API_KEY"
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    async def run(self, system_prompt, messages, tools, context):
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post("https://api.openai.com/v1/chat/completions", headers={"Authorization": f"Bearer {self._key()}"},
                             json={"model": self.model, "messages": [{"role": "system", "content": system_prompt},
                                                                     {"role": "user", "content": self._user_text(messages, context)}]})
            r.raise_for_status()
            j = r.json()
        u = j.get("usage", {})
        return AgentResult(j["choices"][0]["message"]["content"], u.get("prompt_tokens", 0), u.get("completion_tokens", 0), self.model)


class AnthropicProvider(_HttpProvider):
    name, env_key = "anthropic", "ANTHROPIC_API_KEY"
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

    async def run(self, system_prompt, messages, tools, context):
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post("https://api.anthropic.com/v1/messages",
                             headers={"x-api-key": self._key(), "anthropic-version": "2023-06-01"},
                             json={"model": self.model, "max_tokens": 1500, "system": system_prompt,
                                   "messages": [{"role": "user", "content": self._user_text(messages, context)}]})
            r.raise_for_status()
            j = r.json()
        u = j.get("usage", {})
        return AgentResult(j["content"][0]["text"], u.get("input_tokens", 0), u.get("output_tokens", 0), self.model)


class GeminiProvider(_HttpProvider):
    name, env_key = "gemini", "GEMINI_API_KEY"
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    async def run(self, system_prompt, messages, tools, context):
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
                             headers={"x-goog-api-key": self._key()},
                             json={"systemInstruction": {"parts": [{"text": system_prompt}]},
                                   "contents": [{"role": "user", "parts": [{"text": self._user_text(messages, context)}]}]})
            r.raise_for_status()
            j = r.json()
        u = j.get("usageMetadata", {})
        return AgentResult(j["candidates"][0]["content"]["parts"][0]["text"], u.get("promptTokenCount", 0),
                           u.get("candidatesTokenCount", 0), self.model)


PROVIDERS = {"mock": MockProvider, "openai": OpenAIProvider, "anthropic": AnthropicProvider, "gemini": GeminiProvider}


def get_provider(name: str | None = None) -> AgentProvider:
    name = name or config.PROVIDER
    if name not in PROVIDERS:
        raise ValueError(f"unknown provider '{name}'. Options: {sorted(PROVIDERS)}")
    return PROVIDERS[name]()
