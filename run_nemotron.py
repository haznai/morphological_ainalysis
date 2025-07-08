#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = "~=3.12"
# dependencies = ["mlx-lm"]
# exclude-newer = "2025-07-08T00:00:00Z"
# ///


from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Nemotron-Research-Reasoning-Qwen-1.5B-4bit")

prompt="hello"

if hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template is not None:
    messages = [{"role": "user", "content": prompt}]
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

response = generate(model, tokenizer, prompt=prompt, verbose=True)
