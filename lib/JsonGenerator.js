/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource } = require("webpack-sources");
const Generator = require("./Generator");
const RuntimeGlobals = require("./RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Generator").GenerateContext} GenerateContext */
/** @typedef {import("./NormalModule")} NormalModule */

const stringifySafe = data => {
	const stringified = JSON.stringify(data);
	if (!stringified) {
		return undefined; // Invalid JSON
	}

	return stringified.replace(
		/\u2028|\u2029/g,
		str => (str === "\u2029" ? "\\u2029" : "\\u2028")
	); // invalid in JavaScript but valid JSON
};

class JsonGenerator extends Generator {
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
		if (
			Array.isArray(module.buildMeta.providedExports) &&
			!module.isExportUsed(moduleGraph, "default")
		) {
			// Only some exports are used: We can optimize here, by only generating a part of the JSON
			const reducedJson = {};
			for (const exportName of module.buildMeta.providedExports) {
				if (exportName === "default") continue;
				const used = module.getUsedName(moduleGraph, exportName);
				if (typeof used === "string") {
					reducedJson[used] = data[exportName];
				}
			}
			source.add(
				`${module.moduleArgument}.exports = ${stringifySafe(reducedJson)};`
			);
		} else {
			source.add(`${module.moduleArgument}.exports = ${stringifySafe(data)};`);
		}
		return source;
	}
}

module.exports = JsonGenerator;
