/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const { first } = require("../util/SetHelpers");
const { propertyName } = require("../util/property");

/** @import { Source } from "webpack-sources" */
/** @import { GenerateContext } from "../Generator" */
/** @import { UsedName } from "../ExportsInfo" */

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

/** @typedef {Map<UsedName, { value: string, type: typeof ExportBindingType.Getter | typeof ExportBindingType.Value }>} ExportMap */
/** @typedef {Set<string>} UnusedExports */

/**
 * Lets a consumer take over the rendered `d()` call at its required position.
 * End-position value bindings cannot move before the module body.
 * @typedef {(source: string, placeAtEnd: boolean) => boolean} OnDemandGeneration
 */

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
	 * @param {OnDemandGeneration=} onDemand offered the call instead of emitting it
	 */
	constructor(
		exportsArgument,
		exportMap = EMPTY_MAP,
		unusedExports = EMPTY_SET,
		onDemand = undefined
	) {
		super(undefined, InitFragment.STAGE_HARMONY_EXPORTS, 1, "harmony-exports");
		/** @type {string} */
		this.exportsArgument = exportsArgument;
		/** @type {ExportMap} */
		this.exportMap = exportMap;
		/** @type {UnusedExports} */
		this.unusedExports = unusedExports;
		/** @type {OnDemandGeneration | undefined} */
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
		/** @type {OnDemandGeneration=} */
		let onDemand;

		for (const fragment of fragments) {
			if (fragment.exportMap.size !== 0) {
				if (exportMap === undefined) {
					exportMap = fragment.exportMap;
					exportMapOwned = false;
					onDemand = fragment.onDemand;
				} else {
					if (!exportMapOwned) {
						exportMap = new Map(exportMap);
						exportMapOwned = true;
					}
					for (const [key, value] of fragment.exportMap) {
						if (!exportMap.has(key)) exportMap.set(key, value);
						onDemand = onDemand || fragment.onDemand;
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
			onDemand
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
			this.onDemand || other.onDemand
		);
	}

	/**
	 * Returns the source code that will be included as initialization code.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included as initialization code
	 */
	getContent(context) {
		this._generate(context);

		const { runtimeRequirements } = context;
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
			if (this.onDemand !== undefined && this.onDemand(definePart, false)) {
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
	getEndContent({ runtimeRequirements }) {
		let definePart = "";

		if (this._defsValue && this._defsValue.length) {
			// Requested even when the call is taken over below: whoever took it may still
			// emit it, and by then the requirement set is closed.
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			// Only this fragment emits the array form, so the runtime helper drops the
			// branch reading it unless this asks for it.
			runtimeRequirements.add(RuntimeGlobals.definePropertyGettersFromArray);
			const definition = `/* harmony export */ ${
				RuntimeGlobals.definePropertyGetters
			}(${this.exportsArgument}, [${this._defsValue.join(",")}\n/* harmony export */ ]);\n`;

			definePart =
				this.onDemand !== undefined && this.onDemand(definition, true)
					? definePart
					: `\n${definition}`;
		}

		return definePart;
	}
}

module.exports = HarmonyExportInitFragment;

HarmonyExportInitFragment.ExportBindingType = ExportBindingType;
