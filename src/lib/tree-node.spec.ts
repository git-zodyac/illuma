import { InjectionError } from "./errors";
import { nodeInject } from "./injector";
import { MultiNodeToken, NodeToken } from "./token";
import {
  ProtoNodeMulti,
  ProtoNodeSingle,
  ProtoNodeTransparent,
  TreeNodeMulti,
  TreeNodeSingle,
  TreeNodeTransparent,
  TreeRootNode,
} from "./tree-node";

describe("ProtoNodeSingle", () => {
  it("should create with token and factory", () => {
    const token = new NodeToken<string>("test");
    const factory = () => "value";
    const proto = new ProtoNodeSingle(token, factory);

    expect(proto.token).toBe(token);
    expect(proto.factory).toBe(factory);
  });

  it("should set factory when not already set", () => {
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token);
    const factory = () => "value";

    proto.setFactory(factory);
    expect(proto.factory).toBe(factory);
  });

  it("should throw when setting factory twice", () => {
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => "first");

    expect(() => proto.setFactory(() => "second")).toThrow(InjectionError);
  });
});

describe("ProtoNodeTransparent", () => {
  it("should create with parent and factory", () => {
    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const factory = () => "value";
    const proto = new ProtoNodeTransparent(parent, factory);

    expect(proto.parent).toBe(parent);
    expect(proto.factory).toBe(factory);
  });
});

describe("ProtoNodeMulti", () => {
  it("should add different provider types", () => {
    const token = new MultiNodeToken<string>("multi");
    const proto = new ProtoNodeMulti(token);
    const singleToken = new NodeToken<string>("single");
    const multiToken = new MultiNodeToken<string>("another");

    proto.addProvider(singleToken);
    proto.addProvider(multiToken);
    proto.addProvider(() => "value");

    expect(proto.singleNodes.has(singleToken)).toBe(true);
    expect(proto.multiNodes.has(multiToken)).toBe(true);
    expect(proto.transparentNodes.size).toBe(1);
  });
});

describe("TreeRootNode", () => {
  it("should add and instantiate dependencies", () => {
    const root = new TreeRootNode();
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => "value");
    const node = new TreeNodeSingle(proto);

    root.addDependency(node);
    root.instantiate();

    expect(root.find(token)).toBe(node);
  });

  it("should handle shared dependencies", () => {
    const root = new TreeRootNode();
    const sharedToken = new NodeToken<string>("shared");
    const sharedProto = new ProtoNodeSingle(sharedToken, () => "shared-value");
    const sharedNode = new TreeNodeSingle(sharedProto);

    const node1Token = new NodeToken<string>("node1");
    const node1Proto = new ProtoNodeSingle(node1Token, () => "value1");
    const node1 = new TreeNodeSingle(node1Proto);
    node1.addDependency(sharedNode);

    const node2Token = new NodeToken<string>("node2");
    const node2Proto = new ProtoNodeSingle(node2Token, () => "value2");
    const node2 = new TreeNodeSingle(node2Proto);
    node2.addDependency(sharedNode);

    root.addDependency(node1);
    root.addDependency(node2);
    root.instantiate();

    expect(root.find(sharedToken)).toBe(sharedNode);
  });

  it("should return null when token not found", () => {
    const root = new TreeRootNode();
    expect(root.find(new NodeToken<string>("test"))).toBeNull();
  });
});

describe("TreeNodeSingle", () => {
  it("should instantiate with factory from proto", () => {
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => "value");
    const node = new TreeNodeSingle(proto);

    node.instantiate();
    expect(node.instance).toBe("value");
  });

  it("should instantiate with factory from token options", () => {
    const token = new NodeToken<string>("test", { factory: () => "value" });
    const proto = new ProtoNodeSingle(token);
    const node = new TreeNodeSingle(proto);

    node.instantiate();
    expect(node.instance).toBe("value");
  });

  it("should throw when no factory available", () => {
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token);
    const node = new TreeNodeSingle(proto);

    expect(() => node.instantiate()).toThrow(InjectionError);
  });

  it("should inject dependencies", () => {
    const depToken = new NodeToken<string>("dep");
    const depProto = new ProtoNodeSingle(depToken, () => "dep-value");
    const depNode = new TreeNodeSingle(depProto);

    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => {
      const dep = nodeInject(depToken);
      return `test-${dep}`;
    });
    const node = new TreeNodeSingle(proto);

    node.addDependency(depNode);
    node.instantiate();

    expect(node.instance).toBe("test-dep-value");
  });

  it("should throw when dependency is untracked", () => {
    const depToken = new NodeToken<string>("dep");
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => {
      nodeInject(depToken);
      return "value";
    });
    const node = new TreeNodeSingle(proto);

    expect(() => node.instantiate()).toThrow(InjectionError);
  });

  it("should handle optional dependencies", () => {
    const depToken = new NodeToken<string>("dep");
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => {
      const dep = nodeInject(depToken, { optional: true });
      return dep ? dep : "value";
    });
    const node = new TreeNodeSingle(proto);

    node.instantiate();
    expect(node.instance).toBe("value");
  });

  it("should throw when accessing instance before instantiation", () => {
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => "value");
    const node = new TreeNodeSingle(proto);

    expect(() => node.instance).toThrow(InjectionError);
  });

  it("should not instantiate twice", () => {
    const token = new NodeToken<string>("test");
    const proto = new ProtoNodeSingle(token, () => "value");
    const node = new TreeNodeSingle(proto);

    node.instantiate();
    const pool = node.instantiate();

    expect(pool.size).toBe(0);
  });
});

