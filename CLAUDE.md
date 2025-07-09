# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project explores combining morphological analysis (Zwicky box) with AI reasoning models. The core insight: reasoning models can both generate new dimensions/parameters AND discover high-potential combinations, not just filter existing ones.

## Core Concept

Morphological analysis traditionally:
- Breaks problems into parameters/dimensions
- Lists all possible values for each parameter
- Explores combinations systematically

This project's innovation:
- AI reasoning models participate in the morphological analysis itself
- Models generate new parameters, values, and ways of thinking about the problem
- "Bulk then cut" approach: generate extensively in appreciative mode, then prune to killer ideas
- Test-time inference allows dynamic exploration rather than pre-computed exhaustive search

## Commands

```bash
# Run the Nemotron reasoning model
uv run --script run_nemotron.py
```

## Key Principles

- Start from the problem, not solutions
- Keep problems vague initially - let the reasoning model help define parameters
- Embrace "appreciative mode" - list everything you know and have
- Consider inversions (what NOT to do) as part of exploration
- Use reasoning models as creative partners, not just evaluators