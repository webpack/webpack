/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import DependenciesBlock from "./DependenciesBlock.js";
import {
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES,
	UNKNOWN_TYPE
} from "./ModuleSourceTypeConstants.js";
import * as RuntimeGlobals from "./RuntimeGlobals.js";
import makeSerializable from "./util/makeSerializable.js";

const require = createRequire(import.meta.url);
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions.js").ResolveOptions} ResolveOptions */
/** @typedef {import("./config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("./Chunk.js").default} Chunk */
/** @typedef {import("./ChunkGraph.js").default} ChunkGraph */
/** @typedef {import("./ChunkGraph.js").ModuleId} ModuleId */
/** @typedef {import("./ChunkGroup.js").default} ChunkGroup */
/** @typedef {import("./CodeGenerationResults.js").default} CodeGenerationResults */
/** @typedef {import("./Compilation.js").default} Compilation */
/** @typedef {import("./Compilation.js").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation.js").FileSystemDependencies} FileSystemDependencies */
/** @typedef {import("./Compilation.js").UnsafeCacheData} UnsafeCacheData */
/** @typedef {import("./ConcatenationScope.js").default} ConcatenationScope */
/** @typedef {import("./Dependency.js").default} Dependency */
/** @typedef {import("./Dependency.js").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./DependencyTemplates.js").default} DependencyTemplates */
/** @typedef {import("./ModuleSourceTypeConstants.js").AllTypes} AllTypes */
/** @typedef {import("./FileSystemInfo.js").default} FileSystemInfo */
/** @typedef {import("./ModuleGraphConnection.js").ConnectionState} ConnectionState */
/** @typedef {import("./ModuleTypeConstants.js").ModuleTypes} ModuleTypes */
/** @typedef {import("./ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("./ModuleGraph.js").OptimizationBailouts} OptimizationBailouts */
/** @typedef {import("./ModuleProfile.js").default} ModuleProfile */
/** @typedef {import("./NormalModuleFactory.js").default} NormalModuleFactory */
/** @typedef {import("./RequestShortener.js").default} RequestShortener */
/** @typedef {import("./ResolverFactory.js").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate.js").default} RuntimeTemplate */
/**
 * Defines the init fragment type used by this module.
 * @template T
 * @typedef {import("./InitFragment.js").default<T>} InitFragment
 */
/** @typedef {import("./errors/WebpackError.js").default} WebpackError */
/** @typedef {import("./serialization/ObjectMiddleware.js").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware.js").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./util/Hash.js").default} Hash */
/** @typedef {import("./util/fs.js").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/identifier.js").AssociatedObjectForCache} AssociatedObjectForCache */
/** @typedef {import("./util/runtime.js").RuntimeSpec} RuntimeSpec */
/**
 * @template T
 * @typedef {import("./util/SortableSet.js").default<T>} SortableSet
 */
/** @typedef {"namespace" | "default-only" | "default-with-named" | "dynamic"} ExportsType */
/** @typedef {"none" | "simple" | "full"} SourceMapKind */

/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("./util/LazySet.js").default<T>} LazySet<T>
 */

/**
 * Defines the source context type used by this module.
 * @typedef {object} SourceContext
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {RuntimeSpec} runtime the runtimes code should be generated for
 * @property {string=} type the type of source that should be generated
 */

/** @typedef {AllTypes} KnownSourceType */
/** @typedef {KnownSourceType | string} SourceType */
/** @typedef {ReadonlySet<SourceType>} SourceTypes */

/** @typedef {ReadonlySet<typeof JAVASCRIPT_TYPE | string>} BasicSourceTypes */

