export const SCHEDULER_CACHE_KEY = "dsh-tide-hint.scheduler";
export const PREWARN_EVENT = "dsh-tide:prewarn";
export const TASK_START_EVENT = "dsh-tide:task-start";
export const TASK_STOP_EVENT = "dsh-tide:task-stop";
export const PREWARN_MESSAGE = "距峰时原价时段60秒，即将自动停止后台任务。";

export interface SchedulerState {
  enabled: boolean;
  manualLocked: boolean;
  prewarnAt: number | null;
  prewarnBoundary: number | null;
}

export interface SchedulerTickInput {
  now: number;
  isPeak: boolean;
  nextBoundary: number | null;
  nextBoundaryIsPeak: boolean;
}

export interface SchedulerTickResult {
  state: SchedulerState;
  signal: "start" | "stop" | null;
  prewarn: boolean;
}

export const DEFAULT_SCHEDULER_STATE: SchedulerState = Object.freeze({
  enabled: false,
  manualLocked: false,
  prewarnAt: null,
  prewarnBoundary: null,
});

function storageOf(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function finiteTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function loadSchedulerState(storage: Storage | null = storageOf()): SchedulerState {
  if (!storage) return { ...DEFAULT_SCHEDULER_STATE };
  try {
    const parsed = JSON.parse(storage.getItem(SCHEDULER_CACHE_KEY) || "null") as Partial<SchedulerState> | null;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SCHEDULER_STATE };
    return {
      enabled: parsed.enabled === true,
      manualLocked: parsed.manualLocked === true,
      prewarnAt: finiteTimestamp(parsed.prewarnAt),
      prewarnBoundary: finiteTimestamp(parsed.prewarnBoundary),
    };
  } catch {
    return { ...DEFAULT_SCHEDULER_STATE };
  }
}

export function saveSchedulerState(
  state: SchedulerState,
  storage: Storage | null = storageOf(),
): void {
  try {
    storage?.setItem(SCHEDULER_CACHE_KEY, JSON.stringify(state));
  } catch {
    // 持久化失败只影响下次启动，当前 tick 与事件派发继续运行。
  }
}

/**
 * 计算一次调度结果。`dsh-tide:task-start` / `task-stop` 是持续信号：
 * 只要调度开启且未锁定，每个谷时/峰时 tick 都会产出对应 signal。插件只读取
 * 当前峰谷，不保存外部业务任务状态，因此外部暂停后下一谷时 tick 仍会启动。
 */
export function evaluateScheduler(
  input: SchedulerTickInput,
  current: SchedulerState,
): SchedulerTickResult {
  if (!current.enabled || current.manualLocked) {
    return { state: current, signal: null, prewarn: false };
  }

  const signal = input.isPeak ? "stop" : "start";
  const remaining = input.nextBoundary === null ? Number.POSITIVE_INFINITY : input.nextBoundary - input.now;
  const shouldPrewarn = (
    !input.isPeak
    && input.nextBoundaryIsPeak
    && input.nextBoundary !== null
    && remaining > 0
    && remaining <= 60_000
    && current.prewarnBoundary !== input.nextBoundary
  );

  return {
    state: shouldPrewarn
      ? {
          ...current,
          prewarnAt: input.now,
          prewarnBoundary: input.nextBoundary,
        }
      : current,
    signal,
    prewarn: shouldPrewarn,
  };
}

export function dispatchSchedulerEvent(
  name: typeof TASK_START_EVENT | typeof TASK_STOP_EVENT | typeof PREWARN_EVENT,
  detail: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  const init = { detail, bubbles: false, cancelable: false };
  const event = typeof CustomEvent === "function"
    ? new CustomEvent(name, init)
    : Object.assign(new Event(name, init), { detail });
  window.dispatchEvent(event);
}
