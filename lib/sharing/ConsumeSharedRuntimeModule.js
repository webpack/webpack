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
			`var ensureExistence = ${runtimeTemplate.basicFunction(
				"scope, scopeName, key",
				`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);`
			)};`,
			`var invalidVersion = ${runtimeTemplate.basicFunction(
				"version, requiredVersion",
				[
					"for(var i = 0; i < requiredVersion.length; i++) {",
					Template.indent([
						"if(i === version.length) return 1;",
						"if(version[i] != requiredVersion[i]) { // loose equal is intentional to match string and number",
						Template.indent([
							'if(typeof version[i] === "string" || typeof requiredVersion[i] === "string" || version[i] < requiredVersion[i]) return 1;',
							"if(version[i] > requiredVersion[i]) return;"
						]),
						"}"
					]),
					"}"
				]
			)};`,
			`var checkSingletonVersion = ${runtimeTemplate.basicFunction(
				"key, version, requiredVersion, strict",
				[
					"if(!invalidVersion(version, requiredVersion)) return 1;",
					'var msg = "Unsatisfied version of shared singleton module " + key + "@" + (version && version.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";',
					"if(strict) throw new Error(msg);",
					'typeof console !== "undefined" && console.warn && console.warn(msg);'
				]
			)};`,
			`var findVersion = ${runtimeTemplate.basicFunction(
				"scope, key, requiredVersion, strict",
				[
					"requiredVersion = requiredVersion || [];",
					"var currentName = key;",
					`var versions = requiredVersion.map(${runtimeTemplate.returningFunction(
						'currentName += "`" + v',
						"v"
					)});`,
					"versions.unshift(key);",
					"var lastVersion;",
					"while(currentName = versions.shift()) {",
					Template.indent([
						`if(${RuntimeGlobals.hasOwnProperty}(scope, currentName) && !invalidVersion(lastVersion = scope[currentName].version || [], requiredVersion)) return scope[currentName];`
					]),
					"}",
					'var msg = "Unsatisfied version of shared module " + key + "@" + (lastVersion && lastVersion.join(".")) + " (required " + key + "@" + requiredVersion.join(".") + ")";',
					"if(strict) throw new Error(msg);",
					'typeof console !== "undefined" && console.warn && console.warn(msg);'
				]
			)};`,
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
					"return get(findVersion(scope, key, version) || scope[key]);"
				]
			)};`,
			`var loadSingletonVersionCheck = ${runtimeTemplate.basicFunction(
				"scopeName, key, version",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					"ensureExistence(scope, scopeName, key);",
					"checkSingletonVersion(key, scope[key].version, version);",
					"return get(scope[key]);"
				]
			)};`,
			`var loadStrictVersionCheck = ${runtimeTemplate.basicFunction(
				"scopeName, key, version",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					"ensureExistence(scope, scopeName, key);",
					"return get(findVersion(scope, key, version, 1));"
				]
			)};`,
			`var loadStrictSingletonVersionCheck = ${runtimeTemplate.basicFunction(
				"scopeName, key, version",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					"ensureExistence(scope, scopeName, key);",
					"checkSingletonVersion(key, scope[key].version, version, 1);",
					"return get(scope[key]);"
				]
			)};`,
			`var loadVersionCheckFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, version, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"return get(findVersion(scope, key, version) || scope[key]);"
				]
			)};`,
			`var loadSingletonVersionCheckFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, version, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"checkSingletonVersion(key, scope[key].version, version);",
					"return get(scope[key]);"
				]
			)};`,
			`var loadStrictVersionCheckFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, version, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					"var entry = scope && findVersion(scope, key, version);",
					`return entry ? get(entry) : fallback();`
				]
			)};`,
			`var loadStrictSingletonVersionCheckFallback = ${runtimeTemplate.basicFunction(
				"scopeName, key, version, fallback",
				[
					`${RuntimeGlobals.initializeSharing}(scopeName);`,
					`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"checkSingletonVersion(key, scope[key].version, version, 1);",
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
