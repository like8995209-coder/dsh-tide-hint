/**
 * dsh-tide-hint 宿主半区。
 *
 * 只提供两个固定官方 URL 的只读 GET 代理，解决浏览器直接访问定价页时的 CORS
 * 限制。客户端不能传入 URL，只能选择 pricing / offer；代理不会转发 Cookie、
 * 凭据、表单或本机隐私。整个运行时没有 LLM 调用，也不修改任何对话请求。
 */

export const name = "dsh-tide-hint";
export const inject = ["webServer", "credentials"];

const ROUTE_PATH = "/api/dsh-tide-hint/official";
const BALANCE_ROUTE_PATH = "/api/dsh-tide-hint/balance";
const FETCH_TIMEOUT_MS = 5_000;
const MAX_TEXT_BYTES = 2_000_000;
const PLATFORM_CREDENTIAL_REF = "deepseek-account-platform/default";
const PLATFORM_BALANCE_URL = "https://platform.deepseek.com/api/v0/users/get_user_summary";

/** 固定白名单：客户端无法指定任意 URL。 */
const RESOURCE_URLS = Object.freeze({
  pricing: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
  offer: "https://platform.deepseek.com/top_up",
});

type Resource = keyof typeof RESOURCE_URLS;

interface HostContext {
  effect?: (factory: () => () => void, label?: string) => () => void;
  get?: (name: string, strict?: boolean) => unknown;
  webServer: {
    register(route: {
      kind: "exact";
      path: string;
      handler: (req: HostRequest, res: HostResponse) => void | Promise<void>;
    }): () => void;
  };
  credentials?: {
    resolve(ref: string): Promise<unknown>;
    readRecord?(key: string): Promise<unknown>;
  };
  logger?: {
    warn?: (message: unknown) => void;
  };
}

interface HostRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
}

interface HostResponse {
  statusCode: number;
  writeHead(status: number, headers?: Record<string, string>): void;
  end(body?: string | Uint8Array): void;
}

interface ConnectionFace {
  requestRejection?: (request: HostRequest) => unknown;
}

interface CredentialResolution {
  value?: unknown;
  token?: unknown;
  payload?: {
    token?: unknown;
  };
}

