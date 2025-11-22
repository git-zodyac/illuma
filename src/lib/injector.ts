import { InjectionContextV2, InjectionNode } from "./context";
import { INJECTION_SYMBOL } from "./decorator";
import { MultiNodeToken, NodeToken } from "./token";
import type { ExtractInjectedType, iNodeInjectorOptions } from "./types";

export function nodeInject<N>(
  token: N,
  options: iNodeInjectorOptions & { optional: true },
): N extends MultiNodeToken<infer V>
  ? V[]
  : N extends NodeToken<infer U>
    ? U | null
    : N extends new (
          ...args: any[]
        ) => infer T
      ? T | null
      : never;

export function nodeInject<N>(
  token: N,
  options?: iNodeInjectorOptions,
): N extends MultiNodeToken<infer V>
  ? V[]
  : N extends NodeToken<infer U>
    ? U
    : N extends new (
          ...args: any
        ) => infer T
      ? T
      : never;

export function nodeInject<N extends NodeToken<unknown> | MultiNodeToken<unknown>>(
  token: N,
  options?: iNodeInjectorOptions,
): ExtractInjectedType<N>;

export function nodeInject<
  N extends
    | NodeToken<unknown>
    | MultiNodeToken<unknown>
    | (new (
        ...args: any[]
      ) => unknown) = NodeToken<unknown>,
>(provider: N, options?: iNodeInjectorOptions) {
  let token: any = provider;
  if (!InjectionContextV2.contextOpen) {
    throw new Error("nodeInject() can only be called inside an injection context");
  }

  if (typeof provider === "function" && INJECTION_SYMBOL in provider) {
    token = provider[INJECTION_SYMBOL];
  }

  if (!(token instanceof NodeToken) && !(token instanceof MultiNodeToken)) {
    throw new Error(`${provider.name} is not a provider`);
  }

  const injection = new InjectionNode(token, options?.optional);
  InjectionContextV2.calls.add(injection);

  if (InjectionContextV2.injector) {
    return InjectionContextV2.injector(token, options?.optional);
  }

  return injection;
}
