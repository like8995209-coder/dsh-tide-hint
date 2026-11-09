import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_TIDE_RULES,
  formatCountdown,
  nextTransitionAt,
  tideStateAt,
} from "../src/client/index";

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
