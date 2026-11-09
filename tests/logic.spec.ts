import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_TIDE_RULES,
  estimateTokensYi,
  formatCountdown,
  formatTokenEstimate,
  nextTransitionAt,
  parseOfficialBalance,
  parseTokenPricing,
  tideStateAt,
} from "../src/client/index";
import {
  DEFAULT_SCHEDULER_STATE,
  PREWARN_MESSAGE,
  SCHEDULER_CACHE_KEY,
  evaluateScheduler,
  loadSchedulerState,
  saveSchedulerState,
} from "../src/client/scheduler";

const FIXED_NOW = "2026-11-09T10:00:00+08:00";

function setNow(iso: string): void {
  vi.setSystemTime(new Date(iso));
}

function isPeakTime(iso?: string): boolean {
  if (iso) setNow(iso);
  return tideStateAt(Date.now(), BUILTIN_TIDE_RULES).isPeak;
}

function getNextBoundary(iso?: string): Date {
  if (iso) setNow(iso);
  const boundary = nextTransitionAt(Date.now(), BUILTIN_TIDE_RULES);
  if (boundary === null) throw new Error("未找到下一状态边界");
  return new Date(boundary);
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(FIXED_NOW) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("北京时间峰谷边界", () => {
  it.each([
    ["2026-11-09T08:59:59+08:00", false],
    ["2026-11-09T09:00:00+08:00", true],
    ["2026-11-09T11:59:59+08:00", true],
    ["2026-11-09T12:00:00+08:00", false],
    ["2026-11-09T13:59:59+08:00", false],
    ["2026-11-09T14:00:00+08:00", true],
    ["2026-11-09T17:59:59+08:00", true],
    ["2026-11-09T18:00:00+08:00", false],
  ])("%s → %s", (iso, expected) => {
    expect(isPeakTime(iso)).toBe(expected);
  });

  it("周六 10:00、周日 15:00 均为谷时", () => {
    expect(isPeakTime("2026-11-14T10:00:00+08:00")).toBe(false);
    expect(isPeakTime("2026-11-15T15:00:00+08:00")).toBe(false);
  });

  it("法定节假日 10:00 为谷时", () => {
    expect(isPeakTime("2026-10-01T10:00:00+08:00")).toBe(false);
  });

  it("调休上班日优先于周末，10:00 为峰时", () => {
    expect(isPeakTime("2026-02-14T10:00:00+08:00")).toBe(true);
  });
});

describe("下一状态边界", () => {
  it("工作日 12:30 → 14:00", () => {
    expect(getNextBoundary("2026-11-09T12:30:00+08:00").toISOString())
      .toBe("2026-11-09T06:00:00.000Z");
  });

  it("工作日 10:00 → 12:00", () => {
    expect(getNextBoundary("2026-11-09T10:00:00+08:00").toISOString())
      .toBe("2026-11-09T04:00:00.000Z");
  });

  it("周五 18:30 → 下周一 09:00", () => {
    expect(getNextBoundary("2026-11-06T18:30:00+08:00").toISOString())
      .toBe("2026-11-09T01:00:00.000Z");
  });

  it("节前工作日 18:30，次日节假日 → 节后首个工作日 09:00", () => {
    expect(getNextBoundary("2026-09-24T18:30:00+08:00").toISOString())
      .toBe("2026-09-28T01:00:00.000Z");
  });

  it("恰在 09:00:00 时归入峰时，下一边界为 12:00:00", () => {
    setNow("2026-11-09T09:00:00+08:00");
    expect(tideStateAt(Date.now(), BUILTIN_TIDE_RULES).isPeak).toBe(true);
    expect(getNextBoundary().toISOString()).toBe("2026-11-09T04:00:00.000Z");
  });
});

describe("倒计时格式化", () => {
  it("HH:MM:SS 补零", () => {
    expect(formatCountdown(5_000)).toBe("00:00:05");
    expect(formatCountdown(65_000)).toBe("00:01:05");
    expect(formatCountdown(3_661_000)).toBe("01:01:01");
  });

  it("周五 18:30 至周一 09:00 的总时长正确", () => {
    setNow("2026-11-06T18:30:00+08:00");
    const duration = getNextBoundary().getTime() - Date.now();
    expect(formatCountdown(duration)).toBe("62:30:00");
  });
});

describe("自动调度信号", () => {
  it("默认关闭，开启后谷时持续 start、峰时持续 stop", () => {
    const disabled = evaluateScheduler({
      now: Date.now(),
      isPeak: false,
      nextBoundary: Date.now() + 120_000,
      nextBoundaryIsPeak: true,
    }, DEFAULT_SCHEDULER_STATE);
    expect(disabled.signal).toBeNull();

    const enabled = { ...DEFAULT_SCHEDULER_STATE, enabled: true };
    expect(evaluateScheduler({
      now: Date.now(),
      isPeak: false,
      nextBoundary: Date.now() + 120_000,
      nextBoundaryIsPeak: true,
    }, enabled).signal).toBe("start");
    expect(evaluateScheduler({
      now: Date.now(),
      isPeak: true,
      nextBoundary: Date.now() + 120_000,
      nextBoundaryIsPeak: false,
    }, enabled).signal).toBe("stop");
  });

  it("手动锁定后停止发送信号", () => {
    const result = evaluateScheduler({
      now: Date.now(),
      isPeak: false,
      nextBoundary: Date.now() + 120_000,
      nextBoundaryIsPeak: true,
    }, {
      ...DEFAULT_SCHEDULER_STATE,
      enabled: true,
      manualLocked: true,
    });
    expect(result.signal).toBeNull();
  });

  it("峰时边界前 60 秒只预警一次，并持久化时间戳", () => {
    const now = Date.parse("2026-11-09T13:59:10+08:00");
    const boundary = Date.parse("2026-11-09T14:00:00+08:00");
    const enabled = { ...DEFAULT_SCHEDULER_STATE, enabled: true };
    const first = evaluateScheduler({
      now,
      isPeak: false,
      nextBoundary: boundary,
      nextBoundaryIsPeak: true,
    }, enabled);
    expect(first.prewarn).toBe(true);
    expect(first.state.prewarnAt).toBe(now);
    expect(first.state.prewarnBoundary).toBe(boundary);

    const second = evaluateScheduler({
      now: now + 1000,
      isPeak: false,
      nextBoundary: boundary,
      nextBoundaryIsPeak: true,
    }, first.state);
    expect(second.prewarn).toBe(false);
    expect(PREWARN_MESSAGE).toBe("距峰时原价时段60秒，即将自动停止后台任务。");
  });

  it("12:00 的谷时边界不会误发峰时预警", () => {
    const now = Date.parse("2026-11-09T11:59:10+08:00");
    const boundary = Date.parse("2026-11-09T12:00:00+08:00");
    const result = evaluateScheduler({
      now,
      isPeak: false,
      nextBoundary: boundary,
      nextBoundaryIsPeak: false,
    }, { ...DEFAULT_SCHEDULER_STATE, enabled: true });
    expect(result.prewarn).toBe(false);
  });

  it("调度状态写入固定 localStorage key", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as Storage;
    const state = {
      enabled: true,
      manualLocked: false,
      prewarnAt: 123,
      prewarnBoundary: 456,
    };
    saveSchedulerState(state, storage);
    expect(values.has(SCHEDULER_CACHE_KEY)).toBe(true);
    expect(loadSchedulerState(storage)).toEqual(state);
  });
});

