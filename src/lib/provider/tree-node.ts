import type { NodeBase } from "../api";
import { InjectionContext } from "../context";
import { InjectionError } from "../errors";
import type { ProtoNodeMulti, ProtoNodeSingle, ProtoNodeTransparent } from "./proto";

type DependencyPool = Map<NodeBase<any>, TreeNode<any>>;

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
    if (!this._resolved) {
      throw InjectionError.instanceAccessFailed(this.proto.token);
    }

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
    this._instance = InjectionContext.instantiate(factory, (token, optional) => {
      const depNode = depMap.get(token);
      if (!depNode && !optional) {
        throw InjectionError.untracked(token, this.proto.token);
      }

      return depNode?.instance ?? null;
    });

    this._resolved = true;
    pool.set(this.proto.token, this);
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
    if (!this._resolved) throw InjectionError.accessFailed();

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
    this._instance = InjectionContext.instantiate(
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
  public readonly instance = [] as T[];
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
    pool.set(this.proto.token, this);
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
