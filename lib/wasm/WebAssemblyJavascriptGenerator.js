/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const WebAssemblyExportImportedDependency = require("../dependencies/WebAssemblyExportImportedDependency");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

class WebAssemblyJavascriptGenerator extends Generator {
	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(
		module,
		{ runtimeTemplate, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		const usedExports = moduleGraph.getUsedExports(module);
		const initIdentifer =
			usedExports && usedExports !== true
				? Template.numberToIdentifer(usedExports.size)
				: "__webpack_init__";

		let needExportsCopy = false;
		const importedModules = new Map();
		const initParams = [];
		let index = 0;
		for (const dep of module.dependencies) {
			const depAsAny = /** @type {TODO} */ (dep);
			if (moduleGraph.getModule(dep)) {
				let importData = importedModules.get(moduleGraph.getModule(dep));
				if (importData === undefined) {
					importedModules.set(
						moduleGraph.getModule(dep),
						(importData = {
							importVar: `m${index}`,
							index,
							request:
								"userRequest" in depAsAny ? depAsAny.userRequest : undefined,
							names: new Set(),
							reexports: []
						})
					);
					index++;
				}
				if (dep instanceof WebAssemblyImportDependency) {
					importData.names.add(dep.name);
					if (dep.description.type === "GlobalType") {
						const exportName = dep.name;
						const usedName =
							moduleGraph.getModule(dep) &&
							moduleGraph.getModule(dep).getUsedName(moduleGraph, exportName);

						if (moduleGraph.getModule(dep)) {
							if (usedName) {
								initParams.push(
									runtimeTemplate.exportFromImport({
										moduleGraph,
										module: moduleGraph.getModule(dep),
										request: dep.request,
										importVar: importData.importVar,
										originModule: module,
										exportName: dep.name,
										asiSafe: true,
										isCall: false,
										callContext: null,
										runtimeRequirements
									})
								);
							}
						}
					}
				}
				if (dep instanceof WebAssemblyExportImportedDependency) {
					importData.names.add(dep.name);
					const usedName = module.getUsedName(moduleGraph, dep.exportName);
					if (usedName) {
						runtimeRequirements.add(RuntimeGlobals.exports);
						const exportProp = `${module.exportsArgument}[${JSON.stringify(
							usedName
						)}]`;
						const defineStatement = Template.asString([
							`${exportProp} = ${runtimeTemplate.exportFromImport({
								moduleGraph,
								module: moduleGraph.getModule(dep),
								request: dep.request,
								importVar: importData.importVar,
								originModule: module,
								exportName: dep.name,
								asiSafe: true,
								isCall: false,
								callContext: null,
								runtimeRequirements
							})};`,
							`if(WebAssembly.Global) ${exportProp} = ` +
								`new WebAssembly.Global({ value: ${JSON.stringify(
									dep.valueType
								)} }, ${exportProp});`
						]);
						importData.reexports.push(defineStatement);
						needExportsCopy = true;
					}
				}
			}
		}
		const importsCode = Template.asString(
			Array.from(
				importedModules,
				([module, { importVar, request, reexports }]) => {
					const importStatement = runtimeTemplate.importStatement({
						module,
						chunkGraph,
						request,
						importVar,
						originModule: module,
						runtimeRequirements
					});
					return importStatement + reexports.join("\n");
				}
			)
		);

		const copyAllExports =
			usedExports && usedExports !== true && !needExportsCopy;

		// need these globals
		runtimeRequirements.add(RuntimeGlobals.module);
		runtimeRequirements.add(RuntimeGlobals.wasmInstances);
		if (usedExports === true) {
			runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
			runtimeRequirements.add(RuntimeGlobals.exports);
		}
		if (!copyAllExports) {
			runtimeRequirements.add(RuntimeGlobals.exports);
		}

		// create source
		const source = new RawSource(
			[
				'"use strict";',
				"// Instantiate WebAssembly module",
				`var wasmExports = ${RuntimeGlobals.wasmInstances}[${
					module.moduleArgument
				}.i];`,

				usedExports === true
					? `${RuntimeGlobals.makeNamespaceObject}(${module.exportsArgument});`
					: "",

				// this must be before import for circular dependencies
				"// export exports from WebAssembly module",
				copyAllExports
					? `${module.moduleArgument}.exports = wasmExports;`
					: "for(var name in wasmExports) " +
					  `if(name != ${JSON.stringify(initIdentifer)}) ` +
					  `${module.exportsArgument}[name] = wasmExports[name];`,
				"// exec imports from WebAssembly module (for esm order)",
				importsCode,
				"",
				"// exec wasm module",
				`wasmExports[${JSON.stringify(initIdentifer)}](${initParams.join(
					", "
				)})`
			].join("\n")
		);
		return source;
	}
}

module.exports = WebAssemblyJavascriptGenerator;
