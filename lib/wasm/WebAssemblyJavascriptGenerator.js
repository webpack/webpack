/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Generator = require("../Generator");
const Template = require("../Template");
const { RawSource } = require("webpack-sources");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

function generateInitParams(module) {
	const list = [];

	for (const dep of module.dependencies) {
		if (dep instanceof WebAssemblyImportDependency) {
			if (dep.description.type === "GlobalType") {
				const exportName = dep.name;
				const usedName = dep.module && dep.module.isUsed(exportName);

				if (dep.module === null) {
					// Dependency was not found, an error will be thrown later
					continue;
				}

				if (usedName !== false) {
					list.push(
						`__webpack_require__(${JSON.stringify(
							dep.module.id
						)})[${JSON.stringify(usedName)}]`
					);
				}
			}
		}
	}

	return list;
}

class WebAssemblyJavascriptGenerator extends Generator {
	generate(module, dependencyTemplates, runtimeTemplate) {
		const generateExports = () => {
			if (
				Array.isArray(module.buildMeta.providedExports) &&
				Array.isArray(module.usedExports)
			) {
				// generate mangled exports
				return Template.asString(
					module.buildMeta.providedExports.map(exp => {
						const usedName = module.isUsed(exp);
						if (usedName) {
							return `${module.exportsArgument}[${JSON.stringify(
								usedName
							)}] = instance.exports[${JSON.stringify(exp)}];`;
						} else {
							return `// unused ${JSON.stringify(exp)} export`;
						}
					})
				);
			} else {
				// generate simple export
				return `${module.moduleArgument}.exports = instance.exports;`;
			}
		};

		const generateImports = () => {
			const modules = new Map();
			for (const dep of module.dependencies) {
				if (dep.module) modules.set(dep.module, dep.userRequest);
			}
			return Template.asString(
				Array.from(modules, ([m, r]) => {
					return `${runtimeTemplate.moduleRaw({
						module: m,
						request: r
					})};`;
				})
			);
		};

		// FIXME(sven): assert that the exports exists in the modules
		// otherwise it will default to i32 0
		const initParams = generateInitParams(module).join(",");

		// create source
		const source = new RawSource(
			[
				'"use strict";',
				"// Instantiate WebAssembly module",
				"var instance = __webpack_require__.w[module.i];",

				// this must be before import for circular dependencies
				"// export exports from WebAssembly module",
				generateExports(),

				"// exec imports from WebAssembly module (for esm order)",
				generateImports(),

				"// exec wasm module",
				`instance.exports.__webpack_init__(${initParams})`
			].join("\n")
		);
		return source;
	}
}

module.exports = WebAssemblyJavascriptGenerator;
