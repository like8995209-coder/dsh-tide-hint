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
  loading: boolean;
}

type ReactRuntime = typeof ReactNamespace;

const TOP_UP_URL = "https://platform.deepseek.com/top_up";

const CARD_CSS = `
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

/**
 * 组件工厂：真正的 React 由 DSH 的 ModuleLoader 在 factory 内注入，源码本身不
 * 在脚本顶层 require React。
 */
export function createTideHintCard(React: ReactRuntime) {
  function TideHintCard(props: TideHintCardProps) {
    const warningText = [props.warning, props.offerWarning].filter(Boolean).join("；");
    const accessibleLabel = [
      props.statusLabel,
      `距切换 ${props.countdown}`,
      props.updatedText,
      props.offlineText,
      props.offerText,
      warningText,
    ].filter(Boolean).join("，");

    return (
      <a
        className="dsh-tide-hint-card"
        href={TOP_UP_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-peak={props.isPeak ? "true" : "false"}
        data-loading={props.loading ? "true" : "false"}
        title={accessibleLabel}
        aria-label={`${accessibleLabel}。点击打开 DeepSeek 官方充值页`}
      >
        <style>{CARD_CSS}</style>
        <span className="dsh-tide-hint-main">
          <span className="dsh-tide-hint-status">{props.statusLabel}</span>
          <span className="dsh-tide-hint-count">
            距切换 <b>{props.countdown}</b>
          </span>
        </span>
        <span className="dsh-tide-hint-meta">
          {warningText ? "⚠ " : ""}
          {props.updatedText}
        </span>
        <span className="dsh-tide-hint-pop" role="tooltip">
          <span className="dsh-tide-hint-pop-title">{props.statusLabel}</span>
          <span className="dsh-tide-hint-pop-row">距切换 {props.countdown} · {props.targetText}</span>
          <span className="dsh-tide-hint-pop-row">{props.offlineText ?? props.updatedText}</span>
          {props.offlineText ? (
            <span className="dsh-tide-hint-pop-row">{props.updatedText}</span>
          ) : null}
          {warningText ? (
            <span className="dsh-tide-hint-pop-row dsh-tide-hint-warn">⚠ {warningText}</span>
          ) : null}
          <span className="dsh-tide-hint-offer">
            <span className="dsh-tide-hint-offer-label">官方充值优惠</span>
            <span className="dsh-tide-hint-offer-text">{props.offerText}</span>
            <span className="dsh-tide-hint-offer-text dsh-tide-hint-official">
              点击打开 platform.deepseek.com/top_up
            </span>
          </span>
        </span>
      </a>
    );
  }

  return TideHintCard;
}
