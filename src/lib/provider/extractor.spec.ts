import { MultiNodeToken, NodeToken } from "../api";
import { InjectionError } from "../errors";
import { extractProvider } from "./extractor";

describe("extractProvider", () => {
  it("should return NodeToken as is", () => {
    const token = new NodeToken("test");
    expect(extractProvider(token)).toBe(token);
  });

  it("should return MultiNodeToken as is", () => {
    const token = new MultiNodeToken("test");
    expect(extractProvider(token)).toBe(token);
  });

  it("should return function as is", () => {
    const fn = () => "test";
    expect(extractProvider(fn)).toBe(fn);
  });

  it("should extract value provider", () => {
    const provider = { value: "test" };
    const extracted = extractProvider(provider as any);
    expect(typeof extracted).toBe("function");
    expect((extracted as () => any)()).toBe("test");
  });

  it("should extract factory provider", () => {
    const factory = () => "test";
    const provider = { factory };
    expect(extractProvider(provider as any)).toBe(factory);
  });

  it("should extract class provider", () => {
    class TestClass {}
    const provider = { useClass: TestClass };
    const extracted = extractProvider(provider as any);
    expect(typeof extracted).toBe("function");
    expect((extracted as () => any)()).toBeInstanceOf(TestClass);
  });

  it("should extract alias provider", () => {
    const token = new NodeToken("test");
    const provider = { alias: token };
    expect(extractProvider(provider as any)).toBe(token);
  });

  it("should throw on invalid provider", () => {
    expect(() => extractProvider({} as any)).toThrow(InjectionError);
  });
});
