import { NodeContainer } from "./container";
import { NodeInjectable } from "./decorator";
import { InjectionError } from "./errors";
import { createProviderSet } from "./helpers";
import { nodeInject } from "./injector";
import { MultiNodeToken, NodeToken } from "./token";

describe("nodeInjections", () => {
  describe("smoke", () => {
    it("should create container", () => {
      expect(new NodeContainer()).toBeDefined();
    });

    it("should create token", () => {
      const token = new NodeToken("test");
      expect(token).toBeDefined();
      expect(token.name).toBe("test");
    });

    it("should create with factory", () => {
      const token = new NodeToken("test", {
        factory: () => "test-value",
      });
      expect(token).toBeDefined();
      expect(token.name).toBe("test");
      expect(token.opts?.factory).toBeDefined();
      expect(token.opts?.factory?.()).toBe("test-value");
    });
  });

  describe("token providers", () => {
    it("should instantiate token with factory", () => {
      const container = new NodeContainer();
      const token = new NodeToken("plainToken");

      container.provide({
        provide: token,
        factory: () => "value",
      });

      container.bootstrap();
      const value = container.get(token);
      expect(value).toBe("value");
    });

    it("should instantiate token with value", () => {
      const container = new NodeContainer();
      const token = new NodeToken("plainToken");

      container.provide({
        provide: token,
        value: "value",
      });

      container.bootstrap();
      const value = container.get(token);
      expect(value).toBe("value");
    });

    it("should instantiate token with class declaration", () => {
      const container = new NodeContainer();
      const token = new NodeToken<{ value: string }>("plainToken");

      class TestClass {
        public readonly value = "class-value";
      }

      container.provide({
        provide: token,
        useClass: TestClass,
      });

      container.bootstrap();
      const value = container.get(token);
      expect(value).toBeInstanceOf(TestClass);
      expect(value.value).toBe("class-value");
    });

    it("should instantiate token with decorated class", () => {
      const container = new NodeContainer();

      @NodeInjectable()
      class TestClass {
        public readonly value = "class-value";
      }

      container.provide(TestClass);

      container.bootstrap();
      const value = container.get(TestClass);
      expect(value).toBeInstanceOf(TestClass);
      expect(value.value).toBe("class-value");
    });

    it("should support overrides using class", () => {
      const container = new NodeContainer();

      @NodeInjectable()
      class TestClass {
        public readonly value: string = "test-class-value";
      }

      class OverrideClass {
        public readonly value: string = "test-class-value-2";
      }

      container.provide({
        provide: TestClass,
        useClass: OverrideClass,
      });

      container.bootstrap();

      const instance = container.get(TestClass);
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(OverrideClass);
      expect(instance.value).toBe("test-class-value-2");
    });

    it("should support overrides using factory", () => {
      const container = new NodeContainer();

      @NodeInjectable()
      class TestClass {
        public readonly value: string = "test-class-value";
      }

      container.provide({
        provide: TestClass,
        factory: () => ({
          value: "test-factory-value",
        }),
      });

      container.bootstrap();

      const instance = container.get(TestClass);
      expect(instance).toBeDefined();
      expect(instance.value).toBe("test-factory-value");
    });

    it("should support overrides using value", () => {
      const container = new NodeContainer();

      @NodeInjectable()
      class TestClass {
        public readonly value: string = "test-class-value";
      }

      container.provide({
        provide: TestClass,
        value: {
          value: "test-value-2",
        },
      });

      container.bootstrap();

      const instance = container.get(TestClass);
      expect(instance).toBeDefined();
      expect(instance.value).toBe("test-value-2");
    });

    it("should support aliasing", () => {
      const container = new NodeContainer();

      @NodeInjectable()
      class TestClass {
        public readonly value: string = "test-class-value";
      }

      @NodeInjectable()
      class TestClass2 {
        public readonly value: string = "test-class-value-2";
      }

      container.provide(TestClass2);
      container.provide({
        provide: TestClass,
        alias: TestClass2,
      });

      container.bootstrap();

      const target = container.get(TestClass2);
      expect(target).toBeDefined();
      expect(target).toBeInstanceOf(TestClass2);
      expect(target.value).toBe("test-class-value-2");

      const instance = container.get(TestClass);
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(TestClass2);
      expect(instance.value).toBe("test-class-value-2");
    });

    it("should fallback to token built-in factory", () => {
      const container = new NodeContainer();
      const token = new NodeToken("plainToken", {
        factory: () => "built-in-factory-value",
      });

      container.provide(token);

      container.bootstrap();
      const value = container.get(token);
      expect(value).toBe("built-in-factory-value");
    });

    it("should throw error when token not found", () => {
      const container = new NodeContainer();
      const token = new NodeToken("plainToken");

      container.bootstrap();
      expect(() => container.get(token)).toThrow(InjectionError.notFound(token));
    });
  });

  describe("multi token providers", () => {
    it("should inject multi factories", () => {
      const container = new NodeContainer();

      // Plain value
      const token = new MultiNodeToken<string>("tokenValue");

      for (let i = 0; i < 3; i++) {
        container.provide({
          provide: token,
          factory: () => `test-value-${i}`,
        });
      }

      container.bootstrap();

      const value = container.get(token);

      expect(value).toBeDefined();
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(3);
      expect(value).toEqual(["test-value-0", "test-value-1", "test-value-2"]);
    });

    it("should inject multi values", () => {
      const container = new NodeContainer();

      // Plain value
      const token = new MultiNodeToken<string>("tokenValue");

      for (let i = 0; i < 3; i++) {
        container.provide({
          provide: token,
          value: `test-value-${i}`,
        });
      }

      container.bootstrap();

      const value = container.get(token);

      expect(value).toBeDefined();
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(3);
      expect(value).toEqual(["test-value-0", "test-value-1", "test-value-2"]);
    });

    it("should inject multi classes", () => {
      const container = new NodeContainer();

      // Plain value
      const token = new MultiNodeToken<{ value: string }>("tokenValue");

      for (let i = 0; i < 3; i++) {
        class TestClass {
          public readonly value = `test-value-${i}`;
        }

        container.provide({
          provide: token,
          useClass: TestClass,
        });
      }

      container.bootstrap();

      const value = container.get(token);

      expect(value).toBeDefined();
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(3);
      expect(value.map((v) => v.value)).toEqual([
        "test-value-0",
        "test-value-1",
        "test-value-2",
      ]);
    });

    it("should inject multi decorated classes", () => {
      const container = new NodeContainer();

      // Plain value
      const token = new MultiNodeToken<{ value: string }>("MULTI_TOKEN");

      for (let i = 0; i < 3; i++) {
        @NodeInjectable()
        class TestClass {
          public readonly value = `test-value-${i}`;
        }

        container.provide({
          provide: token,
          alias: TestClass,
        });
      }

      container.bootstrap();

      const value = container.get(token);

      expect(value).toBeDefined();
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(3);
      expect(value.map((v) => v.value)).toEqual([
        "test-value-0",
        "test-value-1",
        "test-value-2",
      ]);
    });

    it("should merge multi nodes when aliasing", () => {
      const container = new NodeContainer();

      // Plain value
      const tokenA = new MultiNodeToken<string>("tokenValueA");

      for (let i = 0; i < 3; i++) {
        container.provide({
          provide: tokenA,
          factory: () => `test-value-A-${i}`,
        });
      }

      // Alias
      const tokenB = new MultiNodeToken<string>("tokenValueB");

      for (let i = 0; i < 3; i++) {
        container.provide({
          provide: tokenB,
          factory: () => `test-value-B-${i}`,
        });
      }

      container.provide({
        provide: tokenB,
        alias: tokenA,
      });

      container.bootstrap();

      const value = container.get(tokenB);

      expect(value).toBeDefined();
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(6);
      expect(value).toEqual(
        expect.arrayContaining([
          "test-value-B-0",
          "test-value-B-1",
          "test-value-B-2",
          "test-value-A-0",
          "test-value-A-1",
          "test-value-A-2",
        ]),
      );
    });

    it("should inject mixed multi providers", () => {
      const container = new NodeContainer();

      // Plain value
      const token = new MultiNodeToken<{ value: string }>("MULTI_TOKEN");

      for (let i = 0; i < 3; i++) {
        // Value provider
        container.provide({
          provide: token,
          value: { value: `test-value-value-${i}` },
        });

        // Factory provider
        container.provide({
          provide: token,
          factory: () => ({ value: `test-value-factory-${i}` }),
        });

        // Class provider
        class TestClass {
          public readonly value = `test-value-class-${i}`;
        }

        container.provide({
          provide: token,
          useClass: TestClass,
        });
      }

      container.bootstrap();

      const value = container.get(token);

      expect(value).toBeDefined();
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBe(9);
      expect(value.map((v) => v.value)).toEqual([
        "test-value-value-0",
        "test-value-factory-0",
        "test-value-class-0",
        "test-value-value-1",
        "test-value-factory-1",
        "test-value-class-1",
        "test-value-value-2",
        "test-value-factory-2",
        "test-value-class-2",
      ]);
    });

    it("should not throw error and return empty array when multi token not found", () => {
      const container = new NodeContainer();
      const token = new MultiNodeToken<string>("plainToken");

      container.bootstrap();
      expect(() => container.get(token)).not.toThrow();
      expect(container.get(token)).toEqual([]);
    });
  });

  describe("injection", () => {
    it("should inject token into class", () => {
      const container = new NodeContainer();

      const someToken = new NodeToken<string>("SOME_TOKEN");
      @NodeInjectable()
      class TestClass {
        public readonly injected = nodeInject(someToken);
        public readonly value: string = "test-class-value";
      }

      container.provide(TestClass);
      container.provide({
        provide: someToken,
        value: "some-token-value",
      });

      container.bootstrap();

      const instance = container.get(TestClass);
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.value).toBe("test-class-value");
      expect(instance.injected).toBe("some-token-value");
    });

    it("should inject multi token into class", () => {
      const container = new NodeContainer();

      const multi = new MultiNodeToken<{ value: string }>("MULTI_TOKEN");
      @NodeInjectable()
      class TestClass {
        public readonly injected = nodeInject(multi);
      }

      @NodeInjectable()
      class TestClass2 {
        public readonly value: string = "test-class-value-2";
      }

      container.provide({
        provide: multi,
        alias: TestClass2,
      });

      container.provide({
        provide: multi,
        value: { value: "direct-value" },
      });

      container.provide(TestClass);

      container.bootstrap();

      const instance = container.get(TestClass);
      expect(instance).toBeDefined();
      expect(instance.injected).toBeDefined();
      expect(Array.isArray(instance.injected)).toBe(true);
      expect(instance.injected.length).toBe(2);
      expect(instance.injected.some((i) => i instanceof TestClass2)).toBe(true);
      expect(instance.injected.some((i) => i.value === "direct-value")).toBe(true);
    });

    it("should provide value to factory injection", () => {
      const container = new NodeContainer();

      const valueToken = new NodeToken<string>("VALUE_TOKEN");
      const factoryToken = new NodeToken<string>("FACTORY_TOKEN", {
        factory: () => {
          const value = nodeInject(valueToken, { optional: true });
          return `factory-value-with-${value}`;
        },
      });

      container.provide({
        provide: valueToken,
        value: "injected-value",
      });

      container.provide({
        provide: factoryToken,
        factory: () => {
          const value = nodeInject(valueToken);
          return `outer-factory-with-${value}`;
        },
      });

      container.bootstrap();

      const factoryValue = container.get(factoryToken);
      expect(factoryValue).toBe("outer-factory-with-injected-value");
    });

    it("should provide optional injection", () => {
      const container = new NodeContainer();

      const token = new NodeToken<string>("OPTIONAL_TOKEN");
      const target = new NodeToken<string | null>("TARGET_TOKEN");

      container.provide({
        provide: target,
        factory: () => nodeInject(token, { optional: true }),
      });

      container.bootstrap();

      const value = container.get(target);
      expect(value).toBeFalsy();
    });
  });

  describe("token groups", () => {
    it("should include provider sets", () => {
      const container = new NodeContainer();

      const tokenA = new NodeToken<string>("TOKEN_A");
      const tokenB = new NodeToken<string>("TOKEN_B");

      const providerSet = createProviderSet(
        {
          provide: tokenA,
          value: "value-a",
        },
        {
          provide: tokenB,
          value: "value-b",
        },
      );

      container.include(providerSet);

      container.bootstrap();

      const valueA = container.get(tokenA);
      const valueB = container.get(tokenB);

      expect(valueA).toBe("value-a");
      expect(valueB).toBe("value-b");
    });
  });

  describe("error handling", () => {
    it("should throw error on circular dependency", () => {
      const container = new NodeContainer();

      const tokenA = new NodeToken<string>("TOKEN_A");
      const tokenB = new NodeToken<string>("TOKEN_B");

      container.provide({
        provide: tokenA,
        factory: () => nodeInject<NodeToken<string>>(tokenB),
      });
      container.provide({
        provide: tokenB,
        factory: () => nodeInject<NodeToken<string>>(tokenA),
      });

      expect(() => container.bootstrap()).toThrow(
        InjectionError.circularDependency(tokenA, [tokenA, tokenB, tokenA]),
      );
    });
  });
});
