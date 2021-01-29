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

		if (promises.length > 0)
			runtimeRequirements.add(RuntimeGlobals.asyncModule);

		const source = new RawSource(
			promises.length > 0
				? Template.asString([
						`var __webpack_instantiate__ = ${runtimeTemplate.basicFunction(
							`[${promises.join(", ")}]`,
							`${importsCompatCode}return ${instantiateCall};`
						)}`,
						`${RuntimeGlobals.asyncModule}(${
							module.moduleArgument
						}, ${runtimeTemplate.basicFunction(
							"__webpack_handle_async_dependencies__",
							[
								importsCode,
								`var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([${promises.join(
									", "
								)}]);`,
								"return __webpack_async_dependencies__.then ? __webpack_async_dependencies__.then(__webpack_instantiate__) : __webpack_instantiate__(__webpack_async_dependencies__);"
							]
						)}, 1);`
				  ])
				: `${importsCode}${importsCompatCode}module.exports = ${instantiateCall};`
		);

		return InitFragment.addToSource(source, initFragments, generateContext);
	}
}

module.exports = AsyncWebAssemblyJavascriptGenerator;