/**
 * Defines the code generation context type used by this module.
 * @typedef {object} CodeGenerationContext
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {RuntimeSpec} runtime the runtimes code should be generated for
 * @property {RuntimeSpec[]} runtimes all runtimes code should be generated for
 * @property {ConcatenationScope=} concatenationScope when in concatenated module, information about other concatenated modules
 * @property {CodeGenerationResults | undefined} codeGenerationResults code generation results of other modules (need to have a codeGenerationDependency to use that)
 * @property {Compilation} compilation the compilation
 * @property {SourceTypes=} sourceTypes source types
 */

/**
 * Defines the concatenation bailout reason context type used by this module.
 * @typedef {object} ConcatenationBailoutReasonContext
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

/** @typedef {Set<string>} RuntimeRequirements */
/** @typedef {ReadonlySet<string>} ReadOnlyRuntimeRequirements */

/**
 * Defines the all code generation schemas type used by this module.
 * @typedef {object} AllCodeGenerationSchemas
 * @property {Set<string>} topLevelDeclarations top level declarations for javascript modules
 * @property {Set<string>} freeNames free identifier names in the rendered source for javascript modules
 * @property {InitFragment<EXPECTED_ANY>[]} chunkInitFragments chunk init fragments for javascript modules
 * @property {{ javascript?: string, ["asset-url"]?: string }} url url for asset modules
 * @property {string} filename a filename for asset modules
 * @property {AssetInfo} assetInfo an asset info for asset modules
 * @property {string} fullContentHash a full content hash for asset modules
 * @property {[{ shareScope: string, initStage: number, init: string }]} share-init share-init for modules federation
 */

/**
 * Defines the code gen value type used by this module.
 * @template {string} K
 * @typedef {K extends (keyof AllCodeGenerationSchemas) ? AllCodeGenerationSchemas[K] : EXPECTED_ANY} CodeGenValue
 */

/**
 * Defines the code gen map overloads type used by this module.
 * @typedef {object} CodeGenMapOverloads
 * @property {<K extends string>(key: K) => CodeGenValue<K> | undefined} get
 * @property {<K extends string>(key: K, value: CodeGenValue<K>) => CodeGenerationResultData} set
 * @property {<K extends string>(key: K) => boolean} has
 * @property {<K extends string>(key: K) => boolean} delete
 */

/**
 * Defines the code generation result data type used by this module.
 * @typedef {Omit<Map<string, EXPECTED_ANY>, "get" | "set" | "has" | "delete"> & CodeGenMapOverloads} CodeGenerationResultData
 */

/** @typedef {Map<SourceType, Source>} Sources */

/**
 * Defines the code generation result type used by this module.
 * @typedef {object} CodeGenerationResult
 * @property {Sources} sources the resulting sources for all source types
 * @property {CodeGenerationResultData=} data the resulting data for all source types
 * @property {ReadOnlyRuntimeRequirements | null} runtimeRequirements the runtime requirements
 * @property {string=} hash a hash of the code generation result (will be automatically calculated from sources and runtimeRequirements if not provided)
 */

/**
 * Defines the lib ident options type used by this module.
 * @typedef {object} LibIdentOptions
 * @property {string} context absolute context path to which lib ident is relative to
 * @property {AssociatedObjectForCache=} associatedObjectForCache object for caching
 */

/**
 * Defines the build meta properties common to all module types.
 * Module type specific properties live in the `Known*BuildMeta` typedef of the dedicated module class.
 * @typedef {object} KnownBuildMeta
 * @property {("default" | "namespace" | "flagged" | "dynamic")=} exportsType
 * @property {(false | "redirect" | "redirect-warn")=} defaultObject
 * @property {boolean=} async
 * @property {boolean=} sideEffectFree
 * @property {Map<string, Record<string, string>>=} exportsFinalNameByRuntime using in ModuleLibraryPlugin
 * @property {Map<string, string>=} exportsSourceByRuntime using in ModuleLibraryPlugin
 */

