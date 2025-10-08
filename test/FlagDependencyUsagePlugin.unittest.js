"use strict";

const ExportsInfo = require("../lib/ExportsInfo");
const FlagDependencyUsagePlugin = require("../lib/FlagDependencyUsagePlugin");
const ModuleGraph = require("../lib/ModuleGraph");

describe("FlagDependencyUsagePlugin", () => {
	let plugin;
	let moduleGraph;
	let mockModule;

	beforeEach(() => {
		plugin = new FlagDependencyUsagePlugin(false);
		moduleGraph = new ModuleGraph();
		mockModule = {
			dependencies: [],
			buildMeta: {}
		};
	});

	describe("_isPassThroughReexport", () => {
		it("should return false for modules with no dependencies", () => {
			mockModule.dependencies = [];
			const result = plugin._isPassThroughReexport(mockModule, moduleGraph);
			expect(result).toBe(false);
		});

		it("should return true for modules with only re-export dependencies", () => {
			mockModule.dependencies = [
				{ type: "harmony export imported specifier" },
				{ type: "harmony export specifier" }
			];

			// Mock exportsInfo with no own exports
			const exportsInfo = new ExportsInfo();
			jest.spyOn(moduleGraph, "getExportsInfo").mockReturnValue(exportsInfo);
			jest.spyOn(exportsInfo, "ownedExports", "get").mockReturnValue([]);

			const result = plugin._isPassThroughReexport(mockModule, moduleGraph);
			expect(result).toBe(true);
		});

		it("should return false for modules with non-import dependencies", () => {
			mockModule.dependencies = [
				{ type: "harmony export imported specifier" },
				{ type: "commonjs require" } // Non-import dependency
			];

			const exportsInfo = new ExportsInfo();
			jest.spyOn(moduleGraph, "getExportsInfo").mockReturnValue(exportsInfo);
			jest.spyOn(exportsInfo, "ownedExports", "get").mockReturnValue([]);

			const result = plugin._isPassThroughReexport(mockModule, moduleGraph);
			expect(result).toBe(false);
		});

		it("should return false for modules with own exports", () => {
			mockModule.dependencies = [{ type: "harmony export imported specifier" }];

			const exportsInfo = new ExportsInfo();
			const mockExportInfo = {
				provided: true,
				exportsInfoOwned: false
			};
			jest.spyOn(moduleGraph, "getExportsInfo").mockReturnValue(exportsInfo);
			jest
				.spyOn(exportsInfo, "ownedExports", "get")
				.mockReturnValue([mockExportInfo]);

			const result = plugin._isPassThroughReexport(mockModule, moduleGraph);
			expect(result).toBe(false);
		});

		it("should return true for pure pass-through re-export modules", () => {
			// This is the exact scenario our fix addresses
			mockModule.dependencies = [
				{ type: "harmony export imported specifier" },
				{ type: "harmony import" } // Regular import is OK
			];

			const exportsInfo = new ExportsInfo();
			jest.spyOn(moduleGraph, "getExportsInfo").mockReturnValue(exportsInfo);
			jest.spyOn(exportsInfo, "ownedExports", "get").mockReturnValue([]);

			const result = plugin._isPassThroughReexport(mockModule, moduleGraph);
			expect(result).toBe(true);
		});

		it("should handle modules with re-export constructor names", () => {
			mockModule.dependencies = [
				{
					type: "some other type",
					constructor: { name: "HarmonyReexportDependency" }
				}
			];

			const exportsInfo = new ExportsInfo();
			jest.spyOn(moduleGraph, "getExportsInfo").mockReturnValue(exportsInfo);
			jest.spyOn(exportsInfo, "ownedExports", "get").mockReturnValue([]);

			const result = plugin._isPassThroughReexport(mockModule, moduleGraph);
			expect(result).toBe(true);
		});
	});
});
