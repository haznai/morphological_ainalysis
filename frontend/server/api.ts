import { Router } from "@oak/oak";
import { getLatestBox, saveBox, updateBox } from "./db.ts";
import { analyzeAllCombinations, type CombinationEvaluation } from "./openai.ts";

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