/**
 * Defines the build info properties common to all module types.
 * Module type specific properties live in the `Known*BuildInfo` typedef of the dedicated module class.
 * @typedef {object} KnownBuildInfo
 * @property {boolean=} cacheable
 * @property {boolean=} strict
 * @property {string=} moduleArgument
 * @property {string=} exportsArgument
 * @property {Record<string, Source>=} assets assets added by loaders or plugins
 * @property {Map<string, AssetInfo | undefined>=} assetsInfo
 * @property {Set<string>=} topLevelDeclarations top level declaration names
 * @property {boolean=} isCircular true when the module is part of a circular dependency chain
 */

/** @typedef {string | Set<string>} ValueCacheVersion */
/** @typedef {Map<string, ValueCacheVersion>} ValueCacheVersions */

/**
 * Defines the need build context type used by this module.
 * @typedef {object} NeedBuildContext
 * @property {Compilation} compilation
 * @property {FileSystemInfo} fileSystemInfo
 * @property {ValueCacheVersions} valueCacheVersions
 */

/** @typedef {(err?: WebpackError | null, needBuild?: boolean) => void} NeedBuildCallback */

/** @typedef {(err?: WebpackError) => void} BuildCallback */

/** @typedef {KnownBuildMeta & Record<string, EXPECTED_ANY>} BuildMeta */
/** @typedef {KnownBuildInfo & Record<string, EXPECTED_ANY>} BuildInfo */

/**
 * Defines the factory meta type used by this module.
 * @typedef {object} FactoryMeta
 * @property {boolean=} sideEffectFree
 */

const EMPTY_RESOLVE_OPTIONS = {};

let debugId = 1000;

/** @type {SourceTypes} */
const DEFAULT_TYPES_UNKNOWN = new Set([UNKNOWN_TYPE]);

/** @typedef {string} LibIdent */
/** @typedef {string} NameForCondition */

/** @typedef {(requestShortener: RequestShortener) => string} OptimizationBailoutFunction */

class Module extends DependenciesBlock {
	/**
	 * Creates an instance of Module.
	 * @param {ModuleTypes | ""} type the module type, when deserializing the type is not known and is an empty string
	 * @param {(string | null)=} context an optional context
	 * @param {(string | null)=} layer an optional layer in which the module is
	 */
	constructor(type, context = null, layer = null) {
		super();

		/** @type {ModuleTypes} */
		this.type = type;
		/** @type {string | null} */
		this.context = context;
		/** @type {string | null} */
		this.layer = layer;
		/** @type {boolean} */
		this.needId = true;

		// Unique Id
		/** @type {number} */
		this.debugId = debugId++;

		// Info from Factory
		/** @type {ResolveOptions | undefined} */
		this.resolveOptions = EMPTY_RESOLVE_OPTIONS;
		/** @type {FactoryMeta | undefined} */
		this.factoryMeta = undefined;
		// TODO refactor this -> options object filled from Factory
		/** @type {SourceMapKind} */
		this.sourceMapKind = "none";

		// Info from Build
		/** @type {Error[] | undefined} */
		this._warnings = undefined;
		/** @type {Error[] | undefined} */
		this._errors = undefined;
		// Subclasses with type specific build info/meta redeclare these with a narrowed type
		/** @type {BuildMeta | undefined} */
		this.buildMeta = undefined;
		/** @type {BuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {Dependency[] | undefined} */
		this.presentationalDependencies = undefined;
		/** @type {Dependency[] | undefined} */
		this.codeGenerationDependencies = undefined;
	}

	/**
	 * Gets exports argument.
	 * @returns {string} name of the exports argument
	 */
	get exportsArgument() {
		return (this.buildInfo && this.buildInfo.exportsArgument) || "exports";
	}

	/**
	 * Gets module argument.
	 * @returns {string} name of the module argument
	 */
	get moduleArgument() {
		return (this.buildInfo && this.buildInfo.moduleArgument) || "module";
	}

