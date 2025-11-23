import { MultiNodeToken, NodeToken } from "../api";
import type { InjectionNode } from "../container";
import { InjectionError } from "../errors";
import type { ProtoNode } from "./proto";
import { ProtoNodeMulti, ProtoNodeSingle, ProtoNodeTransparent } from "./proto";
import type { TreeNode } from "./tree-node";
import { TreeNodeMulti, TreeNodeSingle, TreeNodeTransparent } from "./tree-node";

export function resolveTreeNode<T>(
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
