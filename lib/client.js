window.__ModuleLoader__.load({
  id: "dsh-tide-hint",
  factory(require) {
    const React = require("react");
"use strict";
var DshTideHint = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client/index.ts
  var index_exports = {};
  __export(index_exports, {
    BEIJING_OFFSET_MS: () => BEIJING_OFFSET_MS,
    BUILTIN_TIDE_RULES: () => BUILTIN_TIDE_RULES,
    CHINA_MAKEUP_WORKDAYS: () => CHINA_MAKEUP_WORKDAYS,
    CHINA_PUBLIC_HOLIDAYS: () => CHINA_PUBLIC_HOLIDAYS,
    FETCH_TIMEOUT_MS: () => FETCH_TIMEOUT_MS,
    HOST_OFFICIAL_PATH: () => HOST_OFFICIAL_PATH,
    OFFER_CACHE_KEY: () => OFFER_CACHE_KEY,
    PRICING_URL: () => PRICING_URL,
    RULES_CACHE_KEY: () => RULES_CACHE_KEY,
    SLOT_CANDIDATES: () => SLOT_CANDIDATES,
    TOP_UP_URL: () => TOP_UP_URL2,
    addDays: () => addDays,
    beijingDateKey: () => beijingDateKey,
    beijingParts: () => beijingParts,
    createClientPlugin: () => createClientPlugin,
    createRuntime: () => createRuntime,
    expandHolidayRanges: () => expandHolidayRanges,
    extractRuleFootnote: () => extractRuleFootnote,
    formatBeijingDateTime: () => formatBeijingDateTime,
    formatCountdown: () => formatCountdown,
    isHoliday: () => isHoliday,
    isMakeupWorkday: () => isMakeupWorkday,
    isWorkingDay: () => isWorkingDay,
    loadCachedOffer: () => loadCachedOffer,
    loadCachedRules: () => loadCachedRules,
    nextTransitionAt: () => nextTransitionAt,
    parseOfficialOffer: () => parseOfficialOffer,
    parsePeakWindows: () => parsePeakWindows,
    parsePricingRules: () => parsePricingRules,
    peakWindowStrings: () => peakWindowStrings,
    refreshRulesIfNeeded: () => refreshRulesIfNeeded,
    rulesCoverYear: () => rulesCoverYear,
    tideStateAt: () => tideStateAt,
    weekdayOf: () => weekdayOf
  });

  // src/client/TideHintCard.tsx
  var TOP_UP_URL = "https://platform.deepseek.com/top_up";
  var CARD_CSS = `
.dsh-tide-hint-card{
  --dth-color:var(--dsw-alias-state-success-primary,#10b981);
  box-sizing:border-box;
  position:relative;
  width:100%;
  min-width:0;
  flex:1 1 100%;
  height:30px;
  min-height:30px;
  max-height:30px;
  padding:2px 8px;
  border:1px solid color-mix(in srgb,var(--dth-color) 32%,transparent);
  border-radius:8px;
  background:color-mix(in srgb,var(--dth-color) 8%,var(--dsw-alias-bg-layer-1,transparent));
  color:var(--dsw-alias-label-secondary,#6b7280);
  text-decoration:none;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:0;
  overflow:visible;
  font:var(--dsw-font-xxxs-11,11px/1.2 system-ui,sans-serif);
  transition:border-color .15s ease,background-color .15s ease;
}
div[class*="footerActions"]:has(.dsh-tide-hint-card){flex-wrap:wrap}
.dsh-tide-hint-card[data-peak="true"]{
  --dth-color:var(--dsw-alias-state-error-primary,#ef4444);
}
.dsh-tide-hint-card:hover,
.dsh-tide-hint-card:focus-visible{
  border-color:color-mix(in srgb,var(--dth-color) 72%,transparent);
  background:color-mix(in srgb,var(--dth-color) 12%,var(--dsw-alias-bg-layer-1,transparent));
  outline:none;
}
.dsh-tide-hint-card:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,var(--dth-color) 35%,transparent)}
.dsh-tide-hint-main{display:flex;align-items:center;gap:8px;min-width:0;line-height:14px}
.dsh-tide-hint-status{flex:none;color:var(--dth-color);font-weight:650;white-space:nowrap}
.dsh-tide-hint-count{margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary,#111827);font-variant-numeric:tabular-nums}
.dsh-tide-hint-count b{font-weight:600}
.dsh-tide-hint-meta{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;line-height:10px;color:var(--dsw-alias-label-tertiary,#8b95a5)}
.dsh-tide-hint-pop{
  pointer-events:none;
  position:absolute;
  z-index:80;
  left:0;
  right:0;
  bottom:calc(100% + 6px);
  opacity:0;
  visibility:hidden;
  transform:translateY(3px);
  transition:opacity .12s ease,transform .12s ease,visibility .12s;
  box-sizing:border-box;
  padding:10px 11px;
  border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));
  border-radius:9px;
  background:var(--dsw-alias-bg-layer-1,#fff);
  color:var(--dsw-alias-label-primary,#111827);
  box-shadow:0 8px 24px rgba(0,0,0,.16);
  font-size:11px;
  line-height:1.55;
  white-space:normal;
}
.dsh-tide-hint-card:hover .dsh-tide-hint-pop,
.dsh-tide-hint-card:focus-visible .dsh-tide-hint-pop{
  opacity:1;
  visibility:visible;
  transform:translateY(0);
}
.dsh-tide-hint-pop-title{font-weight:650;margin-bottom:4px}
.dsh-tide-hint-pop-row{color:var(--dsw-alias-label-secondary,#6b7280)}
.dsh-tide-hint-pop-row + .dsh-tide-hint-pop-row{margin-top:3px}
.dsh-tide-hint-warn{color:var(--dsw-alias-state-warn-primary,#d97706)}
.dsh-tide-hint-offer{
  margin-top:7px;
  padding-top:7px;
  border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));
}
.dsh-tide-hint-offer-label{font-weight:650;color:var(--dsw-alias-label-primary,#111827)}
.dsh-tide-hint-offer-text{display:block;margin-top:2px;color:var(--dsw-alias-label-secondary,#6b7280)}
.dsh-tide-hint-official{margin-top:4px;font-size:10px;color:var(--dsw-alias-label-tertiary,#8b95a5)}
`;
  function createTideHintCard(React) {
    function TideHintCard(props) {
      const warningText = [props.warning, props.offerWarning].filter(Boolean).join("\uFF1B");
      const accessibleLabel = [
        props.statusLabel,
        `\u8DDD\u5207\u6362 ${props.countdown}`,
        props.updatedText,
        props.offlineText,
        props.offerText,
        warningText
      ].filter(Boolean).join("\uFF0C");
      return /* @__PURE__ */ React.createElement(
        "a",
        {
          className: "dsh-tide-hint-card",
          href: TOP_UP_URL,
          target: "_blank",
          rel: "noopener noreferrer",
          "data-peak": props.isPeak ? "true" : "false",
          "data-loading": props.loading ? "true" : "false",
          title: accessibleLabel,
          "aria-label": `${accessibleLabel}\u3002\u70B9\u51FB\u6253\u5F00 DeepSeek \u5B98\u65B9\u5145\u503C\u9875`
        },
        /* @__PURE__ */ React.createElement("style", null, CARD_CSS),
        /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-main" }, /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-status" }, props.statusLabel), /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-count" }, "\u8DDD\u5207\u6362 ", /* @__PURE__ */ React.createElement("b", null, props.countdown))),
        /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-meta" }, warningText ? "\u26A0 " : "", props.updatedText),
        /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-pop", role: "tooltip" }, /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-pop-title" }, props.statusLabel), /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-pop-row" }, "\u8DDD\u5207\u6362 ", props.countdown, " \xB7 ", props.targetText), /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-pop-row" }, props.offlineText ?? props.updatedText), props.offlineText ? /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-pop-row" }, props.updatedText) : null, warningText ? /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-pop-row dsh-tide-hint-warn" }, "\u26A0 ", warningText) : null, /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-offer" }, /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-offer-label" }, "\u5B98\u65B9\u5145\u503C\u4F18\u60E0"), /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-offer-text" }, props.offerText), /* @__PURE__ */ React.createElement("span", { className: "dsh-tide-hint-offer-text dsh-tide-hint-official" }, "\u70B9\u51FB\u6253\u5F00 platform.deepseek.com/top_up")))
      );
    }
    return TideHintCard;
  }

  // src/client/index.ts
  var PRICING_URL = "https://api-docs.deepseek.com/zh-cn/quick_start/pricing";
  var TOP_UP_URL2 = "https://platform.deepseek.com/top_up";
  var RULES_CACHE_KEY = "dsh-tide-hint.rules";
  var OFFER_CACHE_KEY = "dsh-tide-hint.offer";
  var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1e3;
  var FETCH_TIMEOUT_MS = 5e3;
  var HOST_OFFICIAL_PATH = "api/dsh-tide-hint/official";
  var SLOT_CANDIDATES = ["sidebar.footer", "sidebar.userArea", "sidebar.footer.action"];
  var DAY_MS = 24 * 60 * 60 * 1e3;
  var MAX_SEARCH_DAYS = 400;
  var NO_OFFER_TEXT = "\u5B98\u65B9\u65E0\u989D\u5916\u5145\u503C\u4F18\u60E0";
  var OFFER_ERROR_TEXT = "\u5B98\u65B9\u4F18\u60E0\u6682\u4E0D\u53EF\u7528\uFF08\u91C7\u96C6\u5931\u8D25\uFF09";
  var OFFER_LOADING_TEXT = "\u5B98\u65B9\u4F18\u60E0\u52A0\u8F7D\u4E2D\u2026";
  var CHINA_HOLIDAY_RANGES_2025 = [
    { from: "2025-01-01", to: "2025-01-01" },
    { from: "2025-01-28", to: "2025-02-04" },
    { from: "2025-04-04", to: "2025-04-06" },
    { from: "2025-05-01", to: "2025-05-05" },
    { from: "2025-05-31", to: "2025-06-02" },
    { from: "2025-10-01", to: "2025-10-08" }
  ];
  var CHINA_HOLIDAY_RANGES_2026 = [
    { from: "2026-01-01", to: "2026-01-03" },
    { from: "2026-02-15", to: "2026-02-23" },
    { from: "2026-04-04", to: "2026-04-06" },
    { from: "2026-05-01", to: "2026-05-05" },
    { from: "2026-06-19", to: "2026-06-21" },
    { from: "2026-09-25", to: "2026-09-27" },
    { from: "2026-10-01", to: "2026-10-07" }
  ];
  var CHINA_PUBLIC_HOLIDAYS = [
    ...expandHolidayRanges(CHINA_HOLIDAY_RANGES_2025),
    ...expandHolidayRanges(CHINA_HOLIDAY_RANGES_2026)
  ];
  var CHINA_MAKEUP_WORKDAYS = [
    "2026-01-04",
    "2026-02-14",
    "2026-02-28",
    "2026-05-09",
    "2026-09-20",
    "2026-10-10"
  ];
  var HOLIDAY_SET = new Set(CHINA_PUBLIC_HOLIDAYS);
  var MAKEUP_SET = new Set(CHINA_MAKEUP_WORKDAYS);
  var BUILTIN_TIDE_RULES = {
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
    rawFootnoteSnippet: "\u5185\u7F6E\u5B98\u65B9\u5B9A\u4EF7\u5FEB\u7167\uFF1A\u5DE5\u4F5C\u65E5 09:00-12:00\u300114:00-18:00 \u4E3A\u9AD8\u5CF0\uFF0C\u5176\u4F59\u542B\u5468\u672B\u548C\u6CD5\u5B9A\u8282\u5047\u65E5\u4E3A\u7A7A\u95F2\u3002"
  };
  function pad(value) {
    return String(value).padStart(2, "0");
  }
  function validDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function expandHolidayRanges(ranges) {
    const values = [];
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
  function beijingParts(timestamp = Date.now()) {
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
      dateKey: `${year}-${pad(month)}-${pad(day)}`
    };
  }
  function beijingDateKey(timestamp = Date.now()) {
    return beijingParts(timestamp).dateKey;
  }
  function addDays(dateKey, days) {
    const midpoint = Date.parse(`${dateKey}T00:00:00.000Z`);
    return new Date(midpoint + days * DAY_MS).toISOString().slice(0, 10);
  }
  function weekdayOf(dateKey) {
    return (/* @__PURE__ */ new Date(`${dateKey}T00:00:00.000Z`)).getUTCDay();
  }
  function beijingBoundary(dateKey, minutes) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return Date.UTC(year, month - 1, day, 0, minutes, 0, 0) - BEIJING_OFFSET_MS;
  }
  function formatBeijingDateTime(value) {
    if (value === null) return null;
    const timestamp = typeof value === "number" ? value : Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    const p = beijingParts(timestamp);
    return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
  }
  function normalizeTime(minutes) {
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }
  function parsePeakWindows(text) {
    const windows = [];
    const matcher = /([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|–|—|~|～|至|到)\s*([01]?\d|2[0-3]):([0-5]\d)/g;
    for (const match of text.matchAll(matcher)) {
      const start = Number(match[1]) * 60 + Number(match[2]);
      const end = Number(match[3]) * 60 + Number(match[4]);
      if (end > start) windows.push({ start, end });
    }
    const unique = new Map(windows.map((window2) => [`${window2.start}-${window2.end}`, window2]));
    return [...unique.values()].sort((a, b) => a.start - b.start);
  }
  function peakWindowStrings(windows) {
    return windows.map((window2) => `${normalizeTime(window2.start)}-${normalizeTime(window2.end)}`);
  }
  function windowsOf(rules) {
    return parsePeakWindows(rules.peakWindows.join("\u3001"));
  }
  function isMakeupWorkday(dateKey, rules) {
    return rules.makeupWorkdays.includes(dateKey);
  }
  function isHoliday(dateKey, rules) {
    return rules.holidays.includes(dateKey);
  }
  function isWorkingDay(dateKey, rules) {
    if (isMakeupWorkday(dateKey, rules)) return true;
    if (isHoliday(dateKey, rules) && rules.holidayOffPeak) return false;
    const weekday = weekdayOf(dateKey);
    if ((weekday === 0 || weekday === 6) && rules.weekendOffPeak) return false;
    return true;
  }
  function tideStateAt(timestamp, rules) {
    const p = beijingParts(timestamp);
    const minute = p.hour * 60 + p.minute;
    if (!isWorkingDay(p.dateKey, rules)) return { isPeak: false, dateKey: p.dateKey, minute };
    const isPeak = windowsOf(rules).some((window2) => minute >= window2.start && minute < window2.end);
    return { isPeak, dateKey: p.dateKey, minute };
  }
  function nextTransitionAt(timestamp, rules) {
    const current = tideStateAt(timestamp, rules);
    const windows = windowsOf(rules);
    if (windows.length === 0) return null;
    if (current.isPeak) {
      const end = windows.filter((window2) => current.minute >= window2.start && current.minute < window2.end).map((window2) => window2.end).sort((a, b) => a - b)[0];
      if (end !== void 0) return beijingBoundary(current.dateKey, end);
    }
    for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset += 1) {
      const dateKey = addDays(current.dateKey, offset);
      if (!isWorkingDay(dateKey, rules)) continue;
      for (const window2 of windows) {
        const boundary = beijingBoundary(dateKey, window2.start);
        if (boundary > timestamp) return boundary;
      }
    }
    return null;
  }
  function formatCountdown(milliseconds) {
    const total = Math.max(0, Math.ceil(milliseconds / 1e3));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const seconds = total % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  function rulesCoverYear(rules, year) {
    if (rules.coverageYears.includes(year)) return true;
    const prefix = `${year}-`;
    return rules.holidays.some((date) => date.startsWith(prefix)) || rules.makeupWorkdays.some((date) => date.startsWith(prefix));
  }
  function decodeHtmlEntities(value) {
    const named = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " "
    };
    return value.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16))).replace(/&([a-z]+);/gi, (whole, name) => named[name.toLowerCase()] ?? whole);
  }
  function htmlToText(value) {
    return decodeHtmlEntities(
      value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ")
    ).replace(/\r/g, "").replace(/[ \t\f\v]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  }
  function textBlocksFromHtml(html) {
    const blocks = [];
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
  function extractRuleFootnote(html) {
    const blocks = textBlocksFromHtml(html);
    const direct = blocks.find((block) => /高峰/.test(block) && /空闲|闲时|谷时|非高峰/.test(block) && /周末|法定节假日/.test(block));
    if (direct) return direct.slice(0, 700);
    const allText = htmlToText(html);
    const index = allText.search(/高峰(?:时段)?/);
    if (index < 0) return null;
    const start = Math.max(0, index - 80);
    const end = Math.min(allText.length, index + 520);
    return allText.slice(start, end).replace(/\s+/g, " ").trim();
  }
  function parsePricingRules(html) {
    const snippet = extractRuleFootnote(html);
    if (!snippet) return null;
    const windows = parsePeakWindows(snippet);
    if (windows.length < 1 || windows.length > 4) return null;
    const hasWeekdayRule = /工作日|周一至周五|周一.*?周五/.test(snippet);
    const weekendOffPeak = /周末[^。；]{0,100}(?:空闲|闲时|谷时|半价|非高峰)/.test(snippet) || /(?:空闲|闲时|谷时|半价|非高峰)[^。；]{0,100}周末/.test(snippet);
    const holidayOffPeak = /法定节假日[^。；]{0,100}(?:空闲|闲时|谷时|半价|非高峰)/.test(snippet) || /(?:空闲|闲时|谷时|半价|非高峰)[^。；]{0,100}法定节假日/.test(snippet);
    if (!hasWeekdayRule || !weekendOffPeak || !holidayOffPeak) return null;
    return {
      peakWindows: peakWindowStrings(windows),
      weekendOffPeak,
      holidayOffPeak,
      rawFootnoteSnippet: snippet
    };
  }
  function parseOfficialOffer(html) {
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
  function isDeepSeekDomain(hostname) {
    const host = hostname.toLowerCase();
    return host === "deepseek.com" || host.endsWith(".deepseek.com");
  }
  function builtInRules() {
    return {
      ...BUILTIN_TIDE_RULES,
      peakWindows: [...BUILTIN_TIDE_RULES.peakWindows],
      holidays: [...BUILTIN_TIDE_RULES.holidays],
      makeupWorkdays: [...BUILTIN_TIDE_RULES.makeupWorkdays],
      coverageYears: [...BUILTIN_TIDE_RULES.coverageYears]
    };
  }
  function mergeStringDates(primary, builtin) {
    const values = Array.isArray(primary) ? primary.filter((item) => typeof item === "string" && validDateKey(item)) : [];
    return [.../* @__PURE__ */ new Set([...builtin, ...values])].sort();
  }
  function normalizeCachedRules(value) {
    if (!value || typeof value !== "object") return null;
    const raw = value;
    const peakWindows = Array.isArray(raw.peakWindows) ? peakWindowStrings(parsePeakWindows(raw.peakWindows.filter((item) => typeof item === "string").join("\u3001"))) : [];
    if (peakWindows.length === 0) return null;
    const parseStatus = raw.parseStatus === "ok" || raw.parseStatus === "parse_failed" ? raw.parseStatus : "fallback";
    return {
      peakWindows,
      weekendOffPeak: typeof raw.weekendOffPeak === "boolean" ? raw.weekendOffPeak : true,
      holidayOffPeak: typeof raw.holidayOffPeak === "boolean" ? raw.holidayOffPeak : true,
      holidays: mergeStringDates(raw.holidays, CHINA_PUBLIC_HOLIDAYS),
      makeupWorkdays: mergeStringDates(raw.makeupWorkdays, CHINA_MAKEUP_WORKDAYS),
      coverageYears: Array.isArray(raw.coverageYears) ? raw.coverageYears.filter((year) => Number.isInteger(year)) : [...BUILTIN_TIDE_RULES.coverageYears],
      lastFetchedDate: typeof raw.lastFetchedDate === "string" && validDateKey(raw.lastFetchedDate) ? raw.lastFetchedDate : null,
      fetchedAt: typeof raw.fetchedAt === "string" && Number.isFinite(Date.parse(raw.fetchedAt)) ? raw.fetchedAt : null,
      sourceUrl: raw.sourceUrl === PRICING_URL ? PRICING_URL : PRICING_URL,
      parseStatus,
      rawFootnoteSnippet: typeof raw.rawFootnoteSnippet === "string" ? raw.rawFootnoteSnippet : "",
      lastError: typeof raw.lastError === "string" ? raw.lastError : void 0
    };
  }
  function storageOf() {
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      return null;
    }
  }
  function loadCachedRules(storage = storageOf()) {
    if (!storage) return builtInRules();
    try {
      const raw = storage.getItem(RULES_CACHE_KEY);
      if (!raw) return builtInRules();
      return normalizeCachedRules(JSON.parse(raw)) ?? builtInRules();
    } catch {
      return builtInRules();
    }
  }
  function saveCachedRules(rules, storage = storageOf()) {
    try {
      storage?.setItem(RULES_CACHE_KEY, JSON.stringify(rules));
    } catch {
    }
  }
  function emptyOffer() {
    return {
      date: null,
      text: OFFER_LOADING_TEXT,
      sourceUrl: TOP_UP_URL2,
      fetchedAt: null,
      status: "idle"
    };
  }
  function loadCachedOffer(storage = storageOf()) {
    if (!storage) return emptyOffer();
    try {
      const value = JSON.parse(storage.getItem(OFFER_CACHE_KEY) || "null");
      if (!value || typeof value.text !== "string") return emptyOffer();
      const status = value.status === "ok" || value.status === "error" ? value.status : "idle";
      return {
        date: typeof value.date === "string" && validDateKey(value.date) ? value.date : null,
        text: value.text.slice(0, 240),
        sourceUrl: TOP_UP_URL2,
        fetchedAt: typeof value.fetchedAt === "string" && Number.isFinite(Date.parse(value.fetchedAt)) ? value.fetchedAt : null,
        status
      };
    } catch {
      return emptyOffer();
    }
  }
  function saveCachedOffer(offer, storage = storageOf()) {
    try {
      storage?.setItem(OFFER_CACHE_KEY, JSON.stringify(offer));
    } catch {
    }
  }
  function officialUrlOf(resource) {
    return resource === "pricing" ? PRICING_URL : TOP_UP_URL2;
  }
  function validateOfficialSource(sourceUrl, resource) {
    const expected = officialUrlOf(resource);
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== "https:" || !isDeepSeekDomain(url.hostname)) throw new Error("\u975E\u5B98\u65B9\u57DF\u540D");
      return expected;
    } catch {
      throw new Error("\u5B98\u65B9\u6765\u6E90\u6821\u9A8C\u5931\u8D25");
    }
  }
  async function fetchTextWithTimeout(url, timeoutMs) {
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
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }
  async function fetchOfficialDocument(resource) {
    try {
      const response = await fetchTextWithTimeout(
        `${HOST_OFFICIAL_PATH}?resource=${resource}`,
        FETCH_TIMEOUT_MS * 2 + 1e3
      );
      if (!response.ok) throw new Error(`\u5BBF\u4E3B\u4EE3\u7406 HTTP ${response.status}`);
      const sourceUrl = validateOfficialSource(
        response.headers.get("x-dsh-tide-source-url") || officialUrlOf(resource),
        resource
      );
      return { html: await response.text(), sourceUrl };
    } catch {
      const sourceUrl = officialUrlOf(resource);
      const response = await fetchTextWithTimeout(sourceUrl, FETCH_TIMEOUT_MS);
      if (!response.ok) throw new Error(`\u5B98\u65B9\u9875\u9762 HTTP ${response.status}`);
      return { html: await response.text(), sourceUrl };
    }
  }
  var dailyRefresh = null;
  async function runDailyRefresh(previous, today, storage) {
    const [pricingResult, offerResult] = await Promise.allSettled([
      fetchOfficialDocument("pricing"),
      fetchOfficialDocument("offer")
    ]);
    let nextRules;
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
          fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
          sourceUrl: PRICING_URL,
          parseStatus: "ok",
          rawFootnoteSnippet: rawSnippet,
          lastError: void 0
        };
      } else {
        pricingParseFailed = true;
        pricingFailureReason = "\u5B98\u7F51\u89C4\u5219\u89E3\u6790\u5931\u8D25";
        rawSnippet = extractRuleFootnote(pricingResult.value.html) ?? "";
        nextRules = {
          ...previous,
          lastFetchedDate: today,
          sourceUrl: PRICING_URL,
          parseStatus: "parse_failed",
          rawFootnoteSnippet: rawSnippet,
          lastError: `${pricingFailureReason}\uFF0C\u6CBF\u7528${previous.fetchedAt ? "\u4E0A\u6B21\u89C4\u5219" : "\u5185\u7F6E\u5FEB\u7167"}`
        };
      }
    } else {
      pricingParseFailed = true;
      pricingFailureReason = "\u5B98\u65B9\u5B9A\u4EF7\u9875\u8BFB\u53D6\u5931\u8D25";
      nextRules = {
        ...previous,
        lastFetchedDate: today,
        sourceUrl: PRICING_URL,
        parseStatus: "parse_failed",
        lastError: `${pricingFailureReason}\uFF0C\u6CBF\u7528${previous.fetchedAt ? "\u4E0A\u6B21\u89C4\u5219" : "\u5185\u7F6E\u5FEB\u7167"}`
      };
    }
    let nextOffer;
    if (offerResult.status === "fulfilled") {
      const text = parseOfficialOffer(offerResult.value.html);
      nextOffer = {
        date: today,
        text: text ?? NO_OFFER_TEXT,
        sourceUrl: TOP_UP_URL2,
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "ok"
      };
    } else {
      nextOffer = {
        date: today,
        text: OFFER_ERROR_TEXT,
        sourceUrl: TOP_UP_URL2,
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "error"
      };
    }
    saveCachedRules(nextRules, storage);
    saveCachedOffer(nextOffer, storage);
    return { rules: nextRules, offer: nextOffer };
  }
  function refreshRulesIfNeeded(previous, currentOffer, now = Date.now(), storage = storageOf()) {
    const today = beijingDateKey(now);
    if (previous.lastFetchedDate === today && currentOffer.date === today) {
      return Promise.resolve(null);
    }
    if (dailyRefresh?.date === today) return dailyRefresh.promise;
    const promise = runDailyRefresh(previous, today, storage);
    dailyRefresh = { date: today, promise };
    return promise;
  }
  function createRuntime(storage = storageOf(), now = Date.now) {
    let snapshot = {
      rules: loadCachedRules(storage),
      offer: loadCachedOffer(storage),
      loading: false
    };
    const listeners = /* @__PURE__ */ new Set();
    let disposed = false;
    let started = false;
    const emit = (next) => {
      snapshot = next;
      for (const listener of listeners) listener();
    };
    const start = () => {
      if (started || disposed) return;
      started = true;
      snapshot = { ...snapshot, loading: true };
      void refreshRulesIfNeeded(snapshot.rules, snapshot.offer, now(), storage).then((result) => {
        if (disposed || !result) return;
        emit({ rules: result.rules, offer: result.offer, loading: false });
      }).catch(() => {
        if (disposed) return;
        emit({ ...snapshot, loading: false });
      });
    };
    return {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      start,
      dispose: () => {
        disposed = true;
        listeners.clear();
      }
    };
  }
  function useTicker(React, runtime) {
    const subscribe = React.useCallback(
      (listener) => runtime.subscribe(listener),
      [runtime]
    );
    const getSnapshot = React.useCallback(() => runtime.getSnapshot(), [runtime]);
    return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }
  function createMountedHint(React, runtime) {
    const TideHintCard = createTideHintCard(React);
    function MountedTideHint(_props) {
      const snapshot = useTicker(React, runtime);
      const [now, setNow] = React.useState(() => Date.now());
      React.useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1e3);
        return () => window.clearInterval(timer);
      }, []);
      const current = tideStateAt(now, snapshot.rules);
      const target = nextTransitionAt(now, snapshot.rules);
      const targetText = target === null ? "\u7B49\u5F85\u89C4\u5219\u66F4\u65B0" : `${formatBeijingDateTime(target) ?? "\u2014"}\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09`;
      const updateTime = formatBeijingDateTime(snapshot.rules.fetchedAt);
      const updatedText = updateTime ? `\u89C4\u5219\u66F4\u65B0\uFF1A${updateTime}` : "\u89C4\u5219\u66F4\u65B0\uFF1A\u5185\u7F6E\u5FEB\u7167";
      const offlineText = snapshot.rules.parseStatus === "ok" ? null : "\u79BB\u7EBF\u89C4\u5219\uFF08\u5185\u7F6E\u5FEB\u7167\uFF09";
      const coverageWarning = snapshot.rules.holidayOffPeak && !rulesCoverYear(snapshot.rules, beijingParts(now).year) ? `${beijingParts(now).year} \u5E74\u8282\u5047\u65E5\u6570\u636E\u672A\u8986\u76D6\uFF0C\u6309\u5DE5\u4F5C\u65E5\u4F30\u7B97` : null;
      const warning = [coverageWarning, snapshot.rules.lastError].filter(Boolean).join("\uFF1B") || null;
      const props = {
        statusLabel: current.isPeak ? "\u5CF0\u65F6\xB7\u539F\u4EF7" : "\u8C37\u65F6\xB7\u534A\u4EF7",
        isPeak: current.isPeak,
        countdown: target === null ? "--:--:--" : formatCountdown(target - now),
        targetText,
        updatedText,
        offlineText,
        warning,
        offerText: snapshot.offer.text,
        offerWarning: snapshot.offer.status === "error" ? "\u5B98\u65B9\u4F18\u60E0\u91C7\u96C6\u5931\u8D25" : null,
        loading: snapshot.loading
      };
      return React.createElement(TideHintCard, props);
    }
    return MountedTideHint;
  }
  function registrationOptionsFor(slots, slotName) {
    const spec = slots.specDynamic?.(slotName);
    const options = {
      name: slotName,
      priority: 0
    };
    if (spec?.kind !== "single" && spec?.kind !== "keyed") {
      options.id = "dsh-tide-hint";
      options.order = 10;
      options.label = () => "\u5CF0\u8C37\u63D0\u793A";
    }
    if (spec?.kind === "keyed") {
      options.key = "dsh-tide-hint";
    }
    return options;
  }
  function mountTideHintSlot(ctx, component) {
    const slots = ctx.slots;
    const declared = /* @__PURE__ */ new Set();
    const failed = /* @__PURE__ */ new Set();
    let mounted = null;
    let stopped = false;
    const unmount = () => {
      mounted?.dispose();
      mounted = null;
    };
    const activeCandidate = () => {
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
    const injectors = [];
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
    sync();
    return () => {
      stopped = true;
      for (const dispose of injectors.splice(0)) dispose();
      unmount();
    };
  }
  function createClientPlugin(React) {
    return {
      inject: ["slots"],
      apply(ctx) {
        const runtime = createRuntime();
        const MountedHint = createMountedHint(React, runtime);
        const component = (_props) => React.createElement(MountedHint, null);
        if (typeof ctx.effect === "function") {
          ctx.effect(() => {
            runtime.start();
            return () => runtime.dispose();
          }, "dsh-tide-hint: daily rules refresh");
          ctx.effect(() => mountTideHintSlot(ctx, component), "dsh-tide-hint: slot");
        } else {
          runtime.start();
          mountTideHintSlot(ctx, component);
        }
      }
    };
  }
  return __toCommonJS(index_exports);
})();

    return DshTideHint.createClientPlugin(React);
  },
});
