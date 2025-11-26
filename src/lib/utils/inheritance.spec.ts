import { createProviderSet, NodeInjectable, NodeToken } from "../api";
import { NodeContainer } from "../container";
import { InjectionError } from "../errors";
import { injectAsync, injectChildrenAsync } from "./inheritance";

describe("injectChildrenAsync", () => {
  it("should throw when called outside injection context", () => {
    expect(() => injectChildrenAsync(() => createProviderSet())).toThrow(InjectionError);
  });

  it("should create sub-container with provided dependencies", async () => {
    const parent = new NodeContainer();
    const childToken = new NodeToken<string>("childToken");

    @NodeInjectable()
    class ParentService {
      private readonly _getSubContainer = injectChildrenAsync(() =>
        createProviderSet({
          provide: childToken,
          value: "child-value",
        }),
      );

      public createSubContainer() {
        return this._getSubContainer();
      }
    }

    parent.provide(ParentService);
    parent.bootstrap();

    const parentService = parent.get(ParentService);
    const subInjector = await parentService.createSubContainer();

    expect(subInjector.get(childToken)).toBe("child-value");
  });

  it("should cache sub-container by default", async () => {
    const parent = new NodeContainer();

    @NodeInjectable()
    class ParentService {
      private readonly _getSubContainer = injectChildrenAsync(() => createProviderSet());

      public createSubContainer() {
        return this._getSubContainer();
      }
    }

    parent.provide(ParentService);
    parent.bootstrap();

    const parentService = parent.get(ParentService);
    const subInjector1 = await parentService.createSubContainer();
    const subInjector2 = await parentService.createSubContainer();

    expect(subInjector1).toBe(subInjector2);
  });

  it("should not cache when withCache is false", async () => {
    const parent = new NodeContainer();

    @NodeInjectable()
    class ParentService {
      private readonly _getSubContainer = injectChildrenAsync(() => createProviderSet(), {
        withCache: false,
      });

      public createSubContainer() {
        return this._getSubContainer();
      }
    }

    parent.provide(ParentService);
    parent.bootstrap();

    const parentService = parent.get(ParentService);
    const subInjector1 = await parentService.createSubContainer();
    const subInjector2 = await parentService.createSubContainer();

    expect(subInjector1).not.toBe(subInjector2);
  });
});

describe("injectAsync", () => {
  it("should throw when called outside injection context", () => {
    expect(() => injectAsync(() => new NodeToken<string>("test"))).toThrow(
      InjectionError,
    );
  });

  it("should inject class dependency", async () => {
    const parent = new NodeContainer();

    @NodeInjectable()
    class TestService {
      public readonly value = "test-service";
    }

    parent.provide(TestService);

    @NodeInjectable()
    class ParentService {
      private readonly _getService = injectAsync(() => TestService);

      public getService() {
        return this._getService();
      }
    }

    parent.provide(ParentService);
    parent.bootstrap();

    const parentService = parent.get(ParentService);
    const service = await parentService.getService();

    expect(service).toBeInstanceOf(TestService);
    expect(service.value).toBe("test-service");
  });

  it("should cache by default", async () => {
    const parent = new NodeContainer();

    @NodeInjectable()
    class TestService {}

    parent.provide(TestService);

    @NodeInjectable()
    class ParentService {
      private readonly _getService = injectAsync(() => TestService);

      public getService() {
        return this._getService();
      }
    }

    parent.provide(ParentService);
    parent.bootstrap();

    const parentService = parent.get(ParentService);
    const service1 = await parentService.getService();
    const service2 = await parentService.getService();

    expect(service1).toBe(service2);
  });

  it("should not cache when withCache is false", async () => {
    const parent = new NodeContainer();

    @NodeInjectable()
    class TestService {}

    parent.provide(TestService);

    @NodeInjectable()
    class ParentService {
      private readonly _getService = injectAsync(() => TestService, {
        withCache: false,
      });

      public getService() {
        return this._getService();
      }
    }

    parent.provide(ParentService);
    parent.bootstrap();

    const parentService = parent.get(ParentService);
    const service1 = await parentService.getService();
    const service2 = await parentService.getService();

    expect(service1).not.toBe(service2);
  });
});
