/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");
const {
	CachedSource,
	ConcatSource,
	ReplaceSource
} = require("webpack-sources");
const ConcatenationScope = require("../ConcatenationScope");
const Dependency = require("../Dependency");
const { UsageState } = require("../ExportsInfo");
const ExternalModule = require("../ExternalModule");
const Module = require("../Module");
const {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES
} = require("../ModuleSourceTypeConstants");
const { JAVASCRIPT_MODULE_TYPE_ESM } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { DEFAULTS } = require("../config/defaults");
const CommonJsExportRequireDependency = require("../dependencies/CommonJsExportRequireDependency");
const CommonJsFullRequireDependency = require("../dependencies/CommonJsFullRequireDependency");
const CommonJsRequireDependency = require("../dependencies/CommonJsRequireDependency");
const { ImportPhaseUtils } = require("../dependencies/ImportPhase");
const JavascriptParser = require("../javascript/JavascriptParser");
const analyzeScope = require("../javascript/ScopeAnalyzer");
const {
	getDeferredCycleModuleIds,
	getDeferredCycleModules,
	getMakeDeferredNamespaceModeFromExportsType,
	getOptimizedDeferredModule
} = require("../runtime/MakeDeferredNamespaceObjectRuntime");
const { equals } = require("../util/ArrayHelpers");
const LazySet = require("../util/LazySet");
const {
	compareModulesByFullName,
	concatComparators
} = require("../util/comparators");
const {
	RESERVED_NAMES,
	addScopeSymbols,
	findNewName,
	getAllReferences,
	getPathInAst,
	getUsedNamesInScopeInfo,
	isCommonJsConcatenationEnabled
} = require("../util/concatenate");
const createHash = require("../util/createHash");
const createHooksRegistry = require("../util/createHooksRegistry");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const { propertyAccess, propertyName } = require("../util/property");
const {
	filterRuntime,
	intersectRuntime,
	mergeRuntimeCondition,
	mergeRuntimeConditionNonFalse,
	runtimeConditionToString,
	subtractRuntimeCondition
} = require("../util/runtime");
const { InlinedUsedName } = require("./InlineExports");

/** @import { Source } from "webpack-sources" */
/**
 * @import {
 * 	WebpackOptionsNormalizedWithDefaults as WebpackOptions
 * } from "../config/defaults"
 */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import CodeGenerationResults from "../CodeGenerationResults" */
/** @import Compilation, { FileSystemDependencies } from "../Compilation" */
/** @import { UpdateHashContext } from "../Dependency" */
/** @import HarmonyImportDependency from "../dependencies/HarmonyImportDependency" */
/** @import DependencyTemplates from "../DependencyTemplates" */
/** @import { ExportInfo } from "../ExportsInfo" */
/**
 * @import {
 * 	BuildCallback,
 * 	BuildInfo,
 * 	BuildMeta,
 * 	ExportsType,
 * 	CodeGenerationContext,
 * 	CodeGenerationResultData,
 * 	CodeGenerationResult,
 * 	LibIdentOptions,
 * 	LibIdent,
 * 	NameForCondition,
 * 	ReadOnlyRuntimeRequirements,
 * 	RuntimeRequirements,
 * 	SourceTypes
 * } from "../Module"
 */
/** @import ModuleGraph from "../ModuleGraph" */
/**
 * @import ModuleGraphConnection, {
 * 	ConnectionState
 * } from "../ModuleGraphConnection"
 */
/** @import RequestShortener from "../RequestShortener" */
/** @import { ResolverWithOptions } from "../ResolverFactory" */
/** @import RuntimeTemplate from "../RuntimeTemplate" */
/**
 * @import {
 * 	JavascriptModuleBuildInfo,
 * 	JavascriptModuleBuildMeta
 * } from "../javascript/JavascriptModule"
 */
/**
 * @import {
 * 	ChunkRenderContext,
 * 	Scope,
 * 	Reference,
 * 	Variable
 * } from "../javascript/JavascriptModulesPlugin"
 */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @import { Identifier, Program } from "estree" */
/**
 * @import {
 * 	ObjectDeserializerContext
 * } from "../serialization/ObjectMiddleware"
 */
/** @import Hash, { HashFunction } from "../util/Hash" */
/** @import { UsedNames, UsedNamesInScopeInfo } from "../util/concatenate" */
/** @import { InputFileSystem } from "../util/fs" */
/** @import { AssociatedObjectForCache } from "../util/identifier" */
/** @import { RuntimeSpec } from "../util/runtime" */
/**
 * @template T
 * @typedef {import("../InitFragment")<T>} InitFragment
 */

/**
 * @template T
 * @typedef {import("../util/comparators").Comparator<T>} Comparator
 */

const IDENTIFIER_SCAN_REGEXP = /[$A-Za-z_][\w$]*/g;
const IDENTIFIER_SCAN_WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

/**
 * Finds every identifier a generated source could resolve against the enclosing
 * concatenation scope. Property names are skipped; string and comment contents
 * are not, which only over-reserves.
 * @param {Source} source generated source
 * @returns {ReadonlySet<string>} identifier names
 */
const findIdentifiers = (source) => {
	const code = source.source().toString();
	/** @type {Set<string>} */
	const result = new Set();
	IDENTIFIER_SCAN_REGEXP.lastIndex = 0;
	let match = IDENTIFIER_SCAN_REGEXP.exec(code);
	while (match !== null) {
		let i = match.index - 1;
		while (i >= 0 && IDENTIFIER_SCAN_WHITESPACE.has(code[i])) i--;
		// `a.b` can't bind to the outer scope, but the `b` of `...b` can
		if (!(i >= 0 && code[i] === "." && code[i - 1] !== ".")) {
			result.add(match[0]);
		}
		match = IDENTIFIER_SCAN_REGEXP.exec(code);
	}
	return result;
};

/** @typedef {RawBinding | SymbolBinding} Binding */

/** @typedef {string[]} ExportName */

/**
 * @typedef {object} RawBinding
 * @property {ModuleInfo} info
 * @property {string} rawName
 * @property {string=} comment
 * @property {ExportName} ids
 * @property {ExportName} exportName
 */

/**
 * @typedef {object} SymbolBinding
 * @property {ConcatenatedModuleInfo} info
 * @property {string} name
 * @property {string=} comment
 * @property {ExportName} ids
 * @property {ExportName} exportName
 */

/** @typedef {ConcatenatedModuleInfo | ExternalModuleInfo} ModuleInfo */
/** @typedef {ConcatenatedModuleInfo | ExternalModuleInfo | ReferenceToModuleInfo} ModuleInfoOrReference */

/** @typedef {Map<string, string>} ExportMap */

/**
 * @typedef {object} ConcatenatedModuleInfo
 * @property {"concatenated"} type
 * @property {boolean} wrapped the body renders inside the lazy CJS wrapper with real module/exports instead of being scope-hoisted into the shared scope
 * @property {boolean} eager a wrapped body reached by an eager import edge, so its accessor is called at its own slot in evaluation order
 * @property {Module} module
 * @property {number} index
 * @property {Program | undefined} ast
 * @property {Source | undefined} internalSource
 * @property {ReplaceSource | undefined} source
 * @property {InitFragment<ChunkRenderContext>[]=} chunkInitFragments
 * @property {ReadOnlyRuntimeRequirements | undefined} runtimeRequirements
 * @property {Scope | undefined} globalScope
 * @property {Reference[] | undefined} unresolvedReferences the module's free references
 * @property {Scope | undefined} moduleScope
 * @property {Map<string, string>} internalNames
 * @property {ExportMap | undefined} exportMap
 * @property {ExportMap | undefined} rawExportMap
 * @property {string=} namespaceExportSymbol
 * @property {string | undefined} namespaceFnName name of the lazy wrapper accessor function (calling it evaluates the module and returns its exports)
 * @property {string | undefined} namespaceObjectName
 * @property {string | undefined} escapeNamespaceObjectName decoupled namespace object that keeps original export names when the exports are mangled
 * @property {ConcatenationScope | undefined} concatenationScope
 * @property {boolean} interopNamespaceObjectUsed "default-with-named" namespace
 * @property {string | undefined} interopNamespaceObjectName "default-with-named" namespace
 * @property {boolean} interopNamespaceObject2Used "default-only" namespace
 * @property {string | undefined} interopNamespaceObject2Name "default-only" namespace
 * @property {boolean} interopDefaultAccessUsed runtime namespace object that detects "__esModule"
 * @property {string | undefined} interopDefaultAccessName runtime namespace object that detects "__esModule"
 * @property {ExportsType=} exportsTypeStrict memoized getExportsType(strict=true)
 * @property {ExportsType=} exportsTypeNonStrict memoized getExportsType(strict=false)
 */

/**
 * @typedef {object} ExternalModuleInfo
 * @property {"external"} type
 * @property {boolean} wrapped the module's `require()` call is deferred behind an accessor instead of running at its own slot; unlike a wrapped concatenated member there is no body and no CJS wrapper, so any external may be wrapped
 * @property {boolean} eager a wrapped module reached by an eager import edge, so its accessor is called at its own slot in evaluation order
 * @property {Module} module
 * @property {RuntimeSpec | boolean} runtimeCondition
 * @property {NonDeferAccess} nonDeferAccess
 * @property {number} index
 * @property {string | undefined} name module.exports / harmony namespace object
 * @property {string | undefined} namespaceFnName lazy module accessor
 * @property {string | undefined} escapeNamespaceObjectName decoupled namespace object that keeps original export names when the exports are mangled
 * @property {string | undefined} deferredName deferred module.exports / harmony namespace object
 * @property {boolean} deferred the module is deferred at least once
 * @property {boolean} deferredNamespaceObjectUsed deferred namespace object that being used in a not-analyzable way so it must be materialized
 * @property {string | undefined} deferredNamespaceObjectName deferred namespace object that being used in a not-analyzable way so it must be materialized
 * @property {boolean} interopNamespaceObjectUsed "default-with-named" namespace
 * @property {string | undefined} interopNamespaceObjectName "default-with-named" namespace
 * @property {boolean} interopNamespaceObject2Used "default-only" namespace
 * @property {string | undefined} interopNamespaceObject2Name "default-only" namespace
 * @property {boolean} interopDefaultAccessUsed runtime namespace object that detects "__esModule"
 * @property {string | undefined} interopDefaultAccessName runtime namespace object that detects "__esModule"
 * @property {ExportsType=} exportsTypeStrict memoized getExportsType(strict=true)
 * @property {ExportsType=} exportsTypeNonStrict memoized getExportsType(strict=false)
 */

/**
 * @typedef {object} ReferenceToModuleInfo
 * @property {"reference"} type
 * @property {RuntimeSpec | boolean} runtimeCondition
 * @property {NonDeferAccess} nonDeferAccess
 * @property {ModuleInfo} target
 */

/**
 * @template T
 * @param {string} property property
 * @param {(a: T[keyof T], b: T[keyof T]) => 0 | 1 | -1} comparator comparator
 * @returns {Comparator<T>} comparator
 */

const createComparator = (property, comparator) => (a, b) =>
	comparator(
		a[/** @type {keyof T} */ (property)],
		b[/** @type {keyof T} */ (property)]
	);

/**
 * @param {number} a a
 * @param {number} b b
 * @returns {0 | 1 | -1} result
 */
const compareNumbers = (a, b) => {
	if (Number.isNaN(a)) {
		if (!Number.isNaN(b)) {
			return 1;
		}
	} else {
		if (Number.isNaN(b)) {
			return -1;
		}
		if (a !== b) {
			return a < b ? -1 : 1;
		}
	}
	return 0;
};

const bySourceOrder = createComparator("sourceOrder", compareNumbers);
const byRangeStart = createComparator("rangeStart", compareNumbers);

/**
 * @param {Iterable<string>} iterable iterable object
 * @returns {string} joined iterable object
 */
