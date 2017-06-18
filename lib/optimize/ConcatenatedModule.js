/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Module = require("../Module");
const Template = require("../Template");
const Parser = require("../Parser");
const acorn = require("acorn");
const escope = require("escope");
const ReplaceSource = require("webpack-sources/lib/ReplaceSource");
const ConcatSource = require("webpack-sources/lib/ConcatSource");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");
const HarmonyExportSpecifierDependency = require("../dependencies/HarmonyExportSpecifierDependency");
const HarmonyExportExpressionDependency = require("../dependencies/HarmonyExportExpressionDependency");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");
const HarmonyModulesHelpers = require("../dependencies/HarmonyModulesHelpers");

function getFinalName(info, exportName, moduleToInfoMap, requestShortener) {
	const directExport = info.exportMap.get(exportName);
	if(directExport) {
		if(exportName === true)
			info.needNamespaceObject = true;
		return info.internalNames.get(directExport);
	}
	const reexport = info.reexportMap.get(exportName);
	if(reexport) {
		const refInfo = moduleToInfoMap.get(reexport.module);
		if(refInfo) {
			// module is in the concatenation
			return getFinalName(refInfo, reexport.exportName, moduleToInfoMap, requestShortener);
		} else {
			const dep = reexport.dependency;
			const importedModule = reexport.module;
			const exportName = reexport.exportName;
			const isHarmonyModule = importedModule && (!importedModule.meta || importedModule.meta.harmonyModule);
			const importedVar = dep.importedVar;
			const used = importedModule.isUsed(exportName);
			if(!used) return "/* unused reexport */undefined";
			if(!isHarmonyModule && exportName === "default") {
				return `${importedVar}_default.a`;
			}
			return `${importedVar}[${JSON.stringify(used)}]`;
		}
	}
	throw new Error(`Cannot get final name for export "${exportName}" in "${info.module.readableIdentifier(requestShortener)}"` +
		` (known exports: ${Array.from(info.exportMap.keys()).join(" ")}, ` +
		`known reexports: ${Array.from(info.reexportMap.keys()).join(" ")})`);
}

function getSymbolsFromScope(s, untilScope) {
	const allUsedNames = new Set();
	let scope = s;
	while(scope) {
		if(untilScope === scope) break;
		scope.variables.forEach(variable => allUsedNames.add(variable.name));
		scope = scope.upper;
	}
	return allUsedNames;
}

function getAllReferences(variable) {
	let set = variable.references;
	// Look for inner scope variables too (like in class Foo { t() { Foo } })
	const identifiers = new Set(variable.identifiers);
	for(const scope of variable.scope.childScopes) {
		for(const innerVar of scope.variables) {
			if(innerVar.identifiers.some(id => identifiers.has(id))) {
				set = set.concat(innerVar.references);
				break;
			}
		}
	}
	return set;
}

function reduceSet(a, b) {
	for(const item of b)
		a.add(item);
	return a;
}

function getPathInAst(ast, node) {
	if(ast === node) {
		return [];
	}
	const nr = node.range;
	var i;
	if(Array.isArray(ast)) {
		for(i = 0; i < ast.length; i++) {
			const enterResult = enterNode(ast[i]);
			if(typeof enterResult !== "undefined")
				return enterResult;
		}
	} else if(ast && typeof ast === "object") {
		const keys = Object.keys(ast);
		for(i = 0; i < keys.length; i++) {
			const value = ast[keys[i]];
			if(Array.isArray(value)) {
				const pathResult = getPathInAst(value, node);
				if(typeof pathResult !== "undefined")
					return pathResult;
			} else if(value && typeof value === "object") {
				const enterResult = enterNode(value);
				if(typeof enterResult !== "undefined")
					return enterResult;
			}
		}
	}

	function enterNode(n) {
		const r = n.range;
		if(r) {
			if(r[0] <= nr[0] && r[1] >= nr[1]) {
				const path = getPathInAst(n, node);
				if(path) {
					path.push(n);
					return path;
				}
			}
		}
		return undefined;
	}
}

