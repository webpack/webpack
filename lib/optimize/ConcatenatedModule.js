/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const eslintScope = require("eslint-scope");
const { ConcatSource, ReplaceSource } = require("webpack-sources");
const DependencyTemplate = require("../DependencyTemplate");
const InitFragment = require("../InitFragment");
const JavascriptParser = require("../JavascriptParser");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const DependencyReference = require("../dependencies/DependencyReference");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");
const HarmonyExportExpressionDependency = require("../dependencies/HarmonyExportExpressionDependency");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyExportSpecifierDependency = require("../dependencies/HarmonyExportSpecifierDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");
const createHash = require("../util/createHash");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module").SourceContext} SourceContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/createHash").Hash} Hash */

const RESERVED_NAMES = [
	// internal name
	"__WEBPACK_MODULE_DEFAULT_EXPORT__",

	// keywords
	"abstract,arguments,async,await,boolean,break,byte,case,catch,char,class,const,continue",
	"debugger,default,delete,do,double,else,enum,eval,export,extends,false,final,finally,float",
	"for,function,goto,if,implements,import,in,instanceof,int,interface,let,long,native,new,null",
	"package,private,protected,public,return,short,static,super,switch,synchronized,this,throw",
	"throws,transient,true,try,typeof,var,void,volatile,while,with,yield",

	// commonjs
	"module,__dirname,__filename,exports",

	// js globals
	"Array,Date,eval,function,hasOwnProperty,Infinity,isFinite,isNaN,isPrototypeOf,length,Math",
	"NaN,name,Number,Object,prototype,String,toString,undefined,valueOf",

	// browser globals
	"alert,all,anchor,anchors,area,assign,blur,button,checkbox,clearInterval,clearTimeout",
	"clientInformation,close,closed,confirm,constructor,crypto,decodeURI,decodeURIComponent",
	"defaultStatus,document,element,elements,embed,embeds,encodeURI,encodeURIComponent,escape",
	"event,fileUpload,focus,form,forms,frame,innerHeight,innerWidth,layer,layers,link,location",
	"mimeTypes,navigate,navigator,frames,frameRate,hidden,history,image,images,offscreenBuffering",
	"open,opener,option,outerHeight,outerWidth,packages,pageXOffset,pageYOffset,parent,parseFloat",
	"parseInt,password,pkcs11,plugin,prompt,propertyIsEnum,radio,reset,screenX,screenY,scroll",
	"secure,select,self,setInterval,setTimeout,status,submit,taint,text,textarea,top,unescape",
	"untaint,window",

	// window events
	"onblur,onclick,onerror,onfocus,onkeydown,onkeypress,onkeyup,onmouseover,onload,onmouseup,onmousedown,onsubmit"
]
	.join(",")
	.split(",");

/**
 * @typedef {Object} ConcatenationEntry
 * @property {"concatenated" | "external"} type
 * @property {Module} module
 */

const ensureNsObjSource = (
	moduleGraph,
	info,
	moduleToInfoMap,
	requestShortener,
	strictHarmonyModule
) => {
	if (!info.hasNamespaceObject) {
		info.hasNamespaceObject = true;
		const name = info.exportMap.get(true);
		const nsObj = [
			`var ${name} = {};`,
			`${RuntimeGlobals.makeNamespaceObject}(${name});`
		];
		for (const exportName of info.module.buildMeta.providedExports) {
			const finalName = getFinalName(
				moduleGraph,
				info,
				exportName,
				moduleToInfoMap,
				requestShortener,
				false,
				strictHarmonyModule
			);
			nsObj.push(
				`${RuntimeGlobals.definePropertyGetter}(${name}, ${JSON.stringify(
					exportName
				)}, function() { return ${finalName}; });`
			);
		}
		info.namespaceObjectSource = nsObj.join("\n") + "\n";
	}
};