	/**
	 * Returns export type.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {boolean | undefined} strict the importing module is strict
	 * @returns {ExportsType} export type
	 * "namespace": Exports is already a namespace object. namespace = exports.
	 * "dynamic": Check at runtime if __esModule is set. When set: namespace = { ...exports, default: exports }. When not set: namespace = { default: exports }.
	 * "default-only": Provide a namespace object with only default export. namespace = { default: exports }
	 * "default-with-named": Provide a namespace object with named and default export. namespace = { ...exports, default: exports }
	 */
	getExportsType(moduleGraph, strict) {
		switch (this.buildMeta && this.buildMeta.exportsType) {
			case "flagged":
				return strict ? "default-with-named" : "namespace";
			case "namespace":
				return "namespace";
			case "default":
				switch (/** @type {BuildMeta} */ (this.buildMeta).defaultObject) {
					case "redirect":
						return "default-with-named";
					case "redirect-warn":
						return strict ? "default-only" : "default-with-named";
					default:
						return "default-only";
				}
			case "dynamic": {
				if (strict) return "default-with-named";
				// Try to figure out value of __esModule by following reexports
				const handleDefault = () => {
					switch (/** @type {BuildMeta} */ (this.buildMeta).defaultObject) {
						case "redirect":
						case "redirect-warn":
							return "default-with-named";
						default:
							return "default-only";
					}
				};
				const exportInfo = moduleGraph.getReadOnlyExportInfo(
					this,
					"__esModule"
				);
				if (exportInfo.provided === false) {
					return handleDefault();
				}
				const target = exportInfo.getTarget(moduleGraph);
				if (
					!target ||
					!target.export ||
					target.export.length !== 1 ||
					target.export[0] !== "__esModule"
				) {
					return "dynamic";
				}
				switch (
					target.module.buildMeta &&
					target.module.buildMeta.exportsType
				) {
					case "flagged":
					case "namespace":
						return "namespace";
					case "default":
						return handleDefault();
					default:
						return "dynamic";
				}
			}
			default:
				return strict ? "default-with-named" : "dynamic";
		}
	}

	/**
	 * Adds presentational dependency.
	 * @param {Dependency} presentationalDependency dependency being tied to module.
	 * This is a Dependency without edge in the module graph. It's only for presentation.
	 * @returns {void}
	 */
	addPresentationalDependency(presentationalDependency) {
		if (this.presentationalDependencies === undefined) {
			this.presentationalDependencies = [];
		}
		this.presentationalDependencies.push(presentationalDependency);
	}

	/**
	 * Adds code generation dependency.
	 * @param {Dependency} codeGenerationDependency dependency being tied to module.
	 * This is a Dependency where the code generation result of the referenced module is needed during code generation.
	 * The Dependency should also be added to normal dependencies via addDependency.
	 * @returns {void}
	 */
	addCodeGenerationDependency(codeGenerationDependency) {
		if (this.codeGenerationDependencies === undefined) {
			this.codeGenerationDependencies = [];
		}
		this.codeGenerationDependencies.push(codeGenerationDependency);
	}

	/**
	 * Clear dependencies and blocks.
	 * @returns {void}
	 */
	clearDependenciesAndBlocks() {
		if (this.presentationalDependencies !== undefined) {
			this.presentationalDependencies.length = 0;
		}
		if (this.codeGenerationDependencies !== undefined) {
			this.codeGenerationDependencies.length = 0;
		}
		super.clearDependenciesAndBlocks();
	}

	/**
	 * Adds the provided warning to the module.
	 * @param {Error} warning the warning
	 * @returns {void}
	 */
	addWarning(warning) {
		if (this._warnings === undefined) {
			this._warnings = [];
		}
		this._warnings.push(warning);
	}

	/**
	 * Returns list of warnings if any.
	 * @returns {Error[] | undefined} list of warnings if any
	 */
	getWarnings() {
		return this._warnings;
	}

	/**
	 * Gets number of warnings.
	 * @returns {number} number of warnings
	 */
	getNumberOfWarnings() {
		return this._warnings !== undefined ? this._warnings.length : 0;
	}