class ConcatenatedModule extends Module {
	constructor(rootModule, modules) {
		super();
		this.rootModule = rootModule;
		this.modules = modules;
		this.usedExports = rootModule.usedExports;
		this.providedExports = rootModule.providedExports;
		this.optimizationBailout = rootModule.optimizationBailout;
		this.used = rootModule.used;
		this._chunks = new Set(rootModule._chunks);
		this.index = rootModule.index;
		this.index2 = rootModule.index2;
		this.depth = rootModule.depth;
		this.built = modules.some(m => m.built);
		this.cacheable = modules.every(m => m.cacheable);
		const modulesSet = new Set(modules);
		this.reasons = rootModule.reasons.filter(reason => !modulesSet.has(reason.module));
		this.meta = rootModule.meta;
		this.moduleArgument = rootModule.moduleArgument;
		this.exportsArgument = rootModule.exportsArgument;
		this.strict = true;

		this.dependencies = [];
		this.dependenciesWarnings = [];
		this.dependenciesErrors = [];
		this.warnings = [];
		this.errors = [];
		for(const m of modules) {
			// populate dependencies
			m.dependencies.filter(dep => !modulesSet.has(dep.module))
				.forEach(d => this.dependencies.push(d));
			// populate dep warning
			m.dependenciesWarnings.forEach(depWarning => this.dependenciesWarnings.push(depWarning));
			// populate dep errors
			m.dependenciesErrors.forEach(depError => this.dependenciesErrors.push(depError));
			// populate warnings
			m.warnings.forEach(warning => this.warnings.push(warning));
			// populate errors
			m.errors.forEach(error => this.errors.push(error));
		}
	}

	identifier() {
		return this.modules.map(m => m.identifier()).join(" ");
	}

	readableIdentifier(requestShortener) {
		return this.rootModule.readableIdentifier(requestShortener) + ` + ${this.modules.length - 1} modules`;
	}

	libIdent(options) {
		return this.rootModule.libIdent(options);
	}

	nameForCondition() {
		return this.rootModule.nameForCondition();
	}

	build(options, compilation, resolver, fs, callback) {
		throw new Error("Cannot build this module. It should be already built.");
	}

