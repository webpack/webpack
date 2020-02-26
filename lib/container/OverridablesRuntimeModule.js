/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("./OverridableModule")} OverridableModule */

class OverridablesRuntimeModule extends RuntimeModule {
	constructor() {
		super("overridables");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const {
			runtimeTemplate,
			chunkGraph,
			codeGenerationResults
		} = this.compilation;
		const chunkToOverridableMapping = {};
		const idToNameMapping = {};
		const overridableToFallbackMapping = new Map();
		for (const chunk of this.chunk.getAllAsyncChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"overridable"
			);
			if (!modules) continue;
			const overridables = (chunkToOverridableMapping[chunk.id] = []);
			for (const m of modules) {
				const module = /** @type {OverridableModule} */ (m);
				const name = module.name;
				const id = chunkGraph.getModuleId(module);
				overridables.push(id);
				idToNameMapping[id] = name;
				const source = codeGenerationResults
					.get(module)
					.sources.get("overridable");
				overridableToFallbackMapping.set(id, source.source());
			}
		}
		return Template.asString([
			`${RuntimeGlobals.overrides} = {};`,
			`var chunkMapping = ${JSON.stringify(
				chunkToOverridableMapping,
				null,
				"\t"
			)};`,
			`var idToNameMapping = ${JSON.stringify(idToNameMapping, null, "\t")};`,
			"var fallbackMapping = {",
			Template.indent(
				Array.from(
					overridableToFallbackMapping,
					([id, source]) =>
						`${JSON.stringify(id)}: ${runtimeTemplate.basicFunction(
							"",
							source
						)}`
				).join(",\n")
			),
			"};",
			`${
				RuntimeGlobals.ensureChunkHandlers
			}.overridables = ${runtimeTemplate.basicFunction("chunkId, promises", [
				`if(${RuntimeGlobals.hasOwnProperty}(chunkMapping, chunkId)) {`,
				Template.indent([
					`chunkMapping[chunkId].forEach(${runtimeTemplate.basicFunction("id", [
						"if(__webpack_modules__[id]) return;",
						`promises.push(Promise.resolve((${
							RuntimeGlobals.overrides
						}[idToNameMapping[id]] || fallbackMapping[id])()).then(${runtimeTemplate.basicFunction(
							"factory",
							[
								`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
									"module",
									["module.exports = factory();"]
								)}`
							]
						)}))`
					])});`
				]),
				"}"
			])}`
		]);
	}
}

module.exports = OverridablesRuntimeModule;
