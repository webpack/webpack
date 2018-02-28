/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RawSource = require("webpack-sources").RawSource;
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

class WasmModuleTemplatePlugin {
	apply(moduleTemplate) {
		moduleTemplate.hooks.content.tap(
			"WasmModuleTemplatePlugin",
			(moduleSource, module, { chunk }) => {
				if (module.type && module.type.startsWith("webassembly")) {
					if (chunk.canBeInitial())
						throw new Error(
							"Sync WebAssembly compilation is not yet implemented"
						);
					const generateExports = () => {
						if (
							Array.isArray(module.buildMeta.providedExports) &&
							Array.isArray(module.usedExports)
						) {
							// generate mangled exports
							return module.buildMeta.providedExports
								.map(exp => {
									const usedName = module.isUsed(exp);
									if (usedName) {
										return `${module.exportsArgument}[${JSON.stringify(
											usedName
										)}] = instance.exports[${JSON.stringify(exp)}];`;
									} else {
										return `// unused ${JSON.stringify(exp)} export`;
									}
								})
								.join("\n");
						} else {
							// generate simple export
							return `${module.moduleArgument}.exports = instance.exports;`;
						}
					};
					const generateImports = () => {
						const depsByRequest = new Map();
						for (const dep of module.dependencies) {
							if (dep instanceof WebAssemblyImportDependency) {
								const request = dep.request;
								let array = depsByRequest.get(request);
								if (!array) {
									depsByRequest.set(request, (array = []));
								}
								const exportName = dep.name;
								const usedName = dep.module && dep.module.isUsed(exportName);
								array.push({
									exportName,
									usedName,
									module: dep.module
								});
							}
						}
						const importsCode = [];
						for (const pair of depsByRequest) {
							const properties = [];
							for (const data of pair[1]) {
								properties.push(
									`\n\t\t${JSON.stringify(
										data.exportName
									)}: __webpack_require__(${JSON.stringify(
										data.module.id
									)})[${JSON.stringify(data.usedName)}]`
								);
							}
							importsCode.push(
								`\n\t${JSON.stringify(pair[0])}: {${properties.join(",")}\n\t}`
							);
						}
						return importsCode.join(",");
					};
					const source = new RawSource(
						[
							'"use strict";',
							"",
							"// Instantiate WebAssembly module",
							"var instance = new WebAssembly.Instance(__webpack_require__.w[module.i], {" +
								generateImports(),
							"});",
							"",
							"// export exports from WebAssembly module",
							// TODO rewrite this to getters depending on exports to support circular dependencies
							generateExports()
						].join("\n")
					);
					return source;
				} else {
					return moduleSource;
				}
			}
		);

		moduleTemplate.hooks.hash.tap("WasmModuleTemplatePlugin", hash => {
			hash.update("WasmModuleTemplatePlugin");
			hash.update("1");
		});
	}
}
module.exports = WasmModuleTemplatePlugin;
