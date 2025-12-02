// OpenAI API client for Zwicky box combination analysis

export interface CombinationEvaluation {
  combination: Record<string, string>; // column name -> value
  verdict: "yes" | "no" | "promising";
  reasoning: string;
}

export interface AnalysisRequest {
  problem: string;
  columns: string[];
  rows: string[][];
  apiKey: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Generate all combinations from the Zwicky box
export function generateCombinations(
  columns: string[],
  rows: string[][]
): Array<Record<string, string>> {
  // Get values for each column (transpose the matrix)
  const columnValues: string[][] = columns.map((_, colIndex) =>
    rows.map((row) => row[colIndex]).filter((v) => v && v.trim() !== "")
  );

  // Cartesian product of all column values
  const combinations: Array<Record<string, string>> = [];

  function generate(colIndex: number, current: Record<string, string>) {
    if (colIndex >= columns.length) {
      combinations.push({ ...current });
      return;
    }

    const values = columnValues[colIndex];
    if (values.length === 0) {
      // Skip empty columns
      generate(colIndex + 1, current);
      return;
    }

    for (const value of values) {
      current[columns[colIndex]] = value;
      generate(colIndex + 1, current);
    }
  }

  generate(0, {});
  return combinations;
}

// Build the system prompt with problem and Zwicky box context (for caching)
function buildSystemPrompt(problem: string, columns: string[], rows: string[][]): string {
  let zwickyDescription = "## Zwicky Box (Morphological Analysis Matrix)\n\n";

  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const colName = columns[colIndex];
    const values = rows.map((row) => row[colIndex]).filter((v) => v && v.trim() !== "");
    zwickyDescription += `### ${colName}\n`;
    zwickyDescription += values.map((v) => `- ${v}`).join("\n") + "\n\n";
  }

  return `You are an expert analyst evaluating combinations from a morphological analysis (Zwicky box).

## Problem/Goal
${problem || "No specific problem defined - evaluate general feasibility"}

${zwickyDescription}

Your task: Evaluate whether a specific combination of values (one from each dimension) is viable for solving the problem.

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "yes" | "no" | "promising",
  "reasoning": "Brief explanation (1-2 sentences)"
}

Verdicts:
- "yes": This combination is clearly viable and worth pursuing
- "no": This combination has fundamental issues or contradictions
- "promising": This combination has potential but needs further exploration`;
}

// Build the user prompt for a specific combination
function buildUserPrompt(combination: Record<string, string>): string {
  const parts = Object.entries(combination)
    .map(([col, val]) => `- ${col}: ${val}`)
    .join("\n");

  return `Evaluate this combination:\n${parts}`;
}

// Call OpenAI API for a single combination
async function evaluateCombination(
  combination: Record<string, string>,
  systemPrompt: string,
  apiKey: string
): Promise<CombinationEvaluation> {
  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildUserPrompt(combination) },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Smallest newest model
        messages,
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "{}";

    const parsed = JSON.parse(content);
    return {
      combination,
      verdict: parsed.verdict || "no",
      reasoning: parsed.reasoning || "Could not evaluate",
    };
  } catch (error) {
    console.error("Error evaluating combination:", error);
    return {
      combination,
      verdict: "no",
      reasoning: `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Analyze all combinations in parallel (with concurrency limit)
export async function analyzeAllCombinations(
  request: AnalysisRequest
): Promise<CombinationEvaluation[]> {
  const { problem, columns, rows, apiKey } = request;

  const combinations = generateCombinations(columns, rows);
  const systemPrompt = buildSystemPrompt(problem, columns, rows);

  // Limit concurrency to avoid rate limits (10 parallel requests)
  const CONCURRENCY = 10;
  const results: CombinationEvaluation[] = [];

  for (let i = 0; i < combinations.length; i += CONCURRENCY) {
    const batch = combinations.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((combo) => evaluateCombination(combo, systemPrompt, apiKey))
    );
    results.push(...batchResults);
  }

  return results;
}
