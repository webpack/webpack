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
		let hasFallback = false;
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
				const overridesModule = moduleGraph.getModule(module.dependencies[0]);
				const overridesModuleId =
					overridesModule && chunkGraph.getModuleId(overridesModule);
				const externalModuleIds = module.dependencies.slice(1).map(dep => {
					const externalModule = moduleGraph.getModule(dep);
					return externalModule && chunkGraph.getModuleId(externalModule);
				});
				if (externalModuleIds.length > 1) hasFallback = true;
				remotes.push(id);
				idToExternalAndNameMapping[id] = [
					overridesModuleId,
					name,
					...externalModuleIds
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
							'if(!error) error = new Error("Container missing");',
							'if(typeof error.message === "string")',
							Template.indent(
								`error.message += '\\nwhile loading "' + data[1] + '" from ' + data[${
									hasFallback ? "i" : "2"
								}];`
							),
							`__webpack_modules__[id] = ${runtimeTemplate.basicFunction("", [
								"throw error;"
							])}`,
							"delete installedModules[id];"
						])};`,
						`var onExternal = ${runtimeTemplate.basicFunction(
							"external, handlePromise",
							[
								"try {",
								Template.indent([
									"var promise = __webpack_require__(data[0])(external).get(data[1]);",
									"if(promise && promise.then) {",
									Template.indent([
										"var p = promise.then(onFactory, onError);",
										`if(handlePromise) promises.push(installedModules[id] = p); else return p;`
									]),
									"} else {",
									Template.indent([`onFactory(promise);`]),
									"}"
								]),
								"} catch(error) {",
								Template.indent(["onError(error);"]),
								"}"
							]
						)};`,
						`var onFactory = ${runtimeTemplate.basicFunction("factory", [
							"installedModules[id] = 0;",
							`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
								"module",
								["module.exports = factory();"]
							)}`
						])};`,
						hasFallback
							? Template.asString([
									"var i = 1, item, result;",
									"(function next(error) {",
									Template.indent([
										"for(;;) {",
										Template.indent([
											"try {",
											Template.indent([
												"// Process with the next external in the data array",
												"item = data[++i];",
												"// Reached end of data, report the last error",
												"if(!item) return onError(error);",
												"result = __webpack_require__(item);",
												"// Continue when receiving falsy value, otherwise handle promise or normal value",
												"if(result) return result.then ? promises.push(installedModules[id] = result.then(onExternal, next)) : onExternal(result, 1);"
											]),
											"} catch(e) {",
											Template.indent("error = e;"),
											"}"
										]),
										"}"
									]),
									"})();"
							  ])
							: Template.asString([
									"try {",
									Template.indent([
										"var promise =__webpack_require__(data[2]);",
										"if(promise) return promise.then ? promises.push(installedModules[id] = promise.then(onExternal, onError)) : onExternal(promise, 1);",
										"onError();"
									]),
									"} catch(error) {",
									Template.indent(["onError(error);"]),
									"}"
							  ])
					])});`
				]),
				"}"
			])}`
		]);
	}
}

module.exports = RemoteRuntimeModule;
