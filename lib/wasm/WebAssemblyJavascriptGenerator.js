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
		const initIdentifer = Array.isArray(module.usedExports)
			? Template.numberToIdentifer(module.usedExports.length)
			: "__webpack_init__";

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
				"var wasmExports = __webpack_require__.w[module.i];",

				// this must be before import for circular dependencies
				"// export exports from WebAssembly module",
				Array.isArray(module.usedExports)
					? `${module.moduleArgument}.exports = wasmExports;`
					: "for(var name in wasmExports) " +
					  `if(name != ${JSON.stringify(initIdentifer)}) ` +
					  `${module.exportsArgument}[name] = wasmExports[name];`,
				"// exec imports from WebAssembly module (for esm order)",
				generateImports(),

				"// exec wasm module",
				`wasmExports[${JSON.stringify(initIdentifer)}](${initParams})`
			].join("\n")
		);
		return source;
	}
}

module.exports = WebAssemblyJavascriptGenerator;
