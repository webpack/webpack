"use strict";

const CommonJsRequireDependency = require("../lib/dependencies/CommonJsRequireDependency");

/** @typedef {import("../lib/ExportsInfo")} ExportsInfo */
/** @typedef {import("../lib/ExportsInfo").ExportInfo} ExportInfo */
/** @typedef {import("../lib/Module")} Module */
/** @typedef {import("../lib/ModuleGraph")} ModuleGraph */

/**
 * @param {boolean | null} provided provided flag
 * @param {ExportsInfo=} nested nested exports info
 * @returns {ExportInfo} fake export info
 */
const exportInfo = (provided, nested) =>
	/** @type {ExportInfo} */ (
		/** @type {unknown} */ ({ provided, exportsInfo: nested })
	);

/**
 * @param {Record<string, ExportInfo>} exports declared exports (others are not provided)
 * @returns {ExportsInfo} fake exports info
 */
const exportsInfo = (exports) =>
	/** @type {ExportsInfo} */ (
		/** @type {unknown} */ ({
			getReadOnlyExportInfo: (/** @type {string} */ name) =>
				Object.prototype.hasOwnProperty.call(exports, name)
					? exports[name]
					: exportInfo(false)
		})
	);

/** @type {Module} */
const cjsModule = /** @type {Module} */ (
	/** @type {unknown} */ ({ getExportsType: () => "default" })
);

/**
 * @param {Module | null} module resolved module (null when unresolved)
 * @param {ExportsInfo=} info exports info
 * @returns {ModuleGraph} fake module graph
 */
const moduleGraph = (module, info) =>
	/** @type {ModuleGraph} */ (
		/** @type {unknown} */ ({
			getModule: () => module,
			getExportsInfo: () => info
		})
	);

/**
 * @param {string[][]} referenced referenced export paths
 * @returns {CommonJsRequireDependency} dependency
 */
const dep = (referenced) =>
	new CommonJsRequireDependency("./x", undefined, undefined, referenced);

describe("CommonJsRequireDependency.getReferencedExports", () => {
	it("returns the referenced paths unchanged for an unresolved module", () => {
		expect(
			dep([["foo"]]).getReferencedExports(moduleGraph(null), undefined)
		).toEqual([{ name: ["foo"], canMangle: false, canInline: false }]);
	});

	it("references the whole value for a non-provided prototype method", () => {
		expect(
			dep([["includes"]]).getReferencedExports(
				moduleGraph(cjsModule, exportsInfo({})),
				undefined
			)
		).toEqual([{ name: [], canMangle: false, canInline: false }]);
	});

	it("keeps a provided leaf export", () => {
		expect(
			dep([["foo"]]).getReferencedExports(
				moduleGraph(cjsModule, exportsInfo({ foo: exportInfo(true) })),
				undefined
			)
		).toEqual([{ name: ["foo"], canMangle: false, canInline: false }]);
	});

	it("trims the callee off a nested prototype call", () => {
		expect(
			dep([["list", "includes"]]).getReferencedExports(
				moduleGraph(
					cjsModule,
					exportsInfo({ list: exportInfo(true, exportsInfo({})) })
				),
				undefined
			)
		).toEqual([{ name: ["list"], canMangle: false, canInline: false }]);
	});

	it("keeps a fully provided nested path", () => {
		expect(
			dep([["list"]]).getReferencedExports(
				moduleGraph(
					cjsModule,
					exportsInfo({ list: exportInfo(true, exportsInfo({})) })
				),
				undefined
			)
		).toEqual([{ name: ["list"], canMangle: false, canInline: false }]);
	});
});