const joinIterableWithComma = (iterable) => {
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

/** @typedef {boolean} NonDeferAccess */

/**
 * @param {NonDeferAccess} a a
 * @param {NonDeferAccess} b b
 * @returns {NonDeferAccess} merged
 */
const mergeNonDeferAccess = (a, b) => a || b;

/**
 * @param {NonDeferAccess} a first
 * @param {NonDeferAccess} b second
 * @returns {NonDeferAccess} first - second
 */
const subtractNonDeferAccess = (a, b) => a && !b;

/**
 * @typedef {object} ConcatenationEntry
 * @property {"concatenated" | "external"} type
 * @property {boolean} wrapped evaluation is deferred behind an accessor: a "concatenated" entry renders its body inside the lazy CJS wrapper instead of being scope-hoisted, an "external" entry only defers its `require()` call
 * @property {Module} module
 * @property {RuntimeSpec | boolean} runtimeCondition
 * @property {NonDeferAccess} nonDeferAccess
 */

/**
 * Whether a member runs inside the lazy CJS wrapper or is scope-hoisted. Only a
 * NormalModule can carry a CJS body; an ESM member starts out hoisted and is
 * downgraded by {@link ConcatenatedModule._createConcatenationList}.
 * @param {Module} module a module taking part in the concatenation
 * @returns {boolean} true, when the module renders wrapped
 */
const needWrapped = (module) =>
	module instanceof NormalModule &&
	module.type.startsWith("javascript/") &&
	module.buildMeta !== undefined &&
	module.buildMeta.exportsType !== "namespace";

/**
 * Whether a hoisted member can move into the lazy wrapper instead.
 * @param {ConcatenationEntry} entry a member of the concatenation
 * @returns {boolean} true, when it may be wrapped
 */
const entryCanBeWrapped = (entry) =>
	(entry.module instanceof NormalModule &&
		!entry.module.type.startsWith("css/")) ||
	(entry.module instanceof ExternalModule &&
		entry.module.canBeWrappedInConcatenation());

/** @typedef {Set<ConcatenatedModuleInfo>} NeededNamespaceObjects */

/** @typedef {Map<Module, ModuleInfo>} ModuleToInfoMap */

/**
 * getExportsType memoized on the info, which lives for one codeGeneration.
 * The "dynamic" case walks the module graph, and is queried once per reference.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ModuleInfo} info module info
 * @param {boolean | undefined} strict strict harmony module (undefined is treated as non-strict)
 * @returns {ExportsType} the exports type
 */
const getExportsType = (moduleGraph, info, strict) => {
	if (strict) {
		if (info.exportsTypeStrict === undefined) {
			info.exportsTypeStrict = info.module.getExportsType(moduleGraph, true);
		}
		return info.exportsTypeStrict;
	}
	if (info.exportsTypeNonStrict === undefined) {
		info.exportsTypeNonStrict = info.module.getExportsType(moduleGraph, false);
	}
	return info.exportsTypeNonStrict;
};

/**
 * @param {ExternalModuleInfo} info module info
 * @returns {string} module exports expression
 */
const getExternalModuleExpr = (info) =>
	info.wrapped
		? `${
				/** @type {NonNullable<ExternalModuleInfo["namespaceFnName"]>} */
				(info.namespaceFnName)
			}()`
		: /** @type {NonNullable<ExternalModuleInfo["name"]>} */ (info.name);

/**
 * A wrapped module's interop object is declared as a lazy accessor, so reading
 * it is a call. See `declareInterop`.
 * @param {ModuleInfo} info module info
 * @param {string | undefined} interopName interop variable name
 * @returns {string} interop object expression
 */
const getInteropExpr = (info, interopName) =>
	info.wrapped ? `${interopName}()` : /** @type {string} */ (interopName);

/**
 * Expression for an export that is not used. A hoisted body runs at its own
 * slot, but a wrapped one only runs when its accessor is called, so dropping
 * the reference would drop the module's side effects with it.
 * @param {ConcatenatedModuleInfo} info module info
 * @returns {string} expression evaluating to undefined
 */
const getUnusedExportExpr = (info) =>
	info.wrapped
		? `/* unused export */ (${info.namespaceObjectName}, undefined)`
		: "/* unused export */ undefined";

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ModuleInfo} info module info
 * @param {ExportName} exportName exportName
 * @param {ModuleToInfoMap} moduleToInfoMap moduleToInfoMap
 * @param {RuntimeSpec} runtime for which runtime
 * @param {RequestShortener} requestShortener the request shortener
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {NeededNamespaceObjects} neededNamespaceObjects modules for which a namespace object should be generated
 * @param {boolean} asCall asCall
 * @param {boolean} depDeferred the dependency is deferred
 * @param {boolean | undefined} strictHarmonyModule strictHarmonyModule
 * @param {boolean | undefined} asiSafe asiSafe
 * @param {boolean=} moduleExportsAccess resolve to the module's own exports value with plain property access, skipping ESM interop
 * @param {Set<InstanceType<ExportInfo>>=} alreadyVisited alreadyVisited
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
	depDeferred,
	strictHarmonyModule,
	asiSafe,
	moduleExportsAccess,
	alreadyVisited
) => {
	const exportsType = getExportsType(moduleGraph, info, strictHarmonyModule);
	const moduleDeferred =
		info.type === "external" &&
		info.deferred &&
		!(/** @type {BuildMeta} */ (info.module.buildMeta).async);
	const deferred = depDeferred && moduleDeferred;

	if (moduleExportsAccess && info.type === "concatenated") {
		neededNamespaceObjects.add(info);
		// ids arrive as declared names and the rendered exports object is keyed by
		// used ones, so resolve here — the same way `case "external"` does below.
		// Resolving in the caller instead would mangle twice.
		const usedName =
			exportName.length === 0
				? exportName
				: moduleGraph
						.getExportsInfo(info.module)
						.getUsedName(exportName, runtime);
		if (!usedName) {
			return {
				info,
				rawName: getUnusedExportExpr(info),
				ids: [],
				exportName
			};
		}
		return {
			info,
			rawName:
				/** @type {NonNullable<ConcatenatedModuleInfo["namespaceObjectName"]>} */
				(info.namespaceObjectName),
			ids: /** @type {ExportName} */ (usedName),
			exportName
		};
	}

	if (exportName.length === 0) {
		switch (exportsType) {
			case "default-only":
				if (deferred) info.deferredNamespaceObjectUsed = true;
				else info.interopNamespaceObject2Used = true;
				return {
					info,
					rawName: deferred
						? /** @type {string} */ (info.deferredNamespaceObjectName)
						: getInteropExpr(info, info.interopNamespaceObject2Name),
					ids: exportName,
					exportName
				};
			case "default-with-named":
				if (deferred) info.deferredNamespaceObjectUsed = true;
				else info.interopNamespaceObjectUsed = true;
				return {
					info,
					rawName: deferred
						? /** @type {string} */ (info.deferredNamespaceObjectName)
						: getInteropExpr(info, info.interopNamespaceObjectName),
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
				switch (exportName[0]) {
					case "default":
						exportName = exportName.slice(1);
						if (deferred) {
							// `ns.default` for a deferred default-with-named external
							// module must read through the optimized `.a` getter
							// (which lazily evaluates the module and returns its
							// exports), not the proxy namespace itself — otherwise
							// `typeof ns.default` / `ns.default instanceof X`
							// observe the proxy instead of the actual default.
							return {
								info,
								rawName: `${info.deferredName}.a`,
								ids: exportName,
								exportName
							};
						}
						break;
					case "__esModule":
						return {
							info,
							rawName: "/* __esModule */true",
							ids: exportName.slice(1),
							exportName
						};
				}
				break;
			case "default-only": {
				const exportId = exportName[0];
				if (exportId === "__esModule") {
					return {
						info,
						rawName: "/* __esModule */true",
						ids: exportName.slice(1),
						exportName
					};
				}
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
				if (deferred) {
					// As with default-with-named above, `ns.default` for a
					// deferred default-only external must read through the
					// optimized `.a` getter so that `typeof` / `instanceof`
					// observe the actual default value rather than the proxy.
					return {
						info,
						rawName: `${info.deferredName}.a`,
						ids: exportName,
						exportName
					};
				}
				break;
			}
			case "dynamic":
				switch (exportName[0]) {
					case "default": {
						exportName = exportName.slice(1);
						if (deferred) {
							return {
								info,
								rawName: `${info.deferredName}.a`,
								ids: exportName,
								exportName
							};
						}
						if (moduleDeferred) {
							return {
								info,
								rawName: getExternalModuleExpr(info),
								ids: exportName,
								exportName
							};
						}
						info.interopDefaultAccessUsed = true;
						const accessor = getInteropExpr(
							info,
							info.interopDefaultAccessName
						);
						const defaultExport = asCall
							? `${accessor}()`
							: asiSafe
								? `(${accessor}())`
								: asiSafe === false
									? `;(${accessor}())`
									: `${accessor}.a`;
						return {
							info,
							rawName: defaultExport,
							ids: exportName,
							exportName
						};
					}
					case "__esModule":
						return {
							info,
							rawName: "/* __esModule */true",
							ids: exportName.slice(1),
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
					rawName:
						/** @type {NonNullable<ConcatenatedModuleInfo["namespaceObjectName"]>} */
						(info.namespaceObjectName),
					ids: exportName,
					exportName
				};
			case "external":
				if (deferred) {
					info.deferredNamespaceObjectUsed = true;
					return {
						info,
						rawName: /** @type {string} */ (info.deferredNamespaceObjectName),
						ids: exportName,
						exportName
					};
				}
				return {
					info,
					rawName: getExternalModuleExpr(info),
					ids: exportName,
					exportName
				};
		}
	}
	const exportsInfo = moduleGraph.getExportsInfo(info.module);
	const exportInfo = exportsInfo.getExportInfo(exportName[0]);
	// Lazily allocate: only the reexport-following recursion below needs it,
	// most calls return before reaching this point.
	if (alreadyVisited === undefined) alreadyVisited = new Set();
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
					rawName: /** @type {string} */ (info.namespaceObjectName),
					ids: exportName,
					exportName
				};
			}
			const directExport = info.exportMap && info.exportMap.get(exportId);
			if (directExport) {
				const usedName = exportsInfo.getUsedName(exportName, runtime);
				if (!usedName) {
					return {
						info,
						rawName: "/* unused export */ undefined",
						ids: exportName.slice(1),
						exportName
					};
				}
				if (usedName instanceof InlinedUsedName) {
					return {
						info,
						// Render the inlined literal only (e.g. `"str"`), not its property
						// suffix: that suffix is returned in `ids` and appended once by
						// getFinalName. Using `usedName.render()` would emit it here too,
						// duplicating the access (e.g. `"str".a.a`).
						rawName: usedName.render(
							Template.toNormalComment(
								`inlined export ${propertyAccess(exportName)}`
							)
						),
						ids: usedName.suffix,
						exportName
					};
				}
				return {
					info,
					name: directExport,
					ids: /** @type {ExportName} */ (usedName).slice(1),
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
			const reexport = exportInfo.findTarget(moduleGraph, (module) =>
				moduleToInfoMap.has(module)
			);
			if (reexport === false) {
				// Source module was removed because all its exports were inlined;
				// we render the inlined value here instead of binding to the now-absent module.
				const target = exportInfo.getTarget(moduleGraph);
				if (target && target.export) {
					const usedName = moduleGraph
						.getExportsInfo(target.module)
						.getUsedName([...target.export, ...exportName.slice(1)], runtime);
					if (usedName instanceof InlinedUsedName) {
						return {
							info,
							// Literal only; suffix is appended once via `ids` (see directExport branch).
							rawName: usedName.render(
								Template.toNormalComment(
									`inlined export ${propertyAccess(exportName)}`
								)
							),
							ids: usedName.suffix,
							exportName
						};
					}
				}
				throw new Error(
					`Target module of reexport from '${info.module.readableIdentifier(
						requestShortener
					)}' is not part of the concatenation (export '${exportId}')\nModules in the concatenation:\n${Array.from(
						moduleToInfoMap,
						([m, info]) =>
							` * ${info.type} ${m.readableIdentifier(requestShortener)}`
					).join("\n")}`
				);
			}
			if (reexport) {
				const refInfo = moduleToInfoMap.get(reexport.module);
				return getFinalBinding(
					moduleGraph,
					/** @type {ModuleInfo} */ (refInfo),
					reexport.export
						? [...reexport.export, ...exportName.slice(1)]
						: exportName.slice(1),
					moduleToInfoMap,
					runtime,
					requestShortener,
					runtimeTemplate,
					neededNamespaceObjects,
					asCall,
					reexport.deferred,
					/** @type {BuildMeta} */
					(info.module.buildMeta).strictHarmonyModule,
					asiSafe,
					false,
					alreadyVisited
				);
			}
			// A wrapped module resolves every export through its live exports
			// alias (namespaceObjectName), same as namespaceExportSymbol modules.
			if (info.namespaceExportSymbol || info.wrapped) {
				const usedName = exportsInfo.getUsedName(exportName, runtime);
				if (!usedName) {
					return {
						info,
						rawName: "/* unused export */ undefined",
						ids: exportName.slice(1),
						exportName
					};
				}
				// an inlined export never reaches the exports object, so render the
				// literal instead of reading the namespace
				if (usedName instanceof InlinedUsedName) {
					return {
						info,
						// Literal only; suffix is appended once via `ids` (see directExport branch).
						rawName: usedName.render(
							Template.toNormalComment(
								`inlined export ${propertyAccess(exportName)}`
							)
						),
						ids: usedName.suffix,
						exportName
					};
				}
				return {
					info,
					rawName: /** @type {string} */ (info.namespaceObjectName),
					ids: /** @type {ExportName} */ (usedName),
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
			const used = exportsInfo.getUsedName(exportName, runtime);
			if (!used) {
				return {
					info,
					rawName: "/* unused export */ undefined",
					ids: exportName.slice(1),
					exportName
				};
			}
			if (used instanceof InlinedUsedName) {
				return {
					info,
					// Literal only; suffix is appended once via `ids` (see directExport branch).
					rawName: used.render(
						Template.toNormalComment(
							`inlined export ${propertyAccess(exportName)}`
						)
					),
					ids: used.suffix,
					exportName
				};
			}
			const usedName = /** @type {ExportName} */ (used);
			const comment = equals(usedName, exportName)
				? ""
				: Template.toNormalComment(`${exportName.join(".")}`);
			return {
				info,
				rawName:
					(deferred ? `${info.deferredName}.a` : getExternalModuleExpr(info)) +
					comment,
				ids: usedName,
				exportName
			};
		}
	}
};

/**
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ModuleInfo} info module info
 * @param {ExportName} exportName exportName
 * @param {ModuleToInfoMap} moduleToInfoMap moduleToInfoMap
 * @param {RuntimeSpec} runtime for which runtime
 * @param {RequestShortener} requestShortener the request shortener
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {NeededNamespaceObjects} neededNamespaceObjects modules for which a namespace object should be generated
 * @param {boolean} asCall asCall
 * @param {boolean} depDeferred the dependency is deferred
 * @param {boolean | undefined} callContext callContext
 * @param {boolean | undefined} strictHarmonyModule strictHarmonyModule
 * @param {boolean | undefined} asiSafe asiSafe
 * @param {boolean=} moduleExportsAccess resolve to the module's own exports value with plain property access, skipping ESM interop
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
	depDeferred,
	callContext,
	strictHarmonyModule,
	asiSafe,
	moduleExportsAccess
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
		depDeferred,
		strictHarmonyModule,
		asiSafe,
		moduleExportsAccess
	);
	{
		const { ids, comment } = binding;
		/** @type {string} */
		let reference;
		/** @type {boolean} */
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

		if (isPropertyAccess) {
			if (asCall && callContext === false) {
				return asiSafe
					? `(0,${reference})`
					: asiSafe === false
						? `;(0,${reference})`
						: `/*#__PURE__*/Object(${reference})`;
			} else if (binding.info.wrapped) {
				return asiSafe === false ? `;(${reference})` : `(${reference})`;
			}
		}

		return reference;
	}
};