const getExternalImport = (
	moduleGraph,
	importedModule,
	info,
	exportName,
	asCall,
	strictHarmonyModule
) => {
	const used = importedModule.getUsedName(moduleGraph, exportName);
	if (!used) return "/* unused reexport */undefined";
	const comment =
		used !== exportName ? ` ${Template.toNormalComment(exportName)}` : "";
	switch (importedModule.buildMeta.exportsType) {
		case "named":
			if (exportName === "default") {
				return info.name;
			} else if (exportName === true) {
				info.interopNamespaceObjectUsed = true;
				return info.interopNamespaceObjectName;
			} else {
				break;
			}
		case "namespace":
			if (exportName === true) {
				return info.name;
			} else {
				break;
			}
		default:
			if (strictHarmonyModule) {
				if (exportName === "default") {
					return info.name;
				} else if (exportName === true) {
					info.interopNamespaceObjectUsed = true;
					return info.interopNamespaceObjectName;
				} else {
					return "/* non-default import from non-esm module */undefined";
				}
			} else {
				if (exportName === "default") {
					info.interopDefaultAccessUsed = true;
					return asCall
						? `${info.interopDefaultAccessName}()`
						: `${info.interopDefaultAccessName}.a`;
				} else if (exportName === true) {
					return info.name;
				} else {
					break;
				}
			}
	}
	const reference = `${info.name}[${JSON.stringify(used)}${comment}]`;
	if (asCall) return `Object(${reference})`;
	return reference;
};

const getFinalName = (
	moduleGraph,
	info,
	exportName,
	moduleToInfoMap,
	requestShortener,
	asCall,
	strictHarmonyModule,
	alreadyVisited = new Set()
) => {
	switch (info.type) {
		case "concatenated": {
			const directExport = info.exportMap.get(exportName);
			if (directExport) {
				if (exportName === true) {
					ensureNsObjSource(
						moduleGraph,
						info,
						moduleToInfoMap,
						requestShortener,
						strictHarmonyModule
					);
				} else if (!info.module.isExportUsed(moduleGraph, exportName)) {
					return "/* unused export */ undefined";
				}
				if (info.globalExports.has(directExport)) {
					return directExport;
				}
				const name = info.internalNames.get(directExport);
				if (!name) {
					throw new Error(
						`The export "${directExport}" in "${info.module.readableIdentifier(
							requestShortener
						)}" has no internal name`
					);
				}
				return name;
			}
			const reexport = info.reexportMap.get(exportName);
			if (reexport) {
				if (alreadyVisited.has(reexport)) {
					throw new Error(
						`Circular reexports ${Array.from(
							alreadyVisited,
							e =>
								`"${e.module.readableIdentifier(requestShortener)}".${
									e.exportName
								}`
						).join(
							" --> "
						)} -(circular)-> "${reexport.module.readableIdentifier(
							requestShortener
						)}".${reexport.exportName}`
					);
				}
				alreadyVisited.add(reexport);
				const refInfo = moduleToInfoMap.get(reexport.module);
				if (refInfo) {
					// module is in the concatenation
					return getFinalName(
						moduleGraph,
						refInfo,
						reexport.exportName,
						moduleToInfoMap,
						requestShortener,
						asCall,
						strictHarmonyModule,
						alreadyVisited
					);
				}
			}
			const problem =
				`Cannot get final name for export "${exportName}" in "${info.module.readableIdentifier(
					requestShortener
				)}"` +
				` (known exports: ${Array.from(info.exportMap.keys())
					.filter(name => name !== true)
					.join(" ")}, ` +
				`known reexports: ${Array.from(info.reexportMap.keys()).join(" ")})`;
			return `${Template.toNormalComment(problem)} undefined`;
		}
		case "external": {
			const importedModule = info.module;
			return getExternalImport(
				moduleGraph,
				importedModule,
				info,
				exportName,
				asCall,
				strictHarmonyModule
			);
		}
	}
};

const addScopeSymbols1 = (s, nameSet, scopeSet) => {
	let scope = s;
	while (scope) {
		if (scopeSet.has(scope)) break;
		scopeSet.add(scope);
		for (const variable of scope.variables) {
			nameSet.add(variable.name);
		}
		scope = scope.upper;
	}
};

const addScopeSymbols2 = (s, nameSet, scopeSet1, scopeSet2) => {
	let scope = s;
	while (scope) {
		if (scopeSet1.has(scope)) break;
		if (scopeSet2.has(scope)) break;
		scopeSet1.add(scope);
		for (const variable of scope.variables) {
			nameSet.add(variable.name);
		}
		scope = scope.upper;
	}
};

const getAllReferences = variable => {
	let set = variable.references;
	// Look for inner scope variables too (like in class Foo { t() { Foo } })
	const identifiers = new Set(variable.identifiers);
	for (const scope of variable.scope.childScopes) {
		for (const innerVar of scope.variables) {
			if (innerVar.identifiers.some(id => identifiers.has(id))) {
				set = set.concat(innerVar.references);
				break;
			}
		}
	}
	return set;
};

