import type * as ReactNamespace from "react";
import { createTideHintCard, type TideHintCardProps } from "./TideHintCard";
import {
  PREWARN_EVENT,
  PREWARN_MESSAGE,
  SCHEDULER_CACHE_KEY,
  TASK_START_EVENT,
  TASK_STOP_EVENT,
  dispatchSchedulerEvent,
  evaluateScheduler,
  loadSchedulerState,
  saveSchedulerState,
  type SchedulerState,
} from "./scheduler";

export const PRICING_URL = "https://api-docs.deepseek.com/zh-cn/quick_start/pricing";
export const TOP_UP_URL = "https://platform.deepseek.com/top_up";
export const RULES_CACHE_KEY = "dsh-tide-hint.rules";
export const OFFER_CACHE_KEY = "dsh-tide-hint.offer";
export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 5_000;
export const HOST_OFFICIAL_PATH = "api/dsh-tide-hint/official";

export {
  PREWARN_EVENT,
  PREWARN_MESSAGE,
  SCHEDULER_CACHE_KEY,
  TASK_START_EVENT,
  TASK_STOP_EVENT,
  type SchedulerState,
};

/** 需求指定的优先 Slot；本机 DSH 0.2.x 实际存在的是第三项 footer.action。 */
export const SLOT_CANDIDATES = ["sidebar.footer", "sidebar.userArea", "sidebar.footer.action"] as const;

export interface PeakWindow {
  start: number;
  end: number;
}

export type ParseStatus = "ok" | "parse_failed" | "fallback";

export interface TideRules {
  peakWindows: string[];
  weekendOffPeak: boolean;
  holidayOffPeak: boolean;
  holidays: string[];
  makeupWorkdays: string[];
  coverageYears: number[];
  lastFetchedDate: string | null;
  fetchedAt: string | null;
  sourceUrl: string;
  parseStatus: ParseStatus;
  rawFootnoteSnippet: string;
  tokenPricing: TokenPricing | null;
  lastError?: string;
}

export interface TokenPricing {
  model: string;
  inputPeak: number;
  inputOffPeak: number;
}

export interface OfferSnapshot {
  date: string | null;
  text: string;
  sourceUrl: string;
  fetchedAt: string | null;
  status: "idle" | "ok" | "error";
  balanceCny: number | null;
  balanceSource: "topup" | "official-api" | null;
  balanceAttempted: boolean;
}

export interface RuntimeSnapshot {
  rules: TideRules;
  offer: OfferSnapshot;
  scheduler: SchedulerState;
  balanceRefreshing: boolean;
  loading: boolean;
}

export interface DSHTideHintApi {
  setSchedulerEnable(enabled: boolean): SchedulerState;
  setManualLock(locked: boolean): SchedulerState;
}

declare global {
  interface Window {
    DSHTideHint?: DSHTideHintApi;
  }
}

export interface ParsedPricingRules {
  peakWindows: string[];
  weekendOffPeak: boolean;
  holidayOffPeak: boolean;
  rawFootnoteSnippet: string;
  tokenPricing: TokenPricing | null;
}

interface DateRange {
  from: string;
  to: string;
}

type ReactRuntime = typeof ReactNamespace;

type SlotsFace = {
  inject?: (key: string, callback: () => () => void) => () => void;
  register: (options: Record<string, unknown>, component: unknown) => () => void;
  specDynamic?: (key: string) => { kind?: string } | undefined;
  declarationEpoch?: (key: string) => number;
};

