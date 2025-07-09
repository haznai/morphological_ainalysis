import { Router } from "@oak/oak";
import { getLatestBox, saveBox, updateBox } from "./db.ts";

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