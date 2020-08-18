/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const {
	numberToIdentifier,
	NUMBER_OF_IDENTIFIER_START_CHARS,
	NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS
} = require("../Template");
const { assignDeterministicIds } = require("../ids/IdHelpers");
const { compareSelect, compareStringsNumeric } = require("../util/comparators");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ExportsInfo")} ExportsInfo */
/** @typedef {import("../ExportsInfo").ExportInfo} ExportInfo */

const OBJECT = [];
const ARRAY = [];

/**
 * @param {ExportsInfo} exportsInfo exports info
 * @returns {boolean} mangle is possible
 */
const canMangle = exportsInfo => {
	if (exportsInfo.otherExportsInfo.getUsed(undefined) !== UsageState.Unused)
		return false;
	let hasSomethingToMangle = false;
	for (const exportInfo of exportsInfo.exports) {
		if (exportInfo.canMangle === true) {
			hasSomethingToMangle = true;
		}
	}
	return hasSomethingToMangle;
};

// Sort by name
const comparator = compareSelect(e => e.name, compareStringsNumeric);
/**
 * @param {boolean} deterministic use deterministic names
 * @param {ExportsInfo} exportsInfo exports info
 * @param {boolean} canBeArray can be exports info point to an array
 * @returns {void}
 */
const mangleExportsInfo = (deterministic, exportsInfo, canBeArray) => {
	if (!canMangle(exportsInfo)) return;
	const usedNames = new Set();
	/** @type {ExportInfo[]} */
	const mangleableExports = [];
	const empty = canBeArray ? ARRAY : OBJECT;
	for (const exportInfo of exportsInfo.ownedExports) {
		const name = exportInfo.name;
		if (!exportInfo.hasUsedName()) {
			if (
				// Can the export be mangled?
				exportInfo.canMangle !== true ||
				// Never rename 1 char exports
				(name.length === 1 && /^[a-zA-Z0-9_$]/.test(name)) ||
				// Don't rename 2 char exports in deterministic mode
				(deterministic &&
					name.length === 2 &&
					/^[a-zA-Z_$][a-zA-Z0-9_$]|^[1-9][0-9]/.test(name)) ||
				// Don't rename exports that are not provided and in prototype chain of JSON
				(exportInfo.provided !== true && exportInfo.name in empty) ||
				// Don't rename exports that are neither provided nor used
				(exportInfo.provided === false &&
					exportInfo.getUsed(undefined) === UsageState.Unused)
			) {
				exportInfo.setUsedName(name);
				usedNames.add(name);
			} else {
				mangleableExports.push(exportInfo);
			}
		}
		if (exportInfo.exportsInfoOwned) {
			const used = exportInfo.getUsed(undefined);
			if (
				used === UsageState.OnlyPropertiesUsed ||
				used === UsageState.Unused
			) {
				mangleExportsInfo(deterministic, exportInfo.exportsInfo, true);
			}
		}
	}
	if (deterministic) {
		assignDeterministicIds(
			mangleableExports,
			e => e.name,
			comparator,
			(e, id) => {
				const name = numberToIdentifier(id);
				const size = usedNames.size;
				usedNames.add(name);
				if (size === usedNames.size) return false;
				e.setUsedName(name);
				return true;
			},
			[
				NUMBER_OF_IDENTIFIER_START_CHARS,
				NUMBER_OF_IDENTIFIER_START_CHARS *
					NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS
			],
			NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS,
			usedNames.size
		);
	} else {
		const usedExports = [];
		const unusedExports = [];
		for (const exportInfo of mangleableExports) {
			if (exportInfo.getUsed(undefined) === UsageState.Unused) {
				unusedExports.push(exportInfo);
			} else {
				usedExports.push(exportInfo);
			}
		}
		usedExports.sort(comparator);
		unusedExports.sort(comparator);
		let i = 0;
		for (const list of [usedExports, unusedExports]) {
			for (const exportInfo of list) {
				let name;
				do {
					name = numberToIdentifier(i++);
				} while (usedNames.has(name));
				exportInfo.setUsedName(name);
			}
		}
	}
};

class MangleExportsPlugin {
	/**
	 * @param {boolean} deterministic use deterministic names
	 */
	constructor(deterministic) {
		this._deterministic = deterministic;
	}
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { _deterministic: deterministic } = this;
		compiler.hooks.compilation.tap("MangleExportsPlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.optimizeCodeGeneration.tap(
				"MangleExportsPlugin",
				modules => {
					for (const module of modules) {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						mangleExportsInfo(deterministic, exportsInfo, false);
					}
				}
			);
		});
	}
}

module.exports = MangleExportsPlugin;
