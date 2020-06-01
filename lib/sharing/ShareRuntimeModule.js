/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class ShareRuntimeModule extends RuntimeModule {
	constructor() {
		super("sharing");
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
		/** @type {Map<string, Map<number, Set<string>>>} */
		const initCodePerScope = new Map();
		for (const chunk of this.chunk.getAllReferencedChunks()) {
			const modules = chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"share-init"
			);
			if (!modules) continue;
			for (const m of modules) {
				const codeGen = codeGenerationResults.get(m);
				if (!codeGen) continue;
				const data = codeGen.data && codeGen.data.get("share-init");
				if (!data) continue;
				for (const item of data) {
					const { shareScope, initStage, init } = item;
					let stages = initCodePerScope.get(shareScope);
					if (stages === undefined) {
						initCodePerScope.set(shareScope, (stages = new Map()));
					}
					let list = stages.get(initStage || 0);
					if (list === undefined) {
						stages.set(initStage || 0, (list = new Set()));
					}
					list.add(init);
				}
			}
		}
		return Template.asString([
			`${RuntimeGlobals.shareScopeMap} = {};`,
			"var initPromises = {};",
			`${RuntimeGlobals.initializeSharing} = ${runtimeTemplate.basicFunction(
				"name",
				[
					"// only runs once",
					"if(initPromises[name]) return initPromises[name];",
					"// handling circular init calls",
					"initPromises[name] = 1;",
					"// creates a new share scope if needed",
					`if(!${RuntimeGlobals.hasOwnProperty}(${RuntimeGlobals.shareScopeMap}, name)) ${RuntimeGlobals.shareScopeMap}[name] = {};`,
					"// runs all init snippets from all modules reachable",
					`var scope = ${RuntimeGlobals.shareScopeMap}[name];`,
					`var warn = ${runtimeTemplate.returningFunction(
						'typeof console !== "undefined" && console.warn && console.warn(msg);',
						"msg"
					)};`,
					`var register = ${runtimeTemplate.basicFunction(
						"name, version, factory, currentName",
						[
							"version = version || [];",
							"currentName = name;",
							`var versionConflict = ${runtimeTemplate.returningFunction(
								'warn("Version conflict for shared modules: " + name + " " + (v && v.join(".")) + " <=> " + (version && version.join(".")));'
							)};`,
							`var registerCurrent = ${runtimeTemplate.basicFunction("", [
								"if(scope[currentName]) {",
								Template.indent([
									"var v = scope[currentName].version || [];",
									"for(var i = 0; i < version.length && i < v.length; i++) {",
									Template.indent([
										"if(v[i] != version[i]) { // loose equal is intentional to match string and number",
										Template.indent([
											'if(typeof v[i] === "string" || typeof version[i] === "string") return versionConflict();',
											"if(v[i] > version[i]) return;",
											"if(v[i] < version[i]) { i = -1; break; }"
										]),
										"}"
									]),
									"}",
									"if(i >= 0 && version.length <= v.length) return;",
									'if(scope[currentName].loaded) return warn("Ignoring providing of already used shared module: " + name);'
								]),
								"}",
								"scope[currentName] = { get: factory, version: version };"
							])};`,
							"registerCurrent();",
							`version.forEach(${runtimeTemplate.basicFunction("part", [
								'currentName += "`" + part;',
								"registerCurrent();"
							])});`
						]
					)};`,
					`var initExternal = ${runtimeTemplate.basicFunction("id", [
						`var handleError = ${runtimeTemplate.returningFunction(
							'warn("Initialization of sharing external failed: " + err)',
							"err"
						)};`,
						"try {",
						Template.indent([
							"var module = __webpack_require__(id);",
							"if(!module) return;",
							`var initFn = ${runtimeTemplate.returningFunction(
								`module && module.init && module.init(${RuntimeGlobals.shareScopeMap}[name])`,
								"module"
							)}`,
							"if(module.then) return promises.push(module.then(initFn, handleError));",
							"var initResult = initFn(module);",
							"if(initResult && initResult.then) return promises.push(initResult.catch(handleError));"
						]),
						"} catch(err) { handleError(err); }"
					])}`,
					"var promises = [];",
					"switch(name) {",
					...Array.from(initCodePerScope, ([name, stages]) =>
						Template.indent([
							`case ${JSON.stringify(name)}: {`,
							Template.indent(
								Array.from(stages)
									.sort(([a], [b]) => a - b)
									.map(([, initCode]) =>
										Template.asString(Array.from(initCode))
									)
							),
							"}",
							"break;"
						])
					),
					"}",
					`return promises.length && (initPromises[name] = Promise.all(promises).then(${runtimeTemplate.returningFunction(
						"initPromises[name] = 1"
					)}));`
				]
			)};`
		]);
	}
}

module.exports = ShareRuntimeModule;