const getPathInAst = (ast, node) => {
	if (ast === node) {
		return [];
	}

	const nr = node.range;

	const enterNode = n => {
		if (!n) return undefined;
		const r = n.range;
		if (r) {
			if (r[0] <= nr[0] && r[1] >= nr[1]) {
				const path = getPathInAst(n, node);
				if (path) {
					path.push(n);
					return path;
				}
			}
		}
		return undefined;
	};

	var i;
	if (Array.isArray(ast)) {
		for (i = 0; i < ast.length; i++) {
			const enterResult = enterNode(ast[i]);
			if (enterResult !== undefined) return enterResult;
		}
	} else if (ast && typeof ast === "object") {
		const keys = Object.keys(ast);
		for (i = 0; i < keys.length; i++) {
			const value = ast[keys[i]];
			if (Array.isArray(value)) {
				const pathResult = getPathInAst(value, node);
				if (pathResult !== undefined) return pathResult;
			} else if (value && typeof value === "object") {
				const enterResult = enterNode(value);
				if (enterResult !== undefined) return enterResult;
			}
		}
	}
};

class ConcatenatedModule extends Module {
	/**
	 * @param {Module} rootModule the root module of the concatenation
	 * @param {Set<Module>} modules all modules in the concantenation (including the root module)
	 * @param {Compilation} compilation the compilation
	 */
	constructor(rootModule, modules, compilation) {
		super("javascript/esm", null);

		const moduleGraph = compilation.moduleGraph;

		// Info from Factory
		this.rootModule = rootModule;
		this.factoryMeta = rootModule.factoryMeta;

		// Info from Optimization
		moduleGraph.setUsedExports(this, moduleGraph.getUsedExports(rootModule));

		const modulesArray = Array.from(modules);

		// Info from Build
		this.buildInfo = {
			strict: true,
			cacheable: modulesArray.every(m => m.buildInfo.cacheable),
			moduleArgument: rootModule.buildInfo.moduleArgument,
			exportsArgument: rootModule.buildInfo.exportsArgument,
			fileDependencies: new Set(),
			contextDependencies: new Set(),
			assets: undefined
		};
		this.buildMeta = rootModule.buildMeta;

		// Caching
		this._numberOfConcatenatedModules = modules.size;

		// Graph
		const modulesSet = new Set(modules);

		this.dependencies = [];

		this.warnings = [];
		this.errors = [];
		this._orderedConcatenationList = ConcatenatedModule._createConcatenationList(
			rootModule,
			modulesSet,
			compilation
		);
		for (const info of this._orderedConcatenationList) {
			if (info.type === "concatenated") {
				const m = info.module;

				// populate dependencies
				for (const d of m.dependencies.filter(
					dep =>
						!(dep instanceof HarmonyImportDependency) ||
						!modulesSet.has(compilation.moduleGraph.getModule(dep))
				)) {
					this.dependencies.push(d);
				}
				// populate file dependencies
				if (m.buildInfo.fileDependencies) {
					for (const file of m.buildInfo.fileDependencies) {
						this.buildInfo.fileDependencies.add(file);
					}
				}
				// populate context dependencies
				if (m.buildInfo.contextDependencies) {
					for (const context of m.buildInfo.contextDependencies) {
						this.buildInfo.contextDependencies.add(context);
					}
				}
				// populate warnings
				for (const warning of m.warnings) {
					this.warnings.push(warning);
				}
				// populate errors
				for (const error of m.errors) {
					this.errors.push(error);
				}

				if (m.buildInfo.assets) {
					if (this.buildInfo.assets === undefined) {
						this.buildInfo.assets = Object.create(null);
					}
					Object.assign(this.buildInfo.assets, m.buildInfo.assets);
				}
			}
		}
		this._identifier = this._createIdentifier();
	}

	get modules() {
		return this._orderedConcatenationList
			.filter(info => info.type === "concatenated")
			.map(info => info.module);
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return (
			this.rootModule.readableIdentifier(requestShortener) +
			` + ${this._numberOfConcatenatedModules - 1} modules`
		);
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return this.rootModule.libIdent(options);
	}

