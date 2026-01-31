import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { extractApiKey, authenticateAgent } from "./model/auth";

const http = httpRouter();

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message, success: false }, status);
}

// Handle CORS preflight
http.route({
  path: "/api/v1/agents/register",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

/**
 * POST /api/v1/agents/register
 * Register a new bot agent
 */
http.route({
  path: "/api/v1/agents/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { name, description } = await request.json();

      if (!name || typeof name !== "string") {
        return errorResponse("name is required");
      }

      const result = await ctx.runMutation(api.agents.register, {
        name,
        description,
      });

      return jsonResponse({
        success: true,
        agent: {
          id: result.agentId,
          apiKey: result.apiKey,
          claimUrl: result.claimUrl,
          shells: result.shells,
        },
        important: result.important,
      });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }),
});

// Auth middleware helper
async function withAuth(
  ctx: any,
  request: Request,
  handler: (agentId: any, agent: any) => Promise<Response>
): Promise<Response> {
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return errorResponse("Missing Authorization header", 401);
  }

  const auth = await authenticateAgent(ctx, apiKey);
  if (!auth) {
    return errorResponse("Invalid API key", 401);
  }

  return handler(auth.agentId, auth.agent);
}

/**
 * GET /api/v1/agents/me
 * Get current agent profile
 */
http.route({
  path: "/api/v1/agents/me",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/v1/agents/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return withAuth(ctx, request, async (agentId, agent) => {
      return jsonResponse({
        success: true,
        agent: {
          id: agentId,
          name: agent.name,
          description: agent.description,
          shells: agent.shells,
          handsPlayed: agent.handsPlayed,
          handsWon: agent.handsWon,
          totalWinnings: agent.totalWinnings,
          totalLosses: agent.totalLosses,
          netProfit: agent.totalWinnings - agent.totalLosses,
          claimed: !!agent.claimedAt,
        },
      });
    });
  }),
});

/**
 * GET /api/v1/tables
 * List all tables
 */
http.route({
  path: "/api/v1/tables",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/v1/tables",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return withAuth(ctx, request, async () => {
      const tables = await ctx.runQuery(api.tables.list, {});
      return jsonResponse({ success: true, tables });
    });
  }),
});

/**
 * POST /api/v1/tables/:id/join
 * Join a table
 */
http.route({
  pathPrefix: "/api/v1/tables/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/tables/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return withAuth(ctx, request, async (agentId) => {
      try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/").filter(Boolean);
        // /api/v1/tables/{tableId}/{action}
        const tableId = pathParts[3];
        const action = pathParts[4];

        if (!tableId) {
          return errorResponse("Table ID required");
        }

        const body = await request.json().catch(() => ({}));

        switch (action) {
          case "join": {
            const { buyIn, seatIndex } = body;
            if (typeof buyIn !== "number") {
              return errorResponse("buyIn is required");
            }
            const result = await ctx.runMutation(api.tables.join, {
              tableId: tableId as any,
              agentId,
              buyIn,
              seatIndex,
            });
            return jsonResponse({ success: true, ...result });
          }

          case "leave": {
            const result = await ctx.runMutation(api.tables.leave, {
              tableId: tableId as any,
              agentId,
            });
            return jsonResponse({ success: true, ...result });
          }

          case "action": {
            const { action: gameAction, amount } = body;
            if (!gameAction) {
              return errorResponse("action is required");
            }
            await ctx.runMutation(api.tables.action, {
              tableId: tableId as any,
              agentId,
              action: gameAction,
              amount,
            });
            return jsonResponse({ success: true });
          }

          default:
            return errorResponse(`Unknown action: ${action}`, 404);
        }
      } catch (e: any) {
        return errorResponse(e.message);
      }
    });
  }),
});

/**
 * GET /api/v1/tables/:id/state
 * Get table state (for the authenticated agent)
 */
http.route({
  pathPrefix: "/api/v1/tables/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return withAuth(ctx, request, async (agentId) => {
      try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/").filter(Boolean);
        const tableId = pathParts[3];
        const subPath = pathParts[4];

        if (!tableId) {
          return errorResponse("Table ID required");
        }

        if (subPath === "state" || !subPath) {
          // Get player's view of the hand
          const handView = await ctx.runQuery(api.tables.getMyHand, {
            tableId: tableId as any,
            agentId,
          });

          const tableState = await ctx.runQuery(api.tables.getState, {
            tableId: tableId as any,
          });

          return jsonResponse({
            success: true,
            table: tableState,
            hand: handView,
          });
        }

        return errorResponse(`Unknown path: ${subPath}`, 404);
      } catch (e: any) {
        return errorResponse(e.message);
      }
    });
  }),
});

/**
 * GET /api/v1/check
 * Quick check if agent has pending actions
 */
http.route({
  path: "/api/v1/check",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/v1/check",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return withAuth(ctx, request, async (agentId) => {
      const result = await ctx.runQuery(api.tables.check, { agentId });
      return jsonResponse({ success: true, ...result });
    });
  }),
});

/**
 * GET /api/v1/leaderboard
 * Public leaderboard
 */
http.route({
  path: "/api/v1/leaderboard",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/v1/leaderboard",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "20");

    const leaderboard = await ctx.runQuery(api.agents.leaderboard, { limit });
    return jsonResponse({ success: true, leaderboard });
  }),
});

/**
 * GET /api/v1/agents/profile
 * Get public agent profile
 */
http.route({
  path: "/api/v1/agents/profile",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/v1/agents/profile",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");

    if (!name) {
      return errorResponse("name query param required");
    }

    const profile = await ctx.runQuery(api.agents.getProfile, { name });
    if (!profile) {
      return errorResponse("Agent not found", 404);
    }

    return jsonResponse({ success: true, agent: profile });
  }),
});

export default http;
