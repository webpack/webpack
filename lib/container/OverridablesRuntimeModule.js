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
	constructor(runtimeRequirements) {
		super("overridables");
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const {
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			codeGenerationResults
		} = this.compilation;
		const chunkToOverridableMapping = {};
		const idToNameMapping = {};
		const overridableToFallbackMapping = new Map();
		const initialOverridables = {};
		const asyncChunks = this.chunk.getAllAsyncChunks();
		for (const chunk of asyncChunks) {
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
		for (const chunk of this.chunk.getAllReferencedChunks()) {
			if (asyncChunks.has(chunk)) continue;
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"overridable"
			);
			if (!modules) continue;
			for (const m of modules) {
				const module = /** @type {OverridableModule} */ (m);
				const name = module.name;
				const id = chunkGraph.getModuleId(module);
				idToNameMapping[id] = name;
				const fallbackModule = moduleGraph.getModule(
					module.blocks[0].dependencies[0]
				);
				const fallbackId = chunkGraph.getModuleId(fallbackModule);
				initialOverridables[id] = fallbackId;
			}
		}
		return Template.asString([
			`${RuntimeGlobals.overrides} = {};`,
			"var installedModules = {};",
			`var idToNameMapping = ${JSON.stringify(idToNameMapping, null, "\t")};`,

			Object.keys(initialOverridables).length
				? Template.asString([
						`var initialOverridables = ${JSON.stringify(
							initialOverridables,
							null,
							"\t"
						)};`,
						`for(var id in initialOverridables) if(${
							RuntimeGlobals.hasOwnProperty
						}(initialOverridables, id)) __webpack_modules__[id] = (${runtimeTemplate.returningFunction(
							`${runtimeTemplate.basicFunction("module", [
								"// Handle case when module is used sync",
								"installedModules[id] = 0;",
								`var override = ${RuntimeGlobals.overrides}[idToNameMapping[id]];`,
								"module.exports = override ? override()() : __webpack_require__(initialOverridables[id]);"
							])}`,
							"id"
						)})(id);`
				  ])
				: "// no overridables in initial chunks",
			this._runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers)
				? Template.asString([
						`var chunkMapping = ${JSON.stringify(
							chunkToOverridableMapping,
							null,
							"\t"
						)};`,
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
						}.overridables = ${runtimeTemplate.basicFunction(
							"chunkId, promises",
							[
								`if(${RuntimeGlobals.hasOwnProperty}(chunkMapping, chunkId)) {`,
								Template.indent([
									`chunkMapping[chunkId].forEach(${runtimeTemplate.basicFunction(
										"id",
										[
											`promises.push(${
												RuntimeGlobals.hasOwnProperty
											}(installedModules, id) ? installedModules[id] : installedModules[id] = Promise.resolve((${
												RuntimeGlobals.overrides
											}[idToNameMapping[id]] || fallbackMapping[id])()).then(${runtimeTemplate.basicFunction(
												"factory",
												[
													"installedModules[id] = 0;",
													`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
														"module",
														["module.exports = factory();"]
													)}`
												]
											)}))`
										]
									)});`
								]),
								"}"
							]
						)}`
				  ])
				: "// no chunk loading of overridables"
		]);
	}
}

module.exports = OverridablesRuntimeModule;