	/**
	 * @returns {string | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		return this.rootModule.nameForCondition();
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		throw new Error("Cannot build this module. It should be already built.");
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		// Guess size from embedded modules
		return this._orderedConcatenationList.reduce((sum, info) => {
			switch (info.type) {
				case "concatenated":
					return sum + info.module.size();
				case "external":
					return sum + 5;
			}
			return sum;
		}, 0);
	}

	/**
	 * @private
	 * @param {Module} rootModule the root of the concatenation
	 * @param {Set<Module>} modulesSet a set of modules which should be concatenated
	 * @param {Compilation} compilation the compilation context
	 * @returns {ConcatenationEntry[]} concatenation list
	 */
	static _createConcatenationList(rootModule, modulesSet, compilation) {
		const list = [];
		const set = new Set();

		/**
		 * @param {Module} module a module
		 * @returns {(function(): Module)[]} imported modules in order
		 */
		const getConcatenatedImports = module => {
			const references = module.dependencies
				.filter(dep => dep instanceof HarmonyImportDependency)
				.map(dep => compilation.getDependencyReference(module, dep))
				.filter(ref => ref !== null);
			DependencyReference.sort(references);
			return references.map(ref => {
				return () => ref.module;
			});
		};

		const enterModule = getModule => {
			const module = getModule();
			if (!module) return;
			if (set.has(module)) return;
			set.add(module);
			if (modulesSet.has(module)) {
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
		};

		enterModule(() => rootModule);

		return list;
	}

	_createIdentifier() {
		let orderedConcatenationListIdentifiers = "";
		for (let i = 0; i < this._orderedConcatenationList.length; i++) {
			if (this._orderedConcatenationList[i].type === "concatenated") {
				orderedConcatenationListIdentifiers += this._orderedConcatenationList[
					i
				].module.identifier();
				orderedConcatenationListIdentifiers += " ";
			}
		}
		const hash = createHash("md4");
		hash.update(orderedConcatenationListIdentifiers);
		return this.rootModule.identifier() + " " + hash.digest("hex");
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source({ dependencyTemplates, runtimeTemplate, moduleGraph, chunkGraph }) {
		const requestShortener = runtimeTemplate.requestShortener;
		// Metainfo for each module
		const modulesWithInfo = this._orderedConcatenationList.map((info, idx) => {
			switch (info.type) {
				case "concatenated": {
					const exportMap = new Map();
					const reexportMap = new Map();
					for (const dep of info.module.dependencies) {
						if (dep instanceof HarmonyExportSpecifierDependency) {
							if (!exportMap.has(dep.name)) {
								exportMap.set(dep.name, dep.id);
							}
						} else if (dep instanceof HarmonyExportExpressionDependency) {
							if (!exportMap.has("default")) {
								exportMap.set("default", "__WEBPACK_MODULE_DEFAULT_EXPORT__");
							}
						} else if (
							dep instanceof HarmonyExportImportedSpecifierDependency
						) {
							const exportName = dep.name;
							const importName = dep.id;
							const importedModule = moduleGraph.getModule(dep);
							if (exportName && importName) {
								if (!reexportMap.has(exportName)) {
									reexportMap.set(exportName, {
										module: importedModule,
										exportName: importName,
										dependency: dep
									});
								}
							} else if (exportName) {
								if (!reexportMap.has(exportName)) {
									reexportMap.set(exportName, {
										module: importedModule,
										exportName: true,
										dependency: dep
									});
								}
							} else if (
								importedModule &&
								Array.isArray(importedModule.buildMeta.providedExports)
							) {
								for (const name of importedModule.buildMeta.providedExports) {
									if (dep.activeExports.has(name) || name === "default") {
										continue;
									}
									if (!reexportMap.has(name)) {
										reexportMap.set(name, {
											module: importedModule,
											exportName: name,
											dependency: dep
										});
									}
								}
							}
						}
					}
					return {
						type: "concatenated",
						module: info.module,
						index: idx,
						ast: undefined,
						internalSource: undefined,
						source: undefined,
						globalScope: undefined,
						moduleScope: undefined,
						internalNames: new Map(),
						globalExports: new Set(),
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
						interopNamespaceObjectUsed: false,
						interopNamespaceObjectName: undefined,
						interopDefaultAccessUsed: false,
						interopDefaultAccessName: undefined
					};
				default:
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
		});

		// Create mapping from module to info
		const moduleToInfoMap = new Map();
		for (const m of modulesWithInfo) {
			moduleToInfoMap.set(m.module, m);
		}

		// Configure template decorators for dependencies
		const innerDependencyTemplates = dependencyTemplates.clone();

		innerDependencyTemplates.set(
			HarmonyImportSpecifierDependency,
			new HarmonyImportSpecifierDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyImportSpecifierDependency),
				moduleToInfoMap
			)
		);
		innerDependencyTemplates.set(
			HarmonyImportSideEffectDependency,
			new HarmonyImportSideEffectDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyImportSideEffectDependency),
				moduleToInfoMap
			)
		);
		innerDependencyTemplates.set(
			HarmonyExportSpecifierDependency,
			new HarmonyExportSpecifierDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyExportSpecifierDependency),
				this.rootModule
			)
		);
		innerDependencyTemplates.set(
			HarmonyExportExpressionDependency,
			new HarmonyExportExpressionDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyExportExpressionDependency),
				this.rootModule
			)
		);
		innerDependencyTemplates.set(
			HarmonyExportImportedSpecifierDependency,
			new HarmonyExportImportedSpecifierDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyExportImportedSpecifierDependency),
				this.rootModule,
				moduleToInfoMap
			)
		);
		innerDependencyTemplates.set(
			HarmonyCompatibilityDependency,
			new HarmonyCompatibilityDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyCompatibilityDependency),
				this.rootModule,
				moduleToInfoMap
			)
		);

		// Must use full identifier in our cache here to ensure that the source
		// is updated should our dependencies list change.
		// TODO webpack 5 refactor
		innerDependencyTemplates.updateHash(this.identifier());

		// Generate source code and analyse scopes
		// Prepare a ReplaceSource for the final source
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				const m = info.module;
				const source = m.source({
					dependencyTemplates: innerDependencyTemplates,
					runtimeTemplate,
					moduleGraph,
					chunkGraph
				});
				const code = source.source();
				let ast;
				try {
					ast = JavascriptParser.parse(code, {
						sourceType: "module"
					});
				} catch (err) {
					if (
						err.loc &&
						typeof err.loc === "object" &&
						typeof err.loc.line === "number"
					) {
						const lineNumber = err.loc.line;
						const lines = code.split("\n");
						err.message +=
							"\n| " +
							lines
								.slice(Math.max(0, lineNumber - 3), lineNumber + 2)
								.join("\n| ");
					}
					throw err;
				}
				const scopeManager = eslintScope.analyze(ast, {
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
				info.internalSource = source;
				info.source = resultSource;
				info.globalScope = globalScope;
				info.moduleScope = moduleScope;
			}
		}

		// List of all used names to avoid conflicts
		const allUsedNames = new Set(RESERVED_NAMES);

		// Set of already checked scopes
		const alreadyCheckedScopes = new Set();

		// get all global names
		for (const info of modulesWithInfo) {
			const superClassExpressions = [];

			// ignore symbols from moduleScope
			if (info.moduleScope) {
				alreadyCheckedScopes.add(info.moduleScope);

				// The super class expression in class scopes behaves weird
				// We store ranges of all super class expressions to make
				// renaming to work correctly
				for (const childScope of info.moduleScope.childScopes) {
					if (childScope.type !== "class") continue;
					if (!childScope.block.superClass) continue;
					superClassExpressions.push({
						range: childScope.block.superClass.range,
						variables: childScope.variables
					});
				}
			}

			// add global symbols
			if (info.globalScope) {
				for (const reference of info.globalScope.through) {
					const name = reference.identifier.name;
					if (
						/^__WEBPACK_MODULE_REFERENCE__\d+_([\da-f]+|ns)(_call)?(_strict)?__$/.test(
							name
						)
					) {
						for (const expr of superClassExpressions) {
							if (
								expr.range[0] <= reference.identifier.range[0] &&
								expr.range[1] >= reference.identifier.range[1]
							) {
								for (const variable of expr.variables) {
									allUsedNames.add(variable.name);
								}
							}
						}
						addScopeSymbols1(
							reference.from,
							allUsedNames,
							alreadyCheckedScopes
						);
					} else {
						allUsedNames.add(name);
					}
				}
			}

			// add exported globals
			if (info.type === "concatenated") {
				const variables = new Set();
				for (const variable of info.moduleScope.variables) {
					variables.add(variable.name);
				}
				for (const [, variable] of info.exportMap) {
					if (!variables.has(variable)) {
						info.globalExports.add(variable);
					}
				}
			}
		}

		// generate names for symbols
		for (const info of modulesWithInfo) {
			switch (info.type) {
				case "concatenated": {
					const namespaceObjectName = this.findNewName(
						"namespaceObject",
						allUsedNames,
						null,
						info.module.readableIdentifier(requestShortener)
					);
					allUsedNames.add(namespaceObjectName);
					info.internalNames.set(namespaceObjectName, namespaceObjectName);
					info.exportMap.set(true, namespaceObjectName);
					for (const variable of info.moduleScope.variables) {
						const name = variable.name;
						if (allUsedNames.has(name)) {
							const references = getAllReferences(variable);
							const symbolsInReferences = new Set();
							const alreadyCheckedInnerScopes = new Set();
							for (const ref of references) {
								addScopeSymbols2(
									ref.from,
									symbolsInReferences,
									alreadyCheckedInnerScopes,
									alreadyCheckedScopes
								);
							}
							const newName = this.findNewName(
								name,
								allUsedNames,
								symbolsInReferences,
								info.module.readableIdentifier(requestShortener)
							);
							allUsedNames.add(newName);
							info.internalNames.set(name, newName);
							const source = info.source;
							const allIdentifiers = new Set(
								references.map(r => r.identifier).concat(variable.identifiers)
							);
							for (const identifier of allIdentifiers) {
								const r = identifier.range;
								const path = getPathInAst(info.ast, identifier);
								if (
									path &&
									path.length > 1 &&
									path[1].type === "Property" &&
									path[1].shorthand
								) {
									source.insert(r[1], `: ${newName}`);
								} else {
									source.replace(r[0], r[1] - 1, newName);
								}
							}
						} else {
							allUsedNames.add(name);
							info.internalNames.set(name, name);
						}
					}
					break;
				}
				case "external": {
					const externalName = this.findNewName(
						"",
						allUsedNames,
						null,
						info.module.readableIdentifier(requestShortener)
					);
					allUsedNames.add(externalName);
					info.name = externalName;
					if (
						info.module.buildMeta.exportsType === "named" ||
						!info.module.buildMeta.exportsType
					) {
						const externalNameInterop = this.findNewName(
							"namespaceObject",
							allUsedNames,
							null,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(externalNameInterop);
						info.interopNamespaceObjectName = externalNameInterop;
					}
					if (!info.module.buildMeta.exportsType) {
						const externalNameInterop = this.findNewName(
							"default",
							allUsedNames,
							null,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(externalNameInterop);
						info.interopDefaultAccessName = externalNameInterop;
					}
					break;
				}
			}
		}

		// Find and replace referenced to modules
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				for (const reference of info.globalScope.through) {
					const name = reference.identifier.name;
					const match = /^__WEBPACK_MODULE_REFERENCE__(\d+)_([\da-f]+|ns)(_call)?(_strict)?__$/.exec(
						name
					);
					if (match) {
						const referencedModule = modulesWithInfo[+match[1]];
						let exportName;
						if (match[2] === "ns") {
							exportName = true;
						} else {
							const exportData = match[2];
							exportName = Buffer.from(exportData, "hex").toString("utf-8");
						}
						const asCall = !!match[3];
						const strictHarmonyModule = !!match[4];
						const finalName = getFinalName(
							moduleGraph,
							referencedModule,
							exportName,
							moduleToInfoMap,
							requestShortener,
							asCall,
							strictHarmonyModule
						);
						const r = reference.identifier.range;
						const source = info.source;
						source.replace(r[0], r[1] - 1, finalName);
					}
				}
			}
		}

		const result = new ConcatSource();

		// add harmony compatibility flag (must be first because of possible circular dependencies)
		const usedExports = moduleGraph.getUsedExports(this.rootModule);
		if (usedExports === true) {
			result.add(
				runtimeTemplate.defineEsModuleFlagStatement({
					exportsArgument: this.exportsArgument
				})
			);
		}

		// define required namespace objects (must be before evaluation modules)
		for (const info of modulesWithInfo) {
			if (info.namespaceObjectSource) {
				result.add(info.namespaceObjectSource);
			}
		}

		// evaluate modules in order
		for (const info of modulesWithInfo) {
			switch (info.type) {
				case "concatenated":
					result.add(
						`\n// CONCATENATED MODULE: ${info.module.readableIdentifier(
							requestShortener
						)}\n`
					);
					result.add(info.source);
					break;
				case "external":
					result.add(
						`\n// EXTERNAL MODULE: ${info.module.readableIdentifier(
							requestShortener
						)}\n`
					);
					result.add(
						`var ${info.name} = __webpack_require__(${JSON.stringify(
							chunkGraph.getModuleId(info.module)
						)});\n`
					);
					if (info.interopNamespaceObjectUsed) {
						if (info.module.buildMeta.exportsType === "named") {
							result.add(
								`var ${info.interopNamespaceObjectName} = /*#__PURE__*/${
									RuntimeGlobals.createFakeNamespaceObject
								}(${info.name}, 2);\n`
							);
						} else if (!info.module.buildMeta.exportsType) {
							result.add(
								`var ${info.interopNamespaceObjectName} = /*#__PURE__*/${
									RuntimeGlobals.createFakeNamespaceObject
								}(${info.name});\n`
							);
						}
					}
					if (info.interopDefaultAccessUsed) {
						result.add(
							`var ${info.interopDefaultAccessName} = /*#__PURE__*/${
								RuntimeGlobals.compatGetDefaultExport
							}(${info.name});\n`
						);
					}
					break;
				default:
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
		}

		return result;
	}

	findNewName(oldName, usedNamed1, usedNamed2, extraInfo) {
		let name = oldName;

		if (name === "__WEBPACK_MODULE_DEFAULT_EXPORT__") name = "";

		// Remove uncool stuff
		extraInfo = extraInfo.replace(
			/\.+\/|(\/index)?\.([a-zA-Z0-9]{1,4})($|\s|\?)|\s*\+\s*\d+\s*modules/g,
			""
		);

		const splittedInfo = extraInfo.split("/");
		while (splittedInfo.length) {
			name = splittedInfo.pop() + (name ? "_" + name : "");
			const nameIdent = Template.toIdentifier(name);
			if (
				!usedNamed1.has(nameIdent) &&
				(!usedNamed2 || !usedNamed2.has(nameIdent))
			)
				return nameIdent;
		}

		let i = 0;
		let nameWithNumber = Template.toIdentifier(`${name}_${i}`);
		while (
			usedNamed1.has(nameWithNumber) ||
			(usedNamed2 && usedNamed2.has(nameWithNumber))
		) {
			i++;
			nameWithNumber = Template.toIdentifier(`${name}_${i}`);
		}
		return nameWithNumber;
	}

	getRuntimeRequirements(chunkGraph) {
		const set = new Set([
			RuntimeGlobals.makeNamespaceObject,
			RuntimeGlobals.definePropertyGetter
		]);
		for (const info of this._orderedConcatenationList) {
			switch (info.type) {
				case "concatenated": {
					const req = info.module.getRuntimeRequirements(chunkGraph);
					if (req) {
						for (const r of req) set.add(r);
					}
					break;
				}
				case "external": {
					if (
						!info.module.buildMeta.exportsType ||
						info.module.buildMeta.exportsType === "named"
					) {
						set.add(RuntimeGlobals.createFakeNamespaceObject);
					}
					set.add(RuntimeGlobals.compatGetDefaultExport);
					break;
				}
			}
		}
		return set;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		for (const info of this._orderedConcatenationList) {
			switch (info.type) {
				case "concatenated":
					info.module.updateHash(hash, chunkGraph);
					break;
				case "external":
					hash.update(`${chunkGraph.getModuleId(info.module)}`);
					break;
			}
		}
		super.updateHash(hash, chunkGraph);
	}
}

class HarmonyImportSpecifierDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(originalTemplate, modulesMap) {
		super();
		this.originalTemplate = originalTemplate;
		this.modulesMap = modulesMap;
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { moduleGraph, module: parentModule } = templateContext;
		const dep = /** @type {HarmonyImportSpecifierDependency} */ (dependency);
		const module = moduleGraph.getModule(dep);
		const info = this.modulesMap.get(module);
		if (!info) {
			this.originalTemplate.apply(dependency, source, templateContext);
			return;
		}
		let content;
		const callFlag = dep.call ? "_call" : "";
		const strictFlag = parentModule.buildMeta.strictHarmonyModule
			? "_strict"
			: "";
		const id = dep.getId(moduleGraph);
		if (id === null) {
			content = `__WEBPACK_MODULE_REFERENCE__${info.index}_ns${strictFlag}__`;
		} else if (dep.namespaceObjectAsContext) {
			content = `__WEBPACK_MODULE_REFERENCE__${
				info.index
			}_ns${strictFlag}__[${JSON.stringify(id)}]`;
		} else {
			const exportData = Buffer.from(id, "utf-8").toString("hex");
			content = `__WEBPACK_MODULE_REFERENCE__${
				info.index
			}_${exportData}${callFlag}${strictFlag}__`;
		}
		if (dep.shorthand) {
			content = dep.name + ": " + content;
		}
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
}

class HarmonyImportSideEffectDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(originalTemplate, modulesMap) {
		super();
		this.originalTemplate = originalTemplate;
		this.modulesMap = modulesMap;
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { moduleGraph } = templateContext;
		const dep = /** @type {HarmonyImportSideEffectDependency} */ (dependency);
		const module = moduleGraph.getModule(dep);
		const info = this.modulesMap.get(module);
		if (!info) {
			this.originalTemplate.apply(dependency, source, templateContext);
			return;
		}
	}
}

class HarmonyExportSpecifierDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(originalTemplate, rootModule) {
		super();
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.module === this.rootModule) {
			this.originalTemplate.apply(dependency, source, templateContext);
		}
	}
}

class HarmonyExportExpressionDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(originalTemplate, rootModule) {
		super();
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, moduleGraph, initFragments }) {
		const dep = /** @type {HarmonyExportExpressionDependency} */ (dependency);

		if (module === this.rootModule) {
			const used = module.getUsedName(moduleGraph, "default");
			const exportsName = module.exportsArgument;
			initFragments.push(
				new InitFragment(
					`/* harmony export export */ ` +
						`${
							RuntimeGlobals.definePropertyGetter
						}(${exportsName}, ${JSON.stringify(used)}, ` +
						`function() { return __WEBPACK_MODULE_DEFAULT_EXPORT__; });\n`,
					InitFragment.STAGE_HARMONY_EXPORTS,
					1
				)
			);
		}

		const content =
			"/* harmony default export */ var __WEBPACK_MODULE_DEFAULT_EXPORT__ = ";

		if (dep.range) {
			source.replace(
				dep.rangeStatement[0],
				dep.range[0] - 1,
				content + "(" + dep.prefix
			);
			source.replace(dep.range[1], dep.rangeStatement[1] - 1, ");");
			return;
		}

		source.replace(
			dep.rangeStatement[0],
			dep.rangeStatement[1] - 1,
			content + dep.prefix
		);
	}
}

class HarmonyExportImportedSpecifierDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(originalTemplate, rootModule, modulesMap) {
		super();
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
		this.modulesMap = modulesMap;
	}

	/**
	 * @typedef {Object} GetExportsResultItem
	 * @property {string} name
	 * @property {string | true} id
	 */

	/**
	 * @param {HarmonyExportImportedSpecifierDependency} dep dependency
	 * @param {DependencyTemplateContext} templateContext template context
	 * @returns {GetExportsResultItem[]} exports
	 */
	getExports(dep, { moduleGraph }) {
		const importModule = moduleGraph.getModule(dep);
		if (dep.id) {
			// export { named } from "module"
			return [
				{
					name: dep.name,
					id: dep.id
				}
			];
		}
		if (dep.name) {
			// export * as abc from "module"
			return [
				{
					name: dep.name,
					id: true
				}
			];
		}
		// export * from "module"
		if (Array.isArray(importModule.buildMeta.providedExports)) {
			return importModule.buildMeta.providedExports
				.filter(exp => exp !== "default" && !dep.activeExports.has(exp))
				.map(exp => {
					return {
						name: exp,
						id: exp
					};
				});
		}

		// unknown, should not happen
		throw new Error("ConcatenatedModule: unknown exports");
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { module, moduleGraph, initFragments } = templateContext;
		const dep = /** @type {HarmonyExportImportedSpecifierDependency} */ (dependency);
		const importedModule = moduleGraph.getModule(dep);
		const info = this.modulesMap.get(importedModule);
		if (!info) {
			this.originalTemplate.apply(dependency, source, templateContext);
			return;
		} else if (module === this.rootModule) {
			const exportDefs = this.getExports(dep, templateContext);
			for (const def of exportDefs) {
				const used = module.getUsedName(moduleGraph, def.name);
				if (!used) {
					initFragments.push(
						new InitFragment(
							`/* unused concated harmony import ${dep.name} */\n`,
							InitFragment.STAGE_HARMONY_EXPORTS,
							1
						)
					);
					continue;
				}
				let finalName;
				const strictFlag = module.buildMeta.strictHarmonyModule
					? "_strict"
					: "";
				if (def.id === true) {
					finalName = `__WEBPACK_MODULE_REFERENCE__${
						info.index
					}_ns${strictFlag}__`;
				} else {
					const exportData = Buffer.from(def.id, "utf-8").toString("hex");
					finalName = `__WEBPACK_MODULE_REFERENCE__${
						info.index
					}_${exportData}${strictFlag}__`;
				}
				const exportsName = this.rootModule.exportsArgument;
				const content =
					`/* concated harmony reexport */ ${
						RuntimeGlobals.definePropertyGetter
					}(` +
					`${exportsName}, ${JSON.stringify(used)}, ` +
					`function() { return ${finalName}; });\n`;
				initFragments.push(
					new InitFragment(content, InitFragment.STAGE_HARMONY_EXPORTS, 1)
				);
			}
		}
	}
}

class HarmonyCompatibilityDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(originalTemplate, rootModule, modulesMap) {
		super();
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
		this.modulesMap = modulesMap;
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtimeTemplate, dependencyTemplates, moduleGraph }
	) {
		// do nothing
	}
}

module.exports = ConcatenatedModule;
