/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

const TYPES = new Set(["webassembly"]);

class AsyncWebAssemblyJavascriptGenerator extends Generator {
	constructor(filenameTemplate) {
		super();
		this.filenameTemplate = filenameTemplate;
	}
	/**
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes() {
		return TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		return 40 + module.dependencies.length * 10;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(
		module,
		{ runtimeTemplate, chunkGraph, moduleGraph, runtimeRequirements }
	) {
		runtimeRequirements.add(RuntimeGlobals.module);
		runtimeRequirements.add(RuntimeGlobals.instantiateWasm);
		/** @type {Map<Module, { request: string, importVar: string }>} */
		const depModules = new Map();
		/** @type {Map<string, WebAssemblyImportDependency[]>} */
		const wasmDepsByRequest = new Map();
		for (const dep of module.dependencies) {
			if (dep instanceof WebAssemblyImportDependency) {
				const module = moduleGraph.getModule(dep);
				if (!depModules.has(module)) {
					depModules.set(module, {
						request: dep.request,
						importVar: `WEBPACK_IMPORTED_MODULE_${depModules.size}`
					});
				}
				let list = wasmDepsByRequest.get(dep.request);
				if (list === undefined) {
					list = [];
					wasmDepsByRequest.set(dep.request, list);
				}
				list.push(dep);
			}
		}

		const promises = [];

		const importStatements = Array.from(
			depModules,
			([importedModule, { request, importVar }]) => {
				if (
					importedModule.buildMeta &&
					importedModule.buildMeta.exportsType === "async"
				) {
					promises.push(importVar);
				}
				return runtimeTemplate.importStatement({
					update: false,
					module: importedModule,
					chunkGraph,
					request,
					originModule: module,
					importVar,
					runtimeRequirements
				});
			}
		);

		const importObjRequestItems = Array.from(
			wasmDepsByRequest,
			([request, deps]) => {
				const exportItems = deps.map(dep => {
					const importedModule = moduleGraph.getModule(dep);
					const importVar = depModules.get(importedModule).importVar;
					return `${JSON.stringify(
						dep.name
					)}: ${runtimeTemplate.exportFromImport({
						moduleGraph,
						module: importedModule,
						request,
						exportName: dep.name,
						originModule: module,
						asiSafe: true,
						isCall: false,
						callContext: false,
						importVar,
						runtimeRequirements
					})}`;
				});
				return Template.asString([
					`${JSON.stringify(request)}: {`,
					Template.indent(exportItems.join(",\n")),
					"}"
				]);
			}
		);

		const importsObj =
			importObjRequestItems.length > 0
				? Template.asString([
						"{",
						Template.indent(importObjRequestItems.join(",\n")),
						"}"
				  ])
				: undefined;

		const instantiateCall = importsObj
			? `${RuntimeGlobals.instantiateWasm}(${
					module.moduleArgument
			  }.i, ${importsObj})`
			: `${RuntimeGlobals.instantiateWasm}(${module.moduleArgument}.i)`;

		return new RawSource(
			Template.asString([
				...importStatements,
				promises.length > 0
					? `${module.moduleArgument}.exports = Promise.all([${promises.join(
							", "
					  )}]).then(function([${promises.join(
							", "
					  )}]) { return ${instantiateCall}; })`
					: `${module.moduleArgument}.exports = ${instantiateCall}`
			])
		);
	}
}

module.exports = AsyncWebAssemblyJavascriptGenerator;
