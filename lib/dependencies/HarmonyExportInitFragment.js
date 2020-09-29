/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */

const joinIterableWithComma = iterable => {
	// This is more performant than Array.from().join(", ")
	// as it doesn't create an array
	let str = "";
	let first = true;
	for (const item of iterable) {
		if (first) {
			first = false;
		} else {
			str += ", ";
		}
		str += item;
	}
	return str;
};

const EMPTY_MAP = new Map();
const EMPTY_SET = new Set();

class HarmonyExportInitFragment extends InitFragment {
	/**
	 * @param {string} exportsArgument the exports identifier
	 * @param {Map<string, string>} exportMap mapping from used name to exposed variable name
	 * @param {Set<string>} unusedExports list of unused export names
	 */
	constructor(
		exportsArgument,
		exportMap = EMPTY_MAP,
		unusedExports = EMPTY_SET
	) {
		super(undefined, InitFragment.STAGE_HARMONY_EXPORTS, 1, "harmony-exports");
		this.exportsArgument = exportsArgument;
		this.exportMap = exportMap;
		this.unusedExports = unusedExports;
	}

	merge(other) {
		let exportMap;
		if (this.exportMap.size === 0) {
			exportMap = other.exportMap;
		} else if (other.exportMap.size === 0) {
			exportMap = this.exportMap;
		} else {
			exportMap = new Map(other.exportMap);
			for (const [key, value] of this.exportMap) {
				if (!exportMap.has(key)) exportMap.set(key, value);
			}
		}
		let unusedExports;
		if (this.unusedExports.size === 0) {
			unusedExports = other.unusedExports;
		} else if (other.unusedExports.size === 0) {
			unusedExports = this.unusedExports;
		} else {
			unusedExports = new Set(other.unusedExports);
			for (const value of this.unusedExports) {
				unusedExports.add(value);
			}
		}
		return new HarmonyExportInitFragment(
			this.exportsArgument,
			exportMap,
			unusedExports
		);
	}

	/**
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {string|Source} the source code that will be included as initialization code
	 */
	getContent({ runtimeTemplate, runtimeRequirements }) {
		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);

		const unusedPart =
			this.unusedExports.size > 1
				? `/* unused harmony exports ${joinIterableWithComma(
						this.unusedExports
				  )} */\n`
				: this.unusedExports.size > 0
				? `/* unused harmony export ${
						this.unusedExports.values().next().value
				  } */\n`
				: "";
		const definitions = [];
		for (const [key, value] of this.exportMap) {
			definitions.push(
				`\n/* harmony export */   ${JSON.stringify(
					key
				)}: ${runtimeTemplate.returningFunction(value)}`
			);
		}
		const definePart =
			this.exportMap.size > 0
				? `/* harmony export */ ${RuntimeGlobals.definePropertyGetters}(${
						this.exportsArgument
				  }, {${definitions.join(",")}\n/* harmony export */ });\n`
				: "";
		return `${definePart}${unusedPart}`;
	}
}

module.exports = HarmonyExportInitFragment;
