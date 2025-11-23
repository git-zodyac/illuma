import type { NodeBase } from "../api";
import { MultiNodeToken, NodeToken } from "../api";
import type { InjectionNode } from "../context";
import { InjectionContext } from "../context";
import { InjectionError } from "../errors";

export class ProtoNodeSingle<T = any> {
  // Metadata
  public readonly token: NodeToken<T>;
  public readonly injections: Set<InjectionNode<any>>;

  // Instantiation
  public factory: (() => T) | null = null;

  constructor(token: NodeToken<T>, factory?: () => T) {
    this.token = token;
    this.factory = factory ?? null;
    this.injections = InjectionContext.scan(factory);
  }

  public hasFactory(): boolean {
    return typeof this.factory === "function";
  }

  public setFactory(factory: () => T): void {
    if (this.factory) throw InjectionError.duplicateFactory(this.token);
    this.factory = factory;
  }

  public toString(): string {
    return `ProtoNodeSingle<${this.token.toString()}>`;
  }
}

export class ProtoNodeTransparent<T = any> {
  public readonly factory: () => T;
  public readonly injections: Set<InjectionNode<any>>;

  constructor(
    public readonly parent: ProtoNodeSingle<T> | ProtoNodeMulti<T>,
    factory: () => T,
  ) {
    this.factory = factory;
    this.injections = InjectionContext.scan(factory);
  }

  public toString(): string {
    return `ProtoNodeTransparent<${this.factory.name || "anonymous"}>`;
  }
}

export class ProtoNodeMulti<T = any> {
  public readonly token: MultiNodeToken<T>;
  public readonly singleNodes = new Set<NodeToken<T>>();
  public readonly multiNodes = new Set<MultiNodeToken<T>>();
  public readonly transparentNodes = new Set<ProtoNodeTransparent<T>>();

  constructor(token: MultiNodeToken<T>) {
    this.token = token;
  }

  public addProvider(retriever: NodeBase<T> | (() => T)): void {
    if (retriever instanceof NodeToken) {
      this.singleNodes.add(retriever);
    } else if (retriever instanceof MultiNodeToken) {
      this.multiNodes.add(retriever);
    } else if (typeof retriever === "function") {
      const transparentProto = new ProtoNodeTransparent<T>(this, retriever);
      this.transparentNodes.add(transparentProto);
    }
  }

  public toString(): string {
    return `ProtoNodeMulti<${this.token.toString()}>`;
  }
}

export type ProtoNode<T = any> =
  | ProtoNodeSingle<T>
  | ProtoNodeMulti<T>
  | ProtoNodeTransparent<T>;
