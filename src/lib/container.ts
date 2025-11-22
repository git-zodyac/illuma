import type { InjectionNode } from "./context";
import { INJECTION_SYMBOL } from "./decorator";
import { InjectionError } from "./errors";
import { nodeInject } from "./injector";
import type { NodeBase } from "./token";
import { isNodeBase, MultiNodeToken, NodeToken } from "./token";
import type { ProtoNode, TreeNode } from "./tree-node";
import {
  ProtoNodeMulti,
  ProtoNodeSingle,
  ProtoNodeTransparent,
  TreeNodeMulti,
  TreeNodeSingle,
  TreeNodeTransparent,
  TreeRootNode,
} from "./tree-node";
import type {
  Ctor,
  iDIContainer,
  iNodeProvider,
  iNodeProviderSet,
  Providable,
  Token,
} from "./types";

export interface iContainerOptions {
  measurePerformance?: boolean;
}

export class NodeContainer implements iDIContainer {
  private _bootstrapped = false;
  private _rootNode?: TreeRootNode;

  private readonly _protoNodes = new Map<NodeToken<any>, ProtoNodeSingle<any>>();

  private readonly _multiProtoNodes = new Map<MultiNodeToken<any>, ProtoNodeMulti<any>>();

  constructor(private readonly _opts?: iContainerOptions) {}

  public provide<T>(provider: Providable<T>): void {
    if (this._bootstrapped) {
      throw InjectionError.bootstrapped();
    }

    // Handle node token declarations
    if (provider instanceof MultiNodeToken) {
      if (this._multiProtoNodes.has(provider)) {
        throw InjectionError.duplicate(provider);
      }

      const newProto = new ProtoNodeMulti<T>(provider);
      this._multiProtoNodes.set(provider, newProto);
      return;
    }

    // Handle multi node token declarations
    if (provider instanceof NodeToken) {
      if (this._protoNodes.has(provider)) {
        throw InjectionError.duplicate(provider);
      }

      const proto = new ProtoNodeSingle<T>(provider);
      this._protoNodes.set(provider, proto);
      return;
    }

    // Handle constructors
    if (typeof provider === "function") {
      if (!(INJECTION_SYMBOL in provider)) throw InjectionError.invalidCtor(provider);

      const token = provider[INJECTION_SYMBOL];
      if (!(token instanceof NodeToken)) throw InjectionError.invalidCtor(provider);

      const existing = this._protoNodes.get(token);
      if (existing?.hasFactory()) throw InjectionError.duplicate(token);

      const factory = () => new provider();
      if (existing) {
        existing.setFactory(factory);
        return;
      }

      const proto = new ProtoNodeSingle<T>(token, factory);
      this._protoNodes.set(token, proto);
      return;
    }

    // Extract token and retriever from provider object or constructor
    const token = extractToken((<iNodeProvider<T>>provider).provide);
    const retriever = extractProvider<T>(provider);

    if (token instanceof MultiNodeToken) {
      const multiProto = this._multiProtoNodes.get(token);
      if (multiProto) {
        multiProto.addProvider(retriever);
        return;
      }

      const newProto = new ProtoNodeMulti<T>(token);
      this._multiProtoNodes.set(token, newProto);
      newProto.addProvider(retriever);
      return;
    }

    if (token instanceof NodeToken) {
      const existing = this._protoNodes.get(token);
      if (existing?.hasFactory()) throw InjectionError.duplicate(token);

      let factory: (() => T) | undefined;
      if (typeof retriever === "function") factory = retriever;
      if (isNodeBase<T>(retriever)) {
        if (retriever === token) throw InjectionError.loopAlias(token);
        factory = () => nodeInject<NodeBase<T>>(retriever);
      }

      if (existing && factory) {
        existing.setFactory(factory);
        return;
      }

      const proto = new ProtoNodeSingle<T>(token, factory);
      this._protoNodes.set(token, proto);
      return;
    }

    throw InjectionError.invalidProvider(JSON.stringify(provider));
  }

  public include(group: iNodeProviderSet): void {
    group(this);
  }

  private _buildInjectionTree(): TreeRootNode {
    const root = new TreeRootNode();
    const cache = new Map<ProtoNode, TreeNode>();

    const nodes: ProtoNode[] = [
      ...this._protoNodes.values(),
      ...this._multiProtoNodes.values(),
    ];

    for (const node of nodes) {
      if (cache.has(node)) continue;

      const treeNode = resolveTreeNode(
        node,
        cache,
        this._protoNodes,
        this._multiProtoNodes,
      );

      root.addDependency(treeNode);
    }

    cache.clear();
    this._protoNodes.clear();
    this._multiProtoNodes.clear();

    return root;
  }

  // Step 1 – collect providers
  // Step 2 - resolve injection trees
  // Step 3 - instantiate from bottom to top
  public bootstrap(): void {
    if (this._bootstrapped) throw InjectionError.doubleBootstrap();

    const start = performance.now();

    this._rootNode = this._buildInjectionTree();
    this._rootNode.instantiate();
    this._bootstrapped = true;

    const end = performance.now();
    if (this._opts?.measurePerformance) {
      const duration = end - start;
      console.log(`[Illuma] 🚀 Bootstrapped in ${duration.toFixed(2)} ms`);
    }
  }

