"use strict";

const ConsumeSharedModule = require("../lib/sharing/ConsumeSharedModule");

describe("ConsumeSharedModule", () => {
	let module;
	const context = "/some/context";
	const options = {
		shareKey: "my-package",
		shareScope: "default",
		import: false,
		importResolved: undefined,
		requiredVersion: undefined,
		strictVersion: false,
		singleton: false,
		eager: false
	};

	beforeEach(() => {
		module = new ConsumeSharedModule(context, options);
		module.buildMeta = {};
		module.buildInfo = {};
	});

	describe("#getExportsType", () => {
		it('returns "dynamic" regardless of strict parameter', () => {
			const mockModuleGraph = {};

			expect(module.getExportsType(mockModuleGraph, false)).toBe("dynamic");

			expect(module.getExportsType(mockModuleGraph, true)).toBe("dynamic");
		});

		it('returns "dynamic" to enable runtime __esModule check', () => {
			const mockModuleGraph = {};
			const exportsType = module.getExportsType(mockModuleGraph, true);

			expect(exportsType).toBe("dynamic");
		});
	});
});
