// Cloudflare Worker 入口（公開站，僅開放 POST 給 PM 提交）
// 路由：
//   POST /api/pm-checks   PM 提交核對表（公開）
//   GET  /api/pm-checks   一律拒絕；查詢請走 voc-reports（受 Access 保護）
//   GET  /pm              → 跳 PM 核對表
//   其他路徑              → 交給 ASSETS 處理（靜態檔，無副檔名自動補 .html）

const KEY_PREFIX = "pm-check:";
const KV_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 天

const SHORTLINKS = {
  "/pm": "/research/hp-elitebook-8-pm-check.html",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (SHORTLINKS[url.pathname]) {
      return Response.redirect(new URL(SHORTLINKS[url.pathname], url.origin).toString(), 302);
    }

    if (!url.pathname.startsWith("/api/")) {
      // 無副檔名先嘗試 .html 補
      if (!url.pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(url.pathname)) {
        const tryUrl = new URL(url);
        tryUrl.pathname = url.pathname + ".html";
        const tryRes = await env.ASSETS.fetch(new Request(tryUrl, request));
        if (tryRes.status === 200) return tryRes;
      }
      return env.ASSETS.fetch(request);
    }
    if (url.pathname !== "/api/pm-checks") {
      return reply({ ok: false, error: "Not found" }, 404);
    }
    if (!env.PM_CHECKS_KV) {
      return reply({ ok: false, error: "KV 'PM_CHECKS_KV' 未綁定，請至 wrangler.jsonc 設定 kv_namespaces" }, 500);
    }
    if (request.method === "OPTIONS") return cors();
    if (request.method === "POST") return handlePost(request, env);
    return reply({ ok: false, error: "Method not allowed" }, 405);
  },
};

async function handlePost(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return reply({ ok: false, error: "Invalid JSON" }, 400); }

  const reportId = sanitize(body.reportId || "unknown", /[^a-z0-9-]/gi).slice(0, 50);
  const pmName = (body.pm?.name || "anonymous").slice(0, 50);
  const ts = new Date().toISOString();
  const id = ts.slice(0, 19).replace(/[:-]/g, "") + "-" + sanitize(pmName, /[^a-zA-Z0-9一-鿿]/g);
  const fullKey = `${KEY_PREFIX}${reportId}:${id}`;

  const record = makeRecord(id, reportId, ts, body, pmName);
  const metadata = makeMeta(pmName, reportId, ts, record.summary);
  try {
    await env.PM_CHECKS_KV.put(fullKey, JSON.stringify(record), { metadata, expirationTtl: KV_TTL_SECONDS });
  } catch (e) {
    return reply({ ok: false, error: "KV write failed: " + e.message }, 500);
  }
  return reply({ ok: true, id, key: fullKey });
}

function makeRecord(id, reportId, ts, body, pmName) {
  const r = Object.create(null);
  r.id = id;
  r.reportId = reportId;
  r.submittedAt = ts;
  r.pm = body.pm || { name: pmName };
  r.summary = body.summary || {};
  r.items = body.items || [];
  return r;
}

function makeMeta(pmName, reportId, ts, s) {
  const m = Object.create(null);
  m.pmName = pmName;
  m.reportId = reportId;
  m.submittedAt = ts;
  m.v = s.v || 0;
  m.x = s.x || 0;
  m.q = s.q || 0;
  m.todo = s.todo || 0;
  m.total = s.total || 0;
  return m;
}

function sanitize(raw, regex) { return (raw || "").replace(regex, ""); }
function jsonHeaders() { return { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }; }
function reply(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: jsonHeaders() }); }
function cors() {
  const h = Object.create(null);
  h["access-control-allow-origin"] = "*";
  h["access-control-allow-methods"] = "GET, POST, OPTIONS";
  h["access-control-allow-headers"] = "content-type";
  return new Response(null, { headers: h });
}
