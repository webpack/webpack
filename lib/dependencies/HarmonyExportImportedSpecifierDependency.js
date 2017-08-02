/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");
const Template = require("../Template");

class HarmonyExportImportedSpecifierDependency extends HarmonyImportDependency {
	constructor(request, originModule, sourceOrder, parserScope, id, name) {
		super(request, originModule, sourceOrder, parserScope);
		this.id = id;
		this.name = name;
	}

	get type() {
		return "harmony export imported specifier";
	}

	getMode() {
		const name = this.name;
		const id = this.id;
		const used = this.originModule.isUsed(name);
		const active = HarmonyModulesHelpers.isActive(this.originModule, this);
		const importedModule = this.module;

		if(!importedModule) {
			return {
				type: "missing",
				userRequest: this.userRequest
			};
		}

		if(!active) {
			return {
				type: "inactive",
				name: name || "*"
			};
		}

		if(!used || !this.originModule.usedExports) {
			return {
				type: "unused",
				name: name || "*"
			};
		}

		const isNotAHarmonyModule = importedModule.meta && !importedModule.meta.harmonyModule;
		if(name && id === "default" && isNotAHarmonyModule) {
			return {
				type: "reexport-non-harmony-default",
				module: importedModule,
				name
			};
		}

		if(name) {
			// export { name as name }
			if(id) {
				return {
					type: "safe-reexport",
					module: importedModule,
					map: new Map([
						[id, name]
					])
				};
			}

			// export { * as name }
			return {
				type: "reexport-namespace-object",
				module: importedModule,
				name
			};
		}

		// export *
		if(Array.isArray(this.originModule.usedExports)) {
			// reexport * with known used exports
			var activeExports = HarmonyModulesHelpers.getActiveExports(this.originModule, this);
			if(Array.isArray(importedModule.providedExports)) {
				const map = new Map(this.originModule.usedExports.filter((id) => {
					const notInActiveExports = activeExports.indexOf(id) < 0;
					const notDefault = id !== "default";
					const inProvidedExports = importedModule.providedExports.indexOf(id) >= 0;
					return notInActiveExports && notDefault && inProvidedExports;
				}).map(item => [item, item]));

				if(map.size === 0) {
					return {
						type: "empty-star"
					};
				}

				return {
					type: "safe-reexport",
					module: importedModule,
					map
				};
			}

			const map = new Map(this.originModule.usedExports.filter(id => {
				const notInActiveExports = activeExports.indexOf(id) < 0;
				const notDefault = id !== "default";
				return notInActiveExports && notDefault;
			}).map(item => [item, item]));

			if(map.size === 0) {
				return {
					type: "empty-star"
				};
			}

			return {
				type: "checked-reexport",
				module: importedModule,
				map
			};
		}

		if(Array.isArray(importedModule.providedExports)) {
			const map = new Map(importedModule.providedExports
				.filter(id => id !== "default")
				.map(item => [item, item])
			);

			if(map.size === 0) {
				return {
					type: "empty-star"
				};
			}

			return {
				type: "safe-reexport",
				module: importedModule,
				map
			};
		}

		return {
			type: "dynamic-reexport",
			module: importedModule
		};
	}

