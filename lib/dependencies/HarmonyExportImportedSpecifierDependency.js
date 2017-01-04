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
		const used = this.originModule.isUsed(this.name);
		const active = HarmonyModulesHelpers.isActive(this.originModule, this);
		if(!this.importDependency.module || !used || !active) return null;
		if(!this.originModule.usedExports) return null;
		const importedModule = this.importDependency.module;
		if(!this.name) {
			// export *
			if(Array.isArray(this.originModule.usedExports)) {
				// reexport * with known used exports
				var activeExports = HarmonyModulesHelpers.getActiveExports(this.originModule, this);
				if(Array.isArray(importedModule.providedExports)) {
					return {
						module: importedModule,
						importedNames: this.originModule.usedExports.filter(function(id) {
							return activeExports.indexOf(id) < 0 && importedModule.providedExports.indexOf(id) >= 0 && id !== "default";
						}, this)
					}
				} else {
					return {
						module: importedModule,
						importedNames: this.originModule.usedExports.filter(function(id) {
							return activeExports.indexOf(id) < 0 && id !== "default";
						}, this)
					}
				}
			} else if(Array.isArray(importedModule.providedExports)) {
				return {
					module: importedModule,
					importedNames: importedModule.providedExports.filter(function(id) {
						return id !== "default"
					})
				}
			} else {
				return {
					module: importedModule,
					importedNames: true
				}
			}
		} else {
			if(Array.isArray(this.originModule.usedExports) && this.originModule.usedExports.indexOf(this.name) < 0) return null;
			if(this.id) {
				// export { name as name }
				return {
					module: importedModule,
					importedNames: [this.id]
				};
			} else {
				// export { * as name }
				return {
					module: importedModule,
					importedNames: true
				};
			}
		}
	}

	getExports() {
		if(this.name) {
			return {
				exports: [this.name]
			}
		}

		const importedModule = this.importDependency.module;
		if(importedModule && Array.isArray(importedModule.providedExports)) {
			return {
				exports: importedModule.providedExports.filter(function(id) {
					return id !== "default"
				}),
				dependencies: [importedModule]
			};
		}

		if(importedModule && importedModule.providedExports) {
			return {
				exports: true
			};
		}

		if(importedModule) {
			return {
				exports: null,
				dependencies: [importedModule]
			};
		}

		return {
			exports: null
		}
	}

	describeHarmonyExport() {
		const importedModule = this.importDependency.module;
		if(!this.name && importedModule && Array.isArray(importedModule.providedExports)) {
			// for a star export and when we know which exports are provided, we can tell so
			return {
				exportedName: importedModule.providedExports,
				precedence: 3
			}
		}

		return {
			exportedName: this.name,
			precedence: this.name ? 2 : 3
		};
	}

	updateHash(hash) {
		super.updateHash(hash);
		const importedModule = this.importDependency.module;
		hash.update((importedModule && (importedModule.used + JSON.stringify(importedModule.usedExports) + JSON.stringify(importedModule.providedExports))) + "");
	}
}

module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const name = dep.importedVar;
		const used = dep.originModule.isUsed(dep.name);
		const importedModule = dep.importDependency.module;
		const active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
		let content;
		let activeExports;
		let items;
		const importsExportsUnknown = !importedModule || !Array.isArray(importedModule.providedExports);

		function getReexportStatement(key, valueKey) {
			var conditional = !importsExportsUnknown || !valueKey ? "" : "if(__webpack_require__.o(" + name + ", " + valueKey + ")) ";
			return conditional +
				"__webpack_require__.d(exports, " + key + ", " +
				"function() { return " + name + (valueKey === null ? "_default.a" : valueKey && "[" + valueKey + "]") + "; });\n"
		}
		if(!used) { // we want to rexport something, but the export isn't used
			content = "/* unused harmony reexport " + dep.name + " */\n";
		} else if(!active) { // we want to reexport something but another exports overrides this one
			content = "/* inactive harmony reexport " + (dep.name || "namespace") + " */\n";
		} else if(dep.name && dep.id === "default" && !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule))) { // we want to reexport the default export from a non-hamory module
			content = "/* harmony reexport (default from non-hamory) */ " + getReexportStatement(JSON.stringify(used), null);
		} else if(dep.name && dep.id) { // we want to reexport a key as new key
			var idUsed = importedModule && importedModule.isUsed(dep.id);
			content = "/* harmony reexport (binding) */ " + getReexportStatement(JSON.stringify(used), JSON.stringify(idUsed));
		} else if(dep.name) { // we want to reexport the module object as named export
			content = "/* harmony reexport (module object) */ " + getReexportStatement(JSON.stringify(used), "");
		} else if(Array.isArray(dep.originModule.usedExports)) { // we know which exports are used
			activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule, dep);
			items = dep.originModule.usedExports.map(function(id) {
				if(id === "default") return;
				if(activeExports.indexOf(id) >= 0) return;
				if(importedModule.isProvided(id) === false) return;
				var exportUsed = dep.originModule.isUsed(id);
				var idUsed = importedModule && importedModule.isUsed(id);
				return [exportUsed, idUsed];
			}).filter(Boolean);
			if(items.length > 0) {
				content = items.map(function(item) {
					return "/* harmony namespace reexport (by used) */ " + getReexportStatement(JSON.stringify(item[0]), JSON.stringify(item[1]));
				}).join("");
			} else content = "/* unused harmony namespace reexport */\n";
		} else if(dep.originModule.usedExports && importedModule && Array.isArray(importedModule.providedExports)) { // not sure which exports are used, but we know which are provided
			activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule, dep);
			items = importedModule.providedExports.map(function(id) {
				if(id === "default") return;
				if(activeExports.indexOf(id) >= 0) return;
				var exportUsed = dep.originModule.isUsed(id);
				var idUsed = importedModule && importedModule.isUsed(id);
				return [exportUsed, idUsed];
			}).filter(Boolean);
			if(items.length > 0) {
				content = items.map(function(item) {
					return "/* harmony namespace reexport (by provided) */ " + getReexportStatement(JSON.stringify(item[0]), JSON.stringify(item[1]));
				}).join("");
			} else content = "/* empty harmony namespace reexport */\n";
		} else if(dep.originModule.usedExports) { // not sure which exports are used and provided
			activeExports = HarmonyModulesHelpers.getActiveExports(dep.originModule, dep);
			content = "/* harmony namespace reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in " + name + ") ";

			// Filter out exports which are defined by other exports
			// and filter out default export because it cannot be reexported with *
			if(activeExports.length > 0)
				content += "if(" + JSON.stringify(activeExports.concat("default")) + ".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
			else
				content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
			content += "(function(key) { __webpack_require__.d(exports, key, function() { return " + name + "[key]; }) }(__WEBPACK_IMPORT_KEY__));\n";
		} else {
			content = "/* unused harmony reexport namespace */\n";
		}
		source.insert(-1, content);
	}
}