/**
 * @typedef {object} ConcatenateModuleHooks
 * @property {SyncBailHook<[ConcatenatedModule, RuntimeSpec[], string, Record<string, string>], boolean>} onDemandExportsGeneration
 * @property {SyncBailHook<[Partial<ConcatenatedModuleInfo>, ConcatenatedModuleInfo], boolean | void>} concatenatedModuleInfo
 */

/** @typedef {BuildInfo["topLevelDeclarations"]} TopLevelDeclarations */

/**
 * Defines the build info properties specific to concatenated modules.
 * @typedef {object} KnownConcatenatedModuleBuildInfo
 * @property {FileSystemDependencies=} fileDependencies
 * @property {FileSystemDependencies=} contextDependencies
 * @property {FileSystemDependencies=} missingDependencies
 * @property {boolean=} needCreateRequire collected from the inner modules
 * @property {boolean=} inlineExports taken over from the root module
 */

/** @typedef {BuildInfo & KnownConcatenatedModuleBuildInfo} ConcatenatedModuleBuildInfo */

class ConcatenatedModule extends Module {
	/**
	 * @param {Module} rootModule the root module of the concatenation
	 * @param {Set<Module>} modules all modules in the concatenation (including the root module)
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {Compilation} compilation the compilation
	 * @param {AssociatedObjectForCache=} associatedObjectForCache object for caching
	 * @param {HashFunction=} hashFunction hash function to use
	 * @returns {ConcatenatedModule} the module
	 */
	static create(
		rootModule,
		modules,
		runtime,
		compilation,
		associatedObjectForCache,
		hashFunction = DEFAULTS.HASH_FUNCTION
	) {
		const identifier = ConcatenatedModule._createIdentifier(
			rootModule,
			modules,
			associatedObjectForCache,
			hashFunction
		);
		return new ConcatenatedModule({
			identifier,
			rootModule,
			modules,
			runtime,
			compilation
		});
	}

	/**
	 * @param {object} options options
	 * @param {string} options.identifier the identifier of the module
	 * @param {Module} options.rootModule the root module of the concatenation
	 * @param {RuntimeSpec} options.runtime the selected runtime
	 * @param {Set<Module>} options.modules all concatenated modules
	 * @param {Compilation} options.compilation the compilation
	 */
	constructor({ identifier, rootModule, modules, runtime, compilation }) {
		super(JAVASCRIPT_MODULE_TYPE_ESM, null, rootModule && rootModule.layer);

		// Redeclared with the concatenated module specific shape
		/** @type {ConcatenatedModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {JavascriptModuleBuildMeta | undefined} */
		this.buildMeta = undefined;

		// Info from Factory
		/** @type {string} */
		this._identifier = identifier;
		/** @type {Module} */
		this.rootModule = rootModule;
		/** @type {Set<Module>} */
		this._modules = modules;
		/** @type {RuntimeSpec} */
		this._runtime = runtime;
		this.factoryMeta = rootModule && rootModule.factoryMeta;
		/** @type {Compilation} */
		this.compilation = compilation;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		throw new Error("Must not be called");
	}

	/**
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		return JAVASCRIPT_TYPES;
	}

	get modules() {
		return [...this._modules];
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `${this.rootModule.readableIdentifier(requestShortener)} + ${
			this._modules.size - 1
		} modules`;
	}

	/**
	 * Gets the library identifier.
	 * @param {LibIdentOptions} options options
	 * @returns {LibIdent | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return this.rootModule.libIdent(options);
	}

	/**
	 * Returns the path used when matching this module against rule conditions.
	 * @returns {NameForCondition | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		return this.rootModule.nameForCondition();
	}

	/**
	 * Gets side effects connection state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		return this.rootModule.getSideEffectsConnectionState(moduleGraph);
	}

	/**
	 * Builds the module using the provided compilation context.
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {BuildCallback} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		const { rootModule } = this;
		const concatenateCommonJsModules = isCommonJsConcatenationEnabled(
			options.optimization.concatenateModules
		);
		const { moduleArgument, exportsArgument } =
			/** @type {BuildInfo} */
			(rootModule.buildInfo);
		/** @type {ConcatenatedModuleBuildInfo} */
		this.buildInfo = {
			strict: true,
			cacheable: true,
			moduleArgument,
			exportsArgument,
			fileDependencies: new LazySet(),
			contextDependencies: new LazySet(),
			missingDependencies: new LazySet(),
			topLevelDeclarations: new Set(),
			assets: undefined,
			inlineExports: /** @type {JavascriptModuleBuildInfo} */ (
				rootModule.buildInfo
			).inlineExports
		};
		this.buildMeta = rootModule.buildMeta;
		this.clearDependenciesAndBlocks();
		this.clearWarningsAndErrors();

		for (const m of this._modules) {
			// populate cacheable
			const { cacheable, notCacheableReasons } = /** @type {BuildInfo} */ (
				m.buildInfo
			);
			if (!cacheable) {
				this.buildInfo.cacheable = false;
				if (notCacheableReasons) {
					const reasons =
						this.buildInfo.notCacheableReasons ||
						(this.buildInfo.notCacheableReasons = []);
					for (const reason of notCacheableReasons) {
						if (!reasons.includes(reason)) reasons.push(reason);
					}
				}
			}

			// populate dependencies — keep only deps that leave the concat set
			for (const d of m.dependencies) {
				if (
					!Dependency.canConcatenate(d, concatenateCommonJsModules) ||
					!this._modules.has(
						/** @type {Module} */
						(compilation.moduleGraph.getModule(d))
					)
				) {
					this.dependencies.push(d);
				}
			}
			// populate codeGenerationDependencies — the inner modules'
			// templates are applied during ConcatenatedModule.codeGeneration,
			// so the referenced modules must have been code-generated by then.
			// Skip references that point back into the concat set itself.
			if (m.codeGenerationDependencies !== undefined) {
				for (const d of m.codeGenerationDependencies) {
					const referenced =
						/** @type {Module} */
						(compilation.moduleGraph.getModule(d));
					if (!this._modules.has(referenced)) {
						this.addCodeGenerationDependency(d);
					}
				}
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

			const { assets, assetsInfo, topLevelDeclarations, needCreateRequire } =
				/** @type {JavascriptModuleBuildInfo} */ (m.buildInfo);

			const buildInfo = this.buildInfo;

			// populate topLevelDeclarations
			if (topLevelDeclarations) {
				const mergedTopLevelDeclarations = buildInfo.topLevelDeclarations;
				if (mergedTopLevelDeclarations !== undefined) {
					for (const decl of topLevelDeclarations) {
						mergedTopLevelDeclarations.add(decl);
					}
				}
			} else {
				buildInfo.topLevelDeclarations = undefined;
			}

			// populate needCreateRequire
			if (needCreateRequire) {
				this.buildInfo.needCreateRequire = true;
			}

			// populate assets
			if (assets) {
				if (buildInfo.assets === undefined) {
					buildInfo.assets = Object.create(null);
				}
				Object.assign(
					/** @type {NonNullable<BuildInfo["assets"]>} */
					(buildInfo.assets),
					assets
				);
			}
			if (assetsInfo) {
				if (buildInfo.assetsInfo === undefined) {
					buildInfo.assetsInfo = new Map();
				}
				for (const [key, value] of assetsInfo) {
					buildInfo.assetsInfo.set(key, value);
				}
			}
		}
		callback();
	}

	/**
	 * Returns the estimated size for the requested source type.
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
		const concatenateCommonJsModules = isCommonJsConcatenationEnabled(
			this.compilation.options.optimization.concatenateModules
		);
		/** @type {ConcatenationEntry[]} */
		const list = [];
		/** @type {Map<Module, { runtimeCondition: RuntimeSpec | true, nonDeferAccess: NonDeferAccess }>} */
		const existingEntries = new Map();

		/** @type {Map<Module, Module[]>} */
		const importConnections = new Map();
		/** @type {Set<Module>} */
		const wrappedModules = new Set();

