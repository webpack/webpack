/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../ExportsInfo").UsedName} UsedName */

/**
 * @typedef {object} ExportBinding
 * @property {UsedName} name the used export name
 * @property {string} value the variable expression
 * @property {"getter" | "value"=} bindingType "value" for value binding, defaults to "getter"
 */

/**
 * Init fragment for const export bindings.
 * Generates a flat-array __webpack_require__.d() call.
 * Getter bindings: "key", () => expr (2 items).
 * Value bindings: "key", 0, expr (3 items, 0 is sentinel).
 *
 * Uses a separate key ("harmony-export-bindings") from HarmonyExportInitFragment
 * so the two fragment types do not merge and cannot interfere with each
 * other's placement (top vs bottom).
 * @extends {InitFragment<GenerateContext>} Context
 */
class ExportBindingInitFragment extends InitFragment {
	/**
	 * @param {string} exportsArgument the exports identifier
	 * @param {ExportBinding[]} bindings list of export bindings
	 * @param {boolean=} placeAtEnd when true, place the d() call at the end of the module
	 */
	constructor(exportsArgument, bindings, placeAtEnd = false) {
		super(
			undefined,
			InitFragment.STAGE_HARMONY_EXPORTS,
			1,
			"harmony-export-bindings"
		);
		/** @type {string} */
		this.exportsArgument = exportsArgument;
		/** @type {ExportBinding[]} */
		this.bindings = bindings;
		/** @type {boolean} */
		this.placeAtEnd = placeAtEnd;
	}

	/**
	 * @param {ExportBindingInitFragment[]} fragments all fragments to merge
	 * @returns {ExportBindingInitFragment} merged fragment
	 */
	mergeAll(fragments) {
		/** @type {ExportBinding[]} */
		const bindings = [];
		/** @type {Set<string>} */
		const seenNames = new Set();
		let placeAtEnd = false;

		for (const fragment of fragments) {
			for (const binding of fragment.bindings) {
				const key = /** @type {string} */ (binding.name);
				if (!seenNames.has(key)) {
					seenNames.add(key);
					bindings.push(binding);
				}
			}
			if (fragment.placeAtEnd) placeAtEnd = true;
		}
		return new ExportBindingInitFragment(
			this.exportsArgument,
			bindings,
			placeAtEnd
		);
	}

	/**
	 * @param {ExportBindingInitFragment} other other
	 * @returns {ExportBindingInitFragment} merged result
	 */
	merge(other) {
		/** @type {ExportBinding[]} */
		const bindings = [];
		/** @type {Set<string>} */
		const seenNames = new Set();
		for (const binding of other.bindings) {
			const key = /** @type {string} */ (binding.name);
			seenNames.add(key);
			bindings.push(binding);
		}
		for (const binding of this.bindings) {
			const key = /** @type {string} */ (binding.name);
			if (!seenNames.has(key)) {
				seenNames.add(key);
				bindings.push(binding);
			}
		}
		return new ExportBindingInitFragment(
			this.exportsArgument,
			bindings,
			this.placeAtEnd || other.placeAtEnd
		);
	}

	/**
	 * @param {GenerateContext} context context
	 * @returns {string} the d() call or empty string
	 */
	_generateDefinition({ runtimeTemplate, runtimeRequirements }) {
		if (this.bindings.length === 0) return "";

		const sorted = [...this.bindings].sort((a, b) =>
			/** @type {string} */ (a.name) < /** @type {string} */ (b.name) ? -1 : 1
		);

		/** @type {string[]} */
		const items = [];
		for (const binding of sorted) {
			const key = JSON.stringify(/** @type {string} */ (binding.name));
			if (binding.bindingType === "value") {
				items.push(`\n/* harmony export */   ${key}, 0, ${binding.value}`);
			} else {
				items.push(
					`\n/* harmony export */   ${key}, ${runtimeTemplate.returningFunction(binding.value)}`
				);
			}
		}

		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
		return `/* harmony export */ ${RuntimeGlobals.definePropertyGetters}(${
			this.exportsArgument
		}, [${items.join(",")}\n/* harmony export */ ]);\n`;
	}

	/**
	 * Returns the source code that will be included as initialization code.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included as initialization code
	 */
	getContent(context) {
		if (this.placeAtEnd) return undefined;
		return this._generateDefinition(context);
	}

	/**
	 * Returns the source code that will be included at the end of the module.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included at the end of the module
	 */
	getEndContent(context) {
		if (!this.placeAtEnd) return undefined;
		const definePart = this._generateDefinition(context);
		if (!definePart) return undefined;
		return `\n${definePart}`;
	}
}

module.exports = ExportBindingInitFragment;
