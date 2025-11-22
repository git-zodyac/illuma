import { INJECTION_SYMBOL } from "./decorator";
import type { Ctor, iDIContainer, iNodeProvider, iNodeProviderSet } from "./types";

export const INJECTION_GROUP_SYMBOL = Symbol("__INJECTION_GROUP__");
export function createProviderSet(
  ...providers: (
    | iNodeProvider<unknown>
    | iNodeProvider<unknown>[]
    | iNodeProviderSet
    | Ctor<unknown>
  )[]
): iNodeProviderSet {
  const fn = (container: iDIContainer) => {
    for (const provider of providers) {
      if (Array.isArray(provider)) {
        for (const p of provider) container.provide(p);
        continue;
      }

      if (typeof provider === "function") {
        if (INJECTION_SYMBOL in provider) {
          container.provide(provider);
          continue;
        }

        if (isProviderSet(provider)) provider(container);
        continue;
      }

      if (provider.provide) container.provide(provider);
    }
  };

  fn[INJECTION_GROUP_SYMBOL] = true;
  return fn;
}

function isProviderSet(
  provider: iNodeProvider<unknown> | iNodeProviderSet | Ctor<unknown>,
): provider is iNodeProviderSet {
  return !!(
    typeof provider === "function" &&
    INJECTION_GROUP_SYMBOL in provider &&
    provider[INJECTION_GROUP_SYMBOL]
  );
}
