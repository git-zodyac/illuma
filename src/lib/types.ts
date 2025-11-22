import type { MultiNodeToken, NodeBase, NodeToken } from "./token";

export type Ctor<T> = new (...args: any[]) => T;
export type Token<T> = NodeBase<T> | Ctor<T>;

export interface iNodeTokenBaseOptions<T> {
  factory?: () => NoInfer<T>;
}

export interface iNodeValueProvider<T> {
  provide: Token<T>;
  value: NoInfer<T>;
}

export interface iNodeFactoryProvider<T> {
  provide: Token<T>;
  factory: () => NoInfer<T>;
}

export interface iNodeClassProvider<T> {
  provide: Token<T>;
  useClass: new (...args: any[]) => NoInfer<T>;
}

export interface iNodeAliasProvider<T> {
  provide: Token<T>;
  alias: Token<T>;
}

export type iNodeProvider<T> =
  | iNodeValueProvider<T>
  | iNodeFactoryProvider<T>
  | iNodeClassProvider<T>
  | iNodeAliasProvider<T>;

export interface iDIContainer {
  provide<T>(provider: Providable<T>): void;
  include(group: iNodeProviderSet): void;
}
export type iNodeProviderSet = (container: iDIContainer) => void;
export type Providable<T> = NodeBase<T> | iNodeProvider<T> | Ctor<T>;

export interface iNodeInjectorOptions {
  optional?: boolean;
}

export type ExtractInjectedType<Node> = Node extends MultiNodeToken<infer T>
  ? T[]
  : Node extends NodeToken<infer T>
    ? T
    : never;
