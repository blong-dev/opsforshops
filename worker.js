/**
 * OpsForShops Worker — handles API routes, falls through to static assets.
 *
 * Routes:
 *   POST /api/ops-health — lead capture from diagnostic form
 *   *    everything else — served from _site/ static assets
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API: Ops Health Diagnostic submission ──
    if (url.pathname === "/api/ops-health" && request.method === "POST") {
      return handleOpsHealth(request, env);
    }

    // ── CORS preflight for API routes ──
    if (url.pathname === "/api/ops-health" && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ── Static assets (fall through) ──
    return env.ASSETS.fetch(request);
  },
};

async function handleOpsHealth(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }

  // Enrich with Cloudflare geo data (server-side, no cookies)
  const cf = request.cf || {};
  const payload = {
    ...body,
    geo_city: cf.city || null,
    geo_region: cf.region || null,
    geo_country: cf.country || null,
    device: request.headers.get("user-agent") || "",
    referrer: body.referrer || request.headers.get("referer") || "",
  };

  // Forward to gnosis gateway
  const gatewayUrl = env.GNOSIS_GATEWAY_URL;
  const serviceKey = env.OPS_LEAD_SERVICE_KEY;

  if (gatewayUrl && serviceKey) {
    try {
      const resp = await fetch(gatewayUrl + "/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + serviceKey,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        console.error("Gateway error:", resp.status, await resp.text());
      }
    } catch (err) {
      console.error("Gateway POST failed:", err.message);
    }
  } else {
    console.warn("GNOSIS_GATEWAY_URL or OPS_LEAD_SERVICE_KEY not configured");
  }

  return jsonResponse({ ok: true }, 200);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