	/**
	 * Adds the provided error to the module.
	 * @param {Error} error the error
	 * @returns {void}
	 */
	addError(error) {
		if (this._errors === undefined) {
			this._errors = [];
		}
		this._errors.push(error);
	}

	/**
	 * Returns list of errors if any.
	 * @returns {Error[] | undefined} list of errors if any
	 */
	getErrors() {
		return this._errors;
	}

	/**
	 * Gets number of errors.
	 * @returns {number} number of errors
	 */
	getNumberOfErrors() {
		return this._errors !== undefined ? this._errors.length : 0;
	}

	/**
	 * removes all warnings and errors
	 * @returns {void}
	 */
	clearWarningsAndErrors() {
		if (this._warnings !== undefined) {
			this._warnings.length = 0;
		}
		if (this._errors !== undefined) {
			this._errors.length = 0;
		}
	}

	/**
	 * Checks whether this module is optional.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {boolean} true, if the module is optional
	 */
	isOptional(moduleGraph) {
		let hasConnections = false;
		for (const r of moduleGraph.getIncomingConnections(this)) {
			if (
				!r.dependency ||
				!r.dependency.optional ||
				!r.isTargetActive(undefined)
			) {
				return false;
			}
			hasConnections = true;
		}
		return hasConnections;
	}

	/**
	 * Checks whether this module is accessible in chunk.
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {Chunk} chunk a chunk
	 * @param {Chunk=} ignoreChunk chunk to be ignored
	 * @returns {boolean} true, if the module is accessible from "chunk" when ignoring "ignoreChunk"
	 */
	isAccessibleInChunk(chunkGraph, chunk, ignoreChunk) {
		// Check if module is accessible in ALL chunk groups
		for (const chunkGroup of chunk.groupsIterable) {
			if (!this.isAccessibleInChunkGroup(chunkGraph, chunkGroup)) return false;
		}
		return true;
	}

	/**
	 * Checks whether this module is accessible in chunk group.
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {ChunkGroup} chunkGroup a chunk group
	 * @param {Chunk=} ignoreChunk chunk to be ignored
	 * @returns {boolean} true, if the module is accessible from "chunkGroup" when ignoring "ignoreChunk"
	 */
	isAccessibleInChunkGroup(chunkGraph, chunkGroup, ignoreChunk) {
		const queue = new Set([chunkGroup]);

		// Check if module is accessible from all items of the queue
		queueFor: for (const cg of queue) {
			// 1. If module is in one of the chunks of the group we can continue checking the next items
			//    because it's accessible.
			for (const chunk of cg.chunks) {
				if (chunk !== ignoreChunk && chunkGraph.isModuleInChunk(this, chunk)) {
					continue queueFor;
				}
			}
			// 2. If the chunk group is initial, we can break here because it's not accessible.
			if (chunkGroup.isInitial()) return false;
			// 3. Enqueue all parents because it must be accessible from ALL parents
			for (const parent of chunkGroup.parentsIterable) queue.add(parent);
		}
		// When we processed through the whole list and we didn't bailout, the module is accessible
		return true;
	}