describe("TreeNodeTransparent", () => {
  it("should instantiate with factory", () => {
    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const proto = new ProtoNodeTransparent(parent, () => "transparent-value");
    const node = new TreeNodeTransparent(proto);

    node.instantiate();
    expect(node.instance).toBe("transparent-value");
  });

  it("should inject dependencies", () => {
    const depToken = new NodeToken<string>("dep");
    const depProto = new ProtoNodeSingle(depToken, () => "dep-value");
    const depNode = new TreeNodeSingle(depProto);

    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const proto = new ProtoNodeTransparent(parent, () => {
      const dep = nodeInject(depToken);
      return `transparent-${dep}`;
    });
    const node = new TreeNodeTransparent(proto);

    node.addDependency(depNode);
    node.instantiate();

    expect(node.instance).toBe("transparent-dep-value");
  });

  it("should throw when dependency is untracked", () => {
    const depToken = new NodeToken<string>("dep");
    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const factory = () => {
      nodeInject(depToken);
      return "value";
    };
    const proto = new ProtoNodeTransparent(parent, factory);
    const node = new TreeNodeTransparent(proto);

    expect(() => node.instantiate()).toThrow(InjectionError);
  });

  it("should handle optional dependencies", () => {
    const depToken = new NodeToken<string>("dep");
    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const proto = new ProtoNodeTransparent(parent, () => {
      const dep = nodeInject(depToken, { optional: true });
      return dep ? dep : "value";
    });
    const node = new TreeNodeTransparent(proto);

    node.instantiate();
    expect(node.instance).toBe("value");
  });

  it("should throw when accessing instance before instantiation", () => {
    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const proto = new ProtoNodeTransparent(parent, () => "value");
    const node = new TreeNodeTransparent(proto);

    expect(() => node.instance).toThrow(InjectionError);
  });

  it("should not instantiate twice", () => {
    const token = new NodeToken<string>("test");
    const parent = new ProtoNodeSingle(token);
    const proto = new ProtoNodeTransparent(parent, () => "value");
    const node = new TreeNodeTransparent(proto);

    node.instantiate();
    const pool = node.instantiate();

    expect(pool.size).toBe(0);
  });
});

describe("TreeNodeMulti", () => {
  it("should collect instances from different node types", () => {
    const token = new MultiNodeToken<string>("multi");
    const proto = new ProtoNodeMulti(token);
    const node = new TreeNodeMulti(proto);

    const singleToken = new NodeToken<string>("single");
    const singleProto = new ProtoNodeSingle(singleToken, () => "single-value");
    const singleNode = new TreeNodeSingle(singleProto);

    const parent = new ProtoNodeSingle(new NodeToken<string>("parent"));
    const transProto = new ProtoNodeTransparent(parent, () => "transparent-value");
    const transNode = new TreeNodeTransparent(transProto);

    const subMultiToken = new MultiNodeToken<string>("sub-multi");
    const subMultiProto = new ProtoNodeMulti(subMultiToken);
    const subMultiNode = new TreeNodeMulti(subMultiProto);
    const subToken = new NodeToken<string>("sub");
    const subProto = new ProtoNodeSingle(subToken, () => "sub-value");
    const subNode = new TreeNodeSingle(subProto);
    subMultiNode.addDependency(subNode);
    subMultiNode.instantiate();

    node.addDependency(singleNode, transNode, subMultiNode);
    node.instantiate();

    expect(node.instance).toEqual(["single-value", "transparent-value", "sub-value"]);
  });

  it("should not instantiate twice", () => {
    const token = new MultiNodeToken<string>("multi");
    const proto = new ProtoNodeMulti(token);
    const node = new TreeNodeMulti(proto);

    node.instantiate();
    const pool = node.instantiate();

    expect(pool.size).toBe(0);
  });
});