type ClientContext = {
  slots: SlotsFace;
  effect?: (factory: () => () => void, label?: string) => () => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SEARCH_DAYS = 400;
const NO_OFFER_TEXT = "官方无额外充值优惠";
const OFFER_ERROR_TEXT = "官方优惠暂不可用（采集失败）";
const OFFER_LOADING_TEXT = "官方优惠加载中…";

/**
 * 中国法定节假日。2026 年数据来自国务院办公厅《关于 2026 年部分节假日安排
 * 的通知》（国办发明电〔2025〕7号）：
 * https://www.gov.cn/zhengce/content/202511/content_7047090.htm
 * 2025 年数据保留，便于跨年时查询最近一次官方快照。
 */
const CHINA_HOLIDAY_RANGES_2025: DateRange[] = [
  { from: "2025-01-01", to: "2025-01-01" },
  { from: "2025-01-28", to: "2025-02-04" },
  { from: "2025-04-04", to: "2025-04-06" },
  { from: "2025-05-01", to: "2025-05-05" },
  { from: "2025-05-31", to: "2025-06-02" },
  { from: "2025-10-01", to: "2025-10-08" },
];

const CHINA_HOLIDAY_RANGES_2026: DateRange[] = [
  { from: "2026-01-01", to: "2026-01-03" },
  { from: "2026-02-15", to: "2026-02-23" },
  { from: "2026-04-04", to: "2026-04-06" },
  { from: "2026-05-01", to: "2026-05-05" },
  { from: "2026-06-19", to: "2026-06-21" },
  { from: "2026-09-25", to: "2026-09-27" },
  { from: "2026-10-01", to: "2026-10-07" },
];

export const CHINA_PUBLIC_HOLIDAYS: string[] = [
  ...expandHolidayRanges(CHINA_HOLIDAY_RANGES_2025),
  ...expandHolidayRanges(CHINA_HOLIDAY_RANGES_2026),
];

/** 2026 年官方调休上班日；周末落在这些日期时优先按工作日峰谷规则。 */
export const CHINA_MAKEUP_WORKDAYS: string[] = [
  "2026-01-04",
  "2026-02-14",
  "2026-02-28",
  "2026-05-09",
  "2026-09-20",
  "2026-10-10",
];

const HOLIDAY_SET = new Set(CHINA_PUBLIC_HOLIDAYS);
const MAKEUP_SET = new Set(CHINA_MAKEUP_WORKDAYS);

export const BUILTIN_TIDE_RULES: TideRules = {
  peakWindows: ["09:00-12:00", "14:00-18:00"],
  weekendOffPeak: true,
  holidayOffPeak: true,
  holidays: [...CHINA_PUBLIC_HOLIDAYS],
  makeupWorkdays: [...CHINA_MAKEUP_WORKDAYS],
  coverageYears: [2025, 2026],
  lastFetchedDate: null,
  fetchedAt: null,
  sourceUrl: PRICING_URL,
  parseStatus: "fallback",
  rawFootnoteSnippet: "内置官方定价快照：工作日 09:00-12:00、14:00-18:00 为高峰，其余含周末和法定节假日为空闲。",
  tokenPricing: {
    model: "deepseek-flash 输入（缓存未命中）",
    inputPeak: 2,
    inputOffPeak: 1,
  },
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function expandHolidayRanges(ranges: DateRange[]): string[] {
  const values: string[] = [];
  for (const range of ranges) {
    if (!validDateKey(range.from) || !validDateKey(range.to)) continue;
    const start = Date.parse(`${range.from}T00:00:00.000Z`);
    const end = Date.parse(`${range.to}T00:00:00.000Z`);
    if (end < start) continue;
    for (let cursor = start; cursor <= end; cursor += DAY_MS) {
      values.push(new Date(cursor).toISOString().slice(0, 10));
    }
  }
  return [...new Set(values)];
}

/**
 * 固定北京时间 UTC+8：先平移时间戳，再只用 UTC getter 取年月日和时分。
 * 全插件禁止使用 getHours/getDay 等本地时区方法，因此机器时区不会影响结果。
 */
export function beijingParts(timestamp = Date.now()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
  dateKey: string;
} {
  const shifted = new Date(timestamp + BEIJING_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return {
    year,
    month,
    day,
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
  };
}

export function beijingDateKey(timestamp = Date.now()): string {
  return beijingParts(timestamp).dateKey;
}

export function addDays(dateKey: string, days: number): string {
  const midpoint = Date.parse(`${dateKey}T00:00:00.000Z`);
  return new Date(midpoint + days * DAY_MS).toISOString().slice(0, 10);
}

export function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
}

function beijingBoundary(dateKey: string, minutes: number): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 0, minutes, 0, 0) - BEIJING_OFFSET_MS;
}

export function formatBeijingDateTime(value: string | number | null): string | null {
  if (value === null) return null;
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const p = beijingParts(timestamp);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

function normalizeTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function parsePeakWindows(text: string): PeakWindow[] {
  const windows: PeakWindow[] = [];
  const matcher = /([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|–|—|~|～|至|到)\s*([01]?\d|2[0-3]):([0-5]\d)/g;
  for (const match of text.matchAll(matcher)) {
    const start = Number(match[1]) * 60 + Number(match[2]);
    const end = Number(match[3]) * 60 + Number(match[4]);
    if (end > start) windows.push({ start, end });
  }
  const unique = new Map(windows.map((window) => [`${window.start}-${window.end}`, window]));
  return [...unique.values()].sort((a, b) => a.start - b.start);
}

export function peakWindowStrings(windows: PeakWindow[]): string[] {
  return windows.map((window) => `${normalizeTime(window.start)}-${normalizeTime(window.end)}`);
}

function windowsOf(rules: TideRules): PeakWindow[] {
  return parsePeakWindows(rules.peakWindows.join("、"));
}

export function isMakeupWorkday(dateKey: string, rules: TideRules): boolean {
  return rules.makeupWorkdays.includes(dateKey);
}

export function isHoliday(dateKey: string, rules: TideRules): boolean {
  return rules.holidays.includes(dateKey);
}

/**
 * 调休上班日的优先级最高：同一天即使落在周六/周日，也先判为工作日，再套用
 * 09:00-12:00、14:00-18:00 的峰时窗口。随后才判断法定节假日和普通周末。
 */
export function isWorkingDay(dateKey: string, rules: TideRules): boolean {
  if (isMakeupWorkday(dateKey, rules)) return true;
  if (isHoliday(dateKey, rules) && rules.holidayOffPeak) return false;
  const weekday = weekdayOf(dateKey);
  if ((weekday === 0 || weekday === 6) && rules.weekendOffPeak) return false;
  return true;
}

export function tideStateAt(timestamp: number, rules: TideRules): { isPeak: boolean; dateKey: string; minute: number } {
  const p = beijingParts(timestamp);
  const minute = p.hour * 60 + p.minute;
  if (!isWorkingDay(p.dateKey, rules)) return { isPeak: false, dateKey: p.dateKey, minute };
  const isPeak = windowsOf(rules).some((window) => minute >= window.start && minute < window.end);
  return { isPeak, dateKey: p.dateKey, minute };
}

/**
 * 下一状态边界。峰时只找当前窗口结束；谷时逐日寻找下一个工作日窗口起点。
 * 因此周五 18:00 后会跳过周末到周一 09:00，节假日会继续顺延到节后首个
 * 工作日 09:00；调休周末则会被当作工作日正常返回其 09:00。
 */
export function nextTransitionAt(timestamp: number, rules: TideRules): number | null {
  const current = tideStateAt(timestamp, rules);
  const windows = windowsOf(rules);
  if (windows.length === 0) return null;

  if (current.isPeak) {
    const end = windows
      .filter((window) => current.minute >= window.start && current.minute < window.end)
      .map((window) => window.end)
      .sort((a, b) => a - b)[0];
    if (end !== undefined) return beijingBoundary(current.dateKey, end);
  }

  for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset += 1) {
    const dateKey = addDays(current.dateKey, offset);
    if (!isWorkingDay(dateKey, rules)) continue;
    for (const window of windows) {
      const boundary = beijingBoundary(dateKey, window.start);
      if (boundary > timestamp) return boundary;
    }
  }
  return null;
}

export function formatCountdown(milliseconds: number): string {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function rulesCoverYear(rules: TideRules, year: number): boolean {
  if (rules.coverageYears.includes(year)) return true;
  const prefix = `${year}-`;
  return rules.holidays.some((date) => date.startsWith(prefix))
    || rules.makeupWorkdays.some((date) => date.startsWith(prefix));
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
  };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLowerCase()] ?? whole);
}

