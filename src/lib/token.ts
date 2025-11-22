import type { iNodeTokenBaseOptions } from "./types";

export class NodeBase<T> {
  constructor(
    public readonly name: string,
    public readonly opts?: iNodeTokenBaseOptions<T>,
  ) {}

  public toString(): string {
    return `Token[${this.name}]`;
  }
}
export class NodeToken<T> extends NodeBase<T> {
  public readonly multi = false as const;

  public override toString(): string {
    return `NodeToken[${this.name}]`;
  }
}

export class MultiNodeToken<T> extends NodeBase<T> {
  public readonly multi = true as const;

  public override toString(): string {
    return `MultiNodeToken[${this.name}]`;
  }
}

export function isNodeBase<T>(
  specimen: unknown,
): specimen is NodeToken<T> | MultiNodeToken<T> {
  return specimen instanceof NodeToken || specimen instanceof MultiNodeToken;
}
