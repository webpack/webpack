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
const DependencyTemplate = require("../DependencyTemplate");
const { UsageState } = require("../ExportsInfo");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HarmonyCompatibilityDependency = require("../dependencies/HarmonyCompatibilityDependency");
const HarmonyExportExpressionDependency = require("../dependencies/HarmonyExportExpressionDependency");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyExportSpecifierDependency = require("../dependencies/HarmonyExportSpecifierDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");
const JavascriptParser = require("../javascript/JavascriptParser");
const LazySet = require("../util/LazySet");
const { concatComparators, keepOriginalOrder } = require("../util/comparators");
const createHash = require("../util/createHash");
const contextify = require("../util/identifier").contextify;
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
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
 * @property {string[]} exportName
 * @property {Dependency} dependency
 */

/**
 * @typedef {Object} Binding
 * @property {ModuleInfo} info
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
 * @property {TODO} globalScope
 * @property {TODO} moduleScope
 * @property {Map<string, string>} internalNames
 * @property {Map<string, string>} exportMap
 * @property {Map<string, ReexportInfo>} reexportMap
 * @property {boolean} hasNamespaceObject
 * @property {string} namespaceObjectName
 * @property {string} namespaceObjectSource
 */

/**
 * @typedef {Object} ExternalModuleInfo
 * @property {"external"} type
 * @property {Module} module
 * @property {number} index
 * @property {string} name
 * @property {boolean} interopNamespaceObjectUsed
 * @property {string} interopNamespaceObjectName
 * @property {boolean} interopDefaultAccessUsed
 * @property {string} interopDefaultAccessName
 */

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

const arrayEquals = (a, b) => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

/**
 * @typedef {Object} ConcatenationEntry
 * @property {"concatenated" | "external"} type
 * @property {Module} module
 */

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ConcatenatedModuleInfo} info module info
 * @param {Map<Module, ModuleInfo>} moduleToInfoMap moduleToInfoMap
 * @param {RuntimeSpec} runtime for which runtime
 * @param {RequestShortener} requestShortener requestShortener
 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
 * @param {boolean} strictHarmonyModule strictHarmonyModule
 * @returns {string} the name of the ns obj variable
 */
const ensureNsObjSource = (
	moduleGraph,
	info,
	moduleToInfoMap,
	runtime,
	requestShortener,
	runtimeTemplate,
	strictHarmonyModule
) => {
	const name = info.namespaceObjectName;
	if (!info.hasNamespaceObject) {
		info.hasNamespaceObject = true;
		const nsObj = [];
		const exportsInfo = moduleGraph.getExportsInfo(info.module);
		for (const exportInfo of exportsInfo.orderedExports) {
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
					false,
					undefined,
					strictHarmonyModule,
					true
				);
				nsObj.push(
					`\n  ${JSON.stringify(usedName)}: ${runtimeTemplate.returningFunction(
						finalName
					)}`
				);
			}
		}
		info.namespaceObjectSource = `var ${name} = {};\n${
			RuntimeGlobals.makeNamespaceObject
		}(${name});\n${RuntimeGlobals.definePropertyGetters}(${name}, {${nsObj.join(
			","
		)}\n});\n`;
	}
	return name;
};

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} importedModule module
 * @param {ExternalModuleInfo} info module info
 * @param {string[]} exportName exportName
 * @param {RuntimeSpec} runtime for which runtime
 * @param {boolean} asCall asCall
 * @param {boolean} callContext callContext
 * @param {boolean} strictHarmonyModule strictHarmonyModule
 * @param {boolean} asiSafe asiSafe
 * @returns {string} expression to get value of external module
 */
