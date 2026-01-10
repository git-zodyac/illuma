import type { NodeBase } from "../../api/token";

/**
 * Instantiation parameters for creating a new instance of a type `T`.
 * @template T - The type of the instance to be created.
 */
export interface iInstantiationParams<T = unknown> {
  readonly token: NodeBase<T>;
  readonly factory: () => T;
}

export type iMiddleware<T = unknown> = (
  params: iInstantiationParams<T>,
  next: (params: iInstantiationParams<T>) => T,
) => T;
