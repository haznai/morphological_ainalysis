#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = "~=3.12"
# dependencies = ["mlx-lm"]
# exclude-newer = "2025-07-08T00:00:00Z"
# ///


from mlx_lm import load, stream_generate

model, tokenizer = load("mlx-community/Nemotron-Research-Reasoning-Qwen-1.5B-4bit")

prompt="hello. think in multiple paragraphs about the meaning of life. once youre done thinking, give me the final answer"

if hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template is not None:
    messages = [{"role": "user", "content": prompt}]
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

think_token_spotted = False
accumulated_response = ""
for response in stream_generate(model, tokenizer, prompt, max_tokens=400000000):
   print(response.text, end="", flush=True)
   accumulated_response += response.text

   # spot if thinking is over
   if "</think>" in response.text:
      print("===== </think> end spotted")
      think_token_spotted = True
      break

   if response.finish_reason: print(f"====== finish reason: {response.finish_reason}")

# throw in a new thinking prompt during <think> process
# some prompt hacking based on the prompt template
if think_token_spotted:
   prompt += f"{accumulated_response.split('</think>')[0]} \nWait, haven't I forgot about sufism? Where the meaning of life is becoming one with god? Actually now, I am sure sufism is the answer. I should give a very sufi inspired answer. I should definitely mention sufism as a deeper view, combining insights from world religions"
   for response in stream_generate(model, tokenizer, prompt, max_tokens=400000000):
      print(response.text, end="", flush=True)
