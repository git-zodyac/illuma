import type { iContextScanner } from "../context/types";
import type { iDiagnosticsModule, iDiagnosticsReport } from "../diagnostics/types";
import { Lumiere } from "./plugin-container";

// Test subclass to expose protected methods
class TestPluginContainer extends Lumiere {
  public static triggerReport(report: iDiagnosticsReport): void {
    Lumiere.onReport(report);
  }

  public static resetPlugins(): void {
    (Lumiere as any)._diagnostics.length = 0;
    (Lumiere as any)._scanners.length = 0;
  }
}

describe("Lumiere", () => {
  beforeEach(() => {
    TestPluginContainer.resetPlugins();
  });

  afterEach(() => {
    TestPluginContainer.resetPlugins();
  });

  describe("extendDiagnostics", () => {
    it("should register and call diagnostics module", () => {
      const mockModule: iDiagnosticsModule = {
        onReport: jest.fn(),
      };

      Lumiere.extendDiagnostics(mockModule);

      const report: iDiagnosticsReport = {
        totalNodes: 10,
        unusedNodes: [],
        bootstrapDuration: 50,
      };

      TestPluginContainer.triggerReport(report);

      expect(mockModule.onReport).toHaveBeenCalledWith(report);
    });

    it("should call multiple modules in order", () => {
      const callOrder: number[] = [];
      const mockModule1: iDiagnosticsModule = {
        onReport: jest.fn(() => callOrder.push(1)),
      };
      const mockModule2: iDiagnosticsModule = {
        onReport: jest.fn(() => callOrder.push(2)),
      };

      Lumiere.extendDiagnostics(mockModule1);
      Lumiere.extendDiagnostics(mockModule2);

      TestPluginContainer.triggerReport({
        totalNodes: 0,
        unusedNodes: [],
        bootstrapDuration: 0,
      });

      expect(callOrder).toEqual([1, 2]);
    });
  });

  describe("extendContextScanner", () => {
    it("should register context scanner", () => {
      const mockScanner: iContextScanner = {
        scan: jest.fn(() => new Set()),
      };

      Lumiere.extendContextScanner(mockScanner);

      const scanners = Lumiere.contextScanners;
      expect(scanners).toHaveLength(1);
      expect(scanners[0]).toBe(mockScanner);
    });

    it("should register multiple scanners in order", () => {
      const mockScanner1: iContextScanner = { scan: jest.fn(() => new Set()) };
      const mockScanner2: iContextScanner = { scan: jest.fn(() => new Set()) };

      Lumiere.extendContextScanner(mockScanner1);
      Lumiere.extendContextScanner(mockScanner2);

      const scanners = Lumiere.contextScanners;
      expect(scanners).toEqual([mockScanner1, mockScanner2]);
    });
  });

  describe("contextScanners", () => {
    it("should return readonly array", () => {
      const scanners = Lumiere.contextScanners;
      expect(Array.isArray(scanners)).toBe(true);
    });
  });
});
