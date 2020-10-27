/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const eslintScope = require("eslint-scope");
const {
	CachedSource,
	ConcatSource,
	ReplaceSource
} = require("webpack-sources");
const ConcatenationScope = require("../ConcatenationScope");
const { UsageState } = require("../ExportsInfo");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const JavascriptParser = require("../javascript/JavascriptParser");
const { equals } = require("../util/ArrayHelpers");
const LazySet = require("../util/LazySet");
const { concatComparators, keepOriginalOrder } = require("../util/comparators");
const createHash = require("../util/createHash");
const contextify = require("../util/identifier").contextify;
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");
const {
	filterRuntime,
	mergeRuntime,
	runtimeToString,
	intersectRuntime
} = require("../util/runtime");

/** @typedef {import("eslint-scope").Scope} Scope */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../ExportsInfo").ExportInfo} ExportInfo */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {Object} ReexportInfo
 * @property {Module} module
 * @property {string[]} export
 */

/** @typedef {RawBinding | SymbolBinding} Binding */

/**
 * @typedef {Object} RawBinding
 * @property {ModuleInfo} info
 * @property {string} rawName
 * @property {string=} comment
 * @property {string[]} ids
 * @property {string[]} exportName
 */

/**
 * @typedef {Object} SymbolBinding
 * @property {ConcatenatedModuleInfo} info
 * @property {string} name
 * @property {string=} comment
 * @property {string[]} ids
 * @property {string[]} exportName
 */

/** @typedef {ConcatenatedModuleInfo | ExternalModuleInfo } ModuleInfo */

/**
 * @typedef {Object} ConcatenatedModuleInfo
 * @property {"concatenated"} type
 * @property {Module} module
 * @property {number} index
 * @property {Object} ast
 * @property {Source} internalSource
 * @property {ReplaceSource} source
 * @property {Iterable<string>} runtimeRequirements
 * @property {Scope} globalScope
 * @property {Scope} moduleScope
 * @property {Map<string, string>} internalNames
 * @property {Map<string, string>} exportMap
 * @property {Map<string, string>} rawExportMap
 * @property {string=} namespaceExportSymbol
 * @property {string} namespaceObjectName
 * @property {boolean} interopNamespaceObjectUsed
 * @property {string} interopNamespaceObjectName
 * @property {boolean} interopDefaultAccessUsed
 * @property {string} interopDefaultAccessName
 */

/**
 * @typedef {Object} ExternalModuleInfo
 * @property {"external"} type
 * @property {Module} module
 * @property {RuntimeSpec | boolean} runtimeCondition
 * @property {number} index
 * @property {string} name
 * @property {boolean} interopNamespaceObjectUsed
 * @property {string} interopNamespaceObjectName
 * @property {boolean} interopDefaultAccessUsed
 * @property {string} interopDefaultAccessName
 */

const RESERVED_NAMES = [
	// internal names (should always be renamed)
	ConcatenationScope.DEFAULT_EXPORT,
	ConcatenationScope.NAMESPACE_OBJECT_EXPORT,

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

const bySourceOrder = (a, b) => {
	const aOrder = a.sourceOrder;
	const bOrder = b.sourceOrder;
	if (isNaN(aOrder)) {
		if (!isNaN(bOrder)) {
			return 1;
		}
	} else {
		if (isNaN(bOrder)) {
			return -1;
		}
		if (aOrder !== bOrder) {
			return aOrder < bOrder ? -1 : 1;
		}
	}
	return 0;
};

const joinIterableWithComma = iterable => {
	// This is more performant than Array.from().join(", ")
	// as it doesn't create an array
	let str = "";
	let first = true;
	for (const item of iterable) {
		if (first) {
			first = false;
		} else {
			str += ", ";
		}
		str += item;
	}
	return str;
};

/**
 * @typedef {Object} ConcatenationEntry
 * @property {"concatenated" | "external"} type
 * @property {Module} module
 * @property {RuntimeSpec | boolean} runtimeCondition
 */

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ModuleInfo} info module info
 * @param {string[]} exportName exportName
 * @param {Map<Module, ModuleInfo>} moduleToInfoMap moduleToInfoMap
 * @param {RuntimeSpec} runtime for which runtime
 * @param {RequestShortener} requestShortener the request shortener
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {Set<ConcatenatedModuleInfo>} neededNamespaceObjects modules for which a namespace object should be generated
 * @param {boolean} asCall asCall
 * @param {boolean} strictHarmonyModule strictHarmonyModule
 * @param {boolean | undefined} asiSafe asiSafe
 * @param {Set<ExportInfo>} alreadyVisited alreadyVisited
 * @returns {Binding} the final variable
 */