	size() {
		// Guess size from embedded modules
		return this.modules.reduce((sum, m) => sum + m.size(), 0);
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		const modulesSet = new Set();
		this.modules.forEach(m => modulesSet.add(m));

		// Metainfo for each module
		const modulesWithInfo = this.modules.map((m, idx) => {
			const exportMap = new Map();
			const reexportMap = new Map();
			m.dependencies.forEach(dep => {
				if(dep instanceof HarmonyExportSpecifierDependency) {
					exportMap.set(dep.name, dep.id);
				} else if(dep instanceof HarmonyExportExpressionDependency) {
					exportMap.set("default", "__WEBPACK_MODULE_DEFAULT_EXPORT__");
				} else if(dep instanceof HarmonyExportImportedSpecifierDependency) {
					const exportName = dep.name;
					const importName = dep.id;
					const importModule = dep.importDependency.module;
					const innerReexport = modulesSet.has(importModule);
					if(exportName && importName) {
						reexportMap.set(exportName, {
							module: importModule,
							exportName: importName,
							dependency: dep
						});
					} else if(exportName) {
						reexportMap.set(exportName, {
							module: importModule,
							exportName: true,
							dependency: dep
						});
					} else if(Array.isArray(importModule.providedExports)) {
						var activeExports = new Set(HarmonyModulesHelpers.getActiveExports(dep.originModule, dep));
						importModule.providedExports.forEach(name => {
							if(activeExports.has(name) || name === "default")
								return;
							reexportMap.set(name, {
								module: importModule,
								exportName: name,
								dependency: dep
							});
						});
					} else if(innerReexport) {
						throw new Error(`Module "${importModule.readableIdentifier(requestShortener)}" doesn't provide static exports for "export *" in ${m.readableIdentifier(requestShortener)}`);
					}
				}
			});
			return {
				module: m,
				index: idx,
				ast: undefined,
				source: undefined,
				globalScope: undefined,
				moduleScope: undefined,
				internalNames: new Map(),
				exportMap: exportMap,
				reexportMap: reexportMap,
				needCompatibilityFlag: false,
				needNamespaceObject: false,
				namespaceObjectSource: null
			};
		});

		// Create mapping from module to info
		const moduleToInfoMap = new Map();
		modulesWithInfo.forEach(m => moduleToInfoMap.set(m.module, m));

		// Configure template decorators for dependencies
		const innerDependencyTemplates = new Map(dependencyTemplates);

		innerDependencyTemplates.set(HarmonyImportSpecifierDependency, new HarmonyImportSpecifierDependencyConcatenatedTemplate(
			dependencyTemplates.get(HarmonyImportSpecifierDependency),
			moduleToInfoMap
		));
		innerDependencyTemplates.set(HarmonyImportDependency, new HarmonyImportDependencyConcatenatedTemplate(
			dependencyTemplates.get(HarmonyImportDependency),
			moduleToInfoMap
		));
		innerDependencyTemplates.set(HarmonyExportSpecifierDependency, new HarmonyExportSpecifierDependencyConcatenatedTemplate(
			dependencyTemplates.get(HarmonyExportSpecifierDependency),
			this.rootModule
		));
		innerDependencyTemplates.set(HarmonyExportExpressionDependency, new HarmonyExportExpressionDependencyConcatenatedTemplate(
			dependencyTemplates.get(HarmonyExportExpressionDependency),
			this.rootModule,
			moduleToInfoMap
		));
		innerDependencyTemplates.set(HarmonyExportImportedSpecifierDependency, new HarmonyExportImportedSpecifierDependencyConcatenatedTemplate(
			dependencyTemplates.get(HarmonyExportImportedSpecifierDependency),
			this.rootModule,
			moduleToInfoMap
		));
		innerDependencyTemplates.set(HarmonyCompatibilityDependency, new HarmonyCompatibilityDependencyConcatenatedTemplate(
			dependencyTemplates.get(HarmonyCompatibilityDependency),
			this.rootModule,
			moduleToInfoMap
		));

		// Generate source code and analyse scopes
		// Prepare a ReplaceSource for the final source
		modulesWithInfo.forEach(info => {
			const m = info.module;
			const source = m.source(innerDependencyTemplates, outputOptions, requestShortener);
			const code = source.source();
			const ast = acorn.parse(code, {
				ranges: true,
				locations: true,
				ecmaVersion: Parser.ECMA_VERSION,
				sourceType: "module"
			});
			const scopeManager = escope.analyze(ast, {
				ecmaVersion: 6,
				sourceType: "module",
				optimistic: true,
				ignoreEval: true,
				impliedStrict: true
			});
			const globalScope = scopeManager.acquire(ast);
			const moduleScope = globalScope.childScopes[0];
			const resultSource = new ReplaceSource(source);
			info.ast = ast;
			info.source = resultSource;
			info.globalScope = globalScope;
			info.moduleScope = moduleScope;
		});

		// List of all used names to avoid conflicts
		const allUsedNames = new Set(["__WEBPACK_MODULE_DEFAULT_EXPORT__", "defaultExport", "Object"]);

		// get all global names
		modulesWithInfo.forEach(info => {
			info.globalScope.through.forEach(reference => {
				const name = reference.identifier.name;
				if(/^__WEBPACK_MODULE_REFERENCE__\d+_(\d+|ns)__$/.test(name)) {
					for(const s of getSymbolsFromScope(reference.from, info.moduleScope)) {
						allUsedNames.add(s);
					}
				} else {
					allUsedNames.add(name);
				}
			});
		});

		modulesWithInfo.forEach(info => {
			const namespaceObjectName = this.findNewName("namespaceObject", allUsedNames, null, info.module.readableIdentifier(requestShortener));
			allUsedNames.add(namespaceObjectName);
			info.internalNames.set(namespaceObjectName, namespaceObjectName);
			info.exportMap.set(true, namespaceObjectName);
			info.moduleScope.variables.forEach(variable => {
				const name = variable.name;
				if(allUsedNames.has(name)) {
					const references = getAllReferences(variable);
					const symbolsInReferences = references.map(ref => getSymbolsFromScope(ref.from, info.moduleScope)).reduce(reduceSet, new Set());
					const newName = this.findNewName(name, allUsedNames, symbolsInReferences, info.module.readableIdentifier(requestShortener));
					allUsedNames.add(newName);
					info.internalNames.set(name, newName);
					const source = info.source;
					const allIdentifiers = new Set(references.map(r => r.identifier).concat(variable.identifiers));
					for(const identifier of allIdentifiers) {
						const r = identifier.range;
						const path = getPathInAst(info.ast, identifier);
						if(path && path.length > 1 && path[1].type === "Property" && path[1].shorthand) {
							source.insert(r[1], `: ${newName}`);
						} else {
							source.replace(r[0], r[1] - 1, newName);
						}
					}
				} else {
					allUsedNames.add(name);
					info.internalNames.set(name, name);
				}
			});
		});

		modulesWithInfo.forEach(info => {
			info.globalScope.through.forEach(reference => {
				const name = reference.identifier.name;
				const match = /^__WEBPACK_MODULE_REFERENCE__(\d+)_(\d+|ns)__$/.exec(name);
				if(match) {
					const referencedModule = modulesWithInfo[+match[1]];
					let exportName;
					if(match[2] === "ns") {
						exportName = true;
					} else {
						const exportIdx = +match[2];
						exportName = referencedModule.module.providedExports[exportIdx];
					}
					const finalName = getFinalName(referencedModule, exportName, moduleToInfoMap, requestShortener);
					if(!finalName)
						throw new Error(`Cannot map to variable name in module ${info.module.resource} (export '${exportName}')`);
					const r = reference.identifier.range;
					const source = info.source;
					source.replace(r[0], r[1] - 1, finalName);
				}
			});
		});

		const result = new ConcatSource();
		if(moduleToInfoMap.get(this.rootModule).needCompatibilityFlag) {
			result.add(`Object.defineProperty(${this.rootModule.exportsArgument || "exports"}, "__esModule", { value: true });\n`);
		}
		let generated = true;
		const ensureNsObjSource = info => {
			if(info.needNamespaceObject && !info.namespaceObjectSource) {
				const name = info.exportMap.get(true);
				const nsObj = [`var ${name} = {};`];
				for(const exportName of info.module.providedExports) {
					const finalName = getFinalName(info, exportName, moduleToInfoMap, requestShortener);
					nsObj.push(`__webpack_require__.d(${name}, ${JSON.stringify(exportName)}, function() { return ${finalName}; });`);
				}
				info.namespaceObjectSource = nsObj.join("\n") + "\n";
				generated = true;
			}
		};
		while(generated) {
			generated = false;
			modulesWithInfo.forEach(ensureNsObjSource);
		}
		modulesWithInfo.forEach(info => {
			result.add(`\n// CONCATENATED MODULE: ${info.module.readableIdentifier(requestShortener)}\n`);
			if(info.namespaceObjectSource) {
				result.add(info.namespaceObjectSource);
			}
			result.add(info.source);
		});

		return result;
	}