const getExternalImport = (
	moduleGraph,
	importedModule,
	info,
	exportName,
	runtime,
	asCall,
	callContext,
	strictHarmonyModule,
	asiSafe
) => {
	let exprStart = info.name;
	const exportsType = importedModule.getExportsType(strictHarmonyModule);
	if (exportName.length === 0) {
		switch (exportsType) {
			case "default-only":
			case "default-with-named":
				info.interopNamespaceObjectUsed = true;
				exprStart = info.interopNamespaceObjectName;
				break;
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
					exprStart = info.name;
					exportName = exportName.slice(1);
				}
				break;
			case "default-only":
				if (exportName[0] === "default") {
					exprStart = info.name;
				} else {
					exprStart =
						"/* non-default import from default-exporting module */undefined";
				}
				exportName = exportName.slice(1);
				break;
			case "dynamic":
				if (exportName[0] === "default") {
					info.interopDefaultAccessUsed = true;
					exprStart = asCall
						? `${info.interopDefaultAccessName}()`
						: asiSafe
						? `(${info.interopDefaultAccessName}())`
						: `${info.interopDefaultAccessName}.a`;
					exportName = exportName.slice(1);
				}
				break;
			default:
				throw new Error(`Unexpected exportsType ${exportsType}`);
		}
	}
	const used =
		exportName.length === 0 ||
		moduleGraph.getExportsInfo(importedModule).getUsedName(exportName, runtime);
	if (!used) return "/* unused export */undefined";
	const comment = arrayEquals(used, exportName)
		? ""
		: Template.toNormalComment(`${exportName.join(".")}`);
	const reference = `${exprStart}${comment}${propertyAccess(used)}`;
	if (asCall && callContext === false) {
		return asiSafe ? `(0,${reference})` : `Object(${reference})`;
	}
	return reference;
};

/**
 * @param {Set<ReexportInfo>} alreadyVisited alreadyVisited
 * @param {RequestShortener} requestShortener the request shortener
 * @param {ReexportInfo} reexport the current reexport
 * @returns {void | never} throws error when circular
 */
const checkCircularReexport = (alreadyVisited, requestShortener, reexport) => {
	if (alreadyVisited.has(reexport)) {
		throw new Error(
			`Circular reexports ${Array.from(
				alreadyVisited,
				e =>
					`"${e.module.readableIdentifier(
						requestShortener
					)}".${e.exportName.join(".")}`
			).join(" --> ")} -(circular)-> "${reexport.module.readableIdentifier(
				requestShortener
			)}".${reexport.exportName.join(".")}`
		);
	}
	alreadyVisited.add(reexport);
};

/**
 * @param {ModuleInfo} info module info
 * @param {string[]} exportName exportName
 * @param {Map<Module, ModuleInfo>} moduleToInfoMap moduleToInfoMap
 * @param {RequestShortener} requestShortener the request shortener
 * @param {Set<ReexportInfo>} alreadyVisited alreadyVisited
 * @returns {Binding} the final variable
 */