const getFinalBinding = (
	moduleGraph,
	info,
	exportName,
	moduleToInfoMap,
	runtime,
	requestShortener,
	runtimeTemplate,
	neededNamespaceObjects,
	asCall,
	strictHarmonyModule,
	asiSafe,
	alreadyVisited = new Set()
) => {
	const exportsType = info.module.getExportsType(
		moduleGraph,
		strictHarmonyModule
	);
	if (exportName.length === 0) {
		switch (exportsType) {
			case "default-only":
			case "default-with-named":
				info.interopNamespaceObjectUsed = true;
				return {
					info,
					rawName: info.interopNamespaceObjectName,
					ids: exportName,
					exportName
				};
			case "namespace":
			case "dynamic":
				break;
			default:
				throw new Error(`Unexpected exportsType ${exportsType}`);
		}
	} else {
		switch (exportsType) {
			case "namespace":
				break;
			case "default-with-named":
				if (exportName[0] === "default") {
					exportName = exportName.slice(1);
				}
				break;
			case "default-only": {
				const exportId = exportName[0];
				exportName = exportName.slice(1);
				if (exportId !== "default") {
					return {
						info,
						rawName:
							"/* non-default import from default-exporting module */undefined",
						ids: exportName,
						exportName
					};
				}
				break;
			}
			case "dynamic":
				if (exportName[0] === "default") {
					exportName = exportName.slice(1);
					info.interopDefaultAccessUsed = true;
					const defaultExport = asCall
						? `${info.interopDefaultAccessName}()`
						: asiSafe
						? `(${info.interopDefaultAccessName}())`
						: asiSafe === false
						? `;(${info.interopDefaultAccessName}())`
						: `${info.interopDefaultAccessName}.a`;
					return {
						info,
						rawName: defaultExport,
						ids: exportName,
						exportName
					};
				}
				break;
			default:
				throw new Error(`Unexpected exportsType ${exportsType}`);
		}
	}
	if (exportName.length === 0) {
		switch (info.type) {
			case "concatenated":
				neededNamespaceObjects.add(info);
				return {
					info,
					rawName: info.namespaceObjectName,
					ids: exportName,
					exportName
				};
			case "external":
				return { info, rawName: info.name, ids: exportName, exportName };
		}
	}
	const exportsInfo = moduleGraph.getExportsInfo(info.module);
	const exportInfo = exportsInfo.getExportInfo(exportName[0]);
	if (alreadyVisited.has(exportInfo)) {
		return {
			info,
			rawName: "/* circular reexport */ Object(function x() { x() }())",
			ids: [],
			exportName
		};
	}
	alreadyVisited.add(exportInfo);
	switch (info.type) {
		case "concatenated": {
			const exportId = exportName[0];
			if (exportInfo.provided === false) {
				// It's not provided, but it could be on the prototype
				neededNamespaceObjects.add(info);
				return {
					info,
					rawName: info.namespaceObjectName,
					ids: exportName,
					exportName
				};
			}
			const directExport = info.exportMap && info.exportMap.get(exportId);
			if (directExport) {
				const usedName = /** @type {string[]} */ (exportsInfo.getUsedName(
					exportName,
					runtime
				));
				if (!usedName) {
					return {
						info,
						rawName: "/* unused export */ undefined",
						ids: exportName.slice(1),
						exportName
					};
				}
				return {
					info,
					name: directExport,
					ids: usedName.slice(1),
					exportName
				};
			}
			const rawExport = info.rawExportMap && info.rawExportMap.get(exportId);
			if (rawExport) {
				return {
					info,
					rawName: rawExport,
					ids: exportName.slice(1),
					exportName
				};
			}
			const reexport = exportInfo.findTarget(moduleGraph, module =>
				moduleToInfoMap.has(module)
			);
			if (reexport === false) {
				throw new Error(
					`Target module of reexport from '${info.module.readableIdentifier(
						requestShortener
					)}' is not part of the concatenation`
				);
			}
			if (reexport) {
				const refInfo = moduleToInfoMap.get(reexport.module);
				return getFinalBinding(
					moduleGraph,
					refInfo,
					reexport.export
						? [...reexport.export, ...exportName.slice(1)]
						: exportName.slice(1),
					moduleToInfoMap,
					runtime,
					requestShortener,
					runtimeTemplate,
					neededNamespaceObjects,
					asCall,
					info.module.buildMeta.strictHarmonyModule,
					asiSafe,
					alreadyVisited
				);
			}
			if (info.namespaceExportSymbol) {
				const usedName = /** @type {string[]} */ (exportsInfo.getUsedName(
					exportName,
					runtime
				));
				return {
					info,
					rawName: info.namespaceObjectName,
					ids: usedName,
					exportName
				};
			}
			throw new Error(
				`Cannot get final name for export '${exportName.join(
					"."
				)}' of ${info.module.readableIdentifier(requestShortener)}`
			);
		}

		case "external": {
			const used = /** @type {string[]} */ (exportsInfo.getUsedName(
				exportName,
				runtime
			));
			if (!used) {
				return {
					info,
					rawName: "/* unused export */ undefined",
					ids: exportName.slice(1),
					exportName
				};
			}
			const comment = equals(used, exportName)
				? ""
				: Template.toNormalComment(`${exportName.join(".")}`);
			return { info, rawName: info.name + comment, ids: used, exportName };
		}
	}
};

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ModuleInfo} info module info
 * @param {string[]} exportName exportName
 * @param {Map<Module, ModuleInfo>} moduleToInfoMap moduleToInfoMap
 * @param {RuntimeSpec} runtime for which runtime
 * @param {RequestShortener} requestShortener the request shortener
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {Set<ConcatenatedModuleInfo>} neededNamespaceObjects modules for which a namespace object should be generated
 * @param {boolean} asCall asCall
 * @param {boolean} callContext callContext
 * @param {boolean} strictHarmonyModule strictHarmonyModule
 * @param {boolean | undefined} asiSafe asiSafe
 * @returns {string} the final name
 */