function htmlToText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function textBlocksFromHtml(html: string): string[] {
  const blocks: string[] = [];
  const blockMatcher = /<(p|li|div|section|article)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(blockMatcher)) {
    const text = htmlToText(match[2]);
    if (text) blocks.push(text);
  }
  if (blocks.length === 0) {
    const text = htmlToText(html);
    if (text) blocks.push(text);
  }
  return blocks;
}

export function extractRuleFootnote(html: string): string | null {
  const blocks = textBlocksFromHtml(html);
  const direct = blocks.find((block) => (
    /高峰/.test(block)
    && /空闲|闲时|谷时|非高峰/.test(block)
    && /周末|法定节假日/.test(block)
  ));
  if (direct) return direct.slice(0, 700);

  const allText = htmlToText(html);
  const index = allText.search(/高峰(?:时段)?/);
  if (index < 0) return null;
  const start = Math.max(0, index - 80);
  const end = Math.min(allText.length, index + 520);
  return allText.slice(start, end).replace(/\s+/g, " ").trim();
}

/**
 * 取第一个模型（deepseek-flash）的缓存未命中输入价作为折算基准。
 * 输入价高低决定可购买 token 数；界面明确标注“输入 tokens”，不把输入价与
 * 输出价混用。价格来自与峰谷规则同一份官方定价页。
 */
export function parseTokenPricing(html: string): TokenPricing | null {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => htmlToText(match[1]))
    .filter(Boolean);
  const inputIndex = rows.findIndex((row) => /tokens输入/.test(row) && /缓存未命中/.test(row));
  if (inputIndex < 0) return null;
  const outputIndex = rows.findIndex((row, index) => index > inputIndex && /tokens输出/.test(row));
  const inputSection = rows.slice(inputIndex, outputIndex > inputIndex ? outputIndex : inputIndex + 3);

  const priceOf = (rowsToSearch: string[], start: number, period: "空闲" | "高峰"): number | null => {
    const row = rowsToSearch.slice(start).find((value) => value.includes(period));
    if (!row) return null;
    const match = row.match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    const value = Number(match[0]);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const inputPeak = priceOf(inputSection, 0, "高峰");
  const inputOffPeak = priceOf(inputSection, 0, "空闲");
  if (inputPeak === null || inputOffPeak === null) return null;
  return {
    model: "deepseek-flash 输入（缓存未命中）",
    inputPeak,
    inputOffPeak,
  };
}

/**
 * 只接受脚注中明确写出的峰时窗口以及“周末/法定节假日空闲”条款。任一条缺失
 * 就返回 null，调用方必须沿用旧规则或内置快照，不能猜测。
 */
export function parsePricingRules(html: string): ParsedPricingRules | null {
  const snippet = extractRuleFootnote(html);
  if (!snippet) return null;

  const windows = parsePeakWindows(snippet);
  if (windows.length < 1 || windows.length > 4) return null;

  const hasWeekdayRule = /工作日|周一至周五|周一.*?周五/.test(snippet);
  const weekendOffPeak = (
    /周末[^。；]{0,100}(?:空闲|闲时|谷时|半价|非高峰)/.test(snippet)
    || /(?:空闲|闲时|谷时|半价|非高峰)[^。；]{0,100}周末/.test(snippet)
  );
  const holidayOffPeak = (
    /法定节假日[^。；]{0,100}(?:空闲|闲时|谷时|半价|非高峰)/.test(snippet)
    || /(?:空闲|闲时|谷时|半价|非高峰)[^。；]{0,100}法定节假日/.test(snippet)
  );

  if (!hasWeekdayRule || !weekendOffPeak || !holidayOffPeak) return null;
  return {
    peakWindows: peakWindowStrings(windows),
    weekendOffPeak,
    holidayOffPeak,
    rawFootnoteSnippet: snippet,
    tokenPricing: parseTokenPricing(html),
  };
}

/**
 * 从充值页可见文本或内嵌状态中读取人民币余额。找不到就返回 null，
 * 不从充值金额按钮或第三方文案猜余额。
 */
