/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

class HarmonyExportImportedSpecifierDependency extends NullDependency {
	constructor(originModule, importDependency, importedVar, id, name) {
		super();
		this.originModule = originModule;
		this.importDependency = importDependency;
		this.importedVar = importedVar;
		this.id = id;
		this.name = name;
	}

	get type() {
		return "harmony export imported specifier";
	}

	getReference() {
		const name = this.name;
		const used = this.originModule.isUsed(name);
		const active = HarmonyModulesHelpers.isActive(this.originModule, this);
		const importedModule = this.importDependency.module;

		if(!importedModule || !used || !active) return null;
		if(!this.originModule.usedExports) return null;

		if(name) {
			const nameIsNotInUsedExports = Array.isArray(this.originModule.usedExports) && this.originModule.usedExports.indexOf(name) < 0;
			if(nameIsNotInUsedExports) return null;

			// export { name as name }
			if(this.id) {
				return {
					module: importedModule,
					importedNames: [this.id]
				};
			}

			// export { * as name }
			return {
				module: importedModule,
				importedNames: true
			};
		}

		// export *
		if(Array.isArray(this.originModule.usedExports)) {
			// reexport * with known used exports
			var activeExports = HarmonyModulesHelpers.getActiveExports(this.originModule, this);
			if(Array.isArray(importedModule.providedExports)) {
				return {
					module: importedModule,
					importedNames: this.originModule.usedExports.filter((id) => {
						const notInActiveExports = activeExports.indexOf(id) < 0;
						const notDefault = id !== "default";
						const inProvidedExports = importedModule.providedExports.indexOf(id) >= 0;
						return notInActiveExports && notDefault && inProvidedExports;
					}),
				};
			}

			return {
				module: importedModule,
				importedNames: this.originModule.usedExports.filter(id => {
					const notInActiveExports = activeExports.indexOf(id) < 0;
					const notDefault = id !== "default";
					return notInActiveExports && notDefault;
				}),
			};
		}

		if(Array.isArray(importedModule.providedExports)) {
			return {
				module: importedModule,
				importedNames: importedModule.providedExports.filter(id => id !== "default"),
			};
		}

		return {
			module: importedModule,
			importedNames: true,
		};
	}

	getExports() {
		if(this.name) {
			return {
				exports: [this.name]
			};
		}

		const importedModule = this.importDependency.module;

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
		const importedModule = this.importDependency.module;
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
		const hashValue = this.getHashValue(this.importDependency.module);
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

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const content = this.getContent(dep);
		source.insert(-1, content);
	}

	getContent(dep) {
		const name = dep.importedVar;
		const used = dep.originModule.isUsed(dep.name);
		const importedModule = dep.importDependency.module;
		const active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
		const importsExportsUnknown = !importedModule || !Array.isArray(importedModule.providedExports);

		const getReexportStatement = this.reexportStatementCreator(dep.originModule, importsExportsUnknown, name);

		// we want to rexport something, but the export isn't used
		if(!used) {
			return "/* unused harmony reexport " + dep.name + " */\n";
		}

		// we want to reexport something but another exports overrides this one
		if(!active) {
			return "/* inactive harmony reexport " + (dep.name || "namespace") + " */\n";
		}

		// we want to reexport the default export from a non-hamory module
		const isNotAHarmonyModule = !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule));
		if(dep.name && dep.id === "default" && isNotAHarmonyModule) {
			return "/* harmony reexport (default from non-hamory) */ " + getReexportStatement(JSON.stringify(used), null);
		}

		// we want to reexport a key as new key
		if(dep.name && dep.id) {
			var idUsed = importedModule && importedModule.isUsed(dep.id);
			return "/* harmony reexport (binding) */ " + getReexportStatement(JSON.stringify(used), JSON.stringify(idUsed));
		}

		// we want to reexport the module object as named export
		if(dep.name) {
			return "/* harmony reexport (module object) */ " + getReexportStatement(JSON.stringify(used), "");
		}

		// we know which exports are used
		if(Array.isArray(dep.originModule.usedExports)) {
			const activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule, dep);
			const items = dep.originModule.usedExports.map(function(id) {
				if(id === "default") return;
				if(activeExports.indexOf(id) >= 0) return;
				if(importedModule.isProvided(id) === false) return;
				var exportUsed = dep.originModule.isUsed(id);
				var idUsed = importedModule && importedModule.isUsed(id);
				return [exportUsed, idUsed];
			}).filter(Boolean);

			if(items.length === 0) {
				return "/* unused harmony namespace reexport */\n";
			}

			return items.map(function(item) {
				return "/* harmony namespace reexport (by used) */ " + getReexportStatement(JSON.stringify(item[0]), JSON.stringify(item[1]));
			}).join("");
		}

		// not sure which exports are used, but we know which are provided
		if(dep.originModule.usedExports && importedModule && Array.isArray(importedModule.providedExports)) {
			const activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule, dep);
			const items = importedModule.providedExports.map(function(id) {
				if(id === "default") return;
				if(activeExports.indexOf(id) >= 0) return;
				var exportUsed = dep.originModule.isUsed(id);
				var idUsed = importedModule && importedModule.isUsed(id);
				return [exportUsed, idUsed];
			}).filter(Boolean);

			if(items.length === 0) {
				return "/* empty harmony namespace reexport */\n";
			}

			return items.map(function(item) {
				return "/* harmony namespace reexport (by provided) */ " + getReexportStatement(JSON.stringify(item[0]), JSON.stringify(item[1]));
			}).join("");
		}

		// not sure which exports are used and provided
		if(dep.originModule.usedExports) {
			const activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule, dep);
			let content = "/* harmony namespace reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in " + name + ") ";

			// Filter out exports which are defined by other exports
			// and filter out default export because it cannot be reexported with *
			if(activeExports.length > 0)
				content += "if(" + JSON.stringify(activeExports.concat("default")) + ".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
			else
				content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
			const exportsName = dep.originModule.exportsArgument || "exports";
			return content + `(function(key) { __webpack_require__.d(${exportsName}, key, function() { return ${name}[key]; }) }(__WEBPACK_IMPORT_KEY__));\n`;
		}

		return "/* unused harmony reexport namespace */\n";
	}

	reexportStatementCreator(module, importsExportsUnknown, name) {
		const exportsName = module.exportsArgument || "exports";
		const getReexportStatement = (key, valueKey) => {
			const conditional = this.getConditional(importsExportsUnknown, valueKey, name);
			const returnValue = this.getReturnValue(valueKey);
			return `${conditional}__webpack_require__.d(${exportsName}, ${key}, function() { return ${name}${returnValue}; });\n`;
		};
		return getReexportStatement;
	}

	getConditional(importsExportsUnknown, valueKey, name) {
		if(!importsExportsUnknown || !valueKey) {
			return "";
		}

		return `if(__webpack_require__.o(${name}, ${valueKey})) `;
	}

	getReturnValue(valueKey) {
		if(valueKey === null) {
			return "_default.a";
		}

		return valueKey && "[" + valueKey + "]";
	}
};