const getFinalName = (
	moduleGraph,
	info,
	exportName,
	moduleToInfoMap,
	runtime,
	requestShortener,
	runtimeTemplate,
	neededNamespaceObjects,
	asCall,
	callContext,
	strictHarmonyModule,
	asiSafe
) => {
	const binding = getFinalBinding(
		moduleGraph,
		info,
		exportName,
		moduleToInfoMap,
		runtime,
		requestShortener,
		runtimeTemplate,
		neededNamespaceObjects,
		asCall,
		strictHarmonyModule,
		asiSafe
	);
	{
		const { ids, comment } = binding;
		let reference;
		let isPropertyAccess;
		if ("rawName" in binding) {
			reference = `${binding.rawName}${comment || ""}${propertyAccess(ids)}`;
			isPropertyAccess = ids.length > 0;
		} else {
			const { info, name: exportId } = binding;
			const name = info.internalNames.get(exportId);
			if (!name) {
				throw new Error(
					`The export "${exportId}" in "${info.module.readableIdentifier(
						requestShortener
					)}" has no internal name (existing names: ${
						Array.from(
							info.internalNames,
							([name, symbol]) => `${name}: ${symbol}`
						).join(", ") || "none"
					})`
				);
			}
			reference = `${name}${comment || ""}${propertyAccess(ids)}`;
			isPropertyAccess = ids.length > 1;
		}
		if (isPropertyAccess && asCall && callContext === false) {
			return asiSafe
				? `(0,${reference})`
				: asiSafe === false
				? `;(0,${reference})`
				: `Object(${reference})`;
		}
		return reference;
	}
};

