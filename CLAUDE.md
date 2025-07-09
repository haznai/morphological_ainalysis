# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project combines morphological analysis (Zwicky box) with AI reasoning models to generate new dimensions and discover high-potential combinations for a defined problem or desired outcome.

## Core Concept

Morphological analysis traditionally:
- Breaks problems into parameters/dimensions
- Lists all possible values for each parameter
- Explores combinations systematically

This project's innovation:
- AI reasoning models actively participate in the morphological analysis process
- Models generate new parameters, values, and perspectives on the problem
- Dynamic exploration through test-time inference rather than pre-computed exhaustive search
- Graph traversal approach: incrementally build combinations while reasoning about viability

## Key Principles

1. **Start from the problem, not solutions** - Define what you want to achieve before jumping to how
2. **"Bulk then cut"** - Two-phase approach:
   - Generate mode: Extensively generate ideas in appreciative/generative mode
   - Evaluate mode: Prune to killer ideas through critical evaluation
3. **Test-time inference** - Leverage reasoning models for dynamic exploration of the problem space
4. **Consider inversions** - Explore what NOT to do as part of the analysis

## Commands

```bash
# Run the Nemotron reasoning model
uv run --script run_nemotron.py
```

## Working with AI Reasoning Models

- Use models as creative partners in defining problem dimensions
- Let models suggest non-obvious parameters and values
- Allow models to identify promising combinations worth exploring
- Maintain balance between exhaustive generation and focused evaluation

## Test-Time Inference Approach

The general idea is to use AI reasoning like graph traversal - incrementally building parameter combinations while continuously evaluating their viability. The AI can dynamically add parameters, prune unpromising branches, and explore alternative paths based on its reasoning. This avoids exhaustive enumeration by letting the AI guide exploration through the solution space.