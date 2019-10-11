/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const { UsageState } = require("../ModuleGraph");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../NormalModule")} NormalModule */

const stringifySafe = data => {
	const stringified = JSON.stringify(data);
	if (!stringified) {
		return undefined; // Invalid JSON
	}

	return stringified.replace(/\u2028|\u2029/g, str =>
		str === "\u2029" ? "\\u2029" : "\\u2028"
	); // invalid in JavaScript but valid JSON
};

const TYPES = new Set(["javascript"]);

class JsonGenerator extends Generator {
	/**
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes() {
		return TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		let data = module.buildInfo.jsonData;
		if (!data) return 0;
		return stringifySafe(data).length + 10;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { moduleGraph, runtimeTemplate, runtimeRequirements }) {
		const source = new ConcatSource();
		const data = module.buildInfo.jsonData;
		if (data === undefined) {
			return new RawSource(
				runtimeTemplate.missingModuleStatement({
					request: module.rawRequest
				})
			);
		}
		runtimeRequirements.add(RuntimeGlobals.module);
		const providedExports = moduleGraph.getProvidedExports(module);
		let finalJson;
		if (
			Array.isArray(providedExports) &&
			module.isExportUsed(moduleGraph, "default") === UsageState.Unused
		) {
			// Only some exports are used: We can optimize here, by only generating a part of the JSON
			const reducedJson = {};
			for (const exportName of providedExports) {
				if (exportName === "default") continue;
				const used = module.getUsedName(moduleGraph, exportName);
				if (typeof used === "string") {
					reducedJson[used] = data[exportName];
				}
			}
			finalJson = reducedJson;
		} else {
			finalJson = data;
		}
		// Use JSON because JSON.parse() is much faster than JavaScript evaluation
		const jsonSource = JSON.stringify(stringifySafe(finalJson));
		const jsonExpr = `JSON.parse(${jsonSource})`;
		source.add(`${module.moduleArgument}.exports = ${jsonExpr};`);
		return source;
	}
}

module.exports = JsonGenerator;