const addScopeSymbols = (s, nameSet, scopeSet1, scopeSet2) => {
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

	if (Array.isArray(ast)) {
		for (let i = 0; i < ast.length; i++) {
			const enterResult = enterNode(ast[i]);
			if (enterResult !== undefined) return enterResult;
		}
	} else if (ast && typeof ast === "object") {
		const keys = Object.keys(ast);
		for (let i = 0; i < keys.length; i++) {
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

/**
 * @param {ModuleInfo[]} modulesWithInfo modules
 * @returns {Map<Module, ModuleInfo>} mapping
 */
const modulesWithInfoToMap = modulesWithInfo => {
	const moduleToInfoMap = new Map();
	for (const m of modulesWithInfo) {
		moduleToInfoMap.set(m.module, m);
	}
	return moduleToInfoMap;
};

const TYPES = new Set(["javascript"]);

class ConcatenatedModule extends Module {
	/**
	 * @param {Module} rootModule the root module of the concatenation
	 * @param {Set<Module>} modules all modules in the concatenation (including the root module)
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {Object=} associatedObjectForCache object for caching
	 * @returns {ConcatenatedModule} the module
	 */
	static create(rootModule, modules, runtime, associatedObjectForCache) {
		const identifier = ConcatenatedModule._createIdentifier(
			rootModule,
			modules,
			associatedObjectForCache
		);
		return new ConcatenatedModule({
			identifier,
			rootModule,
			modules,
			runtime
		});
	}

	/**
	 * @param {Object} options options
	 * @param {string} options.identifier the identifier of the module
	 * @param {Module=} options.rootModule the root module of the concatenation
	 * @param {RuntimeSpec} options.runtime the selected runtime
	 * @param {Set<Module>=} options.modules all concatenated modules
	 */
	constructor({ identifier, rootModule, modules, runtime }) {
		super("javascript/esm", null);

		// Info from Factory
		/** @type {string} */
		this._identifier = identifier;
		/** @type {Module} */
		this.rootModule = rootModule;
		/** @type {Set<Module>} */
		this._modules = modules;
		this._runtime = runtime;
		this.factoryMeta = rootModule && rootModule.factoryMeta;

		// Caching
		// TODO
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		const m = /** @type {ConcatenatedModule} */ (module);
		this._identifier = m._identifier;
		this.rootModule = m.rootModule;
		this._modules = m._modules;
		this._runtime = m._runtime;
	}
	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	get modules() {
		return Array.from(this._modules);
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
			` + ${this._modules.size - 1} modules`
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
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		const { rootModule } = this;
		this.buildInfo = {
			strict: true,
			cacheable: true,
			moduleArgument: rootModule.buildInfo.moduleArgument,
			exportsArgument: rootModule.buildInfo.exportsArgument,
			fileDependencies: new LazySet(),
			contextDependencies: new LazySet(),
			missingDependencies: new LazySet(),
			assets: undefined
		};
		this.buildMeta = rootModule.buildMeta;
		this.clearDependenciesAndBlocks();
		this.clearWarningsAndErrors();

		for (const m of this._modules) {
			// populate cacheable
			if (!m.buildInfo.cacheable) {
				this.buildInfo.cacheable = false;
			}

			// populate dependencies
			for (const d of m.dependencies.filter(
				dep =>
					!(dep instanceof HarmonyImportDependency) ||
					!this._modules.has(compilation.moduleGraph.getModule(dep))
			)) {
				this.dependencies.push(d);
			}
			// populate blocks
			for (const d of m.blocks) {
				this.blocks.push(d);
			}

			// populate warnings
			const warnings = m.getWarnings();
			if (warnings !== undefined) {
				for (const warning of warnings) {
					this.addWarning(warning);
				}
			}

			// populate errors
			const errors = m.getErrors();
			if (errors !== undefined) {
				for (const error of errors) {
					this.addError(error);
				}
			}

			// populate assets
			if (m.buildInfo.assets) {
				if (this.buildInfo.assets === undefined) {
					this.buildInfo.assets = Object.create(null);
				}
				Object.assign(this.buildInfo.assets, m.buildInfo.assets);
			}
			if (m.buildInfo.assetsInfo) {
				if (this.buildInfo.assetsInfo === undefined) {
					this.buildInfo.assetsInfo = new Map();
				}
				for (const [key, value] of m.buildInfo.assetsInfo) {
					this.buildInfo.assetsInfo.set(key, value);
				}
			}
		}
		callback();
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		// Guess size from embedded modules
		let size = 0;
		for (const module of this._modules) {
			size += module.size(type);
		}
		return size;
	}

	/**
	 * @private
	 * @param {Module} rootModule the root of the concatenation
	 * @param {Set<Module>} modulesSet a set of modules which should be concatenated
	 * @param {RuntimeSpec} runtime for this runtime
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConcatenationEntry[]} concatenation list
	 */
	_createConcatenationList(rootModule, modulesSet, runtime, moduleGraph) {
		/** @type {ConcatenationEntry[]} */
		const list = [];
		/** @type {Set<Module>} */
		const existingEntries = new Set();

		/**
		 * @param {Module} module a module
		 * @returns {Iterable<{ connection: ModuleGraphConnection, runtimeCondition: RuntimeSpec | boolean }>} imported modules in order
		 */
		const getConcatenatedImports = module => {
			let connections = Array.from(moduleGraph.getOutgoingConnections(module));
			if (module === rootModule) {
				for (const c of moduleGraph.getOutgoingConnections(this))
					connections.push(c);
			}
			const references = connections
				.filter(connection => {
					if (!(connection.dependency instanceof HarmonyImportDependency))
						return false;
					return (
						connection &&
						connection.resolvedOriginModule === module &&
						connection.module &&
						connection.isTargetActive(runtime)
					);
				})
				.map(connection => ({
					connection,
					sourceOrder: /** @type {HarmonyImportDependency} */ (connection.dependency)
						.sourceOrder
				}));
			references.sort(
				concatComparators(bySourceOrder, keepOriginalOrder(references))
			);
			/** @type {Map<Module, { connection, runtimeCondition }>} */
			const referencesMap = new Map();
			for (const { connection } of references) {
				const runtimeCondition = filterRuntime(runtime, r =>
					connection.isTargetActive(r)
				);
				const module = connection.module;
				const entry = referencesMap.get(module);
				if (entry === undefined) {
					referencesMap.set(module, { connection, runtimeCondition });
					continue;
				}
				if (runtimeCondition === false || entry.runtimeCondition === true)
					continue;
				if (entry.runtimeCondition === false || runtimeCondition === true) {
					entry.runtimeCondition = runtimeCondition;
					continue;
				}
				entry.runtimeCondition = mergeRuntime(
					entry.runtimeCondition,
					runtimeCondition
				);
			}
			return referencesMap.values();
		};

		/**
		 * @param {ModuleGraphConnection} connection graph connection
		 * @param {RuntimeSpec | boolean} runtimeCondition runtime condition
		 * @returns {void}
		 */
		const enterModule = (connection, runtimeCondition) => {
			const module = connection.module;
			if (!module) return;
			if (existingEntries.has(module)) {
				return;
			}
			if (modulesSet.has(module)) {
				existingEntries.add(module);
				if (runtimeCondition !== true) {
					throw new Error(
						`Cannot runtime-conditional concatenate a module (${module.identifier()} in ${this.rootModule.identifier()}, ${
							runtimeCondition && runtimeToString(runtimeCondition)
						}). This should not happen.`
					);
				}
				const imports = getConcatenatedImports(module);
				for (const { connection, runtimeCondition } of imports)
					enterModule(connection, runtimeCondition);
				list.push({
					type: "concatenated",
					module: connection.module,
					runtimeCondition
				});
			} else {
				existingEntries.add(connection.module);
				list.push({
					type: "external",
					get module() {
						// We need to use a getter here, because the module in the dependency
						// could be replaced by some other process (i. e. also replaced with a
						// concatenated module)
						return connection.module;
					},
					runtimeCondition
				});
			}
		};

		existingEntries.add(rootModule);
		const imports = getConcatenatedImports(rootModule);
		for (const { connection, runtimeCondition } of imports)
			enterModule(connection, runtimeCondition);
		list.push({
			type: "concatenated",
			module: rootModule,
			runtimeCondition: true
		});

		return list;
	}

	static _createIdentifier(rootModule, modules, associatedObjectForCache) {
		const cachedContextify = contextify.bindContextCache(
			rootModule.context,
			associatedObjectForCache
		);
		let identifiers = [];
		for (const module of modules) {
			identifiers.push(cachedContextify(module.identifier()));
		}
		identifiers.sort();
		const hash = createHash("md4");
		hash.update(identifiers.join(" "));
		return rootModule.identifier() + "|" + hash.digest("hex");
	}

	/**
	 * @param {LazySet<string>} fileDependencies set where file dependencies are added to
	 * @param {LazySet<string>} contextDependencies set where context dependencies are added to
	 * @param {LazySet<string>} missingDependencies set where missing dependencies are added to
	 * @param {LazySet<string>} buildDependencies set where build dependencies are added to
	 */
	addCacheDependencies(
		fileDependencies,
		contextDependencies,
		missingDependencies,
		buildDependencies
	) {
		for (const module of this._modules) {
			module.addCacheDependencies(
				fileDependencies,
				contextDependencies,
				missingDependencies,
				buildDependencies
			);
		}
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime: generationRuntime
	}) {
		/** @type {Set<string>} */
		const runtimeRequirements = new Set();
		const runtime = intersectRuntime(generationRuntime, this._runtime);

		const requestShortener = runtimeTemplate.requestShortener;
		// Meta info for each module
		const modulesWithInfo = this._getModulesWithInfo(moduleGraph, runtime);

		// Create mapping from module to info
		const moduleToInfoMap = modulesWithInfoToMap(modulesWithInfo);

		// Set with modules that need a generated namespace object
		/** @type {Set<ConcatenatedModuleInfo>} */
		const neededNamespaceObjects = new Set();

		// Generate source code and analyse scopes
		// Prepare a ReplaceSource for the final source
		for (const info of modulesWithInfo) {
			this._analyseModule(
				modulesWithInfo,
				info,
				dependencyTemplates,
				runtimeTemplate,
				moduleGraph,
				chunkGraph,
				runtime
			);
		}

		// List of all used names to avoid conflicts
		const allUsedNames = new Set(RESERVED_NAMES);

		// List of additional names in scope for module references
		/** @type {Map<string, { usedNames: Set<string>, alreadyCheckedScopes: Set<TODO> }>} */
		const usedNamesInScopeInfo = new Map();
		/**
		 * @param {string} module module identifier
		 * @param {string} id export id
		 * @returns {{ usedNames: Set<string>, alreadyCheckedScopes: Set<TODO> }} info
		 */
		const getUsedNamesInScopeInfo = (module, id) => {
			const key = `${module}-${id}`;
			let info = usedNamesInScopeInfo.get(key);
			if (info === undefined) {
				info = {
					usedNames: new Set(),
					alreadyCheckedScopes: new Set()
				};
				usedNamesInScopeInfo.set(key, info);
			}
			return info;
		};

		// Set of already checked scopes
		const ignoredScopes = new Set();

		// get all global names
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				const superClassExpressions = [];

				// ignore symbols from moduleScope
				if (info.moduleScope) {
					ignoredScopes.add(info.moduleScope);

					// The super class expression in class scopes behaves weird
					// We store ranges of all super class expressions to make
					// renaming to work correctly
					for (const childScope of info.moduleScope.childScopes) {
						if (childScope.type !== "class") continue;
						const block = childScope.block;
						if (
							(block.type === "ClassDeclaration" ||
								block.type === "ClassExpression") &&
							block.superClass
						) {
							superClassExpressions.push({
								range: block.superClass.range,
								variables: childScope.variables
							});
						}
					}
				}

				// add global symbols
				if (info.globalScope) {
					for (const reference of info.globalScope.through) {
						const name = reference.identifier.name;
						if (ConcatenationScope.isModuleReference(name)) {
							const match = ConcatenationScope.matchModuleReference(name);
							if (!match) continue;
							const binding = getFinalBinding(
								moduleGraph,
								modulesWithInfo[match.index],
								match.ids,
								moduleToInfoMap,
								runtime,
								requestShortener,
								runtimeTemplate,
								neededNamespaceObjects,
								false,
								info.module.buildMeta.strictHarmonyModule,
								true
							);
							if (!binding.ids) continue;
							const {
								usedNames,
								alreadyCheckedScopes
							} = getUsedNamesInScopeInfo(
								binding.info.module.identifier(),
								"name" in binding ? binding.name : ""
							);
							for (const expr of superClassExpressions) {
								if (
									expr.range[0] <= reference.identifier.range[0] &&
									expr.range[1] >= reference.identifier.range[1]
								) {
									for (const variable of expr.variables) {
										usedNames.add(variable.name);
									}
								}
							}
							addScopeSymbols(
								reference.from,
								usedNames,
								alreadyCheckedScopes,
								ignoredScopes
							);
						} else {
							allUsedNames.add(name);
						}
					}
				}
			}
		}

		// generate names for symbols
		for (const info of modulesWithInfo) {
			const { usedNames: namespaceObjectUsedNames } = getUsedNamesInScopeInfo(
				info.module.identifier(),
				""
			);
			switch (info.type) {
				case "concatenated": {
					for (const variable of info.moduleScope.variables) {
						const name = variable.name;
						const { usedNames, alreadyCheckedScopes } = getUsedNamesInScopeInfo(
							info.module.identifier(),
							name
						);
						if (allUsedNames.has(name) || usedNames.has(name)) {
							const references = getAllReferences(variable);
							for (const ref of references) {
								addScopeSymbols(
									ref.from,
									usedNames,
									alreadyCheckedScopes,
									ignoredScopes
								);
							}
							const newName = this.findNewName(
								name,
								allUsedNames,
								usedNames,
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
					let namespaceObjectName;
					if (info.namespaceExportSymbol) {
						namespaceObjectName = info.internalNames.get(
							info.namespaceExportSymbol
						);
					} else {
						namespaceObjectName = this.findNewName(
							"namespaceObject",
							allUsedNames,
							namespaceObjectUsedNames,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(namespaceObjectName);
					}
					info.namespaceObjectName = namespaceObjectName;
					break;
				}
				case "external": {
					const externalName = this.findNewName(
						"",
						allUsedNames,
						namespaceObjectUsedNames,
						info.module.readableIdentifier(requestShortener)
					);
					allUsedNames.add(externalName);
					info.name = externalName;
					break;
				}
			}
			if (
				info.module.buildMeta.exportsType === "default" ||
				info.module.buildMeta.exportsType === "flagged" ||
				info.module.buildMeta.exportsType === "dynamic" ||
				!info.module.buildMeta.exportsType
			) {
				const externalNameInterop = this.findNewName(
					"namespaceObject",
					allUsedNames,
					namespaceObjectUsedNames,
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(externalNameInterop);
				info.interopNamespaceObjectName = externalNameInterop;
			}
			if (
				info.module.buildMeta.exportsType === "dynamic" ||
				!info.module.buildMeta.exportsType
			) {
				const externalNameInterop = this.findNewName(
					"default",
					allUsedNames,
					namespaceObjectUsedNames,
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(externalNameInterop);
				info.interopDefaultAccessName = externalNameInterop;
			}
		}

		// Find and replace references to modules
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				for (const reference of info.globalScope.through) {
					const name = reference.identifier.name;
					const match = ConcatenationScope.matchModuleReference(name);
					if (match) {
						const finalName = getFinalName(
							moduleGraph,
							modulesWithInfo[match.index],
							match.ids,
							moduleToInfoMap,
							runtime,
							requestShortener,
							runtimeTemplate,
							neededNamespaceObjects,
							match.call,
							!match.directImport,
							info.module.buildMeta.strictHarmonyModule,
							match.asiSafe
						);
						const r = reference.identifier.range;
						const source = info.source;
						// range is extended by 2 chars to cover the appended "._"
						source.replace(r[0], r[1] + 1, finalName);
					}
				}
			}
		}

		// Map with all root exposed used exports
		/** @type {Map<string, function(RequestShortener): string>} */
		const exportsMap = new Map();

		// Set with all root exposed unused exports
		/** @type {Set<string>} */
		const unusedExports = new Set();

		const rootInfo = /** @type {ConcatenatedModuleInfo} */ (moduleToInfoMap.get(
			this.rootModule
		));
		const strictHarmonyModule = rootInfo.module.buildMeta.strictHarmonyModule;
		const exportsInfo = moduleGraph.getExportsInfo(rootInfo.module);
		for (const exportInfo of exportsInfo.orderedExports) {
			const name = exportInfo.name;
			if (exportInfo.provided === false) continue;
			const used = exportInfo.getUsedName(undefined, runtime);
			if (!used) {
				unusedExports.add(name);
				continue;
			}
			exportsMap.set(used, requestShortener => {
				const finalName = getFinalName(
					moduleGraph,
					rootInfo,
					[name],
					moduleToInfoMap,
					runtime,
					requestShortener,
					runtimeTemplate,
					neededNamespaceObjects,
					false,
					false,
					strictHarmonyModule,
					true
				);
				return `/* ${
					exportInfo.isReexport() ? "reexport" : "binding"
				} */ ${finalName}`;
			});
		}

		const result = new ConcatSource();

		// add harmony compatibility flag (must be first because of possible circular dependencies)
		if (
			moduleGraph.getExportsInfo(this).otherExportsInfo.getUsed(runtime) !==
			UsageState.Unused
		) {
			result.add(`// ESM COMPAT FLAG\n`);
			result.add(
				runtimeTemplate.defineEsModuleFlagStatement({
					exportsArgument: this.exportsArgument,
					runtimeRequirements
				})
			);
		}

		// define exports
		if (exportsMap.size > 0) {
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			const definitions = [];
			for (const [key, value] of exportsMap) {
				definitions.push(
					`\n  ${JSON.stringify(key)}: ${runtimeTemplate.returningFunction(
						value(requestShortener)
					)}`
				);
			}
			result.add(`\n// EXPORTS\n`);
			result.add(
				`${RuntimeGlobals.definePropertyGetters}(${
					this.exportsArgument
				}, {${definitions.join(",")}\n});\n`
			);
		}

		// list unused exports
		if (unusedExports.size > 0) {
			result.add(
				`\n// UNUSED EXPORTS: ${joinIterableWithComma(unusedExports)}\n`
			);
		}

		// generate namespace objects
		const namespaceObjectSources = new Map();
		for (const info of neededNamespaceObjects) {
			if (info.namespaceExportSymbol) continue;
			const nsObj = [];
			const exportsInfo = moduleGraph.getExportsInfo(info.module);
			for (const exportInfo of exportsInfo.orderedExports) {
				if (exportInfo.provided === false) continue;
				const usedName = exportInfo.getUsedName(undefined, runtime);
				if (usedName) {
					const finalName = getFinalName(
						moduleGraph,
						info,
						[exportInfo.name],
						moduleToInfoMap,
						runtime,
						requestShortener,
						runtimeTemplate,
						neededNamespaceObjects,
						false,
						undefined,
						info.module.buildMeta.strictHarmonyModule,
						true
					);
					nsObj.push(
						`\n  ${JSON.stringify(
							usedName
						)}: ${runtimeTemplate.returningFunction(finalName)}`
					);
				}
			}
			const name = info.namespaceObjectName;
			const defineGetters =
				nsObj.length > 0
					? `${RuntimeGlobals.definePropertyGetters}(${name}, {${nsObj.join(
							","
					  )}\n});\n`
					: "";
			if (nsObj.length > 0)
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			namespaceObjectSources.set(
				info,
				`
// NAMESPACE OBJECT: ${info.module.readableIdentifier(requestShortener)}
var ${name} = {};
${RuntimeGlobals.makeNamespaceObject}(${name});
${defineGetters}`
			);
			runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
		}

		// define required namespace objects (must be before evaluation modules)
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				const source = namespaceObjectSources.get(info);
				if (!source) continue;
				result.add(source);
			}
		}

		// evaluate modules in order
		for (const info of modulesWithInfo) {
			let name;
			let isConditional = false;
			switch (info.type) {
				case "concatenated": {
					result.add(
						`\n// CONCATENATED MODULE: ${info.module.readableIdentifier(
							requestShortener
						)}\n`
					);
					result.add(info.source);
					if (info.runtimeRequirements) {
						for (const r of info.runtimeRequirements) {
							runtimeRequirements.add(r);
						}
					}
					name = info.namespaceObjectName;
					break;
				}
				case "external": {
					result.add(
						`\n// EXTERNAL MODULE: ${info.module.readableIdentifier(
							requestShortener
						)}\n`
					);
					runtimeRequirements.add(RuntimeGlobals.require);
					const condition = runtimeTemplate.runtimeConditionExpression({
						chunkGraph,
						runtimeCondition: info.runtimeCondition,
						runtime,
						runtimeRequirements
					});
					if (condition !== "true") {
						isConditional = true;
						result.add(`if (${condition}) {\n`);
					}
					result.add(
						`var ${info.name} = __webpack_require__(${JSON.stringify(
							chunkGraph.getModuleId(info.module)
						)});`
					);
					name = info.name;
					break;
				}
				default:
					// @ts-expect-error never is expected here
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
			if (info.interopNamespaceObjectUsed) {
				if (info.module.buildMeta.exportsType === "default") {
					runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
					result.add(
						`\nvar ${info.interopNamespaceObjectName} = /*#__PURE__*/${RuntimeGlobals.createFakeNamespaceObject}(${name}, 2);`
					);
				} else if (
					info.module.buildMeta.exportsType === "flagged" ||
					info.module.buildMeta.exportsType === "dynamic" ||
					!info.module.buildMeta.exportsType
				) {
					runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
					result.add(
						`\nvar ${info.interopNamespaceObjectName} = /*#__PURE__*/${RuntimeGlobals.createFakeNamespaceObject}(${name});`
					);
				}
			}
			if (info.interopDefaultAccessUsed) {
				runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
				result.add(
					`\nvar ${info.interopDefaultAccessName} = /*#__PURE__*/${RuntimeGlobals.compatGetDefaultExport}(${name});`
				);
			}
			if (isConditional) {
				result.add("\n}");
			}
		}

		/** @type {CodeGenerationResult} */
		const resultEntry = {
			sources: new Map([["javascript", new CachedSource(result)]]),
			runtimeRequirements
		};

		return resultEntry;
	}

	/**
	 * @param {ModuleInfo[]} modulesWithInfo modulesWithInfo
	 * @param {ModuleInfo} info info
	 * @param {DependencyTemplates} dependencyTemplates dependencyTemplates
	 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
	 * @param {ModuleGraph} moduleGraph moduleGraph
	 * @param {ChunkGraph} chunkGraph chunkGraph
	 * @param {RuntimeSpec} runtime runtime
	 */
	_analyseModule(
		modulesWithInfo,
		info,
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime
	) {
		if (info.type === "concatenated") {
			const m = info.module;
			try {
				// Create a concatenation scope to track and capture information
				const concatenationScope = new ConcatenationScope(
					modulesWithInfo,
					info
				);

				// TODO cache codeGeneration results
				const codeGenResult = m.codeGeneration({
					dependencyTemplates,
					runtimeTemplate,
					moduleGraph,
					chunkGraph,
					runtime,
					concatenationScope
				});
				const source = codeGenResult.sources.get("javascript");
				const code = source.source().toString();
				let ast;
				try {
					ast = JavascriptParser._parse(code, {
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
				info.runtimeRequirements = codeGenResult.runtimeRequirements;
				info.ast = ast;
				info.internalSource = source;
				info.source = resultSource;
				info.globalScope = globalScope;
				info.moduleScope = moduleScope;
			} catch (err) {
				err.message += `\nwhile analysing module ${m.identifier()} for concatenation`;
				throw err;
			}
		}
	}

	/**
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {DependencyTemplates} dependencyTemplates dependency templates
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {string} hash
	 */
	_getHashDigest(chunkGraph, dependencyTemplates, runtime) {
		const hash = chunkGraph.getModuleHash(this, runtime);
		const dtHash = dependencyTemplates.getHash();
		return `${hash}-${dtHash}`;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {ModuleInfo[]} module info items
	 */
	_getModulesWithInfo(moduleGraph, runtime) {
		const orderedConcatenationList = this._createConcatenationList(
			this.rootModule,
			this._modules,
			runtime,
			moduleGraph
		);
		return orderedConcatenationList.map((info, index) => {
			switch (info.type) {
				case "concatenated": {
					return {
						type: "concatenated",
						module: info.module,
						index,
						ast: undefined,
						internalSource: undefined,
						runtimeRequirements: undefined,
						source: undefined,
						globalScope: undefined,
						moduleScope: undefined,
						internalNames: new Map(),
						exportMap: undefined,
						rawExportMap: undefined,
						namespaceExportSymbol: undefined,
						namespaceObjectName: undefined,
						interopNamespaceObjectUsed: false,
						interopNamespaceObjectName: undefined,
						interopDefaultAccessUsed: false,
						interopDefaultAccessName: undefined
					};
				}
				case "external":
					return {
						type: "external",
						module: info.module,
						runtimeCondition: info.runtimeCondition,
						index,
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
	}

	findNewName(oldName, usedNamed1, usedNamed2, extraInfo) {
		let name = oldName;

		if (name === ConcatenationScope.DEFAULT_EXPORT) {
			name = "";
		}
		if (name === ConcatenationScope.NAMESPACE_OBJECT_EXPORT) {
			name = "namespaceObject";
		}

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

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph, runtime } = context;
		for (const info of this._createConcatenationList(
			this.rootModule,
			this._modules,
			intersectRuntime(runtime, this._runtime),
			chunkGraph.moduleGraph
		)) {
			switch (info.type) {
				case "concatenated":
					info.module.updateHash(hash, context);
					break;
				case "external":
					hash.update(`${chunkGraph.getModuleId(info.module)}`);
					break;
			}
		}
		super.updateHash(hash, context);
	}

	static deserialize(context) {
		const obj = new ConcatenatedModule({
			identifier: undefined,
			rootModule: undefined,
			modules: undefined,
			runtime: undefined
		});
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(ConcatenatedModule, "webpack/lib/optimize/ConcatenatedModule");

module.exports = ConcatenatedModule;