const getFinalBinding = (
	info,
	exportName,
	moduleToInfoMap,
	requestShortener,
	alreadyVisited = new Set()
) => {
	switch (info.type) {
		case "concatenated": {
			if (exportName.length === 0) {
				return { info, ids: exportName, exportName };
			}
			const exportId = exportName[0];
			const directExport = info.exportMap.get(exportId);
			if (directExport) {
				return {
					info,
					ids: [directExport, ...exportName.slice(1)],
					exportName
				};
			}
			const reexport = info.reexportMap.get(exportId);
			if (reexport) {
				checkCircularReexport(alreadyVisited, requestShortener, reexport);
				const refInfo = moduleToInfoMap.get(reexport.module);
				if (refInfo) {
					// module is in the concatenation
					return getFinalBinding(
						refInfo,
						[...reexport.exportName, ...exportName.slice(1)],
						moduleToInfoMap,
						requestShortener,
						alreadyVisited
					);
				}
			}
			return { info, ids: null, exportName };
		}
		case "external": {
			return { info, ids: exportName, exportName };
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
 * @param {boolean} asCall asCall
 * @param {boolean} callContext callContext
 * @param {boolean} strictHarmonyModule strictHarmonyModule
 * @param {boolean} asiSafe asiSafe
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
	asCall,
	callContext,
	strictHarmonyModule,
	asiSafe
) => {
	const binding = getFinalBinding(
		info,
		exportName,
		moduleToInfoMap,
		requestShortener
	);
	switch (binding.info.type) {
		case "concatenated": {
			const { info, ids, exportName } = binding;
			if (!ids) {
				const problem =
					`Cannot get final name for export "${exportName}" in "${info.module.readableIdentifier(
						requestShortener
					)}"` +
					` (known exports: ${Array.from(info.exportMap.keys()).join(" ")}, ` +
					`known reexports: ${Array.from(info.reexportMap.keys()).join(" ")})`;
				return `${Template.toNormalComment(problem)} undefined${propertyAccess(
					exportName,
					1
				)}`;
			}
			if (ids.length === 0) {
				return ensureNsObjSource(
					moduleGraph,
					info,
					moduleToInfoMap,
					runtime,
					requestShortener,
					runtimeTemplate,
					strictHarmonyModule
				);
			}
			const exportId = ids[0];
			const exportsInfo = moduleGraph.getExportsInfo(info.module);
			if (exportsInfo.getUsed(exportName, runtime) === UsageState.Unused) {
				return `/* unused export */ undefined${propertyAccess(exportName, 1)}`;
			}
			const name = info.internalNames.get(exportId);
			if (!name) {
				throw new Error(
					`The export "${exportId}" in "${info.module.readableIdentifier(
						requestShortener
					)}" has no internal name`
				);
			}
			return `${name}${propertyAccess(exportName, 1)}`;
		}
		case "external": {
			const { info, ids } = binding;
			const importedModule = info.module;
			return getExternalImport(
				moduleGraph,
				importedModule,
				info,
				ids,
				runtime,
				asCall,
				callContext,
				strictHarmonyModule,
				asiSafe
			);
		}
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

const createModuleReference = ({
	info,
	ids = undefined,
	call = false,
	directImport = false,
	strict = false,
	asiSafe = false
}) => {
	const callFlag = call ? "_call" : "";
	const directImportFlag = directImport ? "_directImport" : "";
	const strictFlag = strict ? "_strict" : "";
	const asiSafeFlag = asiSafe ? "_asiSafe" : "";
	const exportData = ids
		? Buffer.from(JSON.stringify(ids), "utf-8").toString("hex")
		: "ns";
	return `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportData}${callFlag}${directImportFlag}${strictFlag}${asiSafeFlag}__`;
};

const MODULE_REFERENCE_REGEXP = /^__WEBPACK_MODULE_REFERENCE__(\d+)_([\da-f]+|ns)(_call)?(_directImport)?(_strict)?(_asiSafe)?__$/;

const isModuleReference = name => {
	return MODULE_REFERENCE_REGEXP.test(name);
};

const matchModuleReference = (name, modulesWithInfo) => {
	const match = MODULE_REFERENCE_REGEXP.exec(name);
	if (!match) return null;
	const index = +match[1];
	return {
		index,
		info: modulesWithInfo[index],
		ids:
			match[2] === "ns"
				? []
				: JSON.parse(Buffer.from(match[2], "hex").toString("utf-8")),
		call: !!match[3],
		directImport: !!match[4],
		strict: !!match[5],
		asiSafe: !!match[6]
	};
};

const TYPES = new Set(["javascript"]);

/**
 *
 * @param {HarmonyExportImportedSpecifierDependency} dep dependency
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RuntimeSpec} runtime the runtime
 * @returns {{name: string, ids: string[]}[]} list of exports
 */
const getHarmonyExportImportedSpecifierDependencyExports = (
	dep,
	moduleGraph,
	runtime
) => {
	const importModule = moduleGraph.getModule(dep);
	if (!importModule) return [];
	const ids = dep.getIds(moduleGraph);
	if (ids.length > 0) {
		// export { named } from "module"
		return [
			{
				name: dep.name,
				ids
			}
		];
	}
	if (dep.name) {
		// export * as abc from "module"
		return [
			{
				name: dep.name,
				ids: []
			}
		];
	}
	// export * from "module"
	const { exports: providedExports } = dep.getStarReexports(
		moduleGraph,
		runtime,
		undefined,
		importModule
	);
	if (providedExports) {
		return Array.from(providedExports, exp => {
			return {
				name: exp,
				ids: [exp]
			};
		});
	}

	// unknown, should not happen
	throw new Error("ConcatenatedModule: unknown exports");
};

class ConcatenatedModule extends Module {
	/**
	 * @param {Module} rootModule the root module of the concatenation
	 * @param {Set<Module>} modules all modules in the concatenation (including the root module)
	 * @param {Object=} associatedObjectForCache object for caching
	 * @returns {ConcatenatedModule} the module
	 */
	static create(rootModule, modules, associatedObjectForCache) {
		const identifier = ConcatenatedModule._createIdentifier(
			rootModule,
			modules,
			associatedObjectForCache
		);
		return new ConcatenatedModule({
			identifier,
			rootModule,
			modules
		});
	}

	/**
	 * @param {Object} options options
	 * @param {string} options.identifier the identifier of the module
	 * @param {Module=} options.rootModule the root module of the concatenation
	 * @param {Set<Module>=} options.modules all concatenated modules
	 */
	constructor({ identifier, rootModule, modules }) {
		super("javascript/esm", null);

		// Info from Factory
		/** @type {string} */
		this._identifier = identifier;
		/** @type {Module} */
		this.rootModule = rootModule;
		/** @type {Set<Module>} */
		this._modules = modules;
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

			// populate file dependencies
			if (m.buildInfo.fileDependencies) {
				this.buildInfo.fileDependencies.addAll(m.buildInfo.fileDependencies);
			}
			// populate context dependencies
			if (m.buildInfo.contextDependencies) {
				this.buildInfo.contextDependencies.addAll(
					m.buildInfo.contextDependencies
				);
			}
			// populate missing dependencies
			if (m.buildInfo.missingDependencies) {
				this.buildInfo.missingDependencies.addAll(
					m.buildInfo.missingDependencies
				);
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
		 * @returns {ModuleGraphConnection[]} imported modules in order
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
						connection && connection.module && connection.isActive(runtime)
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
			return references.map(({ connection }) => connection);
		};

		/**
		 * @param {ModuleGraphConnection} connection graph connection
		 * @returns {void}
		 */
		const enterModule = connection => {
			const module = connection.module;
			if (!module) return;
			if (existingEntries.has(module)) {
				return;
			}
			if (modulesSet.has(module)) {
				existingEntries.add(module);
				const imports = getConcatenatedImports(module);
				imports.forEach(enterModule);
				list.push({
					type: "concatenated",
					module: connection.module
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
					}
				});
			}
		};

		existingEntries.add(rootModule);
		const imports = getConcatenatedImports(rootModule);
		imports.forEach(enterModule);
		list.push({
			type: "concatenated",
			module: rootModule
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
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime
	}) {
		/** @type {Set<string>} */
		const runtimeRequirements = new Set();

		const requestShortener = runtimeTemplate.requestShortener;
		// Meta info for each module
		const modulesWithInfo = this._getModulesWithInfo(moduleGraph, runtime);

		// Create mapping from module to info
		const moduleToInfoMap = modulesWithInfoToMap(modulesWithInfo);

		// Configure template decorators for dependencies
		const innerDependencyTemplates = this._getInnerDependencyTemplates(
			dependencyTemplates,
			moduleToInfoMap
		);

		// Generate source code and analyse scopes
		// Prepare a ReplaceSource for the final source
		for (const info of modulesWithInfo) {
			this._analyseModule(
				info,
				innerDependencyTemplates,
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
						if (isModuleReference(name)) {
							const match = matchModuleReference(name, modulesWithInfo);
							if (!match || match.ids.length < 1) continue;
							const binding = getFinalBinding(
								match.info,
								match.ids,
								moduleToInfoMap,
								requestShortener
							);
							if (!binding.ids) continue;
							const {
								usedNames,
								alreadyCheckedScopes
							} = getUsedNamesInScopeInfo(
								binding.info.module.identifier(),
								binding.info.type === "external"
									? "external"
									: binding.ids.length > 0
									? binding.ids[0]
									: ""
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
			switch (info.type) {
				case "concatenated": {
					const {
						usedNames: namespaceObjectUsedNames
					} = getUsedNamesInScopeInfo(info.module.identifier(), "");
					const namespaceObjectName = this.findNewName(
						"namespaceObject",
						allUsedNames,
						namespaceObjectUsedNames,
						info.module.readableIdentifier(requestShortener)
					);
					allUsedNames.add(namespaceObjectName);
					info.namespaceObjectName = namespaceObjectName;
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
					break;
				}
				case "external": {
					const { usedNames } = getUsedNamesInScopeInfo(
						info.module.identifier(),
						"external"
					);
					const externalName = this.findNewName(
						"",
						allUsedNames,
						usedNames,
						info.module.readableIdentifier(requestShortener)
					);
					allUsedNames.add(externalName);
					info.name = externalName;
					if (
						info.module.buildMeta.exportsType === "default" ||
						info.module.buildMeta.exportsType === "flagged" ||
						!info.module.buildMeta.exportsType
					) {
						const externalNameInterop = this.findNewName(
							"namespaceObject",
							allUsedNames,
							usedNames,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(externalNameInterop);
						info.interopNamespaceObjectName = externalNameInterop;
					}
					if (!info.module.buildMeta.exportsType) {
						const externalNameInterop = this.findNewName(
							"default",
							allUsedNames,
							usedNames,
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
					const match = matchModuleReference(name, modulesWithInfo);
					if (match) {
						const finalName = getFinalName(
							moduleGraph,
							match.info,
							match.ids,
							moduleToInfoMap,
							runtime,
							requestShortener,
							runtimeTemplate,
							match.call,
							!match.directImport,
							match.strict,
							match.asiSafe
						);
						const r = reference.identifier.range;
						const source = info.source;
						source.replace(r[0], r[1] - 1, finalName);
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
		for (const dep of this.rootModule.dependencies) {
			if (dep instanceof HarmonyExportSpecifierDependency) {
				const used = /** @type {string | false } */ (moduleGraph
					.getExportsInfo(this.rootModule)
					.getUsedName(dep.name, runtime));
				if (used) {
					if (!exportsMap.has(used)) {
						exportsMap.set(
							used,
							() => `/* binding */ ${rootInfo.internalNames.get(dep.id)}`
						);
					}
				} else {
					unusedExports.add(dep.name || "namespace");
				}
			} else if (dep instanceof HarmonyExportExpressionDependency) {
				const used = /** @type {string | false } */ (moduleGraph
					.getExportsInfo(this.rootModule)
					.getUsedName("default", runtime));
				if (used) {
					if (!exportsMap.has(used)) {
						exportsMap.set(
							used,
							() =>
								`/* default */ ${rootInfo.internalNames.get(
									typeof dep.declarationId === "string"
										? dep.declarationId
										: "__WEBPACK_MODULE_DEFAULT_EXPORT__"
								)}`
						);
					}
				} else {
					unusedExports.add("default");
				}
			} else if (dep instanceof HarmonyExportImportedSpecifierDependency) {
				const exportDefs = getHarmonyExportImportedSpecifierDependencyExports(
					dep,
					moduleGraph,
					runtime
				);
				for (const def of exportDefs) {
					const importedModule = moduleGraph.getModule(dep);
					const used = /** @type {string | false} */ (moduleGraph
						.getExportsInfo(this.rootModule)
						.getUsedName(def.name, runtime));
					if (used) {
						if (!exportsMap.has(used)) {
							const info = moduleToInfoMap.get(importedModule);
							if (!info) {
								throw new Error(
									`Imported module ${importedModule.identifier()} is not in moduleToInfoMap: ${Array.from(
										moduleToInfoMap.keys(),
										m => m.identifier()
									).join(", ")}`
								);
							}
							exportsMap.set(used, requestShortener => {
								const finalName = getFinalName(
									moduleGraph,
									info,
									def.ids,
									moduleToInfoMap,
									runtime,
									requestShortener,
									runtimeTemplate,
									false,
									false,
									this.rootModule.buildMeta.strictHarmonyModule,
									true
								);
								return `/* reexport */ ${finalName}`;
							});
						}
					} else {
						unusedExports.add(def.name);
					}
				}
			}
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

		// define required namespace objects (must be before evaluation modules)
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated" && info.namespaceObjectSource) {
				result.add(
					`\n// NAMESPACE OBJECT: ${info.module.readableIdentifier(
						requestShortener
					)}\n`
				);
				result.add(info.namespaceObjectSource);
				runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			}
		}

		// evaluate modules in order
		for (const info of modulesWithInfo) {
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
					break;
				}
				case "external":
					result.add(
						`\n// EXTERNAL MODULE: ${info.module.readableIdentifier(
							requestShortener
						)}\n`
					);
					runtimeRequirements.add(RuntimeGlobals.require);
					result.add(
						`var ${info.name} = __webpack_require__(${JSON.stringify(
							chunkGraph.getModuleId(info.module)
						)});\n`
					);
					if (info.interopNamespaceObjectUsed) {
						if (info.module.buildMeta.exportsType === "default") {
							runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
							result.add(
								`var ${info.interopNamespaceObjectName} = /*#__PURE__*/${RuntimeGlobals.createFakeNamespaceObject}(${info.name}, 2);\n`
							);
						} else if (
							info.module.buildMeta.exportsType === "flagged" ||
							!info.module.buildMeta.exportsType
						) {
							runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
							result.add(
								`var ${info.interopNamespaceObjectName} = /*#__PURE__*/${RuntimeGlobals.createFakeNamespaceObject}(${info.name});\n`
							);
						}
					}
					if (info.interopDefaultAccessUsed) {
						runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
						result.add(
							`var ${info.interopDefaultAccessName} = /*#__PURE__*/${RuntimeGlobals.compatGetDefaultExport}(${info.name});\n`
						);
					}
					break;
				default:
					// @ts-expect-error never is expected here
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
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
	 * @param {ModuleInfo} info info
	 * @param {DependencyTemplates} innerDependencyTemplates innerDependencyTemplates
	 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
	 * @param {ModuleGraph} moduleGraph moduleGraph
	 * @param {ChunkGraph} chunkGraph chunkGraph
	 * @param {RuntimeSpec} runtime runtime
	 */
	_analyseModule(
		info,
		innerDependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime
	) {
		if (info.type === "concatenated") {
			const m = info.module;
			try {
				// TODO cache codeGeneration results
				const codeGenResult = m.codeGeneration({
					dependencyTemplates: innerDependencyTemplates,
					runtimeTemplate,
					moduleGraph,
					chunkGraph,
					runtime
				});
				const source = codeGenResult.sources.get("javascript");
				const code = source.source().toString();
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
		/** @type {ModuleInfo[]} */
		const results = [];
		let idx = 0;
		const orderedConcatenationList = this._createConcatenationList(
			this.rootModule,
			this._modules,
			undefined,
			moduleGraph
		);
		for (const info of orderedConcatenationList) {
			switch (info.type) {
				case "concatenated": {
					/** @type {Map<string, string>} */
					const exportMap = new Map();
					/** @type {Map<string, ReexportInfo>} */
					const reexportMap = new Map();
					for (const dep of info.module.dependencies) {
						if (dep instanceof HarmonyExportSpecifierDependency) {
							if (!exportMap.has(dep.name)) {
								exportMap.set(dep.name, dep.id);
							}
						} else if (dep instanceof HarmonyExportExpressionDependency) {
							if (!exportMap.has("default")) {
								exportMap.set(
									"default",
									typeof dep.declarationId === "string"
										? dep.declarationId
										: "__WEBPACK_MODULE_DEFAULT_EXPORT__"
								);
							}
						} else if (
							dep instanceof HarmonyExportImportedSpecifierDependency
						) {
							const exportName = dep.name;
							const importNames = dep.getIds(moduleGraph);
							const importedModule = moduleGraph.getModule(dep);
							if (exportName) {
								if (!reexportMap.has(exportName)) {
									reexportMap.set(exportName, {
										module: importedModule,
										exportName: importNames,
										dependency: dep
									});
								}
							} else if (importedModule) {
								const { exports: providedExports } = dep.getStarReexports(
									moduleGraph,
									runtime,
									undefined,
									importedModule
								);
								if (providedExports) {
									for (const name of providedExports) {
										if (!reexportMap.has(name)) {
											reexportMap.set(name, {
												module: importedModule,
												exportName: [name],
												dependency: dep
											});
										}
									}
								}
							}
						}
					}
					results.push({
						type: "concatenated",
						module: info.module,
						index: idx++,
						ast: undefined,
						internalSource: undefined,
						runtimeRequirements: undefined,
						source: undefined,
						globalScope: undefined,
						moduleScope: undefined,
						internalNames: new Map(),
						exportMap,
						reexportMap,
						hasNamespaceObject: false,
						namespaceObjectName: undefined,
						namespaceObjectSource: null
					});
					break;
				}
				case "external":
					results.push({
						type: "external",
						module: info.module,
						index: idx++,
						name: undefined,
						interopNamespaceObjectUsed: false,
						interopNamespaceObjectName: undefined,
						interopDefaultAccessUsed: false,
						interopDefaultAccessName: undefined
					});
					break;
				default:
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
		}
		return results;
	}

	/**
	 * @param {DependencyTemplates} dependencyTemplates outer dependency templates
	 * @param {Map<Module, ModuleInfo>} moduleToInfoMap map for module info
	 * @returns {DependencyTemplates} inner dependency templates
	 */
	_getInnerDependencyTemplates(dependencyTemplates, moduleToInfoMap) {
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
			new NullTemplate()
		);
		innerDependencyTemplates.set(
			HarmonyExportExpressionDependency,
			new HarmonyExportExpressionDependencyConcatenatedTemplate(
				dependencyTemplates.get(HarmonyExportExpressionDependency),
				this.rootModule,
				moduleToInfoMap
			)
		);
		innerDependencyTemplates.set(
			HarmonyExportImportedSpecifierDependency,
			new NullTemplate()
		);
		innerDependencyTemplates.set(
			HarmonyCompatibilityDependency,
			new NullTemplate()
		);
		// Must use full identifier in our cache here to ensure that the source
		// is updated should our dependencies list change.
		// TODO webpack 5 refactor
		innerDependencyTemplates.updateHash(this.identifier());
		return innerDependencyTemplates;
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
			runtime,
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
			modules: undefined
		});
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(ConcatenatedModule, "webpack/lib/optimize/ConcatenatedModule");

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
		const ids = dep.getIds(moduleGraph);
		if (ids.length === 0) {
			content = createModuleReference({
				info,
				strict: parentModule.buildMeta.strictHarmonyModule,
				asiSafe: dep.asiSafe
			});
		} else if (dep.namespaceObjectAsContext && ids.length === 1) {
			content =
				createModuleReference({
					info,
					strict: parentModule.buildMeta.strictHarmonyModule,
					asiSafe: dep.asiSafe
				}) + propertyAccess(ids);
		} else {
			content = createModuleReference({
				info,
				ids,
				call: dep.call,
				directImport: dep.directImport,
				strict: parentModule.buildMeta.strictHarmonyModule,
				asiSafe: dep.asiSafe
			});
		}
		if (dep.shorthand) {
			source.insert(dep.range[1], ": " + content);
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, content);
		}
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

class HarmonyExportExpressionDependencyConcatenatedTemplate extends DependencyTemplate {
	constructor(
		originalTemplate,
		rootModule,
		modulesMap,
		exportsMap,
		unusedExports
	) {
		super();
		this.originalTemplate = originalTemplate;
		this.rootModule = rootModule;
		this.modulesMap = modulesMap;
		this.exportsMap = exportsMap;
		this.unusedExports = unusedExports;
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
		{ module, moduleGraph, runtimeTemplate, initFragments }
	) {
		const dep = /** @type {HarmonyExportExpressionDependency} */ (dependency);
		const { declarationId } = dep;

		if (declarationId) {
			let name;
			if (typeof declarationId === "string") {
				name = declarationId;
			} else {
				name = "__WEBPACK_MODULE_DEFAULT_EXPORT__";
				source.replace(
					declarationId.range[0],
					declarationId.range[1] - 1,
					`${declarationId.prefix}${name}${declarationId.suffix}`
				);
			}

			source.replace(
				dep.rangeStatement[0],
				dep.range[0] - 1,
				`/* harmony default export */ ${dep.prefix}`
			);
		} else {
			const content = `/* harmony default export */ ${
				runtimeTemplate.supportsConst() ? "const" : "var"
			} __WEBPACK_MODULE_DEFAULT_EXPORT__ = `;

			if (dep.range) {
				source.replace(
					dep.rangeStatement[0],
					dep.range[0] - 1,
					content + "(" + dep.prefix
				);
				source.replace(dep.range[1], dep.rangeStatement[1] - 0.5, ");");
				return;
			}

			source.replace(
				dep.rangeStatement[0],
				dep.rangeStatement[1] - 1,
				content + dep.prefix
			);
		}
	}
}

class NullTemplate {
	apply() {}
}

module.exports = ConcatenatedModule;
