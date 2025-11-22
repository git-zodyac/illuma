import { NodeBase } from "./token";
import type { Ctor } from "./types";

export class InjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InjectionError";
  }

  // Provider errors
  public static duplicate(token: NodeBase<unknown>): InjectionError {
    return new InjectionError(
      `Duplicate provider for token "${token.toString()}" detected.`,
    );
  }

  public static invalidCtor(ctor: Ctor<unknown>): InjectionError {
    return new InjectionError(
      `Cannot use constructor for token "${ctor.name}". Please make sure to use @nodeInjectable() decorator`,
    );
  }

  public static invalidProvider(provider: string): InjectionError {
    return new InjectionError(
      `Cannot use provider as it is neither a NodeToken nor MultiNodeToken nor a valid constructor.:\n${provider}`,
    );
  }

  // Alias errors
  public static invalidAlias(alias: NodeBase<unknown>): InjectionError {
    return new InjectionError(
      `Cannot use alias as it is not a valid provider:\n${alias.toString()}`,
    );
  }

  public static loopAlias(alias: NodeBase<unknown>): InjectionError {
    return new InjectionError(
      `Token "${alias.toString()}" cannot alias itself in a loop.`,
    );
  }

  // Bootstrap errors
  public static notBootstrapped(): InjectionError {
    return new InjectionError(
      "Cannot retrieve providers before the container has been bootstrapped.",
    );
  }

  public static bootstrapped(): InjectionError {
    return new InjectionError(
      "Cannot modify providers after the container has been bootstrapped.",
    );
  }

  public static doubleBootstrap(): InjectionError {
    return new InjectionError(
      "Container has already been bootstrapped and cannot be bootstrapped again.",
    );
  }

  // Retrieval errors
  public static notFound(token: NodeBase<unknown>): InjectionError {
    return new InjectionError(`No provider found for "${token.toString()}".`);
  }

  public static couldNotResolve(token?: NodeBase<unknown>): InjectionError {
    if (!token) {
      return new InjectionError("Could not resolve dependencies.");
    }

    return new InjectionError(
      `Could not resolve "${token.toString()}". Please check for missing providers or circular dependencies.`,
    );
  }

  public static circularDependency(
    provider: NodeBase<unknown> | Ctor<unknown>,
    path: (NodeBase<unknown> | Ctor<unknown>)[],
  ): InjectionError {
    const providerStr =
      provider instanceof NodeBase ? provider.toString() : provider.name;
    const pathStr = path
      .map((p) => (p instanceof NodeBase ? p.toString() : p.name))
      .join(" -> ");

    return new InjectionError(
      `Circular dependency detected while resolving "${providerStr}":\n${pathStr}`,
    );
  }

  // Instantiation errors
  public static untracked(
    token: NodeBase<unknown> | Ctor<unknown>,
    parent: NodeBase<unknown> | Ctor<unknown>,
  ): InjectionError {
    const tokenStr = token instanceof NodeBase ? token.toString() : token.name;
    const parentStr = parent instanceof NodeBase ? parent.toString() : parent.name;
    return new InjectionError(
      `Cannot instantiate ${parentStr} because it depends on untracked injection ${tokenStr}. Please make sure all injections are properly tracked.`,
    );
  }
}
