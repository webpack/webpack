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
				const externalModuleId =
					externalModule && chunkGraph.getModuleId(externalModule);
				const overridesModule = moduleGraph.getModule(module.dependencies[1]);
				const overridesModuleId =
					overridesModule && chunkGraph.getModuleId(overridesModule);
				remotes.push(id);
				idToExternalAndNameMapping[id] = [
					overridesModuleId,
					externalModuleId,
					name
				];
			}
		}
		return Template.asString([
			"var installedModules = {};",
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
						`if(${RuntimeGlobals.hasOwnProperty}(installedModules, id)) return installedModules[id] && promises.push(installedModules[id]);`,
						"var data = idToExternalAndNameMapping[id];",
						`var onError = ${runtimeTemplate.basicFunction("error", [
							"if(error && typeof error.message === \"string\") error.message += '\\nwhile loading \"' + data[2] + '\" from ' + data[1];",
							`__webpack_modules__[id] = ${runtimeTemplate.basicFunction("", [
								"throw error;"
							])}`,
							"delete installedModules[id];"
						])};`,
						`var onFactory = ${runtimeTemplate.basicFunction("factory", [
							`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
								"module",
								["module.exports = factory();"]
							)}`
						])};`,
						"try {",
						Template.indent([
							"var promise = __webpack_require__(data[0])(__webpack_require__(data[1])).get(data[2]);",
							"if(promise && promise.then) {",
							Template.indent([
								`promises.push(installedModules[id] = promise.then(onFactory, onError));`
							]),
							"} else {",
							Template.indent([`onFactory(promise);`]),
							"}"
						]),
						"} catch(error) {",
						Template.indent(["onError(error);"]),
						"}"
					])});`
				]),
				"}"
			])}`
		]);
	}
}

module.exports = RemoteRuntimeModule;