	getReference() {
		const mode = this.getMode();

		switch(mode.type) {
			case "missing":
			case "unused":
			case "inactive":
			case "empty-star":
				return null;

			case "reexport-non-harmony-default":
				return {
					module: mode.module,
					importedNames: ["default"]
				};

			case "reexport-namespace-object":
				return {
					module: mode.module,
					importedNames: true
				};

			case "safe-reexport":
			case "checked-reexport":
				return {
					module: mode.module,
					importedNames: Array.from(mode.map.keys())
				};

			case "dynamic-reexport":
				return {
					module: mode.module,
					importedNames: true
				};

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	getExports() {
		if(this.name) {
			return {
				exports: [this.name]
			};
		}

		const importedModule = this.module;

		if(!importedModule) {
			// no imported module available
			return {
				exports: null
			};
		}

		if(Array.isArray(importedModule.providedExports)) {
			return {
				exports: importedModule.providedExports.filter(id => id !== "default"),
				dependencies: [importedModule]
			};
		}

		if(importedModule.providedExports) {
			return {
				exports: true
			};
		}

		return {
			exports: null,
			dependencies: [importedModule]
		};
	}

	describeHarmonyExport() {
		const importedModule = this.module;
		if(!this.name && importedModule && Array.isArray(importedModule.providedExports)) {
			// for a star export and when we know which exports are provided, we can tell so
			return {
				exportedName: importedModule.providedExports,
				precedence: 3
			};
		}

		return {
			exportedName: this.name,
			precedence: this.name ? 2 : 3
		};
	}

	updateHash(hash) {
		super.updateHash(hash);
		const hashValue = this.getHashValue(this.module);
		hash.update(hashValue);
	}

	getHashValue(importedModule) {
		if(!importedModule) {
			return "";
		}

		const stringifiedUsedExport = JSON.stringify(importedModule.usedExports);
		const stringifiedProvidedExport = JSON.stringify(importedModule.providedExports);
		return importedModule.used + stringifiedUsedExport + stringifiedProvidedExport;
	}
}

module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	harmonyInit(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		super.harmonyInit(dep, source, outputOptions, requestShortener, dependencyTemplates);
		const importVar = dep.getImportVar(requestShortener);
		const content = this.getContent(dep, importVar);
		source.insert(-1, content);
	}

	getContent(dep, name) {
		const mode = dep.getMode();
		const module = dep.originModule;
		const importedModule = dep.module;
		const importVar = dep.getImportVar();

		switch(mode.type) {
			case "missing":
				return `throw new Error(${JSON.stringify(`Cannot find module '${mode.userRequest}'`)});\n`;

			case "unused":
				return `${Template.toNormalComment(`unused harmony reexport ${mode.name}`)}\n`;

			case "inactive":
				return `${Template.toNormalComment(`inactive harmony reexport ${mode.name}`)}\n`;

			case "reexport-non-harmony-default":
				return "/* harmony reexport (default from non-hamory) */ " + this.getReexportStatement(module, module.isUsed(mode.name), importVar, null);

			case "reexport-namespace-object":
				return "/* harmony reexport (module object) */ " + this.getReexportStatement(module, module.isUsed(mode.name), importVar, "");

			case "empty-star":
				return "/* empty/unused harmony star reexport */";

			case "safe-reexport":
				return Array.from(mode.map.entries()).map(item => {
					return "/* harmony reexport (safe) */ " + this.getReexportStatement(module, module.isUsed(item[1]), importVar, importedModule.isUsed(item[0])) + "\n";
				}).join("");

			case "checked-reexport":
				return Array.from(mode.map.entries()).map(item => {
					return "/* harmony reexport (checked) */ " + this.getConditionalReexportStatement(module, item[1], importVar, item[0]) + "\n";
				}).join("");

			case "dynamic-reexport":
				{
					const activeExports = HarmonyModulesHelpers.getActiveExports(module, dep);
					let content = "/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in " + importVar + ") ";

					// Filter out exports which are defined by other exports
					// and filter out default export because it cannot be reexported with *
					if(activeExports.length > 0)
						content += "if(" + JSON.stringify(activeExports.concat("default")) + ".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
					else
						content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
					const exportsName = dep.originModule.exportsArgument || "exports";
					return content + `(function(key) { __webpack_require__.d(${exportsName}, key, function() { return ${name}[key]; }) }(__WEBPACK_IMPORT_KEY__));\n`;
				}

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	getReexportStatement(module, key, name, valueKey) {
		const exportsName = module.exportsArgument || "exports";
		const returnValue = this.getReturnValue(valueKey);
		return `__webpack_require__.d(${exportsName}, ${JSON.stringify(key)}, function() { return ${name}${returnValue}; });\n`;
	}

	getConditionalReexportStatement(module, key, name, valueKey) {
		const exportsName = module.exportsArgument || "exports";
		const returnValue = this.getReturnValue(valueKey);
		return `if(__webpack_require__.o(${name}, ${JSON.stringify(valueKey)})) __webpack_require__.d(${exportsName}, ${JSON.stringify(key)}, function() { return ${name}${returnValue}; });\n`;
	}

	getReturnValue(valueKey) {
		if(valueKey === null) {
			return "_default.a";
		}

		return valueKey && "[" + JSON.stringify(valueKey) + "]";
	}
};
