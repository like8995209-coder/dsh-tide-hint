// src/index.ts
var name = "dsh-tide-hint";
var inject = ["webServer", "credentials"];
var ROUTE_PATH = "/api/dsh-tide-hint/official";
var BALANCE_ROUTE_PATH = "/api/dsh-tide-hint/balance";
var FETCH_TIMEOUT_MS = 5e3;
var MAX_TEXT_BYTES = 2e6;
var PLATFORM_CREDENTIAL_REF = "deepseek-account-platform/default";
var PLATFORM_BALANCE_URL = "https://platform.deepseek.com/api/v0/users/get_user_summary";
var RESOURCE_URLS = Object.freeze({
  pricing: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
  offer: "https://platform.deepseek.com/top_up"
});
function headerValue(req, name2) {
  const value = req.headers[name2.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function isLoopbackAddress(address) {
  const value = address.toLowerCase();
  return value === "::1" || value.startsWith("127.") || value.startsWith("::ffff:127.");
}
function isLoopbackHost(hostHeader) {
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "[::1]" || hostname === "::1" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}
function isTrustedRequest(ctx, req) {
  let connection;
  try {
    const candidate = ctx.get?.("connection", false) ?? ctx.get?.("connection");
    if (candidate && typeof candidate.requestRejection === "function") {
      connection = candidate;
    }
  } catch {
    connection = void 0;
  }
  if (connection?.requestRejection?.(req) === void 0) {
    if (connection !== void 0) return true;
  }
  const remote = req.socket?.remoteAddress ?? "";
  return isLoopbackAddress(remote) && isLoopbackHost(headerValue(req, "host"));
}
function isDeepSeekUrl(url) {
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && (host === "deepseek.com" || host.endsWith(".deepseek.com"));
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      credentials: "omit",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "Cache-Control": "no-cache"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const finalUrl = new URL(response.url || url);
    if (!isDeepSeekUrl(finalUrl)) throw new Error("\u91CD\u5B9A\u5411\u76EE\u6807\u4E0D\u662F deepseek.com");
    const contentLength = Number(response.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_TEXT_BYTES) {
      throw new Error("\u5B98\u65B9\u9875\u9762\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650");
    }
    const text = await response.text();
    if (text.length > MAX_TEXT_BYTES) throw new Error("\u5B98\u65B9\u9875\u9762\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
async function fetchOfficial(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await sleep(180);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("\u5B98\u65B9\u9875\u9762\u8BFB\u53D6\u5931\u8D25");
}
function sendText(res, status, body, sourceUrl, contentType = "text/plain; charset=utf-8") {
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (sourceUrl) headers["X-DSH-Tide-Source-Url"] = sourceUrl;
  res.writeHead(status, headers);
  res.end(body);
}
function sendError(res, status, reason) {
  sendText(res, status, reason);
}
function sendJson(res, status, value) {
  sendText(res, status, JSON.stringify(value), void 0, "application/json; charset=utf-8");
}
function tokenOfResolvedCredential(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const resolved = value;
  for (const candidate of [resolved.value, resolved.token, resolved.payload?.token]) {
    if (typeof candidate === "string" && candidate !== "") return candidate;
  }
  return null;
}
async function fetchPlatformBalance(token) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(PLATFORM_BALANCE_URL, {
        method: "GET",
        redirect: "error",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          "x-dsh-auth-token": token
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (body.data?.biz_code !== 0) return null;
      const wallets = Array.isArray(body.data.biz_data?.normal_wallets) ? body.data.biz_data.normal_wallets : [];
      const cny = wallets.filter((wallet) => wallet.currency === "CNY").map((wallet) => Number(wallet.balance)).filter((value) => Number.isFinite(value) && value >= 0);
      if (cny.length === 0) return null;
      return cny.reduce((sum, value) => sum + value, 0);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await sleep(180);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("\u5B98\u65B9\u4F59\u989D\u8BFB\u53D6\u5931\u8D25");
}
function apply(ctx) {
  const register = () => ctx.webServer.register({
    kind: "exact",
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (req.method !== "GET") {
        sendError(res, 405, "\u53EA\u5141\u8BB8\u53EA\u8BFB GET");
        return;
      }
      if (!isTrustedRequest(ctx, req)) {
        sendError(res, 403, "\u53EA\u5141\u8BB8\u672C\u673A DSH \u8BF7\u6C42");
        return;
      }
      const resource = new URL(req.url || ROUTE_PATH, "http://127.0.0.1").searchParams.get("resource");
      if (resource !== "pricing" && resource !== "offer") {
        sendError(res, 400, "resource \u53EA\u80FD\u662F pricing \u6216 offer");
        return;
      }
      const sourceUrl = RESOURCE_URLS[resource];
      try {
        const html = await fetchOfficial(sourceUrl);
        sendText(res, 200, html, sourceUrl);
      } catch (error) {
        ctx.logger?.warn?.(`dsh-tide-hint: \u5B98\u65B9\u9875\u9762\u8BFB\u53D6\u5931\u8D25\uFF1A${sourceUrl}`);
        ctx.logger?.warn?.(error);
        sendError(res, 502, "\u5B98\u65B9\u9875\u9762\u6682\u65F6\u4E0D\u53EF\u7528");
      }
    }
  });
  if (typeof ctx.effect === "function") {
    ctx.effect(register, "dsh-tide-hint: official read-only proxy");
  } else {
    register();
  }
  const registerBalance = () => ctx.webServer.register({
    kind: "exact",
    path: BALANCE_ROUTE_PATH,
    handler: async (req, res) => {
      if (req.method !== "GET") {
        sendError(res, 405, "\u53EA\u5141\u8BB8\u53EA\u8BFB GET");
        return;
      }
      if (!isTrustedRequest(ctx, req)) {
        sendError(res, 403, "\u53EA\u5141\u8BB8\u672C\u673A DSH \u8BF7\u6C42");
        return;
      }
      const credentials = ctx.credentials ?? ctx.get?.("credentials", false);
      if (!credentials || typeof credentials.resolve !== "function") {
        sendJson(res, 503, { ok: false, error: "credentials-unavailable" });
        return;
      }
      try {
        const resolved = typeof credentials.readRecord === "function" ? await credentials.readRecord(PLATFORM_CREDENTIAL_REF) : await credentials.resolve(PLATFORM_CREDENTIAL_REF);
        const token = tokenOfResolvedCredential(resolved);
        if (token === null) {
          sendJson(res, 503, { ok: false, error: "account-token-unavailable" });
          return;
        }
        const balanceCny = await fetchPlatformBalance(token);
        sendJson(res, 200, {
          ok: balanceCny !== null,
          balanceCny,
          sourceUrl: PLATFORM_BALANCE_URL,
          updatedAt: Date.now()
        });
      } catch {
        ctx.logger?.warn?.("dsh-tide-hint: \u5B98\u65B9\u8D26\u6237\u4F59\u989D\u8BFB\u53D6\u5931\u8D25");
        sendJson(res, 502, { ok: false, error: "balance-unavailable" });
      }
    }
  });
  if (typeof ctx.effect === "function") {
    ctx.effect(registerBalance, "dsh-tide-hint: official balance route");
  } else {
    registerBalance();
  }
}
export {
  apply,
  inject,
  name
};