describe("余额与 token 折算", () => {
  it("从充值页读取人民币余额", () => {
    expect(parseOfficialBalance("<p>账户余额：¥8.89</p>")).toBe(8.89);
    expect(parseOfficialBalance('<script>window.state={"balance":12.5}</script>')).toBe(12.5);
    expect(parseOfficialBalance("<p>请选择充值金额</p>")).toBeNull();
  });

  it("从定价页读取 Flash 峰谷输入价", () => {
    const html = `
      <table>
        <tr><td rowspan="2">百万tokens输入<br>（缓存未命中）</td><td>空闲时段</td><td>1元</td><td>4.5元</td></tr>
        <tr><td>高峰时段</td><td>2元</td><td>9.0元</td></tr>
        <tr><td>百万tokens输出</td><td>空闲时段</td><td>4元</td><td>13.5元</td></tr>
      </table>
    `;
    expect(parseTokenPricing(html)).toEqual({
      model: "deepseek-flash 输入（缓存未命中）",
      inputPeak: 2,
      inputOffPeak: 1,
    });
  });

  it("按 1 亿 tokens 折算并格式化", () => {
    expect(estimateTokensYi(100, 1)).toBe(1);
    expect(estimateTokensYi(8.89, 1)).toBeCloseTo(0.0889, 6);
    expect(formatTokenEstimate(0.0889)).toBe("0.09 亿");
    expect(formatTokenEstimate(null)).toBe("—");
  });
});
