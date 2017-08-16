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

function ensureNsObjSource(info, moduleToInfoMap, requestShortener) {
	if(!info.hasNamespaceObject) {
		info.hasNamespaceObject = true;
		const name = info.exportMap.get(true);
		const nsObj = [`var ${name} = {};`];
		for(const exportName of info.module.providedExports) {
			const finalName = getFinalName(info, exportName, moduleToInfoMap, requestShortener, false);
			nsObj.push(`__webpack_require__.d(${name}, ${JSON.stringify(exportName)}, function() { return ${finalName}; });`);
		}
		info.namespaceObjectSource = nsObj.join("\n") + "\n";
	}
}

function getExternalImport(importedModule, info, exportName, asCall) {
	if(exportName === true) return info.name;
	const used = importedModule.isUsed(exportName);
	if(!used) return "/* unused reexport */undefined";
	if(info.interop && exportName === "default") {
		return asCall ? `${info.interopName}()` : `${info.interopName}.a`;
	}
	// TODO use Template.toNormalComment when merging with pure-module
	const comment = used !== exportName ? ` /* ${exportName} */` : "";
	const reference = `${info.name}[${JSON.stringify(used)}${comment}]`;
	if(asCall)
		return `Object(${reference})`;
	return reference;
}

function getFinalName(info, exportName, moduleToInfoMap, requestShortener, asCall) {
	switch(info.type) {
		case "concatenated":
			{
				const directExport = info.exportMap.get(exportName);
				if(directExport) {
					if(exportName === true)
						ensureNsObjSource(info, moduleToInfoMap, requestShortener);
					const name = info.internalNames.get(directExport);
					if(!name)
						throw new Error(`The export "${directExport}" in "${info.module.readableIdentifier(requestShortener)}" has no internal name`);
					return name;
				}
				const reexport = info.reexportMap.get(exportName);
				if(reexport) {
					const refInfo = moduleToInfoMap.get(reexport.module);
					if(refInfo) {
						// module is in the concatenation
						return getFinalName(refInfo, reexport.exportName, moduleToInfoMap, requestShortener, asCall);
					}
				}
				const problem = `Cannot get final name for export "${exportName}" in "${info.module.readableIdentifier(requestShortener)}"` +
					` (known exports: ${Array.from(info.exportMap.keys()).filter(name => name !== true).join(" ")}, ` +
					`known reexports: ${Array.from(info.reexportMap.keys()).join(" ")})`;
				// TODO use Template.toNormalComment when merging with pure-module
				return `/* ${problem} */ undefined`;
			}
		case "external":
			{
				const importedModule = info.module;
				return getExternalImport(importedModule, info, exportName, asCall);
			}
	}
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
		super.setChunks(rootModule._chunks);
		this.rootModule = rootModule;
		this.usedExports = rootModule.usedExports;
		this.providedExports = rootModule.providedExports;
		this.optimizationBailout = rootModule.optimizationBailout;
		this.used = rootModule.used;
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
		this._numberOfConcatenatedModules = modules.length;

		this.dependencies = [];
		this.dependenciesWarnings = [];
		this.dependenciesErrors = [];
		this.fileDependencies = [];
		this.contextDependencies = [];
		this.warnings = [];
		this.errors = [];
		this.assets = {};
		this._orderedConcatenationList = this._createOrderedConcatenationList(rootModule, modulesSet);
		for(const info of this._orderedConcatenationList) {
			if(info.type === "concatenated") {
				const m = info.module;

				// populate dependencies
				m.dependencies.filter(dep => !modulesSet.has(dep.module))
					.forEach(d => this.dependencies.push(d));
				// populate dep warning
				m.dependenciesWarnings.forEach(depWarning => this.dependenciesWarnings.push(depWarning));
				// populate dep errors
				m.dependenciesErrors.forEach(depError => this.dependenciesErrors.push(depError));
				// populate file dependencies
				if(m.fileDependencies) m.fileDependencies.forEach(file => this.fileDependencies.push(file));
				// populate context dependencies
				if(m.contextDependencies) m.contextDependencies.forEach(context => this.contextDependencies.push(context));
				// populate warnings
				m.warnings.forEach(warning => this.warnings.push(warning));
				// populate errors
				m.errors.forEach(error => this.errors.push(error));

				Object.assign(this.assets, m.assets);
			}
		}
	}

	get modules() {
		return this._orderedConcatenationList
			.filter(info => info.type === "concatenated")
			.map(info => info.module);
	}

	identifier() {
		return this._orderedConcatenationList.map(info => {
			switch(info.type) {
				case "concatenated":
					return info.module.identifier();
			}
		}).filter(Boolean).join(" ");
	}

	readableIdentifier(requestShortener) {
		return this.rootModule.readableIdentifier(requestShortener) + ` + ${this._numberOfConcatenatedModules - 1} modules`;
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
		return this._orderedConcatenationList.reduce((sum, info) => {
			switch(info.type) {
				case "concatenated":
					return sum + info.module.size();
				case "external":
					return sum + 5;
			}
			return sum;
		}, 0);
	}

	_createOrderedConcatenationList(rootModule, modulesSet) {
		const list = [];
		const set = new Set();

		function getConcatenatedImports(module) {
			// TODO need changes when merging with the pure-module branch
			const allDeps = module.dependencies
				.filter(dep => dep instanceof HarmonyImportDependency && dep.module);

			return allDeps.map(dep => () => dep.module);
		}

		function enterModule(getModule) {
			const module = getModule();
			if(set.has(module)) return;
			set.add(module);
			if(modulesSet.has(module)) {
				const imports = getConcatenatedImports(module);
				imports.forEach(enterModule);
				list.push({
					type: "concatenated",
					module
				});
			} else {
				list.push({
					type: "external",
					get module() {
						// We need to use a getter here, because the module in the dependency
						// could be replaced by some other process (i. e. also replaced with a
						// concatenated module)
						return getModule();
					}
				});
			}
		}

		enterModule(() => rootModule);

		return list;
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		// Metainfo for each module
		const modulesWithInfo = this._orderedConcatenationList.map((info, idx) => {
			switch(info.type) {
				case "concatenated":
					{
						const exportMap = new Map();
						const reexportMap = new Map();
						info.module.dependencies.forEach(dep => {
							if(dep instanceof HarmonyExportSpecifierDependency) {
								exportMap.set(dep.name, dep.id);
							} else if(dep instanceof HarmonyExportExpressionDependency) {
								exportMap.set("default", "__WEBPACK_MODULE_DEFAULT_EXPORT__");
							} else if(dep instanceof HarmonyExportImportedSpecifierDependency) {
								const exportName = dep.name;
								const importName = dep.id;
								const importedModule = dep.importDependency.module;
								if(exportName && importName) {
									reexportMap.set(exportName, {
										module: importedModule,
										exportName: importName,
										dependency: dep
									});
								} else if(exportName) {
									reexportMap.set(exportName, {
										module: importedModule,
										exportName: true,
										dependency: dep
									});
								} else {
									var activeExports = new Set(HarmonyModulesHelpers.getActiveExports(dep.originModule, dep));
									importedModule.providedExports.forEach(name => {
										if(activeExports.has(name) || name === "default")
											return;
										reexportMap.set(name, {
											module: importedModule,
											exportName: name,
											dependency: dep
										});
									});
								}
							}
						});
						return {
							type: "concatenated",
							module: info.module,
							index: idx,
							ast: undefined,
							source: undefined,
							globalScope: undefined,
							moduleScope: undefined,
							internalNames: new Map(),
							exportMap: exportMap,
							reexportMap: reexportMap,
							hasNamespaceObject: false,
							namespaceObjectSource: null
						};
					}
				case "external":
					return {
						type: "external",
						module: info.module,
						index: idx,
						name: undefined,
						interopName: undefined,
						interop: undefined
					};
				default:
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
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
		innerDependencyTemplates.set("hash", innerDependencyTemplates.get("hash") + this.rootModule.identifier());

		// Generate source code and analyse scopes
		// Prepare a ReplaceSource for the final source
		modulesWithInfo.forEach(info => {
			if(info.type === "concatenated") {
				const m = info.module;
				const source = m.source(innerDependencyTemplates, outputOptions, requestShortener);
				const code = source.source();
				let ast;
				try {
					ast = acorn.parse(code, {
						ranges: true,
						locations: true,
						ecmaVersion: Parser.ECMA_VERSION,
						sourceType: "module"
					});
				} catch(err) {
					if(err.loc && typeof err.loc === "object" && typeof err.loc.line === "number") {
						const lineNumber = err.loc.line;
						const lines = code.split("\n");
						err.message += "\n| " + lines.slice(Math.max(0, lineNumber - 3), lineNumber + 2).join("\n| ");
					}
					throw err;
				}
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
			}
		});

		// List of all used names to avoid conflicts
		const allUsedNames = new Set([
			"__WEBPACK_MODULE_DEFAULT_EXPORT__", // avoid using this internal name

			"abstract", "arguments", "await", "boolean", "break", "byte", "case", "catch", "char", "class",
			"const", "continue", "debugger", "default", "delete", "do", "double", "else", "enum", "eval",
			"export", "extends", "false", "final", "finally", "float", "for", "function", "goto", "if",
			"implements", "import", "in", "instanceof", "int", "interface", "let", "long", "native", "new",
			"null", "package", "private", "protected", "public", "return", "short", "static", "super",
			"switch", "synchronized", "this", "throw", "throws", "transient", "true", "try", "typeof",
			"var", "void", "volatile", "while", "with", "yield",

			"module", "__dirname", "__filename", "exports",

			"Array", "Date", "eval", "function", "hasOwnProperty", "Infinity", "isFinite", "isNaN",
			"isPrototypeOf", "length", "Math", "NaN", "name", "Number", "Object", "prototype", "String",
			"toString", "undefined", "valueOf",

			"alert", "all", "anchor", "anchors", "area", "assign", "blur", "button", "checkbox",
			"clearInterval", "clearTimeout", "clientInformation", "close", "closed", "confirm", "constructor",
			"crypto", "decodeURI", "decodeURIComponent", "defaultStatus", "document", "element", "elements",
			"embed", "embeds", "encodeURI", "encodeURIComponent", "escape", "event", "fileUpload", "focus",
			"form", "forms", "frame", "innerHeight", "innerWidth", "layer", "layers", "link", "location",
			"mimeTypes", "navigate", "navigator", "frames", "frameRate", "hidden", "history", "image",
			"images", "offscreenBuffering", "open", "opener", "option", "outerHeight", "outerWidth",
			"packages", "pageXOffset", "pageYOffset", "parent", "parseFloat", "parseInt", "password", "pkcs11",
			"plugin", "prompt", "propertyIsEnum", "radio", "reset", "screenX", "screenY", "scroll", "secure",
			"select", "self", "setInterval", "setTimeout", "status", "submit", "taint", "text", "textarea",
			"top", "unescape", "untaint", "window",

			"onblur", "onclick", "onerror", "onfocus", "onkeydown", "onkeypress", "onkeyup", "onmouseover",
			"onload", "onmouseup", "onmousedown", "onsubmit"
		]);

		// get all global names
		modulesWithInfo.forEach(info => {
			if(info.globalScope) {
				info.globalScope.through.forEach(reference => {
					const name = reference.identifier.name;
					if(/^__WEBPACK_MODULE_REFERENCE__\d+_([\da-f]+|ns)(_call)?__$/.test(name)) {
						for(const s of getSymbolsFromScope(reference.from, info.moduleScope)) {
							allUsedNames.add(s);
						}
					} else {
						allUsedNames.add(name);
					}
				});
			}
		});

		// generate names for symbols
		modulesWithInfo.forEach(info => {
			switch(info.type) {
				case "concatenated":
					{
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
						break;
					}
				case "external":
					{
						info.interop = info.module.meta && !info.module.meta.harmonyModule;
						const externalName = this.findNewName("", allUsedNames, null, info.module.readableIdentifier(requestShortener));
						allUsedNames.add(externalName);
						info.name = externalName;
						if(info.interop) {
							const externalNameInterop = this.findNewName("default", allUsedNames, null, info.module.readableIdentifier(requestShortener));
							allUsedNames.add(externalNameInterop);
							info.interopName = externalNameInterop;
						}
						break;
					}
			}
		});

		// Find and replace referenced to modules
		modulesWithInfo.forEach(info => {
			if(info.type === "concatenated") {
				info.globalScope.through.forEach(reference => {
					const name = reference.identifier.name;
					const match = /^__WEBPACK_MODULE_REFERENCE__(\d+)_([\da-f]+|ns)(_call)?__$/.exec(name);
					if(match) {
						const referencedModule = modulesWithInfo[+match[1]];
						let exportName;
						if(match[2] === "ns") {
							exportName = true;
						} else {
							const exportData = match[2];
							exportName = new Buffer(exportData, "hex").toString("utf-8"); // eslint-disable-line node/no-deprecated-api
						}
						const asCall = !!match[3];
						const finalName = getFinalName(referencedModule, exportName, moduleToInfoMap, requestShortener, asCall);
						const r = reference.identifier.range;
						const source = info.source;
						source.replace(r[0], r[1] - 1, finalName);
					}
				});
			}
		});

		const result = new ConcatSource();

		// add harmony compatibility flag (must be first because of possible circular dependencies)
		const usedExports = this.rootModule.usedExports;
		if(usedExports === true) {
			result.add(`Object.defineProperty(${this.exportsArgument || "exports"}, "__esModule", { value: true });\n`);
		}

		// define required namespace objects (must be before evaluation modules)
		modulesWithInfo.forEach(info => {
			if(info.namespaceObjectSource) {
				result.add(info.namespaceObjectSource);
			}
		});

		// evaluate modules in order
		modulesWithInfo.forEach(info => {
			switch(info.type) {
				case "concatenated":
					result.add(`\n// CONCATENATED MODULE: ${info.module.readableIdentifier(requestShortener)}\n`);
					result.add(info.source);
					break;
				case "external":
					result.add(`\n// EXTERNAL MODULE: ${info.module.readableIdentifier(requestShortener)}\n`);
					result.add(`var ${info.name} = __webpack_require__(${JSON.stringify(info.module.id)});\n`);
					if(info.interop) {
						result.add(`var ${info.interopName} = /*#__PURE__*/__webpack_require__.n(${info.name});\n`);
					}
					break;
				default:
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
		});

		return result;
	}

	findNewName(oldName, usedNamed1, usedNamed2, extraInfo) {
		let name = oldName;

		if(name === "__WEBPACK_MODULE_DEFAULT_EXPORT__")
			name = "";

		// Remove uncool stuff
		extraInfo = extraInfo.replace(/\.+\/|(\/index)?\.([a-zA-Z0-9]{1,4})($|\s|\?)|\s*\+\s*\d+\s*modules/g, "");

		const splittedInfo = extraInfo.split("/");
		while(splittedInfo.length) {
			name = splittedInfo.pop() + (name ? "_" + name : "");
			const nameIdent = Template.toIdentifier(name);
			if(!usedNamed1.has(nameIdent) && (!usedNamed2 || !usedNamed2.has(nameIdent))) return nameIdent;
		}

		let i = 0;
		let nameWithNumber = Template.toIdentifier(`${name}_${i}`);
		while(usedNamed1.has(nameWithNumber) || (usedNamed2 && usedNamed2.has(nameWithNumber))) {
			i++;
			nameWithNumber = Template.toIdentifier(`${name}_${i}`);
		}
		return nameWithNumber;
	}

	updateHash(hash) {
		for(const info of this._orderedConcatenationList) {
			switch(info.type) {
				case "concatenated":
					info.module.updateHash(hash);
					break;
				case "external":
					hash.update(`${info.module.id}`);
					break;
			}
		}
		super.updateHash(hash);
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
		let content;
		if(dep.id === null) {
			content = `__WEBPACK_MODULE_REFERENCE__${info.index}_ns__`;
		} else if(dep.namespaceObjectAsContext) {
			content = `__WEBPACK_MODULE_REFERENCE__${info.index}_ns__[${JSON.stringify(dep.id)}]`;
		} else {
			const exportData = new Buffer(dep.id, "utf-8").toString("hex"); // eslint-disable-line node/no-deprecated-api
			content = `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportData}${dep.call ? "_call" : ""}__`;
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
		let content = "/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = ";
		if(dep.originModule === this.rootModule) {
			const used = dep.originModule.isUsed("default");
			const exportsName = dep.originModule.exportsArgument || "exports";
			if(used) content += `${exportsName}[${JSON.stringify(used)}] = `;
		}

		if(dep.range) {
			source.replace(dep.rangeStatement[0], dep.range[0] - 1, content + "(");
			source.replace(dep.range[1], dep.rangeStatement[1] - 1, ");");
			return;
		}

		source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
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
						const exportData = new Buffer(def.id, "utf-8").toString("hex"); // eslint-disable-line node/no-deprecated-api
						finalName = `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportData}__`;
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
		// do nothing
	}
}

module.exports = ConcatenatedModule;
