"use strict";

const CommonJsExportRequireDependency = require("../lib/dependencies/CommonJsExportRequireDependency");

/** @typedef {import("../lib/ExportsInfo")} ExportsInfo */
/** @typedef {import("../lib/Module")} Module */
/** @typedef {import("../lib/ModuleGraph")} ModuleGraph */

const ESM_MODULE_EXPORTS_NAME = "module.exports";

/**
 * @param {boolean | null} provided provided flag of the imported `"module.exports"` export
 * @param {string} exportsType imported module exports type
 * @returns {{ moduleGraph: ModuleGraph, importedModule: Module }} fakes
 */
const setup = (provided, exportsType = "namespace") => {
	const importedModule = /** @type {Module} */ (
		/** @type {unknown} */ ({ getExportsType: () => exportsType })
	);
	const exportsInfo = {
		getReadOnlyExportInfo: (/** @type {string} */ name) =>
			name === ESM_MODULE_EXPORTS_NAME ? { provided } : { provided: false }
	};
	const moduleGraph = /** @type {ModuleGraph} */ (
		/** @type {unknown} */ ({
			getModule: () => importedModule,
			getConnection: () => ({ module: importedModule }),
			getExportsInfo: () => exportsInfo,
			getMeta: () => ({}),
			getParentModule: () => importedModule
		})
	);
	return { moduleGraph, importedModule };
};

// Full re-export `module.exports = require("./esm")` (no `names`, no `ids`).
const fullReexportDep = () =>
	new CommonJsExportRequireDependency(
		[0, 0],
		null,
		"module.exports",
		[],
		"./esm",
		[],
		false
	);

describe("CommonJsExportRequireDependency.getExports", () => {
	it("defers (provides no names) while the ESM `module.exports` export is undetermined", () => {
		// Regression: providing star-reexport names here leaks them permanently
		// (the exports merge is monotonic), so the result would depend on module
		// processing order and break cross-runtime persistent caching.
		const { moduleGraph, importedModule } = setup(null);
		expect(fullReexportDep().getExports(moduleGraph)).toEqual({
			exports: [],
			dependencies: [importedModule]
		});
	});

	it("re-exports the unwrapped value once `module.exports` is provided", () => {
		const { moduleGraph, importedModule } = setup(true);
		expect(fullReexportDep().getExports(moduleGraph)).toEqual({
			exports: true,
			canMangle: false,
			dependencies: [importedModule]
		});
	});
});
