import type * as ReactNamespace from "react";

export interface TideHintCardProps {
  statusLabel: "谷时·半价" | "峰时·原价";
  isPeak: boolean;
  countdown: string;
  targetText: string;
  updatedText: string;
  offlineText: string | null;
  warning: string | null;
  offerText: string;
  offerWarning: string | null;
  balanceText: string;
  tokenEstimateText: string;
  balanceWarning: string | null;
  tokenBasisText: string | null;
  balanceRefreshing: boolean;
  onRefreshBalance: () => void;
  schedulerEnabled: boolean;
  manualLocked: boolean;
  onSchedulerEnableChange: (enabled: boolean) => void;
  onManualLockChange: (locked: boolean) => void;
  loading: boolean;
}

type ReactRuntime = typeof ReactNamespace;

const TOP_UP_URL = "https://platform.deepseek.com/top_up";

const CARD_CSS = `
.dsh-tide-hint-card{
  --dth-color:var(--dsw-alias-state-success-primary,#10b981);
  box-sizing:border-box;
  position:relative;
  width:264px;
  min-width:264px;
  max-width:264px;
  flex:0 0 264px;
  height:50px;
  min-height:50px;
  max-height:50px;
  padding:3px 8px;
  border:1px solid color-mix(in srgb,var(--dth-color) 32%,transparent);
  border-radius:8px;
  background:color-mix(in srgb,var(--dth-color) 8%,var(--dsw-alias-bg-layer-1,transparent));
  color:var(--dsw-alias-label-secondary,#6b7280);
  text-decoration:none;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:1px;
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
.dsh-tide-hint-balance-row{display:flex;align-items:baseline;gap:5px;min-width:0;overflow:hidden;white-space:nowrap;line-height:14px;font-size:11px}
.dsh-tide-hint-balance-label{flex:none;color:var(--dsw-alias-label-tertiary,#8b95a5)}
.dsh-tide-hint-balance-value{flex:none;color:var(--dsw-alias-label-primary,#111827);font-size:12px;font-weight:650}
.dsh-tide-hint-token-value{min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary,#6b7280);font-size:10px}
.dsh-tide-hint-refresh{box-sizing:border-box;width:16px;height:16px;margin:0 0 0 auto;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:14px;line-height:16px;cursor:pointer;flex:none}
.dsh-tide-hint-refresh:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#111827)}
.dsh-tide-hint-refresh:disabled{cursor:wait;opacity:.65}
.dsh-tide-hint-refresh[data-refreshing="true"]{animation:dth-refresh-spin .8s linear infinite}
@keyframes dth-refresh-spin{to{transform:rotate(360deg)}}
.dsh-tide-hint-meta-row{display:flex;align-items:center;gap:4px;min-width:0;line-height:10px}
.dsh-tide-hint-meta{display:block;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;line-height:10px;color:var(--dsw-alias-label-tertiary,#8b95a5)}
.dsh-tide-hint-controls{display:flex;align-items:center;gap:5px;flex:none;font-size:9px;line-height:10px;color:var(--dsw-alias-label-secondary,#6b7280)}
.dsh-tide-hint-control{display:inline-flex;align-items:center;gap:2px;white-space:nowrap;cursor:pointer}
.dsh-tide-hint-control input{width:10px;height:10px;margin:0;padding:0;accent-color:var(--dth-color);cursor:pointer}
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

/**
 * 组件工厂：真正的 React 由 DSH 的 ModuleLoader 在 factory 内注入，源码本身不
 * 在脚本顶层 require React。
 */
export function createTideHintCard(React: ReactRuntime) {
  function TideHintCard(props: TideHintCardProps) {
    const warningText = [props.warning, props.offerWarning, props.balanceWarning].filter(Boolean).join("；");
    const openTopUp = () => {
      const opened = window.open(TOP_UP_URL, "_blank");
      if (opened) opened.opener = null;
    };
    const accessibleLabel = [
      props.statusLabel,
      `距切换 ${props.countdown}`,
      props.updatedText,
      props.offlineText,
      props.offerText,
      `余额 ${props.balanceText}`,
      `约 ${props.tokenEstimateText} tokens`,
      props.balanceRefreshing ? "余额刷新中" : "余额可刷新",
      `自动调度${props.schedulerEnabled ? "开启" : "关闭"}`,
      `手动锁定${props.manualLocked ? "开启" : "关闭"}`,
      warningText,
    ].filter(Boolean).join("，");

    return (
      <div
        className="dsh-tide-hint-card"
        role="link"
        tabIndex={0}
        data-peak={props.isPeak ? "true" : "false"}
        data-loading={props.loading ? "true" : "false"}
        title={accessibleLabel}
        aria-label={`${accessibleLabel}。点击打开 DeepSeek 官方充值页`}
        onClick={openTopUp}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openTopUp();
          }
        }}
      >
        <style>{CARD_CSS}</style>
        <span className="dsh-tide-hint-main">
          <span className="dsh-tide-hint-status">{props.statusLabel}</span>
          <span className="dsh-tide-hint-count">
            距切换 <b>{props.countdown}</b>
          </span>
        </span>
        <span className="dsh-tide-hint-balance-row">
          <span className="dsh-tide-hint-balance-label">余额</span>
          <b className="dsh-tide-hint-balance-value">{props.balanceText}</b>
          <span className="dsh-tide-hint-token-value">≈ {props.tokenEstimateText} tokens</span>
          <button
            type="button"
            className="dsh-tide-hint-refresh"
            data-refreshing={props.balanceRefreshing ? "true" : "false"}
            disabled={props.balanceRefreshing}
            title={props.balanceRefreshing ? "正在刷新余额" : "刷新余额"}
            aria-label="刷新余额"
            onClick={(event) => {
              event.stopPropagation();
              props.onRefreshBalance();
            }}
          >
            ↻
          </button>
        </span>
        <span className="dsh-tide-hint-meta-row">
          <span className="dsh-tide-hint-meta">
            {warningText ? "⚠ " : ""}
            {props.updatedText}
          </span>
          <span
            className="dsh-tide-hint-controls"
            onClick={(event) => event.stopPropagation()}
          >
            <label
              className="dsh-tide-hint-control"
              onClick={(event) => event.stopPropagation()}
              title="谷时发送任务启动信号，峰时发送停止信号"
            >
              <input
                type="checkbox"
                checked={props.schedulerEnabled}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => props.onSchedulerEnableChange(event.currentTarget.checked)}
                aria-label="自动调度"
              />
              自动调度
            </label>
            <label
              className="dsh-tide-hint-control"
              onClick={(event) => event.stopPropagation()}
              title="锁定后停止发送自动调度信号"
            >
              <input
                type="checkbox"
                checked={props.manualLocked}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => props.onManualLockChange(event.currentTarget.checked)}
                aria-label="手动锁定"
              />
              手动锁定
            </label>
          </span>
        </span>
        <span className="dsh-tide-hint-pop" role="tooltip">
          <span className="dsh-tide-hint-pop-title">{props.statusLabel}</span>
          <span className="dsh-tide-hint-pop-row">距切换 {props.countdown} · {props.targetText}</span>
          <span className="dsh-tide-hint-pop-row">
            余额 {props.balanceText} · 约 {props.tokenEstimateText} tokens
          </span>
          {props.tokenBasisText ? (
            <span className="dsh-tide-hint-pop-row">折算基准：{props.tokenBasisText}</span>
          ) : null}
          <span className="dsh-tide-hint-pop-row">{props.offlineText ?? props.updatedText}</span>
          {props.offlineText ? (
            <span className="dsh-tide-hint-pop-row">{props.updatedText}</span>
          ) : null}
          {warningText ? (
            <span className="dsh-tide-hint-pop-row dsh-tide-hint-warn">⚠ {warningText}</span>
          ) : null}
          <span className="dsh-tide-hint-pop-row">
            自动调度：{props.schedulerEnabled ? "开启" : "关闭"} · 手动锁定：{props.manualLocked ? "开启" : "关闭"}
          </span>
          <span className="dsh-tide-hint-offer">
            <span className="dsh-tide-hint-offer-label">官方充值优惠</span>
            <span className="dsh-tide-hint-offer-text">{props.offerText}</span>
            <span className="dsh-tide-hint-offer-text dsh-tide-hint-official">
              点击打开 platform.deepseek.com/top_up
            </span>
          </span>
        </span>
      </div>
    );
  }

  return TideHintCard;
}
