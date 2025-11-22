import { InjectionError } from "./errors";
import type { MultiNodeToken, NodeBase, NodeToken } from "./token";

type InjectorFn = (token: NodeBase<any>, optional?: boolean) => any;
export abstract class InjectionContext {
  public static contextOpen = false;
  public static calls = new Set<InjectionNode<any>>();
  public static injector: InjectorFn | null = null;

  public static open(injector?: InjectorFn): void {
    InjectionContext.calls = new Set();
    InjectionContext.contextOpen = true;
    InjectionContext.injector = injector || null;
  }

  public static getCalls(): Set<InjectionNode<unknown>> {
    if (!InjectionContext.contextOpen) {
      throw InjectionError.calledUtilsOutsideContext();
    }

    return new Set(InjectionContext.calls);
  }

  public static scan(factory: any): Set<InjectionNode<any>> {
    if (typeof factory !== "function") return new Set();
    InjectionContext.open();
    try {
      factory();
    } catch {
      // No-op
    }

    const injections = InjectionContext.getCalls();
    InjectionContext.close();
    return injections;
  }

  public static instantiate<T>(factory: () => T, injector: InjectorFn): T {
    InjectionContext.open(injector);
    try {
      return factory();
    } finally {
      InjectionContext.close();
    }
  }

  public static close(): void {
    InjectionContext.contextOpen = false;
    InjectionContext.calls = new Set();
    InjectionContext.injector = null;
  }
}

export class InjectionNode<T> {
  constructor(
    public readonly token: NodeToken<T> | MultiNodeToken<T>,
    public readonly optional = false,
  ) {}
}
