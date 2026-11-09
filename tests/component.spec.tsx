// @vitest-environment jsdom

import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_TIDE_RULES,
  OFFER_CACHE_KEY,
  PREWARN_EVENT,
  RULES_CACHE_KEY,
  SCHEDULER_CACHE_KEY,
  TASK_START_EVENT,
  TOP_UP_URL,
} from "../src/client/index";
import {
  createTideHintCard,
  type TideHintCardProps,
} from "../src/client/TideHintCard";

const FIXED_NOW = new Date("2026-11-09T10:00:00+08:00");
const PRICING_HTML = `
  <p>(2) 空闲时段价格为高峰时段价格的一半。北京时间周一至周五（不含中国法定节假日）
  9:00 - 12:00、14:00 - 18:00 为高峰时段；其余时段，包括周末及中国法定节假日全天均为空闲时段。</p>
`;

function okResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html",
      "x-dsh-tide-source-url": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
    },
  });
}

function cardProps(overrides: Partial<TideHintCardProps> = {}): TideHintCardProps {
  return {
    statusLabel: "谷时·半价",
    isPeak: false,
    countdown: "00:01:05",
    targetText: "2026-11-09 14:00（北京时间）",
    updatedText: "规则更新：2026-11-09 10:00",
    offlineText: null,
    warning: null,
    offerText: "官方无额外充值优惠",
    offerWarning: null,
    balanceText: "¥10.00",
    tokenEstimateText: "10.00 亿",
    balanceWarning: null,
    tokenBasisText: "deepseek-flash 输入（缓存未命中） · ¥1/百万 tokens",
    schedulerEnabled: false,
    manualLocked: false,
    onSchedulerEnableChange: vi.fn(),
    onManualLockChange: vi.fn(),
    loading: false,
    ...overrides,
  };
}

function installDailyCache(options: {
  parseStatus?: "ok" | "parse_failed";
  fetchedAt?: string | null;
  lastFetchedDate?: string;
  lastError?: string;
} = {}): void {
  const rules = {
    ...BUILTIN_TIDE_RULES,
    parseStatus: options.parseStatus ?? "ok",
    fetchedAt: options.fetchedAt === undefined ? "2026-11-09T02:00:00.000Z" : options.fetchedAt,
    lastFetchedDate: options.lastFetchedDate ?? "2026-11-09",
    lastError: options.lastError,
  };
  localStorage.setItem(RULES_CACHE_KEY, JSON.stringify(rules));
  localStorage.setItem(OFFER_CACHE_KEY, JSON.stringify({
    date: "2026-11-09",
    text: "官方无额外充值优惠",
    sourceUrl: TOP_UP_URL,
    fetchedAt: "2026-11-09T02:00:00.000Z",
    status: "ok",
    balanceCny: 10,
  }));
}

async function freshClientModule() {
  vi.resetModules();
  return import("../src/client/index");
}

function mountPlugin(mod: Awaited<ReturnType<typeof freshClientModule>>) {
  let component: React.ComponentType | null = null;
  const cleanups: Array<() => void> = [];
  const slots = {
    inject: vi.fn((key: string, callback: () => () => void) => {
      if (key === "sidebar.footer.action") return callback();
      return () => {};
    }),
    register: vi.fn((_options: Record<string, unknown>, registered: unknown) => {
      component = registered as React.ComponentType;
      return () => {
        component = null;
      };
    }),
    specDynamic: vi.fn((key: string) => (
      key === "sidebar.footer.action" ? { kind: "list" } : undefined
    )),
    declarationEpoch: vi.fn((key: string) => key === "sidebar.footer.action" ? 1 : 0),
  };
  const ctx = {
    slots,
    effect: vi.fn((factory: () => () => void) => {
      const dispose = factory();
      cleanups.push(dispose);
      return dispose;
    }),
  };

  const plugin = mod.createClientPlugin(React);
  plugin.apply(ctx);
  if (!component) throw new Error("TideHintCard 未注册");
  return {
    component,
    slots,
    dispose() {
      for (const cleanupFn of cleanups.splice(0).reverse()) cleanupFn();
    },
  };
}

