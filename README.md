# dsh-tide-hint

DSH 侧边栏峰谷价格提示。以固定北京时间显示当前是“谷时·半价”还是“峰时·原价”，并每秒更新到下一状态边界的倒计时。

> 这是第三方非官方插件，与 DeepSeek 官方无隶属关系。充值请认准 `https://platform.deepseek.com/top_up`。

## 功能

- 挂在 Cordis Slot：依次尝试 `sidebar.footer`、`sidebar.userArea`，再兼容当前 DSH 实际提供的 `sidebar.footer.action`，使用 `ctx.slots.inject` 等待 owner 声明后 `register`。
- 卡片固定 30px 高，位于侧边栏底部用户名区域附近；详情和官方充值优惠放在悬停/聚焦气泡中，不撑高布局。
- 固定北京时间 UTC+8，不使用浏览器本地的 `getHours` / `getDay`。
- 工作日 `09:00-12:00`、`14:00-18:00` 为峰时；周末、节假日全天为谷时。
- 内置 2025-2026 中国法定节假日，2026 调休上班日按工作日规则处理，优先级高于周末谷时。
- 倒计时正确处理跨零点、周末、法定节假日和调休：例如周五 18:00 后指向下周一 09:00；长假指向节后首个工作日 09:00。
- 当前年无节假日数据时显示“按工作日估算”警告。
- 每个北京日期首次启动时异步更新定价规则和官方充值优惠；初始渲染不等待网络，失败时保留上次规则或内置快照，倒计时不阻塞。
- 规则缓存键为 `dsh-tide-hint.rules`，包含 `peakWindows`、`weekendOffPeak`、`holidayOffPeak`、`holidays`、`makeupWorkdays`、`lastFetchedDate`、`fetchedAt`、`sourceUrl`、`parseStatus` 和 `rawFootnoteSnippet`。
- 官方充值优惠缓存键为 `dsh-tide-hint.offer`。没有活动时显示“官方无额外充值优惠”。
- 点击整条提示或优惠文案只会在新标签打开硬编码的 DeepSeek 官方充值页。

## 自动调度信号

调度默认关闭。卡片内的“自动调度”和“手动锁定”复选框可随时切换；点击复选框不会触发卡片跳转。调度开启且未锁定时，它复用同一套 UTC+8、节假日、调休和峰谷判定，并在原有每秒 tick 中持续派发：

- 谷时：`dsh-tide:task-start`
- 峰时：`dsh-tide:task-stop`
- 距下一次峰时开始不超过 60 秒：单次 `dsh-tide:prewarn`

预警文案固定为：

```text
距峰时原价时段60秒，即将自动停止后台任务。
```

插件只发送事件信号，不维护外部业务任务状态，也不会代替外部任务执行暂停、恢复或重试。外部即使在峰值期间暂停任务，下一个谷时 tick 仍会再次收到启动信号。

订阅示例：

```js
window.addEventListener("dsh-tide:task-start", (event) => {
  // event.detail: { source, signal, isPeak, at, nextBoundary }
  startBackgroundWork();
});

window.addEventListener("dsh-tide:task-stop", (event) => {
  stopBackgroundWork();
});

window.addEventListener("dsh-tide:prewarn", (event) => {
  console.info(event.detail.text);
});
```

运行时 API：

```js
window.DSHTideHint?.setSchedulerEnable(true);
window.DSHTideHint?.setManualLock(false);

// 锁定后立即停止发送自动调度信号；解锁后下一个 tick 恢复。
window.DSHTideHint?.setManualLock(true);
```

调度开关、手动锁定标记、预警时间戳和已预警边界保存在
`localStorage["dsh-tide-hint.scheduler"]`。预警按边界防抖，同一个峰时开始边界最多触发一次。

## 数据来源与网络行为

定价规则来源：

`https://api-docs.deepseek.com/zh-cn/quick_start/pricing`

充值优惠来源：

`https://platform.deepseek.com/top_up`

两个地址都只在每日首次启动时异步 GET。请求为只读，`credentials: omit`，不发送 Cookie、表单、API Key、Token 或本机隐私；每次上游请求 5 秒超时，最多重试 1 次。定价页未返回 CORS 头，因此插件内置同源只读宿主代理，客户端仍只访问以上两个硬编码资源，不能传入外部 URL。

仅解析 `deepseek.com` 域名下的官方页面。优惠文案直接展示官方原文或以下固定模板，不采集、不推送第三方代理或非官方优惠。

规则解析失败时不猜测，标记 `parseStatus=parse_failed`，沿用上次规则或内置快照，并显示“离线规则（内置快照）”。次要文字显示“规则更新：YYYY-MM-DD HH:mm”或“规则更新：内置快照”；异常时带 `⚠` 和原因。

## 零 Token 约束

插件运行时不调用任何 LLM 或模型 API，不注入系统提示，不修改对话请求，也不会产生 token 消耗。优惠文案直接来自官方页面文本或固定模板，不经模型生成；自动调度也只发送本地 DOM 事件。

## 安装与构建

开发目录：

```powershell
cd C:\Users\M4099\Documents\Codex\dsh-tide-hint
npm install
npm test
npm run build
```

构建产物位于 `lib/`：

- `lib/index.js`：DSH 宿主半区，只读官方页面代理。
- `lib/client.js`：供 DSH `__ModuleLoader__` 加载的 Web 客户端插件。

把整个目录作为本地插件安装到 DSH，或在开发 profile 中链接它；`package.json` 的 `dsh.bundle.patch` 会插入 `cordis.patch.yml` 中的插件条目。

## 缓存与降级

- `lastFetchedDate` 按北京日期记录“每日请求已完成”的日期。
- `fetchedAt` 只在成功解析定价脚注时刷新；规则内容未变也会刷新。
- 网络失败、超时、非官方重定向或解析缺项都会降级，不会清空可用的旧规则。
- 本地存储不可用时仍使用内置快照和实时倒计时。
