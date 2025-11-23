import { NodeContainer } from "../container";
import { NodeInjectable } from "./decorator";
import { createProviderSet } from "./helpers";
import { NodeToken } from "./token";

describe("createProviderSet", () => {
  it("should register provider objects", () => {
    const container = new NodeContainer();
    const token = new NodeToken<string>("test");

    const providerSet = createProviderSet({
      provide: token,
      value: "test-value",
    });

    container.include(providerSet);
    container.bootstrap();

    expect(container.get(token)).toBe("test-value");
  });

  it("should register an array of providers", () => {
    const container = new NodeContainer();
    const token1 = new NodeToken<string>("test1");
    const token2 = new NodeToken<number>("test2");

    const providerSet = createProviderSet([
      { provide: token1, value: "value1" },
      { provide: token2, value: 42 },
    ]);

    container.include(providerSet);
    container.bootstrap();

    expect(container.get(token1)).toBe("value1");
    expect(container.get(token2)).toBe(42);
  });

  it("should register injectable classes", () => {
    @NodeInjectable()
    class TestService {}

    const container = new NodeContainer();
    const providerSet = createProviderSet(TestService);

    container.include(providerSet);
    container.bootstrap();

    expect(container.get(TestService)).toBeInstanceOf(TestService);
  });

  it("should register nested provider sets", () => {
    const container = new NodeContainer();
    const token1 = new NodeToken<string>("test1");
    const token2 = new NodeToken<number>("test2");

    const innerSet = createProviderSet({ provide: token1, value: "inner" });
    const outerSet = createProviderSet(innerSet, { provide: token2, value: 100 });

    container.include(outerSet);
    container.bootstrap();

    expect(container.get(token1)).toBe("inner");
    expect(container.get(token2)).toBe(100);
  });

  it("should ignore plain constructors without decorator", () => {
    class PlainClass {}

    const container = new NodeContainer();
    const token = new NodeToken<string>("test");

    const providerSet = createProviderSet(PlainClass as any, {
      provide: token,
      value: "value",
    });

    container.include(providerSet);
    container.bootstrap();

    expect(container.get(token)).toBe("value");
  });

  it("should ignore invalid provider objects", () => {
    const container = new NodeContainer();
    const token = new NodeToken<string>("test");

    const providerSet = createProviderSet({} as any, { provide: token, value: "valid" });

    container.include(providerSet);
    container.bootstrap();

    expect(container.get(token)).toBe("valid");
  });
});