async function flushAsyncWork(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 12; index += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("TideHintCard 视觉与文案", () => {
  it("谷时显示绿色回退变量和“谷时·半价”", () => {
    const Card = createTideHintCard(React);
    const { container } = render(<Card {...cardProps()} />);
    const css = container.querySelector("style")?.textContent ?? "";

    expect(screen.getAllByText("谷时·半价").length).toBeGreaterThanOrEqual(1);
    expect(css).toContain("var(--dsw-alias-state-success-primary,#10b981)");
    expect(screen.getByRole("link").getAttribute("data-peak")).toBe("false");
  });

  it("峰时显示红色回退变量和“峰时·原价”", () => {
    const Card = createTideHintCard(React);
    const { container } = render(
      <Card {...cardProps({ statusLabel: "峰时·原价", isPeak: true })} />,
    );
    const css = container.querySelector("style")?.textContent ?? "";

    expect(screen.getAllByText("峰时·原价").length).toBeGreaterThanOrEqual(1);
    expect(css).toContain("var(--dsw-alias-state-error-primary,#ef4444)");
    expect(screen.getByRole("link").getAttribute("data-peak")).toBe("true");
  });

  it("显示余额和折算 token（亿）", () => {
    const Card = createTideHintCard(React);
    render(<Card {...cardProps({ balanceText: "¥8.89", tokenEstimateText: "0.09 亿" })} />);

    expect(screen.getByText("¥8.89")).toBeTruthy();
    expect(screen.getByText(/≈ 0\.09 亿 tokens/)).toBeTruthy();
  });

  it("点击目标严格指向硬编码官方充值页", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const Card = createTideHintCard(React);
    const { container } = render(<Card {...cardProps()} />);
    const link = screen.getByRole("link");

    expect(link.getAttribute("role")).toBe("link");
    fireEvent.click(link);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(TOP_UP_URL, "_blank");
  });

  it("调度复选框点击不触发卡片跳转并更新回调", () => {
    const onSchedulerEnableChange = vi.fn();
    const onManualLockChange = vi.fn();
    const Card = createTideHintCard(React);
    render(
      <Card
        {...cardProps({
          onSchedulerEnableChange,
          onManualLockChange,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText("自动调度"));
    fireEvent.click(screen.getByLabelText("手动锁定"));

    expect(onSchedulerEnableChange).toHaveBeenCalledWith(true);
    expect(onManualLockChange).toHaveBeenCalledWith(true);
  });
});

describe("运行时倒计时与更新时间", () => {
  it("每秒刷新并让秒数递减", async () => {
    installDailyCache();
    vi.stubGlobal("fetch", vi.fn());
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    const { container } = render(React.createElement(harness.component));

    const countdown = () => container.querySelector(".dsh-tide-hint-count")?.textContent ?? "";
    expect(countdown()).toContain("02:00:00");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(countdown()).toContain("01:59:59");
    harness.dispose();
  });

  it("fetchedAt + parseStatus=ok 显示格式化更新时间", async () => {
    installDailyCache();
    vi.stubGlobal("fetch", vi.fn());
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    render(React.createElement(harness.component));

    expect(screen.getAllByText("规则更新：2026-11-09 10:00").length).toBeGreaterThan(0);
    harness.dispose();
  });

  it("parse_failed 显示离线规则与警示原因", async () => {
    installDailyCache({
      parseStatus: "parse_failed",
      fetchedAt: null,
      lastError: "官网规则解析失败",
    });
    vi.stubGlobal("fetch", vi.fn());
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    render(React.createElement(harness.component));

    expect(screen.getAllByText("离线规则（内置快照）").length).toBeGreaterThan(0);
    expect(screen.getByText(/⚠ 官网规则解析失败/)).toBeTruthy();
    harness.dispose();
  });

  it("window.DSHTideHint API 更新并持久化调度状态", async () => {
    installDailyCache();
    vi.stubGlobal("fetch", vi.fn());
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    render(React.createElement(harness.component));

    expect(window.DSHTideHint).toBeTruthy();
    window.DSHTideHint?.setSchedulerEnable(true);
    window.DSHTideHint?.setManualLock(true);

    expect(JSON.parse(localStorage.getItem(SCHEDULER_CACHE_KEY) || "{}")).toMatchObject({
      enabled: true,
      manualLocked: true,
    });
    harness.dispose();
  });

  it("复用每秒 tick 派发启动信号和单次峰时预警", async () => {
    vi.setSystemTime(new Date("2026-11-09T13:59:10+08:00"));
    installDailyCache();
    localStorage.setItem(SCHEDULER_CACHE_KEY, JSON.stringify({
      enabled: true,
      manualLocked: false,
      prewarnAt: null,
      prewarnBoundary: null,
    }));
    vi.stubGlobal("fetch", vi.fn());
    const starts: CustomEvent[] = [];
    const prewarns: CustomEvent[] = [];
    const onStart = (event: Event) => starts.push(event as CustomEvent);
    const onPrewarn = (event: Event) => prewarns.push(event as CustomEvent);
    window.addEventListener(TASK_START_EVENT, onStart);
    window.addEventListener(PREWARN_EVENT, onPrewarn);

    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    render(React.createElement(harness.component));

    expect(starts.length).toBe(1);
    expect(starts[0].detail.signal).toBe("start");
    expect(prewarns.length).toBe(1);
    expect(prewarns[0].detail.message).toBe("距峰时原价时段60秒，即将自动停止后台任务。");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(prewarns.length).toBe(1);
    expect(starts.length).toBe(2);

    window.removeEventListener(TASK_START_EVENT, onStart);
    window.removeEventListener(PREWARN_EVENT, onPrewarn);
    harness.dispose();
  });
});

describe("每日首次刷新与降级", () => {
  it("当日未抓取时定价与充值资源各请求一次", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      return String(input).includes("resource=offer")
        ? okResponse("<p>首次充值 100 元赠送 10 元余额。</p>")
        : okResponse(PRICING_HTML);
    });
    vi.stubGlobal("fetch", fetchMock);
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    render(React.createElement(harness.component));
    await flushAsyncWork();

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.filter((url) => url.includes("resource=pricing"))).toHaveLength(1);
    expect(urls.filter((url) => url.includes("resource=offer"))).toHaveLength(1);
    harness.dispose();
  });

  it("lastFetchedDate=今日时不请求", async () => {
    installDailyCache();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    render(React.createElement(harness.component));
    await flushAsyncWork();

    expect(fetchMock).not.toHaveBeenCalled();
    harness.dispose();
  });

  it("非 2xx 时仍渲染倒计时，并降级为离线规则", async () => {
    const fetchMock = vi.fn(async () => okResponse("unavailable", 503));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    const { container } = render(React.createElement(harness.component));
    await flushAsyncWork();

    expect(container.querySelector(".dsh-tide-hint-count")?.textContent).toContain("02:00:00");
    expect(screen.getAllByText("离线规则（内置快照）").length).toBeGreaterThan(0);
    harness.dispose();
  });

  it("超时后仍渲染倒计时，不抛错白屏", async () => {
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })
    )));
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    const { container } = render(React.createElement(harness.component));

    expect(container.querySelector(".dsh-tide-hint-count")?.textContent).toContain("02:00:00");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(screen.getAllByText("离线规则（内置快照）").length).toBeGreaterThan(0);
    expect(container.querySelector(".dsh-tide-hint-count")?.textContent).not.toContain("--:--:--");
    harness.dispose();
  });

  it("返回不含“高峰时段”的 HTML 时标记 parse_failed 并沿用旧规则", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => (
      String(input).includes("resource=offer")
        ? okResponse("<p>请选择充值金额</p>")
        : okResponse("<html><body><p>页面结构已变化</p></body></html>")
    ));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await freshClientModule();
    const harness = mountPlugin(mod);
    const { container } = render(React.createElement(harness.component));
    await flushAsyncWork();

    const cached = JSON.parse(localStorage.getItem(RULES_CACHE_KEY) || "{}");
    expect(cached.parseStatus).toBe("parse_failed");
    expect(cached.peakWindows).toEqual(["09:00-12:00", "14:00-18:00"]);
    expect(screen.getAllByText("离线规则（内置快照）").length).toBeGreaterThan(0);
    expect(container.querySelector(".dsh-tide-hint-count")?.textContent).toContain("02:00:00");
    harness.dispose();
  });
});