	findNewName(oldName, usedNamed1, usedNamed2, extraInfo) {
		let name = oldName;

		if(name === "__WEBPACK_MODULE_DEFAULT_EXPORT__")
			name = "defaultExport";

		// Remove uncool stuff
		extraInfo = extraInfo.replace(/(\/index)?\.([a-zA-Z0-9]{1,4})$/, "");

		const splittedInfo = extraInfo.split("/");
		while(splittedInfo.length) {
			name = splittedInfo.pop() + "_" + name;
			const nameIdent = Template.toIdentifier(name);
			if(!usedNamed1.has(nameIdent) && (!usedNamed2 || !usedNamed2.has(nameIdent))) return nameIdent;
		}

		while(usedNamed1.has(name = name + "_") || (usedNamed2 && usedNamed2.has(name))) { /* do nothing */ }
		return name;
	}

}

class HarmonyImportSpecifierDependencyConcatenatedTemplate {
	constructor(originalTemplate, modulesMap) {
		this.originalTemplate = originalTemplate;
		this.modulesMap = modulesMap;
	}

	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		const module = dep.importDependency.module;
		const info = this.modulesMap.get(module);
		if(!info) {
			this.originalTemplate.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
			return;
		}
		if(!Array.isArray(module.providedExports))
			throw new Error(`Module ${module.resource} has no static exports ${module.providedExports}`);
		let content;
		if(dep.id === null) {
			content = `__WEBPACK_MODULE_REFERENCE__${info.index}_ns__`;
		} else {
			const exportIdx = (module.providedExports).indexOf(dep.id);
			content = exportIdx === -1 ? "undefined" : `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportIdx}__`;
		}
		if(dep.shorthand) {
			content = dep.name + ": " + content;
		}
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
}

