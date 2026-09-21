/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const InitFragment = require("../template/InitFragment");
const { first } = require("../util/SetHelpers");
const { propertyName } = require("../util/property");

/** @import { Source } from "webpack-sources" */
/** @import { GenerateContext } from "../module/Generator" */
/** @import { UsedName } from "../graph/ExportsInfo" */

/**
 * Join iterable with comma.
 * @param {Iterable<string>} iterable iterable strings
 * @returns {string} result
 */
const joinIterableWithComma = (iterable) => {
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

const ExportBindingType = Object.freeze({
	Getter: 0b00,
	Value: 0b01
});

/**
 * @typedef {object} ExportMapEntry
 * @property {string} value the expression the definition reads, comment included
 * @property {typeof ExportBindingType.Getter | typeof ExportBindingType.Value} type how the export is defined
 * @property {string=} finalName the binding of the module's own body the export reads, exported natively where the definition is left out on demand
 */
/** @typedef {Map<UsedName, ExportMapEntry>} ExportMap */
/** @typedef {Set<string>} UnusedExports */

/** @type {ExportMap} */
const EMPTY_MAP = new Map();
/** @type {UnusedExports} */
const EMPTY_SET = new Set();

/**
 * Represents HarmonyExportInitFragment.
 * @extends {InitFragment<GenerateContext>} Context
 */
class HarmonyExportInitFragment extends InitFragment {
	/**
	 * Creates an instance of HarmonyExportInitFragment.
	 * @param {string} exportsArgument the exports identifier
	 * @param {ExportMap} exportMap mapping from used name to exposed variable name
	 * @param {UnusedExports} unusedExports list of unused export names
	 * @param {boolean} onDemand leave the call out of the source and hand it over in the code generation data, with the binding each export reads (see `KnownMeta.onDemandExports`)
	 */
	constructor(
		exportsArgument,
		exportMap = EMPTY_MAP,
		unusedExports = EMPTY_SET,
		onDemand = false
	) {
		super(
			undefined,
			InitFragment.STAGE_HARMONY_EXPORTS,
			1,
			onDemand ? "harmony-exports-on-demand" : "harmony-exports"
		);
		/** @type {string} */
		this.exportsArgument = exportsArgument;
		/** @type {ExportMap} */
		this.exportMap = exportMap;
		/** @type {UnusedExports} */
		this.unusedExports = unusedExports;
		/** @type {boolean} */
		this.onDemand = onDemand;

		this._generated = false;
		this._defsValue = undefined;
		this._defsGetter = undefined;
	}

	/**
	 * Returns the source code that will be included as initialization code.
	 * @param {GenerateContext} context context
	 * @returns {void}
	 */
	_generate({ runtimeTemplate }) {
		if (this._generated) return;
		this._generated = true;

		if (this.exportMap.size > 0) {
			/** @type {string[]} */
			const _defsValue = [];
			const _defsGetter = [];
			const orderedExportMap =
				this.exportMap.size > 1
					? [...this.exportMap].sort(([a], [b]) => (a < b ? -1 : 1))
					: this.exportMap;
			for (const [key, { value, type }] of orderedExportMap) {
				switch (type) {
					case ExportBindingType.Getter:
						_defsGetter.push(
							`\n/* harmony export */   ${propertyName(
								/** @type {string} */ (key)
							)}: ${runtimeTemplate.returningFunction(value)}`
						);
						break;

					case ExportBindingType.Value:
						_defsValue.push(
							`\n/* harmony export */   ${JSON.stringify(key)}, 0, ${value}`
						);
				}
			}

			this._defsGetter = _defsGetter;
			this._defsValue = _defsValue;
		}
	}

	/**
	 * Merges the provided values into a single result.
	 * @param {HarmonyExportInitFragment[]} fragments all fragments to merge
	 * @returns {HarmonyExportInitFragment} merged fragment
	 */
	mergeAll(fragments) {
		/** @type {undefined | ExportMap} */
		let exportMap;
		let exportMapOwned = false;
		/** @type {undefined | UnusedExports} */
		let unusedExports;
		let unusedExportsOwned = false;

		for (const fragment of fragments) {
			if (fragment.exportMap.size !== 0) {
				if (exportMap === undefined) {
					exportMap = fragment.exportMap;
					exportMapOwned = false;
				} else {
					if (!exportMapOwned) {
						exportMap = new Map(exportMap);
						exportMapOwned = true;
					}
					for (const [key, value] of fragment.exportMap) {
						if (!exportMap.has(key)) exportMap.set(key, value);
					}
				}
			}
			if (fragment.unusedExports.size !== 0) {
				if (unusedExports === undefined) {
					unusedExports = fragment.unusedExports;
					unusedExportsOwned = false;
				} else {
					if (!unusedExportsOwned) {
						unusedExports = new Set(unusedExports);
						unusedExportsOwned = true;
					}
					for (const value of fragment.unusedExports) {
						unusedExports.add(value);
					}
				}
			}
		}
		return new HarmonyExportInitFragment(
			this.exportsArgument,
			exportMap,
			unusedExports,
			this.onDemand
		);
	}

	/**
	 * Returns merged result.
	 * @param {HarmonyExportInitFragment} other other
	 * @returns {HarmonyExportInitFragment} merged result
	 */
	merge(other) {
		/** @type {ExportMap} */
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
		/** @type {UnusedExports} */
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
			unusedExports,
			this.onDemand
		);
	}

	/**
	 * Returns the source code that will be included as initialization code.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included as initialization code
	 */
	getContent(context) {
		this._generate(context);

		const { runtimeRequirements, getData } = context;
		const unusedPart =
			this.unusedExports.size > 1
				? `/* unused harmony exports ${joinIterableWithComma(
						this.unusedExports
					)} */\n`
				: this.unusedExports.size > 0
					? `/* unused harmony export ${first(this.unusedExports)} */\n`
					: "";
		let definePart = "";

		if (this._defsGetter && this._defsGetter.length) {
			// Requested even when the call is taken over below: whoever took it may still
			// emit it, and by then the requirement set is closed.
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			definePart = `/* harmony export */ ${
				RuntimeGlobals.definePropertyGetters
			}(${this.exportsArgument}, {${this._defsGetter.join(
				","
			)}\n/* harmony export */ });\n`;
		}

		if (this.onDemand && getData !== undefined) {
			const data = getData();
			/** @type {Record<string, string>} */
			const finalNames = {};
			for (const [key, { finalName }] of this.exportMap) {
				if (finalName !== undefined) {
					finalNames[/** @type {string} */ (key)] = finalName;
				}
			}
			data.set("exportsFinalName", finalNames);
			if (definePart) {
				const before = data.get("exportsSource");
				data.set(
					"exportsSource",
					before ? `${before}${definePart}` : definePart
				);
				definePart = "";
			}
		}

		return `${definePart}${unusedPart}`;
	}

	/**
	 * Returns the source code that will be included at the end of the module.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included at the end of the module
	 */
	getEndContent({ runtimeRequirements, getData }) {
		let definePart = "";

		if (this._defsValue && this._defsValue.length) {
			// Requested even when the call is taken over below: whoever took it may still
			// emit it, and by then the requirement set is closed.
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			// The runtime helper drops the branch reading the array form unless an
			// emitter of it asks, so every emitter has to.
			runtimeRequirements.add(RuntimeGlobals.definePropertyGettersFromArray);
			definePart = `/* harmony export */ ${
				RuntimeGlobals.definePropertyGetters
			}(${this.exportsArgument}, [${this._defsValue.join(",")}\n/* harmony export */ ]);\n`;

			if (this.onDemand && getData !== undefined) {
				const data = getData();
				const before = data.get("exportsBindingSource");
				data.set(
					"exportsBindingSource",
					before ? `${before}${definePart}` : definePart
				);
				definePart = "";
			} else {
				definePart = `\n${definePart}`;
			}
		}

		return definePart;
	}
}

module.exports = HarmonyExportInitFragment;

HarmonyExportInitFragment.ExportBindingType = ExportBindingType;