		/**
		 * @param {Module} module a module
		 * @returns {Iterable<{ connection: ModuleGraphConnection, runtimeCondition: RuntimeSpec | true, nonDeferAccess: NonDeferAccess }>} imported modules in order
		 */
		const getConcatenatedImports = (module) => {
			const connections = [...moduleGraph.getOutgoingConnections(module)];
			if (module === rootModule) {
				for (const c of moduleGraph.getOutgoingConnections(this)) {
					connections.push(c);
				}
			}
			/**
			 * @type {{ connection: ModuleGraphConnection, sourceOrder: number, rangeStart: number | undefined, defer?: boolean }[]}
			 */
			const references = connections
				.filter((connection) => {
					if (
						!connection.dependency ||
						!Dependency.canConcatenate(
							connection.dependency,
							concatenateCommonJsModules
						)
					) {
						return false;
					}
					if (
						!Module.getSourceBasicTypes(connection.module).has(JAVASCRIPT_TYPE)
					) {
						return false;
					}
					return (
						connection &&
						connection.resolvedOriginModule === module &&
						connection.module &&
						connection.isTargetActive(runtime)
					);
				})
				.map((connection) => {
					const dep =
						/** @type {HarmonyImportDependency} */
						(connection.dependency);
					return {
						connection,
						// A require() edge carries no sourceOrder; Infinity sorts it last,
						// matching the low-priority sentinel. NaN must not be used here:
						// compareNumbers returns 0 against every number, which makes the
						// comparator non-transitive and the order depend on insertion order.
						sourceOrder:
							typeof dep.sourceOrder === "number" ? dep.sourceOrder : Infinity,
						rangeStart: dep.range && dep.range[0],
						defer: ImportPhaseUtils.isDefer(dep.phase)
					};
				});
			/**
			 * bySourceOrder
			 * @example
			 * import a from "a"; // sourceOrder=1
			 * import b from "b"; // sourceOrder=2
			 *
			 * byRangeStart
			 * @example
			 * import {a, b} from "a"; // sourceOrder=1
			 * a.a(); // first range
			 * b.b(); // second range
			 *
			 * If there is no reexport, we have the same source.
			 * If there is reexport, but module has side effects, this will lead to reexport module only.
			 * If there is side-effects-free reexport, we can get simple deterministic result with range start comparison.
			 */
			references.sort(concatComparators(bySourceOrder, byRangeStart));
			/** @type {Map<Module, { connection: ModuleGraphConnection, runtimeCondition: RuntimeSpec | true, nonDeferAccess: NonDeferAccess }>} */
			const referencesMap = new Map();
			/** @type {Module[] | undefined} */
			let targets;
			for (const { connection, defer } of references) {
				const runtimeCondition = filterRuntime(runtime, (r) =>
					connection.isTargetActive(r)
				);
				if (runtimeCondition === false) continue;
				const nonDeferAccess = !defer;
				const module = connection.module;
				if (targets === undefined) targets = [module];
				else if (!targets.includes(module)) targets.push(module);
				if (
					[
						CommonJsRequireDependency,
						CommonJsFullRequireDependency,
						CommonJsExportRequireDependency
					].some((Dep) => connection.dependency instanceof Dep)
				) {
					wrappedModules.add(module);
				}
				const entry = referencesMap.get(module);
				if (entry === undefined) {
					referencesMap.set(module, {
						connection,
						runtimeCondition,
						nonDeferAccess
					});
					continue;
				}
				entry.runtimeCondition = mergeRuntimeConditionNonFalse(
					entry.runtimeCondition,
					runtimeCondition,
					runtime
				);
				const wasDeferredOnly = !entry.nonDeferAccess;
				entry.nonDeferAccess = mergeNonDeferAccess(
					entry.nonDeferAccess,
					nonDeferAccess
				);
				// A deferred import does not evaluate, so the first eager reference
				// fixes the position; insertion order is emit order.
				if (wasDeferredOnly && nonDeferAccess) {
					entry.connection = connection;
					referencesMap.delete(module);
					referencesMap.set(module, entry);
				}
			}
			if (targets !== undefined) importConnections.set(module, targets);
			return referencesMap.values();
		};

		/**
		 * @param {ModuleGraphConnection} connection graph connection
		 * @param {RuntimeSpec | true} runtimeCondition runtime condition
		 * @param {NonDeferAccess} nonDeferAccess non-defer access
		 * @returns {void}
		 */
		const enterModule = (connection, runtimeCondition, nonDeferAccess) => {
			const module = connection.module;
			if (!module) return;
			const existingEntry = existingEntries.get(module);
			if (
				existingEntry &&
				existingEntry.runtimeCondition === true &&
				existingEntry.nonDeferAccess === true
			) {
				return;
			}
			if (modulesSet.has(module)) {
				existingEntries.set(module, {
					runtimeCondition: true,
					nonDeferAccess: true
				});
				if (runtimeCondition !== true) {
					throw new Error(
						`Cannot runtime-conditional concatenate a module (${module.identifier()} in ${this.rootModule.identifier()}, ${runtimeConditionToString(
							runtimeCondition
						)}). This should not happen.`
					);
				}
				if (nonDeferAccess !== true) {
					throw new Error(
						`Cannot deferred concatenate a module (${module.identifier()} in ${this.rootModule.identifier()}. This should not happen.`
					);
				}
				const imports = getConcatenatedImports(module);
				for (const {
					connection,
					runtimeCondition,
					nonDeferAccess
				} of imports) {
					enterModule(connection, runtimeCondition, nonDeferAccess);
				}
				list.push({
					type: "concatenated",
					wrapped: needWrapped(module),
					module: connection.module,
					runtimeCondition,
					nonDeferAccess
				});
			} else {
				/** @type {RuntimeSpec | boolean} */
				let reducedRuntimeCondition;
				/** @type {NonDeferAccess} */
				let reducedNonDeferAccess;
				if (existingEntry !== undefined) {
					reducedRuntimeCondition = subtractRuntimeCondition(
						runtimeCondition,
						existingEntry.runtimeCondition,
						runtime
					);
					reducedNonDeferAccess = subtractNonDeferAccess(
						nonDeferAccess,
						existingEntry.nonDeferAccess
					);
					if (
						reducedRuntimeCondition === false &&
						reducedNonDeferAccess === false
					) {
						return;
					}
					if (reducedRuntimeCondition !== false) {
						existingEntry.runtimeCondition = mergeRuntimeConditionNonFalse(
							existingEntry.runtimeCondition,
							reducedRuntimeCondition,
							runtime
						);
					}
					if (reducedNonDeferAccess !== false) {
						existingEntry.nonDeferAccess = mergeNonDeferAccess(
							existingEntry.nonDeferAccess,
							reducedNonDeferAccess
						);
					}
				} else {
					reducedRuntimeCondition = runtimeCondition;
					reducedNonDeferAccess = nonDeferAccess;
					existingEntries.set(connection.module, {
						runtimeCondition,
						nonDeferAccess
					});
				}
				if (list.length > 0) {
					const lastItem = list[list.length - 1];
					if (
						lastItem.type === "external" &&
						lastItem.module === connection.module
					) {
						lastItem.runtimeCondition = mergeRuntimeCondition(
							lastItem.runtimeCondition,
							reducedRuntimeCondition,
							runtime
						);
						lastItem.nonDeferAccess = mergeNonDeferAccess(
							lastItem.nonDeferAccess,
							reducedNonDeferAccess
						);
						return;
					}
				}
				list.push({
					type: "external",
					wrapped: wrappedModules.has(connection.module),
					get module() {
						// We need to use a getter here, because the module in the dependency
						// could be replaced by some other process (i. e. also replaced with a
						// concatenated module)
						return connection.module;
					},
					runtimeCondition: reducedRuntimeCondition,
					nonDeferAccess: reducedNonDeferAccess
				});
			}
		};

		existingEntries.set(rootModule, {
			runtimeCondition: true,
			nonDeferAccess: true
		});
		const imports = getConcatenatedImports(rootModule);
		for (const { connection, runtimeCondition, nonDeferAccess } of imports) {
			enterModule(connection, runtimeCondition, nonDeferAccess);
		}
		list.push({
			type: "concatenated",
			wrapped: needWrapped(rootModule),
			module: rootModule,
			runtimeCondition: true,
			nonDeferAccess: true
		});