class HarmonyImportDependencyConcatenatedTemplate {
	constructor(originalTemplate, modulesMap) {
		this.originalTemplate = originalTemplate;
		this.modulesMap = modulesMap;
	}

	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		const module = dep.module;
		const info = this.modulesMap.get(module);
		if(!info) {
			this.originalTemplate.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
			return;
		}
		source.replace(dep.range[0], dep.range[1] - 1, "");
	}
}

class HarmonyExportSpecifierDependencyConcatenatedTemplate {
	constructor(originalTemplate, rootModule) {
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
	}

	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		if(dep.originModule === this.rootModule) {
			this.originalTemplate.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
		}
	}
}

class HarmonyExportExpressionDependencyConcatenatedTemplate {
	constructor(originalTemplate, rootModule) {
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
	}

	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		if(dep.originModule === this.rootModule) {
			this.originalTemplate.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
		} else {
			const content = "/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = ";

			if(dep.range) {
				source.replace(dep.rangeStatement[0], dep.range[0] - 1, content + "(");
				source.replace(dep.range[1], dep.rangeStatement[1] - 1, ");");
				return;
			}

			source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
		}
	}
}

class HarmonyExportImportedSpecifierDependencyConcatenatedTemplate {
	constructor(originalTemplate, rootModule, modulesMap) {
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
		this.modulesMap = modulesMap;
	}

	getExports(dep) {
		const active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
		if(!active) return [];
		const importModule = dep.importDependency.module;
		if(dep.id) {
			// export { named } from "module"
			return [{
				name: dep.name,
				id: dep.id,
				module: importModule
			}];
		}
		if(dep.name) {
			// export * as abc from "module"
			return [{
				name: dep.name,
				id: true,
				module: importModule
			}];
		}
		// export * from "module"
		const activeExports = new Set(HarmonyModulesHelpers.getActiveExports(dep.originModule, dep));
		return importModule.providedExports.filter(exp => exp !== "default" && !activeExports.has(exp)).map(exp => {
			return {
				name: exp,
				id: exp,
				module: importModule
			};
		});
	}

	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		if(dep.originModule === this.rootModule) {
			if(this.modulesMap.get(dep.importDependency.module)) {
				const exportDefs = this.getExports(dep);
				exportDefs.forEach(def => {
					const info = this.modulesMap.get(def.module);
					const used = dep.originModule.isUsed(def.name);
					if(!used) {
						source.insert(-1, `/* unused concated harmony import ${dep.name} */\n`);
					}
					let finalName;
					if(def.id === true) {
						finalName = `__WEBPACK_MODULE_REFERENCE__${info.index}_ns__`;
					} else {
						const exportIdx = def.module.providedExports.indexOf(def.id);
						finalName = exportIdx < 0 ? "undefined" : `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportIdx}__`;
					}
					const exportsName = this.rootModule.exportsArgument || "exports";
					const content = `/* concated harmony reexport */__webpack_require__.d(${exportsName}, ${JSON.stringify(used)}, function() { return ${finalName}; });\n`;
					source.insert(-1, content);
				});
			} else {
				this.originalTemplate.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
			}
		}
	}
}

class HarmonyCompatibilityDependencyConcatenatedTemplate {
	constructor(originalTemplate, rootModule, modulesMap) {
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
		this.modulesMap = modulesMap;
	}

	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		if(dep.originModule === this.rootModule) {
			this.modulesMap.get(this.rootModule).needCompatibilityFlag = true;
		}
	}
}

module.exports = ConcatenatedModule;
