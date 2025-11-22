import { InjectionContext, InjectionNode } from "./context";
import { INJECTION_SYMBOL } from "./decorator";
import { InjectionError } from "./errors";
import type { MultiNodeToken, NodeToken } from "./token";
import { isNodeBase } from "./token";
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
  if (typeof provider === "function" && INJECTION_SYMBOL in provider) {
    token = provider[INJECTION_SYMBOL];
  }

  if (!InjectionContext.contextOpen) {
    throw InjectionError.outsideContext(token);
  }

  if (!isNodeBase(token)) throw InjectionError.invalidProvider(String(token));

  const injection = new InjectionNode(token, options?.optional);
  InjectionContext.calls.add(injection);

  if (InjectionContext.injector) {
    return InjectionContext.injector(token, options?.optional);
  }

  return injection;
}
