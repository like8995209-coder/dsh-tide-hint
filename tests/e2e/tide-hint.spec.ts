import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { build } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RESULT_DIR = resolve(ROOT, "test-results");
const HARNESS_FILE = resolve(RESULT_DIR, "tide-hint-e2e-harness.html");

let browser: Browser;
const openContexts: BrowserContext[] = [];

const HARNESS_SOURCE = `
  import React from "react";
  import { createRoot } from "react-dom/client";
  import { createTideHintCard } from ${JSON.stringify(resolve(ROOT, "src/client/TideHintCard.tsx"))};
  import {
    BUILTIN_TIDE_RULES,
    beijingParts,
    formatBeijingDateTime,
    formatCountdown,
    nextTransitionAt,
    rulesCoverYear,
    tideStateAt,
  } from ${JSON.stringify(resolve(ROOT, "src/client/index.ts"))};

  const Card = createTideHintCard(React);
  const root = createRoot(document.getElementById("root"));

  function renderCard() {
    const now = Date.now();
    const current = tideStateAt(now, BUILTIN_TIDE_RULES);
    const target = nextTransitionAt(now, BUILTIN_TIDE_RULES);
    const parts = beijingParts(now);
    root.render(React.createElement(Card, {
      statusLabel: current.isPeak ? "峰时·原价" : "谷时·半价",
      isPeak: current.isPeak,
      countdown: target === null ? "--:--:--" : formatCountdown(target - now),
      targetText: target === null ? "等待规则更新" : formatBeijingDateTime(target) + "（北京时间）",
      updatedText: "规则更新：2026-11-09 10:00",
      offlineText: null,
      warning: rulesCoverYear(BUILTIN_TIDE_RULES, parts.year)
        ? null
        : parts.year + " 年节假日数据未覆盖，按工作日估算",
      offerText: "官方无额外充值优惠",
      offerWarning: null,
      loading: false,
    }));
  }

  renderCard();
  window.setInterval(renderCard, 1000);
`;

async function buildHarness(): Promise<void> {
  await mkdir(RESULT_DIR, { recursive: true });
  const result = await build({
    absWorkingDir: ROOT,
    stdin: {
      contents: HARNESS_SOURCE,
      loader: "tsx",
      resolveDir: ROOT,
      sourcefile: "tide-hint-e2e-harness.tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["chrome110"],
    jsx: "transform",
    jsxFactory: "React.createElement",
    legalComments: "none",
    logLevel: "silent",
  });

  const html = `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="UTF-8"><title>dsh-tide-hint e2e</title></head>
  <body><div id="root"></div><script>${result.outputFiles[0].text}</script></body>
</html>`;
  await writeFile(HARNESS_FILE, html, "utf8");
}

async function openAt(iso: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 420, height: 280 } });
  openContexts.push(context);
  const page = await context.newPage();

  // 外部请求全部网络模拟；官方充值页也 fulfil，避免真实网络。
  await context.route("https://**/*", async (route) => {
    const url = route.request().url();
    if (url === "https://platform.deepseek.com/top_up") {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: "<!doctype html><title>DeepSeek 官方充值</title><p>mock official top-up</p>",
      });
      return;
    }
    await route.abort("blockedbyclient");
  });

  // Playwright 文档要求 clock 在 goto 前安装。
  const fixedTime = new Date(iso);
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await page.goto(pathToFileURL(HARNESS_FILE).href);
  await expect(page.getByRole("link")).toBeVisible();
  return { context, page };
}

async function statusColor(page: Page): Promise<string> {
  return page.locator(".dsh-tide-hint-status").evaluate((element) => getComputedStyle(element).color);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await buildHarness();
  // 使用系统 Edge，完全离线；Playwright 内部仍通过 CDP 驱动浏览器。
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--disable-gpu", "--no-first-run"],
  });
  const cdp = await browser.newBrowserCDPSession();
  await cdp.send("Browser.getVersion");
});

test.afterAll(async () => {
  await browser?.close();
});

test.afterEach(async () => {
  for (const context of openContexts.splice(0).reverse()) await context.close();
});

test("工作日 10:00 显示红色峰时", async () => {
  const { context, page } = await openAt("2026-11-09T10:00:00+08:00");
  await expect(page.locator(".dsh-tide-hint-status")).toHaveText("峰时·原价");
  await expect(page.locator(".dsh-tide-hint-count")).toContainText("02:00:00");
  expect(await statusColor(page)).toBe("rgb(239, 68, 68)");
  await page.screenshot({ path: resolve(RESULT_DIR, "e2e-workday-peak.png"), fullPage: true });
});

test("工作日 12:30 显示绿色谷时", async () => {
  const { context, page } = await openAt("2026-11-09T12:30:00+08:00");
  await expect(page.locator(".dsh-tide-hint-status")).toHaveText("谷时·半价");
  await expect(page.locator(".dsh-tide-hint-count")).toContainText("01:30:00");
  expect(await statusColor(page)).toBe("rgb(16, 185, 129)");
  await page.screenshot({ path: resolve(RESULT_DIR, "e2e-workday-offpeak.png"), fullPage: true });
});

test("12:30 推进 01:30:00 后翻为峰时并重置倒计时", async () => {
  const { context, page } = await openAt("2026-11-09T12:30:00+08:00");
  await expect(page.locator(".dsh-tide-hint-status")).toHaveText("谷时·半价");
  await page.clock.fastForward("01:30:00");
  await expect(page.locator(".dsh-tide-hint-status")).toHaveText("峰时·原价");
  await expect(page.locator(".dsh-tide-hint-count")).toContainText("04:00:00");
  await page.screenshot({ path: resolve(RESULT_DIR, "e2e-clock-boundary.png"), fullPage: true });
});

test("周五 18:30 倒计时约等于到下周一 09:00", async () => {
  const { context, page } = await openAt("2026-11-06T18:30:00+08:00");
  await expect(page.locator(".dsh-tide-hint-status")).toHaveText("谷时·半价");
  await expect(page.locator(".dsh-tide-hint-count")).toContainText("62:30:00");
  await page.screenshot({ path: resolve(RESULT_DIR, "e2e-cross-weekend.png"), fullPage: true });
});

test("节前 18:30 跨节假日到节后首个工作日 09:00", async () => {
  const { context, page } = await openAt("2026-09-24T18:30:00+08:00");
  await expect(page.locator(".dsh-tide-hint-status")).toHaveText("谷时·半价");
  await expect(page.locator(".dsh-tide-hint-count")).toContainText("86:30:00");
  await expect(page.getByText("2026-09-28 09:00（北京时间）", { exact: false })).toHaveCount(1);
  await page.screenshot({ path: resolve(RESULT_DIR, "e2e-cross-holiday.png"), fullPage: true });
});

test("点击提示条打开硬编码官方充值页", async () => {
  const { context, page } = await openAt("2026-11-09T10:00:00+08:00");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link").click(),
  ]);
  await expect(popup).toHaveURL("https://platform.deepseek.com/top_up");
  await page.screenshot({ path: resolve(RESULT_DIR, "e2e-click-top-up.png"), fullPage: true });
});
