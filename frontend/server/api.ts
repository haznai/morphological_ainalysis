import { Router } from "@oak/oak";
import { getLatestBox, saveBox, updateBox } from "./db.ts";
import {
  analyzeAllCombinations,
  generateColumns,
  generateValues,
  type CombinationEvaluation,
  type GeneratedColumn,
  type GeneratedValue,
} from "./openai.ts";

export const apiRouter = new Router();

apiRouter.get("/api/zwicky-box", (ctx) => {
  try {
    const box = getLatestBox();
    ctx.response.body = box || { 
      id: null,
      data: {
        columns: ['Parameter 1', 'Parameter 2'],
        rows: [
          ['Value 1-1', 'Value 2-1'],
          ['Value 1-2', 'Value 2-2']
        ]
      }
    };
  } catch (error) {
    console.error('Error getting zwicky box:', error);
    ctx.response.status = 500;
    ctx.response.body = { 
      success: false, 
      error: 'Failed to retrieve zwicky box' 
    };
  }
});

apiRouter.post("/api/zwicky-box", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    
    if (!body.data) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Missing data field' 
      };
      return;
    }

    if (!body.data.columns || !Array.isArray(body.data.columns)) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Invalid columns data' 
      };
      return;
    }

    if (!body.data.rows || !Array.isArray(body.data.rows)) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Invalid rows data' 
      };
      return;
    }

    const id = saveBox(body.data);
    ctx.response.body = { 
      id, 
      success: true, 
      message: 'Zwicky box saved successfully' 
    };
  } catch (error) {
    console.error('Error saving zwicky box:', error);
    ctx.response.status = 500;
    ctx.response.body = { 
      success: false, 
      error: 'Failed to save zwicky box' 
    };
  }
});

apiRouter.put("/api/zwicky-box/:id", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    
    if (isNaN(id) || id <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Invalid ID parameter' 
      };
      return;
    }

    const body = await ctx.request.body.json();
    
    if (!body.data) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Missing data field' 
      };
      return;
    }

    if (!body.data.columns || !Array.isArray(body.data.columns)) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Invalid columns data' 
      };
      return;
    }

    if (!body.data.rows || !Array.isArray(body.data.rows)) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: 'Invalid rows data' 
      };
      return;
    }

    updateBox(id, body.data);
    ctx.response.body = { 
      success: true, 
      message: 'Zwicky box updated successfully' 
    };
  } catch (error) {
    console.error('Error updating zwicky box:', error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: 'Failed to update zwicky box'
    };
  }
});

// AI Analysis endpoint - evaluates all combinations
apiRouter.post("/api/analyze", async (ctx) => {
  try {
    const body = await ctx.request.body.json();

    if (!body.apiKey) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: 'Missing API key'
      };
      return;
    }

    if (!body.data || !body.data.columns || !body.data.rows) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: 'Missing zwicky box data'
      };
      return;
    }

    const results: CombinationEvaluation[] = await analyzeAllCombinations({
      problem: body.data.problem || "",
      columns: body.data.columns,
      rows: body.data.rows,
      apiKey: body.apiKey,
    });

    ctx.response.body = {
      success: true,
      results,
      totalCombinations: results.length,
      summary: {
        yes: results.filter(r => r.verdict === "yes").length,
        no: results.filter(r => r.verdict === "no").length,
        promising: results.filter(r => r.verdict === "promising").length,
      }
    };
  } catch (error) {
    console.error('Error analyzing combinations:', error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze combinations'
    };
  }
});

// ============================================================================
// GENERATION MODE ENDPOINTS
// ============================================================================

// Generate new column suggestions
apiRouter.post("/api/generate/columns", async (ctx) => {
  try {
    const body = await ctx.request.body.json();

    if (!body.apiKey) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: 'Missing API key' };
      return;
    }

    if (!body.problem && (!body.existingColumns || body.existingColumns.length === 0)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: 'Need either a problem statement or existing columns for context' };
      return;
    }

    const columns: GeneratedColumn[] = await generateColumns({
      problem: body.problem || "",
      existingColumns: body.existingColumns || [],
      rows: body.rows || [],
      additionalContext: body.additionalContext,
      count: body.count || 3,
      apiKey: body.apiKey,
    });

    ctx.response.body = {
      success: true,
      columns,
    };
  } catch (error) {
    console.error('Error generating columns:', error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate columns'
    };
  }
});

// Generate new value suggestions for a column
apiRouter.post("/api/generate/values", async (ctx) => {
  try {
    const body = await ctx.request.body.json();

    if (!body.apiKey) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: 'Missing API key' };
      return;
    }

    if (!body.targetColumn) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: 'Missing target column' };
      return;
    }

    const values: GeneratedValue[] = await generateValues({
      problem: body.problem || "",
      columns: body.columns || [],
      rows: body.rows || [],
      targetColumn: body.targetColumn,
      additionalContext: body.additionalContext,
      count: body.count || 5,
      apiKey: body.apiKey,
    });

    ctx.response.body = {
      success: true,
      values,
    };
  } catch (error) {
    console.error('Error generating values:', error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate values'
    };
  }
});