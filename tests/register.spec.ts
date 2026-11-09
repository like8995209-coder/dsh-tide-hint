import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@deepseek-ai/dsh-tools", () => ({
  defineTool: (options: unknown) => options,
}));

import { name, inject as hostInject, apply as hostApply } from "../src/index";
import { createClientPlugin } from "../src/client/index";

const PRICING_HTML = `
  <p>(2) 空闲时段价格为高峰时段价格的一半。北京时间周一至周五（不含中国法定节假日）
  9:00 - 12:00、14:00 - 18:00 为高峰时段；其余时段，包括周末及中国法定节假日全天均为空闲时段。</p>
`;

function okResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

function makeContext(ownerReady: boolean) {
  const cleanups: Array<() => void> = [];
  let registeredComponent: unknown = undefined;
  let registeredOptions: Record<string, unknown> | undefined;
  let registeredDisposed = false;

  const slots = {
    inject: vi.fn((key: string, callback: () => () => void) => {
      if (ownerReady && key === "sidebar.footer.action") return callback();
      return () => {};
    }),
    register: vi.fn((options: Record<string, unknown>, component: unknown) => {
      registeredOptions = options;
      registeredComponent = component;
      return () => {
        registeredDisposed = true;
      };
    }),
    specDynamic: vi.fn((key: string) => (
      ownerReady && key === "sidebar.footer.action" ? { kind: "list" } : undefined
    )),
    declarationEpoch: vi.fn((key: string) => (
      ownerReady && key === "sidebar.footer.action" ? 1 : 0
    )),
  };

  const ctx = {
    slots,
    effect: vi.fn((factory: () => () => void) => {
      const cleanup = factory();
      cleanups.push(cleanup);
      return cleanup;
    }),
  };

  return {
    ctx,
    slots,
    cleanups,
    get registeredComponent() {
      return registeredComponent;
    },
    get registeredOptions() {
      return registeredOptions;
    },
    get registeredDisposed() {
      return registeredDisposed;
    },
    disposeAll() {
      for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DSH 插件注册契约", () => {
  it("导出宿主插件 name/inject/apply，客户端 require 包含 slots", () => {
    const clientPlugin = createClientPlugin(React);

    expect(name).toBe("dsh-tide-hint");
    expect(hostInject).toContain("webServer");
    expect(typeof hostApply).toBe("function");
    expect(clientPlugin.inject).toEqual(expect.arrayContaining(["slots"]));
    expect(typeof clientPlugin.apply).toBe("function");
  });

  it("owner 就绪后注册 TideHintCard 组件，disposer 可逆", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T10:00:00+08:00"));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return okResponse(url.includes("resource=offer") ? "<p>请选择充值金额</p>" : PRICING_HTML);
    }));

    const harness = makeContext(true);
    const plugin = createClientPlugin(React);

    expect(() => plugin.apply(harness.ctx)).not.toThrow();
    expect(harness.slots.register).toHaveBeenCalledTimes(1);
    expect(harness.registeredOptions).toMatchObject({
      name: "sidebar.footer.action",
      id: "dsh-tide-hint",
    });
    expect(typeof harness.registeredComponent).toBe("function");
    expect(harness.registeredDisposed).toBe(false);

    harness.disposeAll();
    expect(harness.registeredDisposed).toBe(true);
  });

  it("slot owner 尚未就绪时不注册且不崩溃", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T10:00:00+08:00"));
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    const harness = makeContext(false);
    const plugin = createClientPlugin(React);

    expect(() => plugin.apply(harness.ctx)).not.toThrow();
    expect(harness.slots.inject).toHaveBeenCalled();
    expect(harness.slots.register).not.toHaveBeenCalled();
    expect(() => harness.disposeAll()).not.toThrow();
  });
});
