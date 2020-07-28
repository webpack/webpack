/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const InitFragment = require("../InitFragment");
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
	 * @param {NormalModule} module fresh module
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes(module) {
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
	generate(module, generateContext) {
		const {
			runtimeTemplate,
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtime
		} = generateContext;
		runtimeRequirements.add(RuntimeGlobals.module);
		runtimeRequirements.add(RuntimeGlobals.moduleId);
		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.instantiateWasm);
		/** @type {InitFragment[]} */
		const initFragments = [];
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
				if (moduleGraph.isAsync(importedModule)) {
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
		const importsCode = importStatements.map(([x]) => x).join("");
		const importsCompatCode = importStatements.map(([_, x]) => x).join("");

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
						defaultInterop: true,
						importVar,
						initFragments,
						runtime,
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

		const instantiateCall =
			`${RuntimeGlobals.instantiateWasm}(${module.exportsArgument}, ${
				module.moduleArgument
			}.id, ${JSON.stringify(
				chunkGraph.getRenderedModuleHash(module, runtime)
			)}` + (importsObj ? `, ${importsObj})` : `)`);

		const source = new RawSource(
			`${importsCode}${
				promises.length > 1
					? Template.asString([
							`${module.moduleArgument}.exports = Promise.all([${promises.join(
								", "
							)}]).then(${runtimeTemplate.basicFunction(
								`[${promises.join(", ")}]`,
								`${importsCompatCode}return ${instantiateCall};`
							)})`
					  ])
					: promises.length === 1
					? Template.asString([
							`${module.moduleArgument}.exports = Promise.resolve(${
								promises[0]
							}).then(${runtimeTemplate.basicFunction(
								promises[0],

								`${importsCompatCode}return ${instantiateCall};`
							)})`
					  ])
					: `${importsCompatCode}${module.moduleArgument}.exports = ${instantiateCall}`
			}`
		);
		return InitFragment.addToSource(source, initFragments, generateContext);
	}
}

module.exports = AsyncWebAssemblyJavascriptGenerator;
