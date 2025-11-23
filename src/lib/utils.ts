import type { MultiNodeToken } from "./token";
import { NodeToken } from "./token";
import type { Ctor, iDIContainer, Token } from "./types";

/**
 * Injector implementation that allows retrieving instances from the parent DI container.
 */
export class InjectorImpl {
  constructor(private readonly _container: iDIContainer) {}
  /**
   * Retrieves an instance for the given token.
   * @template T - The type of value being retrieved
   * @param token - The token or constructor to retrieve
   * @returns The resolved instance
   */
  public get<T>(token: MultiNodeToken<T>): T[];
  public get<T>(token: NodeToken<T>): T;
  public get<T>(token: Ctor<T>): T;
  public get<T>(token: Token<T>): T | T[] {
    return this._container.get<T>(token as any);
  }
}

/**
 * Injector node that is used to access provider outside of injection context.
 * @example
 * ```typescript
 * import { Injector, nodeInject, NodeInjectable, NodeContainer } from "@zodyac/illuma";
 *
 * @NodeInjectable()
 * class MyService {
 *   private readonly _injector = nodeInject(Injector);
 *   public doSomething() {
 *     const otherService = this._injector.get(OtherService);
 *     // Use otherService...
 *   }
 * }
 * ```
 */
export const Injector = new NodeToken<InjectorImpl>("Injector");
