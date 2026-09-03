"use strict";

const {
	getKnownExportNames
} = require("../lib/runtime/MakeDeferredNamespaceObjectRuntime");

/**
 * @typedef {object} FakeExportInfo
 * @property {string} name export name
 * @property {boolean | null | undefined} provided whether the module provides it
 * @property {(string | false)=} usedName the name it is emitted under
 */

/**
 * A module graph whose only deferred module reports the given exports.
 * @param {boolean | null | undefined} otherProvided `otherExportsInfo.provided`
 * @param {FakeExportInfo[]} exports the module's exports
 * @returns {import("../lib/ModuleGraph")} the stub module graph
 */
const moduleGraphWith = (otherProvided, exports) =>
	/** @type {import("../lib/ModuleGraph")} */ (
		/** @type {unknown} */ ({
			getExportsInfo: () => ({
				otherExportsInfo: { provided: otherProvided },
				orderedExports: exports.map((exportInfo) => ({
					name: exportInfo.name,
					provided: exportInfo.provided,
					getUsedName: () =>
						exportInfo.usedName === undefined
							? exportInfo.name
							: exportInfo.usedName
				}))
			})
		})
	);

const module_ = /** @type {import("../lib/Module")} */ (
	/** @type {unknown} */ ({})
);

describe("getKnownExportNames", () => {
	it("sorts the provided export names", () => {
		const moduleGraph = moduleGraphWith(false, [
			{ name: "beta", provided: true },
			{ name: "alpha", provided: true }
		]);
		expect(getKnownExportNames(moduleGraph, module_, undefined)).toEqual([
			"alpha",
			"beta"
		]);
	});

	it("bails out when the module may have exports the graph does not know", () => {
		for (const otherProvided of [true, null, undefined]) {
			const moduleGraph = moduleGraphWith(otherProvided, [
				{ name: "alpha", provided: true }
			]);
			expect(getKnownExportNames(moduleGraph, module_, undefined)).toBeNull();
		}
	});

	it("skips an export the module definitively does not provide", () => {
		const moduleGraph = moduleGraphWith(false, [
			{ name: "alpha", provided: true },
			{ name: "__esModule", provided: false }
		]);
		expect(getKnownExportNames(moduleGraph, module_, undefined)).toEqual([
			"alpha"
		]);
	});

	it("keeps `__esModule` when the module really exports it", () => {
		const moduleGraph = moduleGraphWith(false, [
			{ name: "alpha", provided: true },
			{ name: "__esModule", provided: true }
		]);
		expect(getKnownExportNames(moduleGraph, module_, undefined)).toEqual([
			"__esModule",
			"alpha"
		]);
	});

	it("bails out on an export whose presence is unknown", () => {
		for (const provided of [null, undefined]) {
			const moduleGraph = moduleGraphWith(false, [{ name: "alpha", provided }]);
			expect(getKnownExportNames(moduleGraph, module_, undefined)).toBeNull();
		}
	});

	it("never exposes `then`", () => {
		const moduleGraph = moduleGraphWith(false, [
			{ name: "alpha", provided: true },
			{ name: "then", provided: true }
		]);
		expect(getKnownExportNames(moduleGraph, module_, undefined)).toEqual([
			"alpha"
		]);
	});

	it("bails out when a name is emitted mangled", () => {
		const moduleGraph = moduleGraphWith(false, [
			{ name: "alpha", provided: true, usedName: "a" }
		]);
		expect(getKnownExportNames(moduleGraph, module_, undefined)).toBeNull();
	});

	it("keeps a name the graph reports as unused", () => {
		const moduleGraph = moduleGraphWith(false, [
			{ name: "alpha", provided: true, usedName: false }
		]);
		expect(getKnownExportNames(moduleGraph, module_, undefined)).toEqual([
			"alpha"
		]);
	});
});