  public get<T>(token: MultiNodeToken<T>): T[];
  public get<T>(token: NodeToken<T>): T;
  public get<T>(token: NodeToken<T> | Ctor<T>): T;
  public get<T>(provider: NodeBase<T> | Ctor<T>): T | T[] {
    if (!this._bootstrapped || !this._rootNode) {
      throw InjectionError.notBootstrapped();
    }

    let token: NodeBase<T> | null = null;
    if (typeof provider === "function") {
      if (!(INJECTION_SYMBOL in provider)) {
        throw InjectionError.invalidCtor(provider);
      }

      token = provider[INJECTION_SYMBOL] as NodeBase<T>;
    }

    if (isNodeBase<T>(provider)) token = provider;

    if (!token) {
      throw InjectionError.invalidProvider(JSON.stringify(provider));
    }

    const treeNode = this._rootNode.find(token);
    if (!treeNode) {
      if (token instanceof MultiNodeToken) return [];
      throw InjectionError.notFound(token);
    }

    return treeNode.instance;
  }
}

function extractToken<T>(provider: Token<T>, isAlias = false): NodeBase<T> {
  let token: NodeBase<T> | null = null;
  if (typeof provider === "function" && INJECTION_SYMBOL in provider) {
    const node = provider[INJECTION_SYMBOL];
    if (isNodeBase<T>(node)) token = node;
  } else if (isNodeBase<T>(provider)) token = provider;

  if (!token) {
    if (isAlias) throw InjectionError.invalidAlias(provider);
    throw InjectionError.invalidProvider(JSON.stringify(provider));
  }

  return token;
}

function extractProvider<T>(provider: Providable<T>): NodeBase<T> | (() => T) {
  if (provider instanceof NodeToken || provider instanceof MultiNodeToken)
    return provider;
  if (typeof provider === "function") {
    return provider;
  }

  if ("value" in provider) return () => provider.value;
  if ("factory" in provider) return provider.factory;
  if ("useClass" in provider) return () => new provider.useClass();
  if ("alias" in provider) return extractToken(provider.alias, true);

  throw InjectionError.invalidProvider(JSON.stringify(provider));
}

function resolveTreeNode<T>(
  proto: ProtoNode<T>,
  cache: Map<ProtoNode, TreeNode>,
  singleNodes: Map<NodeToken<any>, ProtoNodeSingle>,
  multiNodes: Map<MultiNodeToken<any>, ProtoNodeMulti>,
  path: (ProtoNodeSingle | ProtoNodeMulti)[] = [],
): TreeNode<T> {
  const cached = cache.get(proto);
  if (cached) return cached;

  const newPath = [...path];
  if (!(proto instanceof ProtoNodeTransparent)) {
    newPath.push(proto);

    if (path.includes(proto)) {
      const loopPath = newPath.map((n) => n.token);
      throw InjectionError.circularDependency(proto.token, loopPath);
    }
  }

  function resolveInjection(nextNode: TreeNode<T>, injection: InjectionNode<any>) {
    const treeNode =
      injection.token instanceof NodeToken
        ? singleNodes.get(injection.token)
        : injection.token instanceof MultiNodeToken
          ? multiNodes.get(injection.token)
          : undefined;

    if (!treeNode && !injection.optional) {
      throw InjectionError.notFound(injection.token);
    }

    if (treeNode) {
      const child = resolveTreeNode(treeNode, cache, singleNodes, multiNodes, newPath);
      nextNode.addDependency(child);
    }
  }

  let resolvedNode: TreeNode<T>;
  if (proto instanceof ProtoNodeSingle) {
    const nextNode = new TreeNodeSingle<T>(proto);
    for (const injection of proto.injections) {
      resolveInjection(nextNode, injection);
    }

    resolvedNode = nextNode;
  } else if (proto instanceof ProtoNodeMulti) {
    const nextNode = new TreeNodeMulti<T>(proto);
    for (const single of proto.singleNodes) {
      let proto = singleNodes.get(single);
      if (!proto) {
        proto = new ProtoNodeSingle<T>(single);
        singleNodes.set(single, proto);
      }

      const resolved = resolveTreeNode(proto, cache, singleNodes, multiNodes, newPath);

      nextNode.addDependency(resolved);
    }

    for (const multi of proto.multiNodes) {
      let proto = multiNodes.get(multi);
      if (!proto) {
        proto = new ProtoNodeMulti<T>(multi);
        multiNodes.set(multi, proto);
      }

      const resolved = resolveTreeNode(proto, cache, singleNodes, multiNodes, newPath);

      nextNode.addDependency(resolved);
    }

    for (const transparent of proto.transparentNodes) {
      const resolved = resolveTreeNode(
        transparent,
        cache,
        singleNodes,
        multiNodes,
        newPath,
      );

      nextNode.addDependency(resolved);
    }

    resolvedNode = nextNode;
  } else if (proto instanceof ProtoNodeTransparent) {
    const nextNode = new TreeNodeTransparent<T>(proto);
    for (const injection of proto.injections) {
      resolveInjection(nextNode, injection);
    }

    resolvedNode = nextNode;
  }

  // biome-ignore lint/style/noNonNullAssertion: This is not possible, cause we identify proto type above.
  const res = resolvedNode!;
  cache.set(proto, res);
  return res;
}