		// A lazily evaluated member may only depend on lazily evaluated members,
		// so wrapping propagates forward from every `require()` target along all
		// import edges, ESM included.
		/** @type {Set<Module>} */
		const modules = new Set(wrappedModules);
		for (const entry of list) {
			if (entry.wrapped) modules.add(entry.module);
		}
		const queue = [...modules];
		for (let i = 0; i < queue.length; i++) {
			const targets = importConnections.get(queue[i]);
			if (targets === undefined) continue;
			for (const target of targets) {
				if (modules.has(target)) continue;
				modules.add(target);
				queue.push(target);
			}
		}
		for (const entry of list) {
			if (
				!entry.wrapped &&
				modules.has(entry.module) &&
				entryCanBeWrapped(entry)
			) {
				entry.wrapped = true;
			}
		}
		return list;
	}

	/**
	 * @param {Module} rootModule the root module of the concatenation
	 * @param {Set<Module>} modules all modules in the concatenation (including the root module)
	 * @param {AssociatedObjectForCache=} associatedObjectForCache object for caching
	 * @param {HashFunction=} hashFunction hash function to use
	 * @returns {string} the identifier
	 */
	static _createIdentifier(
		rootModule,
		modules,
		associatedObjectForCache,
		hashFunction = DEFAULTS.HASH_FUNCTION
	) {
		const cachedMakePathsRelative = makePathsRelative.bindContextCache(
			/** @type {string} */ (rootModule.context),
			associatedObjectForCache
		);
		/** @type {string[]} */
		const identifiers = [];
		for (const module of modules) {
			identifiers.push(cachedMakePathsRelative(module.identifier()));
		}
		identifiers.sort();
		const hash = createHash(hashFunction);
		hash.update(identifiers.join(" "));
		return `${rootModule.identifier()}|${hash.digest("hex")}`;
	}

	/**
	 * Adds the provided file dependencies to the module.
	 * @param {FileSystemDependencies} fileDependencies set where file dependencies are added to
	 * @param {FileSystemDependencies} contextDependencies set where context dependencies are added to
	 * @param {FileSystemDependencies} missingDependencies set where missing dependencies are added to
	 * @param {FileSystemDependencies} buildDependencies set where build dependencies are added to
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

	/*
	 * How the inner modules become one flat source. Stages [1]-[5] only mutate the
	 * per-module info records (names, ReplaceSource patches); stages [6]-[9] append
	 * to the single output ConcatSource, in exactly the order shown.
	 *
	 *  _getModulesWithInfo() — ordered concatenation list + one info per module
	 *  |     (concatenated [+wrapped] | external | reference)
	 *  v
	 *  [1] ANALYSE — inner codeGeneration() per module, into a ConcatenationScope
	 *  |     plain    -> ReplaceSource + ast + scope analysis
	 *  |     wrapped  -> ReplaceSource only, body kept verbatim
	 *  |     external -> nothing yet, rendered as a require() below
	 *  [2] RESERVE — free globals of the analysed bodies enter allUsedNames, so
	 *  |     renaming in [3] can't shadow them (a wrapped body is not analysed;
	 *  |     the reserved `__webpack_` prefix protects it)
	 *  [3] RENAME — module-scope variables renamed inside the ReplaceSource, then
	 *  |     the generated names allocated: wrapper accessor, namespace object,
	 *  |     interop helpers, external import variable
	 *  [4] LINK — __WEBPACK_MODULE_REFERENCE__ tokens replaced by their final
	 *  |     binding; through the ast for analysed bodies, textually for wrapped
	 *  [5] COLLECT EXPORTS — root exports split into used / unused / inlined
	 *  v
	 *  ---- from here on everything is appended to the result ConcatSource ----
	 *  |
	 *  [6] EMIT EXPORTS — __esModule flag + exports getters, UNUSED/INLINED lists
	 *  [7] BUILD NS — namespace object sources built as strings (not emitted yet)
	 *  [8] DEFINE — everything that must exist before any body runs: namespace
	 *  |     objects, wrapper accessors (wrapped modules and wrapped externals),
	 *  |     deferred external loaders
	 *  [9] EVALUATE — bodies in concatenation order: plain bodies inline, externals
	 *  |     as require(); a wrapped body stays behind its accessor
	 *  v
	 *  [10] RESULT — CodeGenerationResult { sources, data, runtimeRequirements }
	 */
	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime: generationRuntime,
		runtimes,
		codeGenerationResults
	}) {
		const { concatenatedModuleInfo } = ConcatenatedModule.getCompilationHooks(
			this.compilation
		);

		/** @type {RuntimeRequirements} */
		const runtimeRequirements = new Set();
		const runtime = intersectRuntime(generationRuntime, this._runtime);

		const requestShortener = runtimeTemplate.requestShortener;
		// Meta info for each module, in evaluation order (repeats become references)
		const [modulesWithInfo, moduleToInfoMap] = this._getModulesWithInfo(
			moduleGraph,
			runtime
		);

		// This module's body is the root's body, so a wrapped root still evaluates
		// at its slot. No import edge inside the concatenation expresses that.
		const rootModuleInfo = moduleToInfoMap.get(this.rootModule);
		if (rootModuleInfo !== undefined) rootModuleInfo.eager = true;

		// State shared by all stages below, in the order they are filled

		// List of all used names to avoid conflicts
		const allUsedNames = new Set(RESERVED_NAMES);

		// Updated Top level declarations are created by renaming
		/** @type {TopLevelDeclarations} */
		const topLevelDeclarations = new Set();

		// Free names remaining in the rendered source (runtime globals are
		// tracked by runtimeRequirements instead)
		/** @type {Set<string>} */
		const freeNames = new Set();

		// List of additional names in scope for module references
		/** @type {UsedNamesInScopeInfo} */
		const usedNamesInScopeInfo = new Map();

		// Set of already checked scopes
		/** @type {Set<Scope>} */
		const ignoredScopes = new Set();

		// Set with modules that need a generated namespace object
		/** @type {NeededNamespaceObjects} */
		const neededNamespaceObjects = new Set();

		// Set with modules whose mangled namespace escapes as a whole value and
		// therefore needs a decoupled namespace object keyed by the original names
		/** @type {Set<ConcatenatedModuleInfo | ExternalModuleInfo>} */
		const neededEscapeNamespaceObjects = new Set();

		// #region [1] ANALYSE: run each inner module's own codeGeneration; a
		// non-wrapped body is parsed and scope-analysed so [3] can rename its locals
		for (const info of moduleToInfoMap.values()) {
			this._analyseModule(
				moduleToInfoMap,
				info,
				dependencyTemplates,
				runtimeTemplate,
				moduleGraph,
				chunkGraph,
				runtime,
				runtimes,
				/** @type {CodeGenerationResults} */
				(codeGenerationResults),
				allUsedNames
			);
		}
		// #endregion

		/**
		 * Lazily allocates a decoupled namespace object for a concatenated module
		 * whose exports are mangled, so an escaping whole-namespace value still
		 * exposes the original export names. Returns undefined when no export is
		 * mangled (the regular namespace object can be used as-is).
		 * @param {ConcatenatedModuleInfo | ExternalModuleInfo} info module info
		 * @returns {string | undefined} the escape namespace object name
		 */
		const getEscapeNamespaceObjectName = (info) => {
			// Only a hoisted member's namespaceExportSymbol is a real variable
			// holding the original names; a wrapped one reuses the field for its
			// `X_namespaceFn()` call, which exposes the mangled keys
			if (
				info.type === "concatenated" &&
				!info.wrapped &&
				info.namespaceExportSymbol
			) {
				return undefined;
			}

			// Deferred external modules keep their special deferred namespace object
			// and are rendered through a different path that wouldn't emit ours.
			if (info.type === "external" && info.deferred) {
				return undefined;
			}
			// Only real ES module namespaces are decoupled; non-harmony modules use
			// their interop/fake namespace object as before.
			const buildMeta = /** @type {BuildMeta} */ (info.module.buildMeta);
			if (!buildMeta || buildMeta.exportsType !== "namespace") return undefined;
			if (info.escapeNamespaceObjectName !== undefined) {
				return info.escapeNamespaceObjectName;
			}
			const exportsInfo = moduleGraph.getExportsInfo(info.module);
			let mangled = false;
			for (const exportInfo of exportsInfo.orderedExports) {
				if (exportInfo.provided === false) continue;
				const usedName = exportInfo.getUsedName(undefined, runtime);
				if (!usedName || usedName instanceof InlinedUsedName) continue;
				if (usedName[usedName.length - 1] !== exportInfo.name) {
					mangled = true;
					break;
				}
			}
			if (!mangled) return undefined;
			const name = findNewName(
				"namespaceObject",
				allUsedNames,
				/** @type {UsedNames} */ (new Set()),
				info.module.readableIdentifier(requestShortener)
			);
			allUsedNames.add(name);
			topLevelDeclarations.add(name);
			info.escapeNamespaceObjectName = name;
			neededEscapeNamespaceObjects.add(info);
			return name;
		};

		// #region [2] RESERVE: the free globals of every analysed body. Claiming
		// them up front is what lets [3] rename without shadowing any of them
		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				if (info.wrapped) {
					// The body is emitted verbatim and never renamed, so every identifier
					// in it is claimed: its declarations must not shadow a name [3]
					// generates, and its free globals must not be captured by one.
					for (const name of findIdentifiers(
						/** @type {Source} */ (info.internalSource)
					)) {
						allUsedNames.add(name);
					}
					// A wrapped body has no scope analysis, so its references are found
					// textually. They still have to be resolved here: binding one is what
					// flags the interop objects it needs, and [3] allocates their names.
					/** @type {Set<string>} */
					const visitedReferences = new Set();
					for (const reference of ConcatenationScope.findModuleReferences(
						/** @type {Source} */ (info.internalSource)
					)) {
						if (visitedReferences.has(reference.name)) continue;
						visitedReferences.add(reference.name);
						const match = ConcatenationScope.matchModuleReference(
							reference.name
						);
						if (!match) continue;
						const referencedInfo = modulesWithInfo[match.index];
						if (referencedInfo.type === "reference") {
							throw new Error("Module reference can't point to a reference");
						}
						if (
							match.mangleableNamespace &&
							match.ids.length === 0 &&
							getEscapeNamespaceObjectName(referencedInfo) !== undefined
						) {
							continue;
						}
						getFinalBinding(
							moduleGraph,
							referencedInfo,
							match.ids,
							moduleToInfoMap,
							runtime,
							requestShortener,
							runtimeTemplate,
							neededNamespaceObjects,
							match.call,
							match.deferredImport,
							/** @type {BuildMeta} */
							(info.module.buildMeta).strictHarmonyModule,
							match.asiSafe,
							match.moduleExportsAccess
						);
					}
				} else {
					// ignore symbols from moduleScope
					if (info.moduleScope) {
						ignoredScopes.add(info.moduleScope);
					}

					// add global symbols
					if (info.unresolvedReferences) {
						for (const reference of info.unresolvedReferences) {
							const name = reference.identifier.name;
							if (ConcatenationScope.isModuleReference(name)) {
								const match = ConcatenationScope.matchModuleReference(name);
								if (!match) continue;
								const referencedInfo = modulesWithInfo[match.index];
								if (referencedInfo.type === "reference") {
									throw new Error(
										"Module reference can't point to a reference"
									);
								}
								// An escaping mangled namespace resolves to its own decoupled
								// namespace object (a unique top-level name), so it neither needs
								// the regular namespace object nor super-class scope handling.
								if (
									match.mangleableNamespace &&
									match.ids.length === 0 &&
									getEscapeNamespaceObjectName(referencedInfo) !== undefined
								) {
									continue;
								}
								const binding = getFinalBinding(
									moduleGraph,
									referencedInfo,
									match.ids,
									moduleToInfoMap,
									runtime,
									requestShortener,
									runtimeTemplate,
									neededNamespaceObjects,
									false,
									match.deferredImport,
									/** @type {BuildMeta} */
									(info.module.buildMeta).strictHarmonyModule,
									true,
									match.moduleExportsAccess
								);
								if (!binding.ids) continue;
								const { usedNames, alreadyCheckedScopes } =
									getUsedNamesInScopeInfo(
										usedNamesInScopeInfo,
										binding.info.module.identifier(),
										"name" in binding ? binding.name : ""
									);
								addScopeSymbols(
									reference.from,
									usedNames,
									alreadyCheckedScopes,
									ignoredScopes
								);
							} else {
								allUsedNames.add(name);
								freeNames.add(name);
							}
						}
					}
				}
			}
		}
		// #endregion

		/**
		 * @param {string} name the name to find a new name for
		 * @param {ConcatenatedModuleInfo} info the info of the module
		 * @param {Reference[]} references the references to the name
		 * @returns {string | undefined} the new name or undefined if the name is not found
		 */
		const _findNewName = (name, info, references) => {
			const { usedNames, alreadyCheckedScopes } = getUsedNamesInScopeInfo(
				usedNamesInScopeInfo,
				info.module.identifier(),
				name
			);
			if (allUsedNames.has(name) || usedNames.has(name)) {
				for (const ref of references) {
					addScopeSymbols(
						ref.from,
						usedNames,
						alreadyCheckedScopes,
						ignoredScopes
					);
				}
				const newName = findNewName(
					name,
					allUsedNames,
					usedNames,
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(newName);
				info.internalNames.set(name, newName);
				topLevelDeclarations.add(newName);
				return newName;
			}
		};

		/**
		 * @param {string} name the name to find a new name for
		 * @param {ConcatenatedModuleInfo} info the info of the module
		 * @param {Reference[]} references the references to the name
		 * @returns {string | undefined} the new name or undefined if the name is not found
		 */
		const _findNewNameForSpecifier = (name, info, references) => {
			const { usedNames: moduleUsedNames, alreadyCheckedScopes } =
				getUsedNamesInScopeInfo(
					usedNamesInScopeInfo,
					info.module.identifier(),
					name
				);
			/** @type {UsedNames} */
			const referencesUsedNames = new Set();
			for (const ref of references) {
				addScopeSymbols(
					ref.from,
					referencesUsedNames,
					alreadyCheckedScopes,
					ignoredScopes
				);
			}
			if (moduleUsedNames.has(name) || referencesUsedNames.has(name)) {
				const newName = findNewName(
					name,
					allUsedNames,
					new Set([...moduleUsedNames, ...referencesUsedNames]),
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(newName);
				topLevelDeclarations.add(newName);
				return newName;
			}
		};

		// #region [3] RENAME: rename every module-scope variable inside its
		// ReplaceSource, then allocate the generated names (wrapper accessor,
		// namespace object, interop helpers, external import variable)
		for (const info of moduleToInfoMap.values()) {
			const { usedNames: namespaceObjectUsedNames } = getUsedNamesInScopeInfo(
				usedNamesInScopeInfo,
				info.module.identifier(),
				""
			);
			switch (info.type) {
				case "concatenated": {
					if (info.wrapped) {
						// A wrapped module declares exactly one shared-scope name: the
						// lazy wrapper accessor holding its body. [2] claimed every
						// identifier of that body, so findNewName avoids the ones that
						// would shadow the accessor from inside it.
						const namespaceFnName = findNewName(
							"namespaceFn",
							allUsedNames,
							namespaceObjectUsedNames,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(namespaceFnName);
						topLevelDeclarations.add(namespaceFnName);
						info.namespaceFnName = namespaceFnName;
						// Every reference — `require()` and ESM import alike — reads the
						// live exports object through the accessor, so the namespace is
						// the call itself, not a variable. Not a declared name.
						info.namespaceObjectName = `${namespaceFnName}()`;
					} else {
						const variables = /** @type {Scope} */ (info.moduleScope).variables;
						for (const variable of variables) {
							const name = variable.name;
							const references = getAllReferences(variable);
							const newName = _findNewName(name, info, references);
							if (newName) {
								const source = /** @type {ReplaceSource} */ (info.source);
								/** @type {Set<Identifier>} */
								const allIdentifiers = new Set();
								for (const r of references) allIdentifiers.add(r.identifier);
								for (const identifier of variable.identifiers) {
									allIdentifiers.add(identifier);
								}
								for (const identifier of allIdentifiers) {
									const r = /** @type {Range} */ (identifier.range);
									const path = getPathInAst(
										/** @type {NonNullable<ConcatenatedModuleInfo["ast"]>} */
										(info.ast),
										identifier
									);
									if (path && path.length > 1) {
										const maybeProperty =
											path[1].type === "AssignmentPattern" &&
											path[1].left === path[0]
												? path[2]
												: path[1];
										if (
											maybeProperty.type === "Property" &&
											maybeProperty.shorthand
										) {
											source.insert(r[1], `: ${newName}`);
											continue;
										}
									}
									source.replace(r[0], r[1] - 1, newName);
								}
							} else {
								allUsedNames.add(name);
								info.internalNames.set(name, name);
								topLevelDeclarations.add(name);
							}
						}
						/** @type {string} */
						let namespaceObjectName;
						if (info.namespaceExportSymbol) {
							namespaceObjectName =
								/** @type {string} */
								(info.internalNames.get(info.namespaceExportSymbol));
						} else {
							namespaceObjectName = findNewName(
								"namespaceObject",
								allUsedNames,
								namespaceObjectUsedNames,
								info.module.readableIdentifier(requestShortener)
							);
							allUsedNames.add(namespaceObjectName);
						}
						info.namespaceObjectName = namespaceObjectName;
						topLevelDeclarations.add(namespaceObjectName);
					}
					break;
				}
				case "external": {
					const externalName = findNewName(
						"",
						allUsedNames,
						namespaceObjectUsedNames,
						info.module.readableIdentifier(requestShortener)
					);
					allUsedNames.add(externalName);
					info.name = externalName;
					topLevelDeclarations.add(externalName);

					if (info.wrapped) {
						const namespaceFnName = findNewName(
							"namespaceFn",
							allUsedNames,
							namespaceObjectUsedNames,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(namespaceFnName);
						info.namespaceFnName = namespaceFnName;
						topLevelDeclarations.add(namespaceFnName);
					}

					if (info.deferred) {
						const externalName = findNewName(
							"deferred",
							allUsedNames,
							namespaceObjectUsedNames,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(externalName);
						info.deferredName = externalName;
						topLevelDeclarations.add(externalName);

						const externalNameInterop = findNewName(
							"deferredNamespaceObject",
							allUsedNames,
							namespaceObjectUsedNames,
							info.module.readableIdentifier(requestShortener)
						);
						allUsedNames.add(externalNameInterop);
						info.deferredNamespaceObjectName = externalNameInterop;
						topLevelDeclarations.add(externalNameInterop);
					}
					break;
				}
			}
			const buildMeta = /** @type {BuildMeta} */ (info.module.buildMeta);
			if (buildMeta.exportsType !== "namespace") {
				const externalNameInterop = findNewName(
					"namespaceObject",
					allUsedNames,
					namespaceObjectUsedNames,
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(externalNameInterop);
				info.interopNamespaceObjectName = externalNameInterop;
				topLevelDeclarations.add(externalNameInterop);
			}
			if (
				buildMeta.exportsType === "default" &&
				buildMeta.defaultObject !== "redirect" &&
				info.interopNamespaceObject2Used
			) {
				const externalNameInterop = findNewName(
					"namespaceObject2",
					allUsedNames,
					namespaceObjectUsedNames,
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(externalNameInterop);
				info.interopNamespaceObject2Name = externalNameInterop;
				topLevelDeclarations.add(externalNameInterop);
			}
			if (buildMeta.exportsType === "dynamic" || !buildMeta.exportsType) {
				const externalNameInterop = findNewName(
					"default",
					allUsedNames,
					namespaceObjectUsedNames,
					info.module.readableIdentifier(requestShortener)
				);
				allUsedNames.add(externalNameInterop);
				info.interopDefaultAccessName = externalNameInterop;
				topLevelDeclarations.add(externalNameInterop);
			}
		}
		// #endregion

		// #region [4] LINK: resolve each cross-module reference token to the final
		// name picked in [3] and patch it in. Must run after [3] — a reference can
		// only be resolved once its target has been named
		for (const info of moduleToInfoMap.values()) {
			if (info.type !== "concatenated") continue;
			if (!info.wrapped) {
				// group references by name
				/** @type {Map<string, Reference[]>} */
				const referencesByName = new Map();
				for (const reference of /** @type {Reference[]} */ (
					info.unresolvedReferences
				)) {
					const name = reference.identifier.name;
					let references = referencesByName.get(name);
					if (references === undefined) {
						referencesByName.set(name, (references = []));
					}
					references.push(reference);
				}
				for (const [name, references] of referencesByName) {
					const match = ConcatenationScope.matchModuleReference(name);
					if (match) {
						const referencedInfo = modulesWithInfo[match.index];
						if (referencedInfo.type === "reference") {
							throw new Error("Module reference can't point to a reference");
						}
						const concatenationScope = /** @type {ConcatenatedModuleInfo} */ (
							referencedInfo
						).concatenationScope;
						const exportId = match.ids[0];
						const specifier =
							concatenationScope && concatenationScope.getRawExport(exportId);
						if (specifier) {
							const newName = _findNewNameForSpecifier(
								specifier,
								info,
								references
							);
							const initFragmentChanged =
								newName &&
								concatenatedModuleInfo.call(
									{
										rawExportMap: new Map([
											[exportId, /** @type {string} */ (newName)]
										])
									},
									/** @type {ConcatenatedModuleInfo} */ (referencedInfo)
								);
							if (initFragmentChanged) {
								concatenationScope.setRawExportMap(exportId, newName);
							}
						}
						// A whole-namespace value that escapes: when the module's exports
						// are mangled, point it at a decoupled namespace object that keeps
						// the original names so untracked access keeps working.
						const escapeName =
							match.mangleableNamespace && match.ids.length === 0
								? getEscapeNamespaceObjectName(referencedInfo)
								: undefined;
						const finalName =
							escapeName !== undefined
								? escapeName
								: getFinalName(
										moduleGraph,
										referencedInfo,
										match.ids,
										moduleToInfoMap,
										runtime,
										requestShortener,
										runtimeTemplate,
										neededNamespaceObjects,
										match.call,
										match.deferredImport,
										!match.directImport,
										/** @type {BuildMeta} */
										(info.module.buildMeta).strictHarmonyModule,
										match.asiSafe,
										match.moduleExportsAccess
									);

						for (const reference of references) {
							const r = /** @type {Range} */ (reference.identifier.range);
							const source = /** @type {ReplaceSource} */ (info.source);
							// range is extended by 2 chars to cover the appended "._"
							source.replace(r[0], r[1] + 1, finalName);
						}
					}
				}
			} else {
				// Wrapped bodies are not re-parsed: find their reference tokens
				// textually. [2] scanned the same source, so this reuses its result.
				/** @type {Map<string, string>} */
				const finalNames = new Map();
				const source = /** @type {ReplaceSource} */ (info.source);
				for (const reference of ConcatenationScope.findModuleReferences(
					/** @type {Source} */ (info.internalSource)
				)) {
					let finalName = finalNames.get(reference.name);
					if (finalName === undefined) {
						const match = ConcatenationScope.matchModuleReference(
							reference.name
						);
						if (!match) continue;
						const referencedInfo = modulesWithInfo[match.index];
						if (referencedInfo.type === "reference") {
							throw new Error("Module reference can't point to a reference");
						}
						// Same escaping whole-namespace rule as the hoisted branch above: a
						// wrapped target resolves to its `X_namespaceFn()` exports object,
						// whose keys are the mangled ones.
						const escapeName =
							match.mangleableNamespace && match.ids.length === 0
								? getEscapeNamespaceObjectName(referencedInfo)
								: undefined;
						finalName =
							escapeName !== undefined
								? escapeName
								: getFinalName(
										moduleGraph,
										referencedInfo,
										match.ids,
										moduleToInfoMap,
										runtime,
										requestShortener,
										runtimeTemplate,
										neededNamespaceObjects,
										match.call,
										match.deferredImport,
										!match.directImport,
										/** @type {BuildMeta} */
										(info.module.buildMeta).strictHarmonyModule,
										match.asiSafe,
										match.moduleExportsAccess
									);
						finalNames.set(reference.name, finalName);
					}
					// token end is extended by 2 chars to cover the appended "._"
					source.replace(reference.start, reference.end + 1, finalName);
				}
			}
		}
		// #endregion

		// #region [5] COLLECT EXPORTS: split the root module's exports into used /
		// unused / inlined. Used ones stay thunks — resolving one can still
		// register a namespace object, which [7] must see
		// Map with all root exposed used exports
		/** @type {Map<string, (requestShortener: RequestShortener) => string>} */
		const exportsMap = new Map();

		// Set with all root exposed unused exports
		/** @type {Set<string>} */
		const unusedExports = new Set();
		// Set with all root exposed exports that were substituted with inlined literals
		/** @type {Set<string>} */
		const inlinedExports = new Set();

		const rootInfo =
			/** @type {ConcatenatedModuleInfo} */
			(moduleToInfoMap.get(this.rootModule));
		const strictHarmonyModule =
			/** @type {BuildMeta} */
			(rootInfo.module.buildMeta).strictHarmonyModule;
		const exportsInfo = moduleGraph.getExportsInfo(rootInfo.module);
		/** @type {Record<string, string>} */
		const exportsFinalName = {};
		for (const exportInfo of exportsInfo.orderedExports) {
			const name = exportInfo.name;
			if (exportInfo.provided === false) continue;
			const used = exportInfo.getUsedName(undefined, runtime);
			if (!used) {
				unusedExports.add(name);
				continue;
			}
			if (used instanceof InlinedUsedName) {
				inlinedExports.add(name);
				continue;
			}
			exportsMap.set(used, (requestShortener) => {
				try {
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
						false,
						strictHarmonyModule,
						true
					);
					exportsFinalName[used] = finalName;
					return `/* ${
						exportInfo.isReexport() ? "reexport" : "binding"
					} */ ${finalName}`;
				} catch (err) {
					/** @type {Error} */
					(err).message +=
						`\nwhile generating the root export '${name}' (used name: '${used}')`;
					throw err;
				}
			});
		}
		// #endregion

		// #region [6] EMIT EXPORTS: first thing in the output — the exports getters
		// must exist before any body runs, so circular importers see them
		const result = new ConcatSource();

		// add harmony compatibility flag (must be first because of possible circular dependencies)
		let shouldAddHarmonyFlag = false;
		const rootExportsInfo = moduleGraph.getExportsInfo(this);
		if (
			rootExportsInfo.otherExportsInfo.getUsed(runtime) !== UsageState.Unused ||
			rootExportsInfo.getReadOnlyExportInfo("__esModule").getUsed(runtime) !==
				UsageState.Unused
		) {
			shouldAddHarmonyFlag = true;
		}

		// define exports
		if (exportsMap.size > 0) {
			/** @type {string[]} */
			const definitions = [];
			for (const [key, value] of exportsMap) {
				definitions.push(
					`\n  ${propertyName(key)}: ${runtimeTemplate.returningFunction(
						value(requestShortener)
					)}`
				);
			}

			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);

			// Goes with the definitions below: whoever takes those over emits both,
			// and the marker has to stay in front of them.
			const harmonyFlagSource = shouldAddHarmonyFlag
				? `// ESM COMPAT FLAG\n${runtimeTemplate.defineEsModuleFlagStatement({
						exportsArgument: this.exportsArgument,
						runtimeRequirements
					})}`
				: "";

			const exportsSource =
				"\n// EXPORTS\n" +
				`${RuntimeGlobals.definePropertyGetters}(${
					this.exportsArgument
				}, {${definitions.join(",")}\n});\n`;

			const { onDemandExportsGeneration } =
				ConcatenatedModule.getCompilationHooks(this.compilation);

			if (
				!onDemandExportsGeneration.call(
					this,
					runtimes,
					`${harmonyFlagSource}${exportsSource}`,
					exportsFinalName
				)
			) {
				result.add(harmonyFlagSource);
				result.add(exportsSource);
			}
		}

		// list unused exports
		if (unusedExports.size > 0) {
			result.add(
				`\n// UNUSED EXPORTS: ${joinIterableWithComma(unusedExports)}\n`
			);
		}

		// list inlined exports
		if (inlinedExports.size > 0) {
			result.add(
				`\n// INLINED EXPORTS: ${joinIterableWithComma(inlinedExports)}\n`
			);
		}
		// #endregion

		// #region [7] BUILD NS: namespace object sources are built as strings here
		// and emitted by [8]; an external's is emitted next to its import variable
		// or accessor instead, which is defined later.
		//
		// generate decoupled namespace objects for escaping mangled namespaces:
		// same getters as the regular namespace object, but keyed by the original
		// export names so untracked access by name keeps working. Done before the
		// regular namespace objects so any nested namespace they pull in is built.
		/** @type {Map<ConcatenatedModuleInfo | ExternalModuleInfo, string>} */
		const escapeNamespaceObjectSources = new Map();
		for (const info of neededEscapeNamespaceObjects) {
			/** @type {string[]} */
			const nsObj = [];
			const exportsInfo = moduleGraph.getExportsInfo(info.module);
			for (const exportInfo of exportsInfo.orderedExports) {
				if (exportInfo.provided === false) continue;
				const usedName = exportInfo.getUsedName(undefined, runtime);
				if (!usedName) continue;
				if (usedName instanceof InlinedUsedName) {
					nsObj.push(
						`\n  ${propertyName(
							exportInfo.name
						)}: ${runtimeTemplate.returningFunction(
							usedName.render(
								Template.toNormalComment(
									`inlined export ${propertyAccess([exportInfo.name])}`
								)
							)
						)}`
					);
				} else {
					// External (non-concatenated) modules are accessed through their
					// import variable; concatenated ones resolve to an internal binding.
					const finalName =
						info.type === "external"
							? `${getExternalModuleExpr(info)}${propertyAccess([usedName])}`
							: getFinalName(
									moduleGraph,
									info,
									[exportInfo.name],
									moduleToInfoMap,
									runtime,
									requestShortener,
									runtimeTemplate,
									neededNamespaceObjects,
									false,
									false,
									undefined,
									/** @type {BuildMeta} */
									(info.module.buildMeta).strictHarmonyModule,
									true
								);
					nsObj.push(
						`\n  ${propertyName(
							exportInfo.name
						)}: ${runtimeTemplate.returningFunction(finalName)}`
					);
				}
			}
			const name = /** @type {string} */ (info.escapeNamespaceObjectName);
			const defineGetters =
				nsObj.length > 0
					? `${RuntimeGlobals.definePropertyGetters}(${name}, {${nsObj.join(
							","
						)}\n});\n`
					: "";
			if (nsObj.length > 0) {
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			}
			escapeNamespaceObjectSources.set(
				info,
				`
// NAMESPACE OBJECT (decoupled): ${info.module.readableIdentifier(
					requestShortener
				)}
var ${name} = {};
${RuntimeGlobals.makeNamespaceObject}(${name});
${defineGetters}`
			);
			runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
		}

		// generate namespace objects
		/** @type {Map<ConcatenatedModuleInfo, string>} */
		const namespaceObjectSources = new Map();
		for (const info of neededNamespaceObjects) {
			if (
				info.namespaceExportSymbol ||
				// Skip constructing namespace object generated for wrapped module
				info.wrapped
			) {
				continue;
			}
			/** @type {string[]} */
			const nsObj = [];
			const exportsInfo = moduleGraph.getExportsInfo(info.module);
			for (const exportInfo of exportsInfo.orderedExports) {
				if (exportInfo.provided === false) continue;
				const usedName = exportInfo.getUsedName(undefined, runtime);
				if (usedName && !(usedName instanceof InlinedUsedName)) {
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
						false,
						undefined,
						/** @type {BuildMeta} */
						(info.module.buildMeta).strictHarmonyModule,
						true
					);
					nsObj.push(
						`\n  ${propertyName(
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
			if (nsObj.length > 0) {
				runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
			}
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
		// #endregion

		// #region [8] DEFINE: define required namespace objects and wrapper
		// (must be before evaluation modules — a cycle member calls another's
		// accessor before that module's own position in the order)

		// wrapper accessors are only called later, so their definitions may be
		// emitted in a stable order of their own instead of concatenation order
		/** @type {(ConcatenatedModuleInfo | ExternalModuleInfo)[]} */
		const wrappedInfos = [];
		for (const info of modulesWithInfo) {
			if (
				(info.type === "concatenated" || info.type === "external") &&
				info.wrapped
			) {
				wrappedInfos.push(info);
			}
		}
		const compareWrappedModules = compareModulesByFullName(
			runtimeTemplate.compilation.compiler
		);
		wrappedInfos.sort((a, b) => compareWrappedModules(a.module, b.module));

		for (const info of wrappedInfos) {
			if (info.type === "concatenated") {
				runtimeRequirements.add(RuntimeGlobals.concatenationWrap);
				result.add(
					`\n// MODULE: ${info.module.readableIdentifier(
						requestShortener
					)}\nvar ${info.namespaceFnName} = /*#__PURE__*/${
						RuntimeGlobals.concatenationWrap
					}(function(${info.module.moduleArgument}, ${
						info.module.exportsArgument
					}) {\n`
				);
				result.add(/** @type {ReplaceSource} */ (info.source));
				// A generated body (json, asset, html) binds its value to a local
				// instead of writing exports; hand that local to the accessor. The
				// name is verbatim: a wrapped body is not scope-analysed, so it keeps
				// the reserved symbol the generator registered.
				result.add(
					info.namespaceExportSymbol
						? `\n${info.module.moduleArgument}.exports = ${info.namespaceExportSymbol};\n});\n`
						: "\n});\n"
				);
				// its getters call the accessor lazily, so this may sit right after it
				const escapeSource = escapeNamespaceObjectSources.get(info);
				if (escapeSource) result.add(escapeSource);
			} else if (info.type === "external") {
				runtimeRequirements.add(RuntimeGlobals.require);
				const { runtimeCondition } = info;
				const condition = runtimeTemplate.runtimeConditionExpression({
					chunkGraph,
					runtimeCondition,
					runtime,
					runtimeRequirements
				});
				const moduleId = JSON.stringify(chunkGraph.getModuleId(info.module));
				const body =
					condition === "true"
						? `return ${RuntimeGlobals.require}(${moduleId});`
						: `if (${condition}) return ${RuntimeGlobals.require}(${moduleId});`;
				result.add(
					`\n// EXTERNAL MODULE: ${info.module.readableIdentifier(
						requestShortener
					)}\nvar ${info.namespaceFnName} = ${runtimeTemplate.basicFunction(
						"",
						body
					)};\n`
				);
				const escapeSource = escapeNamespaceObjectSources.get(info);
				if (escapeSource) result.add(escapeSource);
			}
		}

		for (const info of modulesWithInfo) {
			if (info.type === "concatenated") {
				if (!info.wrapped) {
					const source = namespaceObjectSources.get(info);
					if (source) result.add(source);
					const escapeSource = escapeNamespaceObjectSources.get(
						/** @type {ConcatenatedModuleInfo} */ (info)
					);
					if (escapeSource) result.add(escapeSource);
				}
			} else if (info.type === "external" && info.deferred) {
				const moduleId = JSON.stringify(chunkGraph.getModuleId(info.module));
				const loader = getOptimizedDeferredModule(
					moduleId,
					getExportsType(
						moduleGraph,
						info,
						/** @type {BuildMeta} */
						(this.rootModule.buildMeta).strictHarmonyModule
					),
					// an async module will opt-out of the concat module optimization.
					[],
					// A closure member absorbed into this concatenation shares this
					// module's runtime id (and thus its `evaluating` flag); resolve it
					// to that id instead of the member's now-absent standalone id.
					getDeferredCycleModuleIds(
						getDeferredCycleModules(moduleGraph, info.module),
						(mod) =>
							moduleToInfoMap.has(mod)
								? chunkGraph.getModuleId(this)
								: chunkGraph.getModuleId(mod)
					),
					runtimeRequirements
				);
				runtimeRequirements.add(RuntimeGlobals.require);
				result.add(
					`\n// DEFERRED EXTERNAL MODULE: ${info.module.readableIdentifier(
						requestShortener
					)}\nvar ${info.deferredName} = ${loader};`
				);
				if (info.deferredNamespaceObjectUsed) {
					runtimeRequirements.add(RuntimeGlobals.makeDeferredNamespaceObject);
					result.add(
						`\nvar ${info.deferredNamespaceObjectName} = /*#__PURE__*/${
							RuntimeGlobals.makeDeferredNamespaceObject
						}(${JSON.stringify(
							chunkGraph.getModuleId(info.module)
						)}, ${getMakeDeferredNamespaceModeFromExportsType(
							getExportsType(moduleGraph, info, strictHarmonyModule)
						)});`
					);
				}
			}
		}

		// #endregion

		// #region [9] EVALUATE: emit the bodies in concatenation order and collect
		// what they need — runtime requirements, chunk init fragments, interop
		/** @type {InitFragment<ChunkRenderContext>[]} */
		const chunkInitFragments = [];

		for (const rawInfo of modulesWithInfo) {
			/** @type {undefined | string} */
			let name;
			let isConditional = false;
			const info = rawInfo.type === "reference" ? rawInfo.target : rawInfo;
			switch (info.type) {
				case "concatenated": {
					name = info.namespaceObjectName;
					// wrapped bodies are emitted above, evaluated at their call sites
					if (info.wrapped && info.eager) {
						// This slot is the module's place in evaluation order; calling from
						// the importing body would run it too late.
						result.add(
							`\n;// ${info.module.readableIdentifier(
								requestShortener
							)}\n${info.namespaceFnName}();\n`
						);
					} else if (!info.wrapped) {
						result.add(
							`\n;// ${info.module.readableIdentifier(requestShortener)}\n`
						);
						result.add(/** @type {ReplaceSource} */ (info.source));
					}

					if (info.chunkInitFragments) {
						for (const f of info.chunkInitFragments) chunkInitFragments.push(f);
					}
					if (info.runtimeRequirements) {
						for (const r of info.runtimeRequirements) {
							// Wrapped module supplies module/exports/this itself
							if (
								info.wrapped &&
								(r === RuntimeGlobals.module ||
									r === RuntimeGlobals.exports ||
									r === RuntimeGlobals.thisAsExports)
							) {
								continue;
							}
							runtimeRequirements.add(r);
						}
					}

					break;
				}
				case "external": {
					name = getExternalModuleExpr(info);
					// deferred and wrapped cases are handled in the "const info of modulesWithInfo" loop above
					if (!info.deferred && !info.wrapped) {
						result.add(
							`\n// EXTERNAL MODULE: ${info.module.readableIdentifier(
								requestShortener
							)}\n`
						);
						runtimeRequirements.add(RuntimeGlobals.require);
						const { runtimeCondition } =
							/** @type {ExternalModuleInfo | ReferenceToModuleInfo} */
							(rawInfo);
						const condition = runtimeTemplate.runtimeConditionExpression({
							chunkGraph,
							runtimeCondition,
							runtime,
							runtimeRequirements
						});
						if (condition !== "true") {
							isConditional = true;
							result.add(`if (${condition}) {\n`);
						}
						const moduleId = JSON.stringify(
							chunkGraph.getModuleId(info.module)
						);
						// External module bindings may be wrapped in
						// runtime-condition `if` blocks but referenced outside,
						// so they must remain function-scoped (`var`).
						result.add(`var ${info.name} = __webpack_require__(${moduleId});`);

						// Decoupled namespace object for an escaping mangled external
						// module must come after its import variable is defined.
						const escapeSource = escapeNamespaceObjectSources.get(info);
						if (escapeSource) result.add(escapeSource);
					} else if (info.wrapped && info.eager) {
						result.add(
							`\n;// EXTERNAL MODULE: ${info.module.readableIdentifier(
								requestShortener
							)}\n${info.namespaceFnName}();\n`
						);
					}
					// If a module is deferred in other places, but used as non-deferred here,
					// the module itself will be emitted as mod_deferred (in the case "external"),
					// we need to emit an extra import declaration to evaluate it in order.
					const { nonDeferAccess } =
						/** @type {ExternalModuleInfo | ReferenceToModuleInfo} */
						(rawInfo);
					if (info.deferred && nonDeferAccess && !info.wrapped) {
						result.add(
							`\n// non-deferred import to a deferred module (${info.module.readableIdentifier(
								requestShortener
							)})\nvar ${info.name} = ${info.deferredName}.a;`
						);
					}
					break;
				}
				default:
					// @ts-expect-error never is expected here
					throw new Error(`Unsupported concatenation entry type ${info.type}`);
			}
			// Building a wrapped module's interop object here would evaluate its body
			// at the top level and break require() cycles, so defer it behind a
			// hoisted function. The memo lives on the function object: it keeps the
			// identity stable without claiming a second top-level name.
			/**
			 * @param {string} interopName interop variable name
			 * @param {string} expr interop object expression
			 * @returns {string} the declaration
			 */
			const declareInterop = (interopName, expr) =>
				info.wrapped
					? `\nfunction ${interopName}() { return ${interopName}.c || (${interopName}.c = ${expr}); }`
					: `\nvar ${interopName} = /*#__PURE__*/${expr};`;
			if (info.interopNamespaceObjectUsed) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				result.add(
					declareInterop(
						/** @type {string} */ (info.interopNamespaceObjectName),
						`${RuntimeGlobals.createFakeNamespaceObject}(${name}, 2)`
					)
				);
			}
			if (info.interopNamespaceObject2Used) {
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				result.add(
					declareInterop(
						/** @type {string} */ (info.interopNamespaceObject2Name),
						`${RuntimeGlobals.createFakeNamespaceObject}(${name})`
					)
				);
			}
			if (info.interopDefaultAccessUsed) {
				runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
				result.add(
					declareInterop(
						/** @type {string} */ (info.interopDefaultAccessName),
						`${RuntimeGlobals.compatGetDefaultExport}(${name})`
					)
				);
			}
			if (isConditional) {
				result.add("\n}");
			}
		}
		// #endregion

		// #region [10] RESULT: topLevelDeclarations and freeNames let consumers
		// (mangling, an outer concatenation) reason about this source unparsed
		/** @type {CodeGenerationResultData} */
		const data = new Map();
		if (chunkInitFragments.length > 0) {
			data.set("chunkInitFragments", chunkInitFragments);
		}
		data.set("topLevelDeclarations", topLevelDeclarations);
		data.set("freeNames", freeNames);

		/** @type {CodeGenerationResult} */
		const resultEntry = {
			sources: new Map([[JAVASCRIPT_TYPE, new CachedSource(result)]]),
			data,
			runtimeRequirements
		};
		// #endregion

		return resultEntry;
	}

	/**
	 * @param {ModuleToInfoMap} modulesMap modulesMap
	 * @param {ModuleInfo} info info
	 * @param {DependencyTemplates} dependencyTemplates dependencyTemplates
	 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
	 * @param {ModuleGraph} moduleGraph moduleGraph
	 * @param {ChunkGraph} chunkGraph chunkGraph
	 * @param {RuntimeSpec} runtime runtime
	 * @param {RuntimeSpec[]} runtimes runtimes
	 * @param {CodeGenerationResults} codeGenerationResults codeGenerationResults
	 * @param {UsedNames} usedNames used names
	 */
	_analyseModule(
		modulesMap,
		info,
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime,
		runtimes,
		codeGenerationResults,
		usedNames
	) {
		if (info.type === "concatenated") {
			const m = info.module;
			if (info.wrapped) {
				// the wrapper isolates the body's top-level declarations, so no
				// renaming is needed -- only a concatenation scope, to rewrite in-scope
				// `require()` targets to accessor references. [2] claims its identifiers
				// textually in place of the scope analysis skipped here.
				const concatenationScope = new ConcatenationScope(
					modulesMap,
					info,
					usedNames
				);
				info.concatenationScope = concatenationScope;
				const codeGenResult = m.codeGeneration({
					dependencyTemplates,
					runtimeTemplate,
					moduleGraph,
					chunkGraph,
					runtime,
					runtimes,
					concatenationScope,
					codeGenerationResults,
					sourceTypes: JAVASCRIPT_TYPES
				});
				const source =
					/** @type {Source} */
					(codeGenResult.sources.get(JAVASCRIPT_TYPE));
				const data = codeGenResult.data;
				info.runtimeRequirements =
					/** @type {ReadOnlyRuntimeRequirements} */
					(codeGenResult.runtimeRequirements);
				info.internalSource = source;
				info.source = new ReplaceSource(source);
				info.chunkInitFragments = data && data.get("chunkInitFragments");
			} else {
				try {
					// Create a concatenation scope to track and capture information
					const concatenationScope = new ConcatenationScope(
						modulesMap,
						info,
						usedNames
					);

					// Not cached: Compilation memoizes the outer codeGeneration per
					// (module, runtime), so inner generation never recomputes usefully.
					const codeGenResult = m.codeGeneration({
						dependencyTemplates,
						runtimeTemplate,
						moduleGraph,
						chunkGraph,
						runtime,
						runtimes,
						concatenationScope,
						codeGenerationResults,
						sourceTypes: JAVASCRIPT_TYPES
					});
					const source =
						/** @type {Source} */
						(codeGenResult.sources.get(JAVASCRIPT_TYPE));
					const data = codeGenResult.data;
					const chunkInitFragments = data && data.get("chunkInitFragments");
					const code = source.source().toString();

					/** @type {Program} */
					let ast;

					try {
						const { experiments } = this.compilation.options;

						({ ast } = JavascriptParser._parse(
							code,
							{
								sourceType: "module",
								ranges: true,
								// generated code contains phase imports when the experiments are on
								importPhases: Boolean(
									experiments.deferImport || experiments.sourceImport
								)
							},
							JavascriptParser._getModuleParseFunction(this.compilation, m)
						));
					} catch (_err) {
						const err =
							/** @type {Error & { loc?: { line: number, column: number } }} */
							(_err);
						if (
							err.loc &&
							typeof err.loc === "object" &&
							typeof err.loc.line === "number"
						) {
							const lineNumber = err.loc.line;
							const lines = code.split("\n");
							err.message += `\n| ${lines
								.slice(Math.max(0, lineNumber - 3), lineNumber + 2)
								.join("\n| ")}`;
						}
						throw err;
					}
					const analysis = analyzeScope(ast);
					const resultSource = new ReplaceSource(source);
					info.runtimeRequirements =
						/** @type {ReadOnlyRuntimeRequirements} */
						(codeGenResult.runtimeRequirements);
					info.ast = ast;
					info.internalSource = source;
					info.source = resultSource;
					info.chunkInitFragments = chunkInitFragments;
					info.globalScope = analysis.globalScope;
					info.moduleScope = analysis.moduleScope;
					info.unresolvedReferences = analysis.unresolvedReferences;
					info.concatenationScope = concatenationScope;
				} catch (err) {
					/** @type {Error} */
					(err).message +=
						`\nwhile analyzing module ${m.identifier()} for concatenation`;
					throw err;
				}
			}
		}
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {[ModuleInfoOrReference[], ModuleToInfoMap]} module info items
	 */
	_getModulesWithInfo(moduleGraph, runtime) {
		const orderedConcatenationList = this._createConcatenationList(
			this.rootModule,
			this._modules,
			runtime,
			moduleGraph
		);
		/** @type {ModuleToInfoMap} */
		const map = new Map();
		const list = orderedConcatenationList.map((info, index) => {
			let item = map.get(info.module);
			if (item === undefined) {
				switch (info.type) {
					case "concatenated":
						item = {
							type: "concatenated",
							wrapped: info.wrapped,
							eager: false,
							module: info.module,
							index,
							namespaceFnName: undefined,
							ast: undefined,
							chunkInitFragments: undefined,
							internalSource: undefined,
							runtimeRequirements: undefined,
							source: undefined,
							globalScope: undefined,
							unresolvedReferences: undefined,
							moduleScope: undefined,
							internalNames: new Map(),
							exportMap: undefined,
							rawExportMap: undefined,
							namespaceExportSymbol: undefined,
							namespaceObjectName: undefined,
							escapeNamespaceObjectName: undefined,
							interopNamespaceObjectUsed: false,
							interopNamespaceObjectName: undefined,
							interopNamespaceObject2Used: false,
							interopNamespaceObject2Name: undefined,
							interopDefaultAccessUsed: false,
							interopDefaultAccessName: undefined,
							concatenationScope: undefined,
							exportsTypeStrict: undefined,
							exportsTypeNonStrict: undefined
						};
						break;
					case "external":
						item = {
							type: "external",
							wrapped: info.wrapped,
							eager: false,
							module: info.module,
							runtimeCondition: info.runtimeCondition,
							nonDeferAccess: info.nonDeferAccess,
							index,
							name: undefined,
							namespaceFnName: undefined,
							escapeNamespaceObjectName: undefined,
							deferredName: undefined,
							interopNamespaceObjectUsed: false,
							interopNamespaceObjectName: undefined,
							interopNamespaceObject2Used: false,
							interopNamespaceObject2Name: undefined,
							interopDefaultAccessUsed: false,
							interopDefaultAccessName: undefined,
							deferred: this.compilation.options.experiments.deferImport
								? moduleGraph.isDeferred(info.module)
								: false,
							deferredNamespaceObjectName: undefined,
							deferredNamespaceObjectUsed: false,
							exportsTypeStrict: undefined,
							exportsTypeNonStrict: undefined
						};
						break;
					default:
						throw new Error(
							`Unsupported concatenation entry type ${info.type}`
						);
				}
				map.set(
					/** @type {ModuleInfo} */ (item).module,
					/** @type {ModuleInfo} */ (item)
				);
				return /** @type {ModuleInfo} */ (item);
			}
			/** @type {ReferenceToModuleInfo} */
			const ref = {
				type: "reference",
				runtimeCondition: info.runtimeCondition,
				nonDeferAccess: info.nonDeferAccess,
				target: item
			};
			return ref;
		});
		return [list, map];
	}

	/**
	 * Updates the hash with the data contributed by this instance.
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
					hash.update(
						`${chunkGraph.getModuleId(info.module)}|${runtimeConditionToString(
							info.runtimeCondition
						)}|${info.nonDeferAccess ? "1" : "0"}|${
							this.compilation.options.experiments.deferImport &&
							chunkGraph.moduleGraph.isDeferred(info.module)
								? "1"
								: "0"
						}`
					);
					break;
			}
		}
		super.updateHash(hash, context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {ConcatenatedModule} ConcatenatedModule
	 */
	static deserialize(context) {
		const obj = new ConcatenatedModule({
			identifier: /** @type {EXPECTED_ANY} */ (undefined),
			rootModule: /** @type {EXPECTED_ANY} */ (undefined),
			modules: /** @type {EXPECTED_ANY} */ (undefined),
			runtime: undefined,
			compilation: /** @type {EXPECTED_ANY} */ (undefined)
		});
		obj.deserialize(context);
		return obj;
	}
}

