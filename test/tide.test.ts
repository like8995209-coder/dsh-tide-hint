import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILTIN_TIDE_RULES,
  CHINA_MAKEUP_WORKDAYS,
  CHINA_PUBLIC_HOLIDAYS,
  beijingParts,
  formatCountdown,
  isWorkingDay,
  nextTransitionAt,
  parseOfficialOffer,
  parsePeakWindows,
  parsePricingRules,
  rulesCoverYear,
  tideStateAt,
} from "../src/client/index";

function at(iso: string): number {
  return Date.parse(iso);
}

test("北京时间日期和星期不受主机时区影响", () => {
  const parts = beijingParts(at("2026-11-09T01:30:00.000Z"));
  assert.equal(parts.dateKey, "2026-11-09");
  assert.equal(parts.hour, 9);
  assert.equal(parts.minute, 30);
  assert.equal(parts.weekday, 1);
});

test("峰时窗口和谷时倒计时边界正确", () => {
  const beforePeak = at("2026-11-09T00:30:00.000Z");
  assert.equal(tideStateAt(beforePeak, BUILTIN_TIDE_RULES).isPeak, false);
  assert.equal(nextTransitionAt(beforePeak, BUILTIN_TIDE_RULES), at("2026-11-09T01:00:00.000Z"));

  const duringPeak = at("2026-11-09T01:00:00.000Z");
  assert.equal(tideStateAt(duringPeak, BUILTIN_TIDE_RULES).isPeak, true);
  assert.equal(nextTransitionAt(duringPeak, BUILTIN_TIDE_RULES), at("2026-11-09T04:00:00.000Z"));

  const lunch = at("2026-11-09T04:00:00.000Z");
  assert.equal(tideStateAt(lunch, BUILTIN_TIDE_RULES).isPeak, false);
  assert.equal(nextTransitionAt(lunch, BUILTIN_TIDE_RULES), at("2026-11-09T06:00:00.000Z"));
});

test("周五 18:00 后跨周末到周一 09:00", () => {
  const fridayAfter = at("2026-11-06T10:00:00.000Z");
  assert.equal(nextTransitionAt(fridayAfter, BUILTIN_TIDE_RULES), at("2026-11-09T01:00:00.000Z"));
});

test("跨零点到次日 09:00，普通周六也跳过", () => {
  assert.equal(
    nextTransitionAt(at("2026-11-09T15:59:59.000Z"), BUILTIN_TIDE_RULES),
    at("2026-11-10T01:00:00.000Z"),
  );
  assert.equal(
    nextTransitionAt(at("2026-11-07T03:00:00.000Z"), BUILTIN_TIDE_RULES),
    at("2026-11-09T01:00:00.000Z"),
  );
});

test("节假日结束后顺延到首个工作日 09:00", () => {
  const holidayNow = at("2026-10-07T02:00:00.000Z");
  assert.equal(tideStateAt(holidayNow, BUILTIN_TIDE_RULES).isPeak, false);
  assert.equal(nextTransitionAt(holidayNow, BUILTIN_TIDE_RULES), at("2026-10-08T01:00:00.000Z"));
  assert.equal(
    nextTransitionAt(at("2026-02-21T03:00:00.000Z"), BUILTIN_TIDE_RULES),
    at("2026-02-24T01:00:00.000Z"),
  );
});

test("调休周末优先按工作日峰谷规则处理", () => {
  assert.ok(CHINA_PUBLIC_HOLIDAYS.includes("2026-02-23"));
  assert.ok(CHINA_MAKEUP_WORKDAYS.includes("2026-02-14"));
  assert.equal(isWorkingDay("2026-02-14", BUILTIN_TIDE_RULES), true);
  assert.equal(tideStateAt(at("2026-02-14T01:30:00.000Z"), BUILTIN_TIDE_RULES).isPeak, true);
  assert.equal(nextTransitionAt(at("2026-02-13T10:00:00.000Z"), BUILTIN_TIDE_RULES), at("2026-02-14T01:00:00.000Z"));
});

test("当前年没有节假日数据时进入工作日估算", () => {
  assert.equal(rulesCoverYear(BUILTIN_TIDE_RULES, 2026), true);
  assert.equal(rulesCoverYear(BUILTIN_TIDE_RULES, 2027), false);
});

test("倒计时格式至少保留两位小时", () => {
  assert.equal(formatCountdown(65_000), "00:01:05");
  assert.equal(formatCountdown(9 * 3_600_000 + 8_000), "09:00:08");
});

test("解析官方峰谷脚注", () => {
  const html = `
    <p>(2) 空闲时段价格为高峰时段价格的一半。北京时间周一至周五（不含中国法定节假日）
    9:00 - 12:00、14:00 - 18:00 为高峰时段；其余时段，包括周末及中国法定节假日全天均为空闲时段。</p>
  `;
  const parsed = parsePricingRules(html);
  assert.ok(parsed);
  assert.deepEqual(parsed.peakWindows, ["09:00-12:00", "14:00-18:00"]);
  assert.equal(parsed.weekendOffPeak, true);
  assert.equal(parsed.holidayOffPeak, true);
  assert.deepEqual(parsePeakWindows(parsed.rawFootnoteSnippet), [
    { start: 540, end: 720 },
    { start: 840, end: 1080 },
  ]);
});

test("缺少周末或节假日条款时解析失败而不是猜测", () => {
  const html = "<p>北京时间周一至周五 9:00 - 12:00、14:00 - 18:00 为高峰时段。</p>";
  assert.equal(parsePricingRules(html), null);
});

test("只提取官方充值优惠相关原文", () => {
  assert.equal(parseOfficialOffer("<p>请选择充值金额</p>"), null);
  assert.equal(
    parseOfficialOffer("<p>首次充值 100 元赠送 10 元余额，活动详情见官方充值页。</p>"),
    "首次充值 100 元赠送 10 元余额，活动详情见官方充值页。",
  );
  assert.equal(
    parseOfficialOffer("<p>充值优惠活动，请访问 https://example.com/agent 领取。</p>"),
    null,
  );
});