export function parseOfficialBalance(html: string): number | null {
  const jsonMatch = html.match(/"(?:balance|available_balance|cash_balance)"\s*:\s*"?(\d+(?:\.\d+)?)/i);
  if (jsonMatch) {
    const value = Number(jsonMatch[1]);
    if (Number.isFinite(value) && value >= 0) return value;
  }

  for (const block of textBlocksFromHtml(html)) {
    if (!/余额/.test(block)) continue;
    const match = block.match(/(?:账户余额|可用余额|余额)[^0-9¥￥]{0,24}[¥￥]?\s*(\d+(?:\.\d+)?)/);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

export function formatBalanceCny(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `¥${value.toFixed(2)}`;
}

/** 1 亿 tokens = 100 个“百万 tokens”计价单位，因此先除以 100。 */
export function estimateTokensYi(balanceCny: number | null, pricePerMillion: number | null): number | null {
  if (balanceCny === null || pricePerMillion === null || balanceCny < 0 || pricePerMillion <= 0) return null;
  return balanceCny / pricePerMillion / 100;
}

export function formatTokenEstimate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} 亿`;
}

/**
 * 充值页没有优惠时返回 null。只展示页面可见文本中同时含“充值/余额”和
 * “优惠/活动/赠送”等官方活动词的原文，不调用模型，也不接受第三方代理文案。
 */
export function parseOfficialOffer(html: string): string | null {
  const blocks = textBlocksFromHtml(html);
  for (const block of blocks) {
    const sentences = block.split(/(?<=[。！？!?])|\n+/).map((part) => part.trim()).filter(Boolean);
    for (const sentence of sentences) {
      if (sentence.length < 8 || sentence.length > 220) continue;
      if (!/(充值|余额|储值)/.test(sentence)) continue;
      if (!/(优惠|活动|赠送|加赠|返现|折扣|立减|满减)/.test(sentence)) continue;
      if (/(第三方|代理|代充|折扣码|邀请码)/.test(sentence)) continue;
      const external = sentence.match(/https?:\/\/[^\s，。；]+/gi) ?? [];
      if (external.some((url) => {
        try {
          return !isDeepSeekDomain(new URL(url).hostname);
        } catch {
          return true;
        }
      })) continue;
      return sentence.replace(/\s+/g, " ").slice(0, 180);
    }
  }
  return null;
}

function isDeepSeekDomain(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "deepseek.com" || host.endsWith(".deepseek.com");
}

function builtInRules(): TideRules {
  return {
    ...BUILTIN_TIDE_RULES,
    peakWindows: [...BUILTIN_TIDE_RULES.peakWindows],
    holidays: [...BUILTIN_TIDE_RULES.holidays],
    makeupWorkdays: [...BUILTIN_TIDE_RULES.makeupWorkdays],
    coverageYears: [...BUILTIN_TIDE_RULES.coverageYears],
  };
}

function mergeStringDates(primary: unknown, builtin: string[]): string[] {
  const values = Array.isArray(primary)
    ? primary.filter((item): item is string => typeof item === "string" && validDateKey(item))
    : [];
  return [...new Set([...builtin, ...values])].sort();
}

function normalizeTokenPricing(value: unknown): TokenPricing | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<TokenPricing>;
  if (
    typeof raw.model !== "string"
    || typeof raw.inputPeak !== "number"
    || typeof raw.inputOffPeak !== "number"
    || !Number.isFinite(raw.inputPeak)
    || !Number.isFinite(raw.inputOffPeak)
    || raw.inputPeak <= 0
    || raw.inputOffPeak <= 0
  ) return null;
  return {
    model: raw.model,
    inputPeak: raw.inputPeak,
    inputOffPeak: raw.inputOffPeak,
  };
}

function normalizeCachedRules(value: unknown): TideRules | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<TideRules>;
  const peakWindows = Array.isArray(raw.peakWindows)
    ? peakWindowStrings(parsePeakWindows(raw.peakWindows.filter((item): item is string => typeof item === "string").join("、")))
    : [];
  if (peakWindows.length === 0) return null;

  const parseStatus: ParseStatus = raw.parseStatus === "ok" || raw.parseStatus === "parse_failed"
    ? raw.parseStatus
    : "fallback";
  return {
    peakWindows,
    weekendOffPeak: typeof raw.weekendOffPeak === "boolean" ? raw.weekendOffPeak : true,
    holidayOffPeak: typeof raw.holidayOffPeak === "boolean" ? raw.holidayOffPeak : true,
    holidays: mergeStringDates(raw.holidays, CHINA_PUBLIC_HOLIDAYS),
    makeupWorkdays: mergeStringDates(raw.makeupWorkdays, CHINA_MAKEUP_WORKDAYS),
    coverageYears: Array.isArray(raw.coverageYears)
      ? raw.coverageYears.filter((year): year is number => Number.isInteger(year))
      : [...BUILTIN_TIDE_RULES.coverageYears],
    lastFetchedDate: typeof raw.lastFetchedDate === "string" && validDateKey(raw.lastFetchedDate)
      ? raw.lastFetchedDate
      : null,
    fetchedAt: typeof raw.fetchedAt === "string" && Number.isFinite(Date.parse(raw.fetchedAt))
      ? raw.fetchedAt
      : null,
    sourceUrl: raw.sourceUrl === PRICING_URL ? PRICING_URL : PRICING_URL,
    parseStatus,
    rawFootnoteSnippet: typeof raw.rawFootnoteSnippet === "string" ? raw.rawFootnoteSnippet : "",
    tokenPricing: normalizeTokenPricing(raw.tokenPricing) ?? BUILTIN_TIDE_RULES.tokenPricing,
    lastError: typeof raw.lastError === "string" ? raw.lastError : undefined,
  };
}

function storageOf(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadCachedRules(storage: Storage | null = storageOf()): TideRules {
  if (!storage) return builtInRules();
  try {
    const raw = storage.getItem(RULES_CACHE_KEY);
    if (!raw) return builtInRules();
    return normalizeCachedRules(JSON.parse(raw)) ?? builtInRules();
  } catch {
    return builtInRules();
  }
}

function saveCachedRules(rules: TideRules, storage: Storage | null = storageOf()): void {
  try {
    storage?.setItem(RULES_CACHE_KEY, JSON.stringify(rules));
  } catch {
    // 本地缓存不可用时只影响下次启动，当前倒计时继续运行。
  }
}

function emptyOffer(): OfferSnapshot {
  return {
    date: null,
    text: OFFER_LOADING_TEXT,
    sourceUrl: TOP_UP_URL,
    fetchedAt: null,
    status: "idle",
    balanceCny: null,
    balanceSource: null,
    balanceAttempted: false,
  };
}

export function loadCachedOffer(storage: Storage | null = storageOf()): OfferSnapshot {
  if (!storage) return emptyOffer();
  try {
    const value = JSON.parse(storage.getItem(OFFER_CACHE_KEY) || "null") as Partial<OfferSnapshot> | null;
    if (!value || typeof value.text !== "string") return emptyOffer();
    const status = value.status === "ok" || value.status === "error" ? value.status : "idle";
    return {
      date: typeof value.date === "string" && validDateKey(value.date) ? value.date : null,
      text: value.text.slice(0, 240),
      sourceUrl: TOP_UP_URL,
      fetchedAt: typeof value.fetchedAt === "string" && Number.isFinite(Date.parse(value.fetchedAt))
        ? value.fetchedAt
        : null,
      status,
      balanceCny: typeof value.balanceCny === "number" && Number.isFinite(value.balanceCny) && value.balanceCny >= 0
        ? value.balanceCny
        : null,
      balanceSource: value.balanceSource === "topup" || value.balanceSource === "official-api"
        ? value.balanceSource
        : null,
      balanceAttempted: value.balanceAttempted === true,
    };
  } catch {
    return emptyOffer();
  }
}

function saveCachedOffer(offer: OfferSnapshot, storage: Storage | null = storageOf()): void {
  try {
    storage?.setItem(OFFER_CACHE_KEY, JSON.stringify(offer));
  } catch {
    // 与规则缓存相同：缓存失败绝不阻止倒计时。
  }
}

function officialUrlOf(resource: "pricing" | "offer"): string {
  return resource === "pricing" ? PRICING_URL : TOP_UP_URL;
}

function validateOfficialSource(sourceUrl: string, resource: "pricing" | "offer"): string {
  const expected = officialUrlOf(resource);
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || !isDeepSeekDomain(url.hostname)) throw new Error("非官方域名");
    return expected;
  } catch {
    throw new Error("官方来源校验失败");
  }
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 浏览器先走同源宿主代理，避免官方定价页没有 CORS 头；若宿主路由不可用，
 * 再对硬编码官方 URL 做一次只读 GET。两条路径都禁用凭据、Cookie、表单和
 * 外部 URL 参数。每日刷新由模块级 Promise 防抖，多个卡片实例也只发一轮请求。
 */
async function fetchOfficialDocument(resource: "pricing" | "offer"): Promise<{ html: string; sourceUrl: string }> {
  try {
    const response = await fetchTextWithTimeout(
      `${HOST_OFFICIAL_PATH}?resource=${resource}`,
      FETCH_TIMEOUT_MS * 2 + 1_000,
    );
    if (!response.ok) throw new Error(`宿主代理 HTTP ${response.status}`);
    const sourceUrl = validateOfficialSource(
      response.headers.get("x-dsh-tide-source-url") || officialUrlOf(resource),
      resource,
    );
    return { html: await response.text(), sourceUrl };
  } catch {
    const sourceUrl = officialUrlOf(resource);
    const response = await fetchTextWithTimeout(sourceUrl, FETCH_TIMEOUT_MS);
    if (!response.ok) throw new Error(`官方页面 HTTP ${response.status}`);
    return { html: await response.text(), sourceUrl };
  }
}

/**
 * 公开充值页不返回登录后余额时，由本插件宿主半区使用 DSH 已保存的平台账户
 * 凭据调用官方 `/user/get_user_summary`。浏览器只读同源结果，永远拿不到 Token。
 */
async function fetchOfficialPlatformBalance(): Promise<number | null> {
  try {
    const response = await fetchTextWithTimeout("api/dsh-tide-hint/balance", FETCH_TIMEOUT_MS);
    if (!response.ok) return null;
    const body = await response.json() as {
      ok?: boolean;
      balanceCny?: number | null;
    };
    if (
      body.ok !== true
      || typeof body.balanceCny !== "number"
      || !Number.isFinite(body.balanceCny)
      || body.balanceCny < 0
    ) return null;
    return body.balanceCny;
  } catch {
    return null;
  }
}

async function resolveOfferSnapshot(
  previous: OfferSnapshot,
  today: string,
  topupHtml: string | null,
): Promise<OfferSnapshot> {
  let balanceCny = topupHtml === null ? null : parseOfficialBalance(topupHtml);
  let balanceSource: OfferSnapshot["balanceSource"] = balanceCny === null ? null : "topup";
  if (balanceCny === null) {
    balanceCny = await fetchOfficialPlatformBalance();
    if (balanceCny !== null) balanceSource = "official-api";
  }

  // 刷新失败时保留上次有效余额；成功但确实无余额时清空，避免伪造数字。
  if (balanceCny === null && previous.balanceCny !== null) {
    balanceCny = previous.balanceCny;
    balanceSource = previous.balanceSource;
  }

  const text = topupHtml === null ? OFFER_ERROR_TEXT : (parseOfficialOffer(topupHtml) ?? NO_OFFER_TEXT);
  return {
    date: today,
    text,
    sourceUrl: TOP_UP_URL,
    fetchedAt: new Date().toISOString(),
    status: topupHtml === null ? "error" : "ok",
    balanceCny,
    balanceSource,
    balanceAttempted: true,
  };
}

interface DailyResult {
  rules: TideRules;
  offer: OfferSnapshot;
}

let dailyRefresh: { date: string; promise: Promise<DailyResult> } | null = null;

async function runDailyRefresh(
  previous: TideRules,
  previousOffer: OfferSnapshot,
  today: string,
  storage: Storage | null,
): Promise<DailyResult> {
  const [pricingResult, offerResult] = await Promise.allSettled([
    fetchOfficialDocument("pricing"),
    fetchOfficialDocument("offer"),
  ]);

  let nextRules: TideRules;
  let pricingParseFailed = false;
  let pricingFailureReason = "";
  let rawSnippet = previous.rawFootnoteSnippet;

  if (pricingResult.status === "fulfilled") {
    const parsed = parsePricingRules(pricingResult.value.html);
    if (parsed) {
      rawSnippet = parsed.rawFootnoteSnippet;
      nextRules = {
        ...previous,
        peakWindows: parsed.peakWindows,
        weekendOffPeak: parsed.weekendOffPeak,
        holidayOffPeak: parsed.holidayOffPeak,
        holidays: mergeStringDates(previous.holidays, CHINA_PUBLIC_HOLIDAYS),
        makeupWorkdays: mergeStringDates(previous.makeupWorkdays, CHINA_MAKEUP_WORKDAYS),
        lastFetchedDate: today,
        fetchedAt: new Date().toISOString(),
        sourceUrl: PRICING_URL,
        parseStatus: "ok",
        rawFootnoteSnippet: rawSnippet,
        tokenPricing: parsed.tokenPricing ?? previous.tokenPricing,
        lastError: undefined,
      };
    } else {
      pricingParseFailed = true;
      pricingFailureReason = "官网规则解析失败";
      rawSnippet = extractRuleFootnote(pricingResult.value.html) ?? "";
      nextRules = {
        ...previous,
        lastFetchedDate: today,
        sourceUrl: PRICING_URL,
        parseStatus: "parse_failed",
        rawFootnoteSnippet: rawSnippet,
        lastError: `${pricingFailureReason}，沿用${previous.fetchedAt ? "上次规则" : "内置快照"}`,
      };
    }
  } else {
    pricingParseFailed = true;
    pricingFailureReason = "官方定价页读取失败";
    nextRules = {
      ...previous,
      lastFetchedDate: today,
      sourceUrl: PRICING_URL,
      parseStatus: "parse_failed",
      lastError: `${pricingFailureReason}，沿用${previous.fetchedAt ? "上次规则" : "内置快照"}`,
    };
  }

  const nextOffer = await resolveOfferSnapshot(
    previousOffer,
    today,
    offerResult.status === "fulfilled" ? offerResult.value.html : null,
  );

  saveCachedRules(nextRules, storage);
  saveCachedOffer(nextOffer, storage);
  return { rules: nextRules, offer: nextOffer };
}

/**
 * 北京日期不是今天时才更新；模块级 Promise 是跨卡片的防抖锁。请求完全异步，
 * 初始渲染始终先使用缓存或内置快照，网络慢/失败都不会阻塞倒计时。
 */
export function refreshRulesIfNeeded(
  previous: TideRules,
  currentOffer: OfferSnapshot,
  now = Date.now(),
  storage: Storage | null = storageOf(),
): Promise<DailyResult | null> {
  const today = beijingDateKey(now);
  if (previous.lastFetchedDate === today && currentOffer.date === today && currentOffer.balanceAttempted) {
    return Promise.resolve(null);
  }
  if (dailyRefresh?.date === today) return dailyRefresh.promise;
  const promise = runDailyRefresh(previous, currentOffer, today, storage);
  dailyRefresh = { date: today, promise };
  return promise;
}

export function createRuntime(
  storage: Storage | null = storageOf(),
  now: () => number = Date.now,
) {
  let snapshot: RuntimeSnapshot = {
    rules: loadCachedRules(storage),
    offer: loadCachedOffer(storage),
    scheduler: loadSchedulerState(storage),
    balanceRefreshing: false,
    loading: false,
  };
  const listeners = new Set<() => void>();
  let disposed = false;
  let started = false;
  let balanceRefreshFlight: Promise<void> | null = null;

  const emit = (next: RuntimeSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const start = () => {
    if (started || disposed) return;
    started = true;
    snapshot = { ...snapshot, loading: true };
    void refreshRulesIfNeeded(snapshot.rules, snapshot.offer, now(), storage)
      .then((result) => {
        if (disposed || !result) return;
        emit({
          rules: result.rules,
          offer: result.offer,
          scheduler: snapshot.scheduler,
          balanceRefreshing: snapshot.balanceRefreshing,
          loading: false,
        });
      })
      .catch(() => {
        if (disposed) return;
        emit({ ...snapshot, loading: false });
      });
  };

  const updateScheduler = (next: SchedulerState): SchedulerState => {
    if (disposed) return snapshot.scheduler;
    saveSchedulerState(next, storage);
    emit({ ...snapshot, scheduler: next });
    return next;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    setSchedulerEnable: (enabled: boolean) => updateScheduler({
      ...snapshot.scheduler,
      enabled: Boolean(enabled),
    }),
    setManualLock: (manualLocked: boolean) => updateScheduler({
      ...snapshot.scheduler,
      manualLocked: Boolean(manualLocked),
    }),
    refreshBalance: (): Promise<void> => {
      if (disposed) return Promise.resolve();
      if (balanceRefreshFlight !== null) return balanceRefreshFlight;
      emit({ ...snapshot, balanceRefreshing: true });
      balanceRefreshFlight = (async () => {
        let topupHtml: string | null = null;
        try {
          topupHtml = (await fetchOfficialDocument("offer")).html;
        } catch {
          topupHtml = null;
        }
        const offer = await resolveOfferSnapshot(snapshot.offer, beijingDateKey(now()), topupHtml);
        saveCachedOffer(offer, storage);
        if (!disposed) emit({ ...snapshot, offer, balanceRefreshing: false });
      })().catch(() => {
        if (!disposed) emit({ ...snapshot, balanceRefreshing: false });
      }).finally(() => {
        balanceRefreshFlight = null;
      });
      return balanceRefreshFlight;
    },
    schedulerTick: ({
      now: tickAt,
      isPeak,
      nextBoundary,
      nextBoundaryIsPeak,
    }: {
      now: number;
      isPeak: boolean;
      nextBoundary: number | null;
      nextBoundaryIsPeak: boolean;
    }) => {
      const result = evaluateScheduler({
        now: tickAt,
        isPeak,
        nextBoundary,
        nextBoundaryIsPeak,
      }, snapshot.scheduler);

      if (result.state !== snapshot.scheduler) {
        saveSchedulerState(result.state, storage);
        emit({ ...snapshot, scheduler: result.state });
      }

      if (result.signal !== null) {
        dispatchSchedulerEvent(
          result.signal === "start" ? TASK_START_EVENT : TASK_STOP_EVENT,
          {
            source: "dsh-tide-hint",
            signal: result.signal,
            isPeak,
            at: tickAt,
            nextBoundary,
          },
        );
      }

      if (result.prewarn) {
        dispatchSchedulerEvent(PREWARN_EVENT, {
          source: "dsh-tide-hint",
          message: PREWARN_MESSAGE,
          text: PREWARN_MESSAGE,
          isPeak,
          at: tickAt,
          targetAt: nextBoundary,
          remainingSeconds: nextBoundary === null ? null : Math.ceil((nextBoundary - tickAt) / 1000),
        });
      }
      return result;
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
    },
  };
}

function useTicker(React: ReactRuntime, runtime: ReturnType<typeof createRuntime>): RuntimeSnapshot {
  const subscribe = React.useCallback(
    (listener: () => void) => runtime.subscribe(listener),
    [runtime],
  );
  const getSnapshot = React.useCallback(() => runtime.getSnapshot(), [runtime]);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function createMountedHint(React: ReactRuntime, runtime: ReturnType<typeof createRuntime>) {
  const TideHintCard = createTideHintCard(React);

  function MountedTideHint(_props: unknown) {
    const snapshot = useTicker(React, runtime);
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
      const tick = () => {
        const tickAt = Date.now();
        const rules = runtime.getSnapshot().rules;
        const currentState = tideStateAt(tickAt, rules);
        const boundary = nextTransitionAt(tickAt, rules);
        runtime.schedulerTick({
          now: tickAt,
          isPeak: currentState.isPeak,
          nextBoundary: boundary,
          nextBoundaryIsPeak: boundary === null ? false : tideStateAt(boundary, rules).isPeak,
        });
        setNow(tickAt);
      };
      tick();
      const timer = window.setInterval(tick, 1000);
      return () => window.clearInterval(timer);
    }, [runtime]);

    const current = tideStateAt(now, snapshot.rules);
    const target = nextTransitionAt(now, snapshot.rules);
    const targetText = target === null
      ? "等待规则更新"
      : `${formatBeijingDateTime(target) ?? "—"}（北京时间）`;
    const updateTime = formatBeijingDateTime(snapshot.rules.fetchedAt);
    const updatedText = updateTime
      ? `规则更新：${updateTime}`
      : "规则更新：内置快照";
    const offlineText = snapshot.rules.parseStatus === "ok" ? null : "离线规则（内置快照）";
    const coverageWarning = (
      snapshot.rules.holidayOffPeak
      && !rulesCoverYear(snapshot.rules, beijingParts(now).year)
    ) ? `${beijingParts(now).year} 年节假日数据未覆盖，按工作日估算` : null;
    const warning = [coverageWarning, snapshot.rules.lastError].filter(Boolean).join("；") || null;
    const inputPrice = snapshot.rules.tokenPricing === null
      ? null
      : current.isPeak
        ? snapshot.rules.tokenPricing.inputPeak
        : snapshot.rules.tokenPricing.inputOffPeak;
    const tokenEstimate = estimateTokensYi(snapshot.offer.balanceCny, inputPrice);
    const balanceWarning = snapshot.offer.balanceCny !== null
      ? null
      : snapshot.offer.status === "error"
        ? "充值页与官方余额接口均不可用"
        : snapshot.offer.status === "ok"
          ? "充值页与官方余额接口均未提供余额"
          : null;

    const props: TideHintCardProps = {
      statusLabel: current.isPeak ? "峰时·原价" : "谷时·半价",
      isPeak: current.isPeak,
      countdown: target === null ? "--:--:--" : formatCountdown(target - now),
      targetText,
      updatedText,
      offlineText,
      warning,
      offerText: snapshot.offer.text,
      offerWarning: snapshot.offer.status === "error" ? "官方优惠采集失败" : null,
      balanceText: formatBalanceCny(snapshot.offer.balanceCny),
      tokenEstimateText: formatTokenEstimate(tokenEstimate),
      balanceWarning,
      tokenBasisText: snapshot.rules.tokenPricing === null || inputPrice === null
        ? null
        : `${snapshot.rules.tokenPricing.model} · ¥${inputPrice}/百万 tokens`,
      balanceRefreshing: snapshot.balanceRefreshing,
      onRefreshBalance: () => {
        void runtime.refreshBalance();
      },
      schedulerEnabled: snapshot.scheduler.enabled,
      manualLocked: snapshot.scheduler.manualLocked,
      onSchedulerEnableChange: (enabled: boolean) => {
        runtime.setSchedulerEnable(enabled);
      },
      onManualLockChange: (locked: boolean) => {
        runtime.setManualLock(locked);
      },
      loading: snapshot.loading,
    };
    return React.createElement(TideHintCard, props);
  }

  return MountedTideHint;
}

function registrationOptionsFor(slots: SlotsFace, slotName: string): Record<string, unknown> {
  const spec = slots.specDynamic?.(slotName);
  const options: Record<string, unknown> = {
    name: slotName,
    priority: 0,
  };
  // 当前 DSH 的 slots service 可能不暴露 specDynamic；未知类型按 list 提交，
  // 这是 sidebar.footer.action 的实际形态。single/keyed 只在明确可探测时切换。
  if (spec?.kind !== "single" && spec?.kind !== "keyed") {
    options.id = "dsh-tide-hint";
    options.order = 10;
    options.label = () => "峰谷提示";
  }
  if (spec?.kind === "keyed") {
    options.key = "dsh-tide-hint";
  }
  return options;
}

/**
 * Cordis Slot 挂载策略：先等待并尝试 sidebar.footer / sidebar.userArea，
 * 再用当前 DSH 实际提供的 sidebar.footer.action。ctx.slots.inject 会等 owner
 * 声明 Slot 后再 register；每个候选只挂一个实例，避免布局里重复出现。
 */
function mountTideHintSlot(ctx: ClientContext, component: unknown): () => void {
  const slots = ctx.slots;
  const declared = new Set<string>();
  const failed = new Set<string>();
  let mounted: { slot: string; dispose: () => void } | null = null;
  let stopped = false;

  const unmount = () => {
    mounted?.dispose();
    mounted = null;
  };

  const activeCandidate = (): string | null => {
    for (const slot of SLOT_CANDIDATES) {
      if (failed.has(slot)) continue;
      let active = declared.has(slot);
      if (!active) {
        try {
          active = (slots.declarationEpoch?.(slot) ?? 0) > 0;
        } catch {
          active = false;
        }
      }
      if (!active) continue;
      const spec = slots.specDynamic?.(slot);
      if (spec?.kind === "chain") continue;
      return slot;
    }
    return null;
  };

  const sync = () => {
    if (stopped) return;
    const slot = activeCandidate();
    if (!slot || mounted?.slot === slot) return;
    unmount();
    try {
      const dispose = slots.register(registrationOptionsFor(slots, slot), component);
      mounted = { slot, dispose };
    } catch {
      failed.add(slot);
      sync();
    }
  };

  const injectors: Array<() => void> = [];
  for (const slot of SLOT_CANDIDATES) {
    if (typeof slots.inject !== "function") break;
    try {
      const dispose = slots.inject(slot, () => {
        declared.add(slot);
        sync();
        return () => {
          declared.delete(slot);
          if (mounted?.slot === slot) unmount();
          sync();
        };
      });
      injectors.push(dispose);
    } catch {
      failed.add(slot);
    }
  }

  // 部分 DSH 版本只暴露已声明的 Slot，不会触发 inject 回调；同步探测一次。
  sync();

  return () => {
    stopped = true;
    for (const dispose of injectors.splice(0)) dispose();
    unmount();
  };
}

export function createClientPlugin(React: ReactRuntime) {
  return {
    inject: ["slots"],
    apply(ctx: ClientContext) {
      const runtime = createRuntime();
      const MountedHint = createMountedHint(React, runtime);
      const component = (_props: unknown) => React.createElement(MountedHint, null);
      const previousApi = typeof window === "undefined" ? undefined : window.DSHTideHint;
      const api: DSHTideHintApi = {
        setSchedulerEnable: (enabled: boolean) => runtime.setSchedulerEnable(enabled),
        setManualLock: (locked: boolean) => runtime.setManualLock(locked),
      };
      if (typeof window !== "undefined") window.DSHTideHint = api;
      const restoreApi = () => {
        if (typeof window !== "undefined" && window.DSHTideHint === api) {
          window.DSHTideHint = previousApi;
        }
      };

      if (typeof ctx.effect === "function") {
        ctx.effect(() => {
          runtime.start();
          return () => {
            runtime.dispose();
            restoreApi();
          };
        }, "dsh-tide-hint: daily rules refresh");
        ctx.effect(() => mountTideHintSlot(ctx, component), "dsh-tide-hint: slot");
      } else {
        runtime.start();
        mountTideHintSlot(ctx, component);
      }
    },
  };
}
