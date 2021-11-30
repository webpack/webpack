/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const {
	parseVersionRuntimeCode,
	versionLtRuntimeCode,
	rangeToStringRuntimeCode,
	satisfyRuntimeCode
} = require("../util/semver");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module")} Module */
/** @typedef {import("./ConsumeSharedModule")} ConsumeSharedModule */

class ConsumeSharedRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements) {
		super("consumes", RuntimeModule.STAGE_ATTACH);
		this._runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation, chunkGraph } = this;
		const { runtimeTemplate, codeGenerationResults } = compilation;
		const chunkToModuleMapping = {};
		/** @type {Map<string | number, Source>} */
		const moduleIdToSourceMapping = new Map();
		const initialConsumes = [];
		/**
		 *
		 * @param {Iterable<Module>} modules modules
		 * @param {Chunk} chunk the chunk
		 * @param {(string | number)[]} list list of ids
		 */
		const addModules = (modules, chunk, list) => {
			for (const m of modules) {
				const module = /** @type {ConsumeSharedModule} */ (m);
				const id = chunkGraph.getModuleId(module);
				list.push(id);
				moduleIdToSourceMapping.set(
					id,
					codeGenerationResults.getSource(
						module,
						chunk.runtime,
						"consume-shared"
					)
				);
			}
		};
		for (const chunk of this.chunk.getAllAsyncChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"consume-shared"
			);
			if (!modules) continue;
			addModules(modules, chunk, (chunkToModuleMapping[chunk.id] = []));
		}
		for (const chunk of this.chunk.getAllInitialChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"consume-shared"
			);
			if (!modules) continue;
			addModules(modules, chunk, initialConsumes);
		}
		if (moduleIdToSourceMapping.size === 0) return null;
		return Template.asString([
			parseVersionRuntimeCode(runtimeTemplate),
			versionLtRuntimeCode(runtimeTemplate),
			rangeToStringRuntimeCode(runtimeTemplate),
			satisfyRuntimeCode(runtimeTemplate),
			`var ensureExistence = ${runtimeTemplate.basicFunction("scopeName, key", [
				`var scope = ${RuntimeGlobals.shareScopeMap}[scopeName];`,
				`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) throw new Error("Shared module " + key + " doesn't exist in shared scope " + scopeName);`,
				"return scope;"
			])};`,
			`var findVersion = ${runtimeTemplate.basicFunction("scope, key", [
				"var versions = scope[key];",
				`var key = Object.keys(versions).reduce(${runtimeTemplate.basicFunction(
					"a, b",
					["return !a || versionLt(a, b) ? b : a;"]
				)}, 0);`,
				"return key && versions[key]"
			])};`,
			`var findSingletonVersionKey = ${runtimeTemplate.basicFunction(
				"scope, key",
				[
					"var versions = scope[key];",
					`return Object.keys(versions).reduce(${runtimeTemplate.basicFunction(
						"a, b",
						["return !a || (!versions[a].loaded && versionLt(a, b)) ? b : a;"]
					)}, 0);`
				]
			)};`,
			`var getInvalidSingletonVersionMessage = ${runtimeTemplate.basicFunction(
				"scope, key, version, requiredVersion",
				[
					`return "Unsatisfied version " + version + " from " + (version && scope[key][version].from) + " of shared singleton module " + key + " (required " + rangeToString(requiredVersion) + ")"`
				]
			)};`,
			`var getSingletonVersion = ${runtimeTemplate.basicFunction(
				"scope, scopeName, key, requiredVersion",
				[
					"var version = findSingletonVersionKey(scope, key);",
					"if (!satisfy(requiredVersion, version)) " +
						'typeof console !== "undefined" && console.warn && console.warn(getInvalidSingletonVersionMessage(scope, key, version, requiredVersion));',
					"return get(scope[key][version]);"
				]
			)};`,
			`var getStrictSingletonVersion = ${runtimeTemplate.basicFunction(
				"scope, scopeName, key, requiredVersion",
				[
					"var version = findSingletonVersionKey(scope, key);",
					"if (!satisfy(requiredVersion, version)) " +
						"throw new Error(getInvalidSingletonVersionMessage(scope, key, version, requiredVersion));",
					"return get(scope[key][version]);"
				]
			)};`,
			`var findValidVersion = ${runtimeTemplate.basicFunction(
				"scope, key, requiredVersion",
				[
					"var versions = scope[key];",
					`var key = Object.keys(versions).reduce(${runtimeTemplate.basicFunction(
						"a, b",
						[
							"if (!satisfy(requiredVersion, b)) return a;",
							"return !a || versionLt(a, b) ? b : a;"
						]
					)}, 0);`,
					"return key && versions[key]"
				]
			)};`,
			`var getInvalidVersionMessage = ${runtimeTemplate.basicFunction(
				"scope, scopeName, key, requiredVersion",
				[
					"var versions = scope[key];",
					'return "No satisfying version (" + rangeToString(requiredVersion) + ") of shared module " + key + " found in shared scope " + scopeName + ".\\n" +',
					`\t"Available versions: " + Object.keys(versions).map(${runtimeTemplate.basicFunction(
						"key",
						['return key + " from " + versions[key].from;']
					)}).join(", ");`
				]
			)};`,
			`var getValidVersion = ${runtimeTemplate.basicFunction(
				"scope, scopeName, key, requiredVersion",
				[
					"var entry = findValidVersion(scope, key, requiredVersion);",
					"if(entry) return get(entry);",
					"throw new Error(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));"
				]
			)};`,
			`var warnInvalidVersion = ${runtimeTemplate.basicFunction(
				"scope, scopeName, key, requiredVersion",
				[
					'typeof console !== "undefined" && console.warn && console.warn(getInvalidVersionMessage(scope, scopeName, key, requiredVersion));'
				]
			)};`,
			`var get = ${runtimeTemplate.basicFunction("entry", [
				"entry.loaded = 1;",
				"return entry.get()"
			])};`,
			`var init = ${runtimeTemplate.returningFunction(
				Template.asString([
					"function(scopeName, a, b, c) {",
					Template.indent([
						`var promise = ${RuntimeGlobals.initializeSharing}(scopeName);`,
						`if (promise && promise.then) return promise.then(fn.bind(fn, scopeName, ${RuntimeGlobals.shareScopeMap}[scopeName], a, b, c));`,
						`return fn(scopeName, ${RuntimeGlobals.shareScopeMap}[scopeName], a, b, c);`
					]),
					"}"
				]),
				"fn"
			)};`,
			"",
			`var load = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key",
				[
					"ensureExistence(scopeName, key);",
					"return get(findVersion(scope, key));"
				]
			)});`,
			`var loadFallback = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, fallback",
				[
					`return scope && ${RuntimeGlobals.hasOwnProperty}(scope, key) ? get(findVersion(scope, key)) : fallback();`
				]
			)});`,
			`var loadVersionCheck = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version",
				[
					"ensureExistence(scopeName, key);",
					"return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));"
				]
			)});`,
			`var loadSingletonVersionCheck = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version",
				[
					"ensureExistence(scopeName, key);",
					"return getSingletonVersion(scope, scopeName, key, version);"
				]
			)});`,
			`var loadStrictVersionCheck = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version",
				[
					"ensureExistence(scopeName, key);",
					"return getValidVersion(scope, scopeName, key, version);"
				]
			)});`,
			`var loadStrictSingletonVersionCheck = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version",
				[
					"ensureExistence(scopeName, key);",
					"return getStrictSingletonVersion(scope, scopeName, key, version);"
				]
			)});`,
			`var loadVersionCheckFallback = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version, fallback",
				[
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"return get(findValidVersion(scope, key, version) || warnInvalidVersion(scope, scopeName, key, version) || findVersion(scope, key));"
				]
			)});`,
			`var loadSingletonVersionCheckFallback = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version, fallback",
				[
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"return getSingletonVersion(scope, scopeName, key, version);"
				]
			)});`,
			`var loadStrictVersionCheckFallback = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version, fallback",
				[
					`var entry = scope && ${RuntimeGlobals.hasOwnProperty}(scope, key) && findValidVersion(scope, key, version);`,
					`return entry ? get(entry) : fallback();`
				]
			)});`,
			`var loadStrictSingletonVersionCheckFallback = /*#__PURE__*/ init(${runtimeTemplate.basicFunction(
				"scopeName, scope, key, version, fallback",
				[
					`if(!scope || !${RuntimeGlobals.hasOwnProperty}(scope, key)) return fallback();`,
					"return getStrictSingletonVersion(scope, scopeName, key, version);"
				]
			)});`,
			"var installedModules = {};",
			"var moduleToHandlerMapping = {",
			Template.indent(
				Array.from(
					moduleIdToSourceMapping,
					([key, source]) => `${JSON.stringify(key)}: ${source.source()}`
				).join(",\n")
			),
			"};",

			initialConsumes.length > 0
				? Template.asString([
						`var initialConsumes = ${JSON.stringify(initialConsumes)};`,
						`initialConsumes.forEach(${runtimeTemplate.basicFunction("id", [
							`${
								RuntimeGlobals.moduleFactories
							}[id] = ${runtimeTemplate.basicFunction("module", [
								"// Handle case when module is used sync",
								"installedModules[id] = 0;",
								`delete ${RuntimeGlobals.moduleCache}[id];`,
								"var factory = moduleToHandlerMapping[id]();",
								'if(typeof factory !== "function") throw new Error("Shared module is not available for eager consumption: " + id);',
								`module.exports = factory();`
							])}`
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
												`${
													RuntimeGlobals.moduleFactories
												}[id] = ${runtimeTemplate.basicFunction("module", [
													`delete ${RuntimeGlobals.moduleCache}[id];`,
													"module.exports = factory();"
												])}`
											]
										)};`,
										`var onError = ${runtimeTemplate.basicFunction("error", [
											"delete installedModules[id];",
											`${
												RuntimeGlobals.moduleFactories
											}[id] = ${runtimeTemplate.basicFunction("module", [
												`delete ${RuntimeGlobals.moduleCache}[id];`,
												"throw error;"
											])}`
										])};`,
										"try {",
										Template.indent([
											"var promise = moduleToHandlerMapping[id]();",
											"if(promise.then) {",
											Template.indent(
												"promises.push(installedModules[id] = promise.then(onFactory)['catch'](onError));"
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
