/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("./ConsumeSharedModule")} ConsumeSharedModule */

class ConsumeSharedRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements) {
		super("consumes", 10);
		this._runtimeRequirements = runtimeRequirements;
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
		const chunkToModuleMapping = {};
		const idToModuleMapping = new Map();
		const initialConsumes = [];
		for (const chunk of this.chunk.getAllAsyncChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"consume-shared"
			);
			if (!modules) continue;
			const consumes = (chunkToModuleMapping[chunk.id] = []);
			for (const m of modules) {
				const module = /** @type {ConsumeSharedModule} */ (m);
				const id = chunkGraph.getModuleId(module);
				consumes.push(id);
				idToModuleMapping.set(id, module);
			}
		}
		for (const chunk of this.chunk.getAllInitialChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"consume-shared"
			);
			if (!modules) continue;
			for (const m of modules) {
				const module = /** @type {ConsumeSharedModule} */ (m);
				const id = chunkGraph.getModuleId(module);
				initialConsumes.push(id);
				idToModuleMapping.set(id, module);
			}
		}
		if (idToModuleMapping.size === 0) return null;
		return Template.asString([
			"function ensureExistence(scope, scopeName, key) {",
			Template.indent(
				`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);`
			),
			"}",
			"function checkVersion(scope, key, version, strict) {",
			Template.indent([
				`var versionConflict = ${runtimeTemplate.basicFunction("", [
					'var msg = "Unsatisfied version of shared module " + key + "@" + (v && v.join(".")) + ", but required " + version.join(".");',
					"if(strict) throw new Error(msg);",
					'typeof console !== "undefined" && console.warn && console.warn(msg);',
					"return 1;"
				])};`,
				"var v = scope[key].v;",
				"if(!v) return versionConflict();",
				"for(var i = 0; i < version.length; i++) {",
				Template.indent([
					"if(i === v.length) return versionConflict();",
					"if(v[i] != version[i]) { // loose equal is intentional to match string and number",
					Template.indent([
						'if(typeof v[i] === "string" || typeof version[i] === "string" || v[i] < version[i]) return versionConflict();',
						"if(v[i] > version[i]) return;"
					]),
					"}"
				]),
				"}"
			]),
			"}",
			`var get = ${runtimeTemplate.returningFunction(
				"(sharedModule.loaded = 1, sharedModule.get())",
				"sharedModule"
			)};`,
			`var load = ${runtimeTemplate.basicFunction("scopeName, key", [
				`${RuntimeGlobals.initializeSharing}(scopeName);`,
				`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
				`ensureExistence(scope, scopeName, key);`,
				"return get(scope[key]);"
			])};`,
			`var loadFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					`return scope && ${RuntimeGlobals.hasOwnProperty}(scope, key) ? get(scope[key]) : fallback();`
				]
			)};`,
			`var loadVersionCheck = ${runtimeTemplate.basicFunction(
				"scopeName, key, version",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					"ensureExistence(scope, scopeName, key);",
					"checkVersion(scope, key, version);",
					"return get(scope[key]);"
				]
			)};`,
			`var loadStrictVersionCheck = ${runtimeTemplate.basicFunction(
				"scopeName, key, version",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					"ensureExistence(scope, scopeName, key);",
					"checkVersion(scope, key, version, 1);",
					"return get(scope[key]);"
				]
			)};`,
			`var loadStrictVersionCheckFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, version, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					`return scope && ${RuntimeGlobals.hasOwnProperty}(scope, key) && !checkVersion(scope, key, version) ? get(scope[key]) : fallback();`
				]
			)};`,
			`var loadVersionCheckFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, version, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"checkVersion(scope, key, version);",
					"return get(scope[key]);"
				]
			)};`,
			"var installedModules = {};",
			"var moduleToHandlerMapping = {",
			Template.indent(
				Array.from(
					idToModuleMapping,
					([key, module]) =>
						`${JSON.stringify(key)}: ${codeGenerationResults
							.get(module)
							.sources.get("consume-shared")
							.source()}`
				).join(",\n")
			),
			"};",

			initialConsumes.length > 0
				? Template.asString([
						`var initialConsumes = ${JSON.stringify(initialConsumes)};`,
						`initialConsumes.forEach(${runtimeTemplate.basicFunction("id", [
							`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
								"module",
								[
									"// Handle case when module is used sync",
									"installedModules[id] = 0;",
									"delete __webpack_module_cache__[id];",
									"var factory = moduleToHandlerMapping[id]();",
									'if(typeof factory !== "function") throw new Error("Shared module is not available for eager consumption: " + id);',
									`module.exports = factory();`
								]
							)}`
						])});`
				  ])
				: "// no consumes in initial chunks",
			this._runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers)
				? Template.asString([
						`var chunkMapping = ${JSON.stringify(
							chunkToModuleMapping,
							null,
							"\t"
						)};`,
						`${
							RuntimeGlobals.ensureChunkHandlers
						}.consumes = ${runtimeTemplate.basicFunction("chunkId, promises", [
							`if(${RuntimeGlobals.hasOwnProperty}(chunkMapping, chunkId)) {`,
							Template.indent([
								`chunkMapping[chunkId].forEach(${runtimeTemplate.basicFunction(
									"id",
									[
										`if(${RuntimeGlobals.hasOwnProperty}(installedModules, id)) return promises.push(installedModules[id]);`,
										`var onFactory = ${runtimeTemplate.basicFunction(
											"factory",
											[
												"installedModules[id] = 0;",
												`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
													"module",
													[
														"delete __webpack_module_cache__[id];",
														"module.exports = factory();"
													]
												)}`
											]
										)};`,
										`var onError = ${runtimeTemplate.basicFunction("error", [
											"delete installedModules[id];",
											`__webpack_modules__[id] = ${runtimeTemplate.basicFunction(
												"module",
												["delete __webpack_module_cache__[id];", "throw error;"]
											)}`
										])};`,
										"try {",
										Template.indent([
											"var promise = moduleToHandlerMapping[id]();",
											"if(promise.then) {",
											Template.indent(
												`promises.push(installedModules[id] = promise.then(onFactory).catch(onError));`
											),
											"} else onFactory(promise);"
										]),
										"} catch(e) { onError(e); }"
									]
								)});`
							]),
							"}"
						])}`
				  ])
				: "// no chunk loading of consumes"
		]);
	}
}

module.exports = ConsumeSharedRuntimeModule;