	/**
	 * Checks whether this module contains the chunk.
	 * @param {Chunk} chunk a chunk
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {boolean} true, if the module has any reason why "chunk" should be included
	 */
	hasReasonForChunk(chunk, moduleGraph, chunkGraph) {
		// check for each reason if we need the chunk
		for (const [
			fromModule,
			connections
		] of moduleGraph.getIncomingConnectionsByOriginModule(this)) {
			if (!connections.some((c) => c.isTargetActive(chunk.runtime))) continue;
			for (const originChunk of chunkGraph.getModuleChunksIterable(
				/** @type {Module} */ (fromModule)
			)) {
				// return true if module this is not reachable from originChunk when ignoring chunk
				if (!this.isAccessibleInChunk(chunkGraph, originChunk, chunk)) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Checks whether this module contains the module graph.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true if at least one other module depends on this module
	 */
	hasReasons(moduleGraph, runtime) {
		for (const c of moduleGraph.getIncomingConnections(this)) {
			if (c.isTargetActive(runtime)) return true;
		}
		return false;
	}

	/**
	 * Returns a string representation.
	 * @returns {string} for debugging
	 */
	toString() {
		return `Module[${this.debugId}: ${this.identifier()}]`;
	}

	/**
	 * Checks whether the module needs to be rebuilt for the current build state.
	 * @param {NeedBuildContext} context context info
	 * @param {NeedBuildCallback} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		callback(null, !this.buildMeta);
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph, runtime } = context;
		hash.update(chunkGraph.getModuleGraphHash(this, runtime));
		if (this.presentationalDependencies !== undefined) {
			for (const dep of this.presentationalDependencies) {
				dep.updateHash(hash, context);
			}
		}
		super.updateHash(hash, context);
	}

	/**
	 * Invalidates the cached state associated with this value.
	 * @returns {void}
	 */
	invalidateBuild() {
		// should be overridden to support this feature
	}

	/* istanbul ignore next */
	/**
	 * Returns the unique identifier used to reference this module.
	 * @abstract
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		const AbstractMethodError =
			/** @type {typeof import("./errors/AbstractMethodError.js").default} */ (
				require("./errors/AbstractMethodError.js")
			);

		throw new AbstractMethodError();
	}

	/* istanbul ignore next */
	/**
	 * Returns a human-readable identifier for this module.
	 * @abstract
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		const AbstractMethodError =
			/** @type {typeof import("./errors/AbstractMethodError.js").default} */ (
				require("./errors/AbstractMethodError.js")
			);

		throw new AbstractMethodError();
	}

	/* istanbul ignore next */
	/**
	 * Builds the module using the provided compilation context.
	 * @abstract
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {BuildCallback} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		const AbstractMethodError =
			/** @type {typeof import("./errors/AbstractMethodError.js").default} */ (
				require("./errors/AbstractMethodError.js")
			);

		throw new AbstractMethodError();
	}

	/**
	 * Returns the source types this module can generate.
	 * @abstract
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		// Better override this method to return the correct types
		if (this.source === Module.prototype.source) {
			return DEFAULT_TYPES_UNKNOWN;
		}
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Freshly recomputed source types when they depend on incoming connections, for chunk-graph cache invalidation; undefined otherwise. #20800
	 * @returns {SourceTypes | undefined} source types or undefined
	 */
	getReferencedSourceTypes() {
		return undefined;
	}

	/**
	 * Basic source types are high-level categories like javascript, css, webassembly, etc.
	 * We only have built-in knowledge about the javascript basic type here; other basic types may be
	 * added or changed over time by generators and do not need to be handled or detected here.
	 *
	 * Some modules, e.g. RemoteModule, may return non-basic source types like "remote" and "share-init"
	 * from getSourceTypes(), but their generated output is still JavaScript, i.e. their basic type is JS.
	 * @returns {BasicSourceTypes} types available (do not mutate)
	 */
	getSourceBasicTypes() {
		return this.getSourceTypes();
	}

	/**
	 * Returns generated source.
	 * @abstract
	 * @deprecated Use codeGeneration() instead
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {SourceType=} type the type of source that should be generated
	 * @returns {Source} generated source
	 */
	source(dependencyTemplates, runtimeTemplate, type = JAVASCRIPT_TYPE) {
		if (this.codeGeneration === Module.prototype.codeGeneration) {
			const AbstractMethodError =
				/** @type {typeof import("./errors/AbstractMethodError.js").default} */ (
					require("./errors/AbstractMethodError.js")
				);

			throw new AbstractMethodError();
		}
		throw new Error(
			"Module.source() was removed (use Compilation.codeGenerationResults.getSource(module, runtime, type) instead)"
		);
	}

