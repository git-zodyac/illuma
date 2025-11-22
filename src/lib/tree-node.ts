import type { InjectionNode } from "./context";
import { InjectionContextV2 } from "./context";
import { InjectionError } from "./errors";
import type { NodeBase } from "./token";
import { MultiNodeToken, NodeToken } from "./token";

type DependencyPool = Map<NodeBase<any>, TreeNode<any>>;

// Proto Tree Nodes
export class ProtoNodeSingle<T = any> {
  // Metadata
  public readonly token: NodeToken<T>;
  public readonly injections: Set<InjectionNode<any>>;

  // Instantiation
  public factory: (() => T) | null = null;

  constructor(token: NodeToken<T>, factory?: () => T) {
    this.token = token;
    this.factory = factory ?? null;
    this.injections = InjectionContextV2.scan(factory);
  }

  public hasFactory(): boolean {
    return typeof this.factory === "function";
  }

  public setFactory(factory: () => T): void {
    if (this.factory) {
      throw new Error(
        `Cannot overwrite factory for token ${this.token.toString()} as it is already set`,
      );
    }

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
    this.injections = InjectionContextV2.scan(factory);
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

// Tree Nodes
export class TreeRootNode {
  private readonly _deps: Set<TreeNode<any>> = new Set();
  private readonly _treePool = new Map<NodeBase<any>, TreeNode>();

  public get dependencies(): Set<TreeNode<any>> {
    return this._deps;
  }

  public addDependency(node: TreeNode<any>): void {
    this._deps.add(node);
  }

  public instantiate(): void {
    for (const dep of this._deps) {
      const childPool = dep.instantiate();

      for (const [key, value] of childPool) {
        if (this._treePool.has(key)) continue;
        this._treePool.set(key, value);
      }

      if ("token" in dep.proto) this._treePool.set(dep.proto.token, dep);
    }
  }

  public find<T>(token: NodeBase<T>): TreeNode<T> | null {
    const node = this._treePool.get(token);
    if (!node) return null;
    return node as TreeNode<T>;
  }

  public toString(): string {
    return "TreeRootNode";
  }
}

export class TreeNodeSingle<T = any> {
  private readonly _deps: Set<TreeNode<any>> = new Set();
  private _instance: T | null = null;
  private _resolved = false;

  public get instance(): T {
    if (!this._resolved) throw new Error("Instance not yet resolved");
    return this._instance as T;
  }

  public get dependencies(): Set<TreeNode<any>> {
    return this._deps;
  }

  constructor(public readonly proto: ProtoNodeSingle<T>) {}

  public addDependency(node: TreeNode<any>): void {
    this._deps.add(node);
  }

  public instantiate(): DependencyPool {
    if (this._resolved) return new Map();

    const pool: DependencyPool = new Map();

    // Instantiate dependencies first
    const depMap = new Map<NodeBase<any>, TreeNode<any>>();
    for (const dep of this._deps) {
      if ("token" in dep.proto) depMap.set(dep.proto.token, dep);
      const childPool = dep.instantiate();

      for (const [key, value] of childPool) {
        if (pool.has(key)) continue;
        pool.set(key, value);
      }
    }

    // Instantiate self
    const factory = this.proto.factory ?? this.proto.token.opts?.factory;
    if (!factory) throw InjectionError.notFound(this.proto.token);
    this._instance = InjectionContextV2.instantiate(factory, (token, optional) => {
      const depNode = depMap.get(token);
      if (!depNode && !optional) {
        throw InjectionError.untracked(token, this.proto.token);
      }

      return depNode?.instance ?? null;
    });

    this._resolved = true;
    return pool;
  }

  public toString(): string {
    return `TreeNodeSingle<${this.proto.token.toString()}>`;
  }
}

export class TreeNodeTransparent<T = any> {
  private readonly _deps = new Set<TreeNode<any>>();
  private _instance: T | null = null;
  private _resolved = false;

  public get instance(): T {
    if (!this._resolved) throw new Error("Instance not yet resolved");
    return this._instance as T;
  }

  public get dependencies(): Set<TreeNode<any>> {
    return this._deps;
  }

  constructor(public readonly proto: ProtoNodeTransparent<T>) {}

  public addDependency(node: TreeNode<any>): void {
    this._deps.add(node);
  }

  public instantiate(): DependencyPool {
    if (this._resolved) return new Map();

    const pool: DependencyPool = new Map();

    // Instantiate dependencies first
    const depMap = new Map<NodeBase<any>, TreeNode<any>>();
    for (const dep of this._deps) {
      if ("token" in dep.proto) depMap.set(dep.proto.token, dep);
      const childPool = dep.instantiate();

      for (const [key, value] of childPool) {
        if (pool.has(key)) continue;
        pool.set(key, value);
      }
    }

    // Instantiate self
    this._instance = InjectionContextV2.instantiate(
      this.proto.factory,
      (token, optional) => {
        const depNode = depMap.get(token);
        if (!depNode && !optional) {
          throw InjectionError.untracked(token, this.proto.parent.token);
        }

        return depNode?.instance ?? null;
      },
    );

    this._resolved = true;
    return pool;
  }

  public toString(): string {
    return `TreeNodeTransparent<${this.proto.parent.token.toString()}>`;
  }
}

export class TreeNodeMulti<T = any> {
  private readonly _deps = new Set<TreeNode<any>>();
  public readonly instance = new Array<T>();
  private _resolved = false;

  public get dependencies(): Set<TreeNode<any>> {
    return this._deps;
  }

  constructor(public readonly proto: ProtoNodeMulti<T>) {}

  public instantiate(): DependencyPool {
    if (this._resolved) return new Map();

    const pool: DependencyPool = new Map();
    for (const dep of this._deps) {
      const childPool = dep.instantiate();

      for (const [key, value] of childPool) {
        if (pool.has(key)) continue;
        pool.set(key, value);
      }

      if (dep instanceof TreeNodeSingle) {
        this.instance.push(dep.instance);
      } else if (dep instanceof TreeNodeMulti) {
        this.instance.push(...dep.instance);
      } else if (dep instanceof TreeNodeTransparent) {
        this.instance.push(dep.instance);
      }
    }

    this._resolved = true;
    return pool;
  }

  public addDependency(...nodes: TreeNode[]): void {
    for (const node of nodes) {
      this._deps.add(node);
    }
  }

  public toString(): string {
    return `TreeNodeMulti<${this.proto.token.toString()}>`;
  }
}

export type TreeNode<T = any> =
  | TreeNodeSingle<T>
  | TreeNodeMulti<T>
  | TreeNodeTransparent<T>;