function headerValue(req: HostRequest, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isLoopbackAddress(address: string): boolean {
  const value = address.toLowerCase();
  return value === "::1" || value.startsWith("127.") || value.startsWith("::ffff:127.");
}

function isLoopbackHost(hostHeader: string): boolean {
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "[::1]" || hostname === "::1" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

/** 允许 DSH 自带的 connection 准入判定；没有该服务时只接受本机请求。 */
function isTrustedRequest(ctx: HostContext, req: HostRequest): boolean {
  let connection: ConnectionFace | undefined;
  try {
    const candidate = ctx.get?.("connection", false) ?? ctx.get?.("connection");
    if (candidate && typeof (candidate as ConnectionFace).requestRejection === "function") {
      connection = candidate as ConnectionFace;
    }
  } catch {
    connection = undefined;
  }

  if (connection?.requestRejection?.(req) === undefined) {
    // 有 connection 服务且明确放行；没有服务时继续走本机地址检查。
    if (connection !== undefined) return true;
  }

  const remote = req.socket?.remoteAddress ?? "";
  return isLoopbackAddress(remote) && isLoopbackHost(headerValue(req, "host"));
}

function isDeepSeekUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && (host === "deepseek.com" || host.endsWith(".deepseek.com"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOnce(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      credentials: "omit",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const finalUrl = new URL(response.url || url);
    if (!isDeepSeekUrl(finalUrl)) throw new Error("重定向目标不是 deepseek.com");

    const contentLength = Number(response.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_TEXT_BYTES) {
      throw new Error("官方页面超过大小上限");
    }

    const text = await response.text();
    if (text.length > MAX_TEXT_BYTES) throw new Error("官方页面超过大小上限");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** 单个官方资源最多请求 1 次、重试 1 次，每次超时 5 秒。 */
async function fetchOfficial(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await sleep(180);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("官方页面读取失败");
}

function sendText(
  res: HostResponse,
  status: number,
  body: string,
  sourceUrl?: string,
  contentType = "text/plain; charset=utf-8",
): void {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (sourceUrl) headers["X-DSH-Tide-Source-Url"] = sourceUrl;
  res.writeHead(status, headers);
  res.end(body);
}

function sendError(res: HostResponse, status: number, reason: string): void {
  sendText(res, status, reason);
}

function sendJson(res: HostResponse, status: number, value: unknown): void {
  sendText(res, status, JSON.stringify(value), undefined, "application/json; charset=utf-8");
}

function tokenOfResolvedCredential(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const resolved = value as CredentialResolution;
  for (const candidate of [resolved.value, resolved.token, resolved.payload?.token]) {
    if (typeof candidate === "string" && candidate !== "") return candidate;
  }
  return null;
}

async function fetchPlatformBalance(token: string): Promise<number | null> {
  let lastError: unknown;
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
          "x-dsh-auth-token": token,
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json() as {
        data?: {
          biz_code?: number;
          biz_data?: {
            normal_wallets?: Array<{ balance?: unknown; currency?: unknown }>;
          };
        };
      };
      if (body.data?.biz_code !== 0) return null;
      const wallets = Array.isArray(body.data.biz_data?.normal_wallets)
        ? body.data.biz_data.normal_wallets
        : [];
      const cny = wallets
        .filter((wallet) => wallet.currency === "CNY")
        .map((wallet) => Number(wallet.balance))
        .filter((value) => Number.isFinite(value) && value >= 0);
      if (cny.length === 0) return null;
      return cny.reduce((sum, value) => sum + value, 0);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await sleep(180);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("官方余额读取失败");
}

export function apply(ctx: HostContext): void {
  const register = () => ctx.webServer.register({
    kind: "exact",
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (req.method !== "GET") {
        sendError(res, 405, "只允许只读 GET");
        return;
      }
      if (!isTrustedRequest(ctx, req)) {
        sendError(res, 403, "只允许本机 DSH 请求");
        return;
      }

      const resource = new URL(req.url || ROUTE_PATH, "http://127.0.0.1").searchParams.get("resource");
      if (resource !== "pricing" && resource !== "offer") {
        sendError(res, 400, "resource 只能是 pricing 或 offer");
        return;
      }

      const sourceUrl = RESOURCE_URLS[resource as Resource];
      try {
        const html = await fetchOfficial(sourceUrl);
        sendText(res, 200, html, sourceUrl);
      } catch (error) {
        ctx.logger?.warn?.(`dsh-tide-hint: 官方页面读取失败：${sourceUrl}`);
        ctx.logger?.warn?.(error);
        sendError(res, 502, "官方页面暂时不可用");
      }
    },
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
        sendError(res, 405, "只允许只读 GET");
        return;
      }
      if (!isTrustedRequest(ctx, req)) {
        sendError(res, 403, "只允许本机 DSH 请求");
        return;
      }
      const credentials = ctx.credentials ?? ctx.get?.("credentials", false) as HostContext["credentials"];
      if (!credentials || typeof credentials.resolve !== "function") {
        sendJson(res, 503, { ok: false, error: "credentials-unavailable" });
        return;
      }
      try {
        const resolved = typeof credentials.readRecord === "function"
          ? await credentials.readRecord(PLATFORM_CREDENTIAL_REF)
          : await credentials.resolve(PLATFORM_CREDENTIAL_REF);
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
          updatedAt: Date.now(),
        });
      } catch {
        ctx.logger?.warn?.("dsh-tide-hint: 官方账户余额读取失败");
        sendJson(res, 502, { ok: false, error: "balance-unavailable" });
      }
    },
  });

  if (typeof ctx.effect === "function") {
    ctx.effect(registerBalance, "dsh-tide-hint: official balance route");
  } else {
    registerBalance();
  }
}
