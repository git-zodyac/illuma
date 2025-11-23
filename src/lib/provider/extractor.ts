import type { NodeBase } from "../api";
import { extractToken, MultiNodeToken, NodeToken } from "../api";
import { InjectionError } from "../errors";
import type { Providable } from "../types";

export function extractProvider<T>(provider: Providable<T>): NodeBase<T> | (() => T) {
  if (provider instanceof NodeToken || provider instanceof MultiNodeToken)
    return provider;
  if (typeof provider === "function") {
    return provider;
  }

  if ("value" in provider) return () => provider.value;
  if ("factory" in provider) return provider.factory;
  if ("useClass" in provider) return () => new provider.useClass();
  if ("alias" in provider) return extractToken(provider.alias, true);

  throw InjectionError.invalidProvider(JSON.stringify(provider));
}
