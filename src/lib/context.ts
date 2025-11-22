import type { MultiNodeToken, NodeBase, NodeToken } from "./token";

type InjectorFn = (token: NodeBase<any>, optional?: boolean) => any;
export abstract class InjectionContextV2 {
  public static contextOpen = false;
  public static calls = new Set<InjectionNode<any>>();
  public static injector: InjectorFn | null = null;

  public static open(injector?: InjectorFn): void {
    InjectionContextV2.calls = new Set();
    InjectionContextV2.contextOpen = true;
    InjectionContextV2.injector = injector || null;
  }

  public static getCalls(): Set<InjectionNode<unknown>> {
    if (!InjectionContextV2.contextOpen) {
      throw new Error(
        "InjectionContext is not open. Use InjectionContext.open() to open it.",
      );
    }
    return new Set(InjectionContextV2.calls);
  }

  public static scan(factory: any): Set<InjectionNode<any>> {
    if (typeof factory !== "function") return new Set();
    InjectionContextV2.open();
    try {
      factory();
    } catch {
      // No-op
    }

    const injections = InjectionContextV2.getCalls();
    InjectionContextV2.close();
    return injections;
  }

  public static instantiate<T>(factory: () => T, injector: InjectorFn): T {
    InjectionContextV2.open(injector);
    try {
      return factory();
    } finally {
      InjectionContextV2.close();
    }
  }

  public static close(): void {
    InjectionContextV2.contextOpen = false;
    InjectionContextV2.calls = new Set();
    InjectionContextV2.injector = null;
  }
}

export class InjectionNode<T> {
  constructor(
    public readonly token: NodeToken<T> | MultiNodeToken<T>,
    public readonly optional = false,
  ) {}
}
