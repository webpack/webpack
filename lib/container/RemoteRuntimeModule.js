/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("./RemoteModule")} RemoteModule */

class RemoteRuntimeModule extends RuntimeModule {
	constructor() {
		super("remotes loading");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { runtimeTemplate, chunkGraph, moduleGraph } = this.compilation;
		const chunkToRemotesMapping = {};
		const idToExternalAndNameMapping = {};
		for (const chunk of this.chunk.getAllAsyncChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"remote"
			);
			if (!modules) continue;
			const remotes = (chunkToRemotesMapping[chunk.id] = []);
			for (const m of modules) {
				const module = /** @type {RemoteModule} */ (m);
				const name = module.internalRequest;
				const id = chunkGraph.getModuleId(module);
				const externalModule = moduleGraph.getModule(module.dependencies[0]);
				const externalModuleId = chunkGraph.getModuleId(externalModule);
				remotes.push(id);
				idToExternalAndNameMapping[id] = [externalModuleId, name];
			}
		}
		return Template.asString([
			`var chunkMapping = ${JSON.stringify(
				chunkToRemotesMapping,
				null,
				"\t"
			)};`,
			`var idToExternalAndNameMapping = ${JSON.stringify(
				idToExternalAndNameMapping,
				null,
				"\t"
			)};`,
			`${
				RuntimeGlobals.ensureChunkHandlers
			}.remotes = ${runtimeTemplate.basicFunction("chunkId, promises", [
				`if(${RuntimeGlobals.hasOwnProperty}(chunkMapping, chunkId)) {`,
				Template.indent([
					`chunkMapping[chunkId].forEach(${runtimeTemplate.basicFunction("id", [
						"if(__webpack_modules__[id]) return;",
						"var data = idToExternalAndNameMapping[id];",
						"console.log(data);",
						`promises.push(Promise.resolve(__webpack_require__(data[0]).get(data[1])).then(${runtimeTemplate.basicFunction(
							"factory",
							[
								`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
									"module",
									[
										"console.log(factory.toString());",
										"module.exports = factory();"
									]
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

module.exports = RemoteRuntimeModule;