ConcatenatedModule.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {ConcatenateModuleHooks} */ ({
			onDemandExportsGeneration: new SyncBailHook([
				"module",
				"runtimes",
				"exportsFinalName",
				"exportsSource"
			]),
			concatenatedModuleInfo: new SyncBailHook([
				"updatedInfo",
				"concatenatedModuleInfo"
			])
		})
);

makeSerializable(ConcatenatedModule, "webpack/lib/optimize/ConcatenatedModule");

/** @type {WeakMap<Compilation, WeakMap<Module, ConcatenatedModule>>} */
const absorbedBy = new WeakMap();

/**
 * The module the chunk graph holds for `module`: concatenation replaces every module
 * it absorbs with one `ConcatenatedModule`, so an absorbed module is itself in no
 * chunk and no runtime, and asking the chunk graph about it answers about nothing.
 * @param {Compilation} compilation the compilation
 * @param {Module} module a module, possibly absorbed by concatenation
 * @returns {Module} the module the chunk graph holds, or `module` itself
 */
ConcatenatedModule.getChunkGraphModule = (compilation, module) => {
	let map = absorbedBy.get(compilation);
	if (map === undefined) {
		map = new WeakMap();
		for (const candidate of compilation.modules) {
			if (candidate instanceof ConcatenatedModule) {
				for (const inner of candidate._modules) {
					map.set(inner, candidate);
				}
			}
		}
		absorbedBy.set(compilation, map);
	}
	const outer = map.get(module);
	return outer === undefined ? module : outer;
};

module.exports = ConcatenatedModule;
