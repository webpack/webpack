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
					const { shareScope, init } = item;
					let list = initCodePerScope.get(shareScope);
					if (list === undefined) {
						initCodePerScope.set(shareScope, (list = []));
					}
					list.push(init);
				}
			}
		}
		return Template.asString([
			`${RuntimeGlobals.shareScopeMap} = {};`,
			"var initPromises = {};",
			`${
				RuntimeGlobals.initializeSharing
			} = ${runtimeTemplate.basicFunction("name", [
				"// only runs once",
				"if(initPromises[name]) return initPromises[name];",
				"// creates a new share scope if needed",
				`if(!${RuntimeGlobals.hasOwnProperty}(${RuntimeGlobals.shareScopeMap}, name)) ${RuntimeGlobals.shareScopeMap}[name] = {};`,
				"// runs all init snippets from all modules reachable",
				`var scope = ${RuntimeGlobals.shareScopeMap}[name];`,
				`var register = ${runtimeTemplate.basicFunction(
					"name, version, factory",
					[
						`var versionConflict = ${runtimeTemplate.basicFunction("", [
							'console && console.warn && console.warn("Version conflict for shared modules: " + name + " " + (v && v.join(".")) + " <=> " + (version && version.join(".")));'
						])};`,
						"if(scope[name]) {",
						Template.indent([
							'if(scope[name].l) return console && console.warn && console.warn("Ignoring providing of already used shared module: " + name);',
							"var v = scope[name].v;",
							"if(v && version) {",
							Template.indent([
								"for(var i = 0; i < version.length; i++) {",
								Template.indent([
									"if(i === v.length) break;",
									"if(v[i] != version[i]) { // loose equal is intentional to match string and number",
									Template.indent([
										'if(typeof v[i] === "string" || typeof version[i] === "string") return versionConflict();',
										"if(v[i] > version[i]) return;",
										"if(v[i] < version[i]) { i = v.length; break; }"
									]),
									"}"
								]),
								"}",
								"if(i < v.length) return;"
							]),
							"} else if(v !== version) return versionConflict()"
						]),
						"}",
						"scope[name] = { g: factory, v: version };"
					]
				)};`,
				"var promises = [];",
				"switch(name) {",
				...Array.from(initCodePerScope, ([name, initCode]) =>
					Template.indent([
						`case ${JSON.stringify(name)}: {`,
						Template.indent(initCode),
						"}",
						"break;"
					])
				),
				"}",
				"return initPromises[name] = Promise.all(promises);"
			])};`
		]);
	}
}

module.exports = ShareRuntimeModule;