	/* istanbul ignore next */
	/**
	 * Returns the estimated size for the requested source type.
	 * @abstract
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		const AbstractMethodError =
			/** @type {typeof import("./errors/AbstractMethodError.js").default} */ (
				require("./errors/AbstractMethodError.js")
			);

		throw new AbstractMethodError();
	}

	/**
	 * Gets the library identifier.
	 * @param {LibIdentOptions} options options
	 * @returns {LibIdent | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return null;
	}

	/**
	 * Returns the path used when matching this module against rule conditions.
	 * @returns {NameForCondition | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		return null;
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(context) {
		return `Module Concatenation is not implemented for ${this.constructor.name}`;
	}

	/**
	 * Gets side effects connection state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		return true;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration(context) {
		// Best override this method
		/** @type {Sources} */
		const sources = new Map();
		for (const type of this.getSourceTypes()) {
			if (type !== UNKNOWN_TYPE) {
				sources.set(
					type,
					this.source(
						context.dependencyTemplates,
						context.runtimeTemplate,
						type
					)
				);
			}
		}
		return {
			sources,
			runtimeRequirements: new Set([
				RuntimeGlobals.module,
				RuntimeGlobals.exports,
				RuntimeGlobals.require
			])
		};
	}

	/**
	 * Returns true if the module can be placed in the chunk.
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @param {Compilation} compilation the compilation
	 * @returns {boolean} true if the module can be placed in the chunk
	 */
	chunkCondition(chunk, compilation) {
		return true;
	}

	hasChunkCondition() {
		return this.chunkCondition !== Module.prototype.chunkCondition;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		this.type = module.type;
		this.layer = module.layer;
		this.context = module.context;
		this.factoryMeta = module.factoryMeta;
		this.resolveOptions = module.resolveOptions;
	}

	/**
	 * Module should be unsafe cached. Get data that's needed for that.
	 * This data will be passed to restoreFromUnsafeCache later.
	 * @returns {UnsafeCacheData} cached data
	 */
	getUnsafeCacheData() {
		return {
			factoryMeta: this.factoryMeta,
			resolveOptions: this.resolveOptions
		};
	}

	/**
	 * restore unsafe cache data
	 * @param {UnsafeCacheData} unsafeCacheData data from getUnsafeCacheData
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory handling the unsafe caching
	 */
	_restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory) {
		this.factoryMeta = unsafeCacheData.factoryMeta;
		this.resolveOptions = unsafeCacheData.resolveOptions;
	}

	/**
	 * Assuming this module is in the cache. Remove internal references to allow freeing some memory.
	 */
	cleanupForCache() {
		this.factoryMeta = undefined;
		this.resolveOptions = undefined;
	}

	/**
	 * Gets the original source.
	 * @returns {Source | null} the original source for the module before webpack transformation
	 */
	originalSource() {
		return null;
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
	) {}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.type);
		write(this.layer);
		write(this.context);
		write(this.resolveOptions);
		write(this.factoryMeta);
		write(this.sourceMapKind);
		write(
			this._warnings !== undefined && this._warnings.length === 0
				? undefined
				: this._warnings
		);
		write(
			this._errors !== undefined && this._errors.length === 0
				? undefined
				: this._errors
		);
		write(this.buildMeta);
		write(this.buildInfo);
		write(this.presentationalDependencies);
		write(this.codeGenerationDependencies);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.type = read();
		this.layer = read();
		this.context = read();
		this.resolveOptions = read();
		this.factoryMeta = read();
		this.sourceMapKind = read();
		this._warnings = read();
		this._errors = read();
		this.buildMeta = read();
		this.buildInfo = read();
		this.presentationalDependencies = read();
		this.codeGenerationDependencies = read();
		super.deserialize(context);
	}
}

makeSerializable(Module, "webpack/lib/Module");

export default Module;

export { Module as "module.exports" };
