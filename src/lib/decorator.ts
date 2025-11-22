import { NodeToken } from "./token";

export const INJECTION_SYMBOL = Symbol("Injectable");

export function NodeInjectable<T>() {
  return (ctor: new (...args: any[]) => T) => {
    const nodeToken = new NodeToken<T>(`_${ctor.name}`, {
      factory: () => new ctor(),
    });

    (ctor as any)[INJECTION_SYMBOL] = nodeToken;
  };
}
