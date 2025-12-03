// OpenAI API client for Zwicky box combination analysis

export interface CombinationEvaluation {
  combination: Record<string, string>; // column name -> value
  verdict: "yes" | "no";
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
  "verdict": "yes" | "no",
  "reasoning": "Brief explanation (1-2 sentences)"
}

Verdicts:
- "yes": This combination is viable and worth pursuing
- "no": This combination has issues, contradictions, or is not viable`;
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
        model: "gpt-5-nano", // Smallest newest model
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

// ============================================================================
// GENERATION MODE - AI suggests new parameters and values
// ============================================================================

export interface GenerateColumnsRequest {
  problem: string;
  existingColumns: string[];
  rows: string[][];
  additionalContext?: string;
  count?: number;
  apiKey: string;
}

export interface GenerateValuesRequest {
  problem: string;
  columns: string[];
  rows: string[][];
  targetColumn: string;
  additionalContext?: string;
  count?: number;
  apiKey: string;
}

export interface GeneratedColumn {
  name: string;
  description: string;
  suggestedValues: string[];
}

export interface GeneratedValue {
  value: string;
  rationale: string;
}

// Build context description for generation prompts
function buildZwickyContext(problem: string, columns: string[], rows: string[][]): string {
  let context = `## Problem/Goal\n${problem || "No specific problem defined yet"}\n\n`;

  if (columns.length > 0) {
    context += "## Current Zwicky Box Dimensions\n\n";
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const colName = columns[colIndex];
      const values = rows.map((row) => row[colIndex]).filter((v) => v && v.trim() !== "");
      context += `### ${colName}\n`;
      if (values.length > 0) {
        context += values.map((v) => `- ${v}`).join("\n") + "\n\n";
      } else {
        context += "(no values yet)\n\n";
      }
    }
  } else {
    context += "## Current State\nNo dimensions defined yet - starting fresh.\n\n";
  }

  return context;
}

// Generate new column/parameter suggestions
export async function generateColumns(
  request: GenerateColumnsRequest
): Promise<GeneratedColumn[]> {
  const { problem, existingColumns, rows, additionalContext, count = 3, apiKey } = request;

  const zwickyContext = buildZwickyContext(problem, existingColumns, rows);

  const systemPrompt = `You are an expert in morphological analysis (Zwicky box method) - a structured approach to exploring solution spaces by breaking problems into independent dimensions/parameters.

${zwickyContext}

Your task: Suggest NEW dimensions/parameters that would be valuable to add to this morphological analysis.

Guidelines for good dimensions:
- Each dimension should be INDEPENDENT from existing ones (not redundant)
- Dimensions should be RELEVANT to solving the problem
- Think about: Who? What? How? Where? When? Why? With what resources?
- Consider: technical approaches, business models, user segments, delivery methods, constraints, enablers
- Look for non-obvious angles that could unlock creative solutions
- Consider inversions: what NOT to do, what to avoid, anti-patterns

${additionalContext ? `## Additional Context from User\n${additionalContext}\n\n` : ""}

Respond with valid JSON in this exact format:
{
  "columns": [
    {
      "name": "Dimension Name",
      "description": "Why this dimension matters for the problem",
      "suggestedValues": ["value1", "value2", "value3"]
    }
  ]
}

Suggest ${count} new dimensions. Be creative but practical.`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Suggest new dimensions for this morphological analysis." },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages,
        temperature: 0.8, // Higher temperature for creativity
        max_tokens: 1000,
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

    return parsed.columns || [];
  } catch (error) {
    console.error("Error generating columns:", error);
    throw error;
  }
}

// Generate new value suggestions for a specific column
export async function generateValues(
  request: GenerateValuesRequest
): Promise<GeneratedValue[]> {
  const { problem, columns, rows, targetColumn, additionalContext, count = 5, apiKey } = request;

  const zwickyContext = buildZwickyContext(problem, columns, rows);

  // Find existing values for target column
  const colIndex = columns.indexOf(targetColumn);
  const existingValues = colIndex >= 0
    ? rows.map((row) => row[colIndex]).filter((v) => v && v.trim() !== "")
    : [];

  const systemPrompt = `You are an expert in morphological analysis (Zwicky box method).

${zwickyContext}

Your task: Suggest NEW values for the dimension "${targetColumn}".

${existingValues.length > 0 ? `Existing values for this dimension:\n${existingValues.map(v => `- ${v}`).join("\n")}\n\n` : ""}

Guidelines for good values:
- Values should be DISTINCT from existing ones
- Values should be MUTUALLY EXCLUSIVE where possible (different approaches, not variations)
- Consider the full spectrum: conventional to unconventional, simple to complex
- Think about extremes, opposites, and edge cases
- Consider what competitors or other industries might do
- Include at least one "wild card" unconventional option

${additionalContext ? `## Additional Context from User\n${additionalContext}\n\n` : ""}

Respond with valid JSON in this exact format:
{
  "values": [
    {
      "value": "The value to add",
      "rationale": "Brief explanation of why this value is worth considering"
    }
  ]
}

Suggest ${count} new values. Be creative but relevant to the problem.`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Suggest new values for the "${targetColumn}" dimension.` },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages,
        temperature: 0.8,
        max_tokens: 800,
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

    return parsed.values || [];
  } catch (error) {
    console.error("Error generating values:", error);
    throw error;
  }
}
