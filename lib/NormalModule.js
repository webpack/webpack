/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const querystring = require("querystring");
const {
	AsyncSeriesBailHook,
	HookMap,
	SyncHook,
	SyncWaterfallHook
} = require("tapable");
const {
	CachedSource,
	OriginalSource,
	RawSource,
	SourceMapSource
} = require("webpack-sources");
const Dependency = require("./Dependency");
const Module = require("./Module");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const { JAVASCRIPT_MODULE_TYPE_AUTO } = require("./ModuleTypeConstants");
const RuntimeGlobals = require("./RuntimeGlobals");
const HookWebpackError = require("./errors/HookWebpackError");
const ModuleBuildError = require("./errors/ModuleBuildError");
const ModuleError = require("./errors/ModuleError");
const ModuleParseError = require("./errors/ModuleParseError");
const ModuleWarning = require("./errors/ModuleWarning");
const NonErrorEmittedError = require("./errors/NonErrorEmittedError");
const UnhandledSchemeError = require("./errors/UnhandledSchemeError");
const {
	createLoaderContext,
	getContext,
	runLoaders
} = require("./loaders/LoaderRunner");
const LazySet = require("./util/LazySet");
const { isSubset } = require("./util/SetHelpers");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const {
	concatComparators,
	keepOriginalOrder,
	sortWithSourceOrder
} = require("./util/comparators");
const createHash = require("./util/createHash");
const createHooksRegistry = require("./util/createHooksRegistry");
const { createFakeHook } = require("./util/deprecation");
const formatLocation = require("./util/formatLocation");
const { join } = require("./util/fs");
const {
	ABSOLUTE_PATH_REGEXP,
	absolutify,
	contextify,
	makePathsRelative
} = require("./util/identifier");
const makeSerializable = require("./util/makeSerializable");
const memoize = require("./util/memoize");
const parseJson = require("./util/parseJson");

/** @typedef {import("enhanced-resolve").ResolveContext} ResolveContext */
/** @typedef {import("enhanced-resolve").ResolveRequest} ResolveRequest */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */
/** @typedef {import("../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../declarations/WebpackOptions").NoParse} NoParse */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./config/defaults").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./Generator")} Generator */
/** @typedef {import("./Generator").GenerateErrorFn} GenerateErrorFn */
/** @typedef {import("./FileSystemInfo").Snapshot} Snapshot */
/** @typedef {import("./Module").BuildInfo} BuildInfo */
/** @typedef {import("./Module").FileSystemDependencies} FileSystemDependencies */
/** @typedef {import("./Module").ValueCacheVersions} ValueCacheVersions */
/** @typedef {import("./Module").BuildMeta} BuildMeta */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").CodeGenerationResultData} CodeGenerationResultData */
/** @typedef {import("./Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("./Module").KnownBuildInfo} KnownBuildInfo */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").LibIdent} LibIdent */
/** @typedef {import("./Module").NameForCondition} NameForCondition */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("./Module").BuildCallback} BuildCallback */
/** @typedef {import("./Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("./Module").Sources} Sources */
/** @typedef {import("./Module").SourceType} SourceType */
/** @typedef {import("./Module").SourceTypes} SourceTypes */
/** @typedef {import("./Module").UnsafeCacheData} UnsafeCacheData */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */
/** @typedef {import("./NormalModuleFactory").NormalModuleTypes} NormalModuleTypes */
/** @typedef {import("./NormalModuleFactory").ParserByType} ParserByType */
/** @typedef {import("./NormalModuleFactory").ParserOptionsByType} ParserOptionsByType */
/** @typedef {import("./NormalModuleFactory").GeneratorByType} GeneratorByType */
/** @typedef {import("./NormalModuleFactory").GeneratorOptionsByType} GeneratorOptionsByType */
/** @typedef {import("./NormalModuleFactory").ResourceSchemeData} ResourceSchemeData */
/** @typedef {import("./Parser")} Parser */
/** @typedef {import("./Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../declarations/WebpackOptions").HashFunction} HashFunction */
/** @typedef {import("./util/identifier").AssociatedObjectForCache} AssociatedObjectForCache */
/**
 * @template T
 * @typedef {import("./util/deprecation").FakeHook<T>} FakeHook
 */

/** @typedef {{ [k: string]: EXPECTED_ANY }} ParserOptions */
/** @typedef {{ [k: string]: EXPECTED_ANY }} GeneratorOptions */

/**
 * @template T
 * @typedef {import("../declarations/LoaderContext").LoaderContext<T>} LoaderContext
 */

/**
 * @template T
 * @typedef {import("../declarations/LoaderContext").NormalModuleLoaderContext<T>} NormalModuleLoaderContext
 */

/** @typedef {(content: string) => boolean} NoParseFn */

const getInvalidDependenciesModuleWarning = memoize(() =>
	require("./errors/InvalidDependenciesModuleWarning")
);

const getExtractSourceMap = memoize(() => require("./util/extractSourceMap"));

const getValidate = memoize(() => require("schema-utils").validate);

const getHarmonyImportSideEffectDependency = memoize(() =>
	require("./dependencies/HarmonyImportSideEffectDependency")
);

/**
 * @param {NormalModule} mod the module
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Dependency} dep the dep that triggered the bailout
 */
const recordSideEffectsBailout = (mod, moduleGraph, dep) => {
	if (mod._addedSideEffectsBailout === undefined) {
		mod._addedSideEffectsBailout = new WeakSet();
	} else if (mod._addedSideEffectsBailout.has(moduleGraph)) {
		return;
	}
	mod._addedSideEffectsBailout.add(moduleGraph);
	moduleGraph
		.getOptimizationBailout(mod)
		.push(
			() =>
				`Dependency (${dep.type}) with side effects at ${formatLocation(dep.loc)}`
		);
};

/**
 * Walks the `HarmonyImportSideEffectDependency` graph to decide how `rootMod`
 * connects to a referrer when consumed for its side effects only.
 *
 * Iterative (explicit work stack) so deep import chains never approach V8's
 * recursion limit — the overflow behind #20986 — with no separate recursive
 * form or depth cap. Cycles use Tarjan's `index`/`lowlink`: a module's result
 * is memoized on `_sideEffectsStateGraph` only when it is context-independent
 * (cycle-free, or the root of its strongly-connected component), i.e. exactly
 * when the result cannot depend on which ancestors are mid-walk.
 *
 * The previous walker disabled memoization for the whole walk the moment any
 * cycle appeared (one global `circular` flag). With diamond-shaped graphs that
 * made the walk exponential, so a single circular import could blow up an
 * otherwise-linear graph. Per-module lowlink keeps the cycle-free majority
 * memoized while a cycle exists elsewhere.
 *
 * Caching under `lowlink === index` is conservative: an imprecise lowlink can
 * only skip caching (a later recompute yields the same value), never memoize a
 * state that depended on stack context. `true` is monotonic and always cached.
 * A non-`NormalModule` dependency (e.g. `ConcatenatedModule` re-entering this
 * method) is treated as a taint so its chain is never memoized, and any module
 * already flagged `_isEvaluatingSideEffects` (this walk or an outer re-entrant
 * one) counts as circular, matching the previous walker.
 * @param {NormalModule} rootMod the module being walked
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {EXPECTED_ANY} SideEffectDep `HarmonyImportSideEffectDependency` constructor, resolved once at the entry
 * @returns {ConnectionState} the side-effects connection state
 */
const walkSideEffects = (rootMod, moduleGraph, SideEffectDep) => {
	// Context-independent state without descending; `undefined` => walk deps.
	/**
	 * @param {NormalModule} mod module
	 * @returns {ConnectionState | undefined} resolved state or undefined
	 */
	const quick = (mod) => {
		if (mod._sideEffectsStateGraph === moduleGraph) {
			return /** @type {ConnectionState} */ (mod._sideEffectsStateValue);
		}
		const fm = mod.factoryMeta;
		if (fm !== undefined) {
			if (fm.sideEffectFree) return false;
			if (fm.sideEffectFree === false) return true;
		}
		if (!(mod.buildMeta !== undefined && mod.buildMeta.sideEffectFree)) {
			return true;
		}
		return undefined;
	};

	const q0 = quick(rootMod);
	if (q0 !== undefined) return q0;

	/** @type {Map<NormalModule, number>} module -> Tarjan index */
	const indexOf = new Map();
	/** @type {Map<NormalModule, number>} module -> Tarjan lowlink */
	const lowOf = new Map();
	// Parallel frame arrays, to avoid a per-frame object allocation.
	/** @type {NormalModule[]} */
	const fMod = [];
	/** @type {Dependency[][]} */
	const fDeps = [];
	/** @type {number[]} */
	const fIdx = [];
	/** @type {ConnectionState[]} */
	const fCur = [];
	let counter = 0;

	/**
	 * @param {NormalModule} mod module to push a frame for
	 */
	const enter = (mod) => {
		indexOf.set(mod, counter);
		lowOf.set(mod, counter);
		counter++;
		mod._isEvaluatingSideEffects = true;
		fMod.push(mod);
		fDeps.push(mod.dependencies);
		fIdx.push(0);
		fCur.push(false);
	};

	enter(rootMod);
	/** @type {ConnectionState} the just-popped frame's result */
	let result = false;
	/**
	 * Result of a just-popped child frame, to apply to the new top's current
	 * dep. `undefined` means "no pending; advance normally".
	 * @type {ConnectionState | undefined}
	 */
	let pending;

	while (fMod.length > 0) {
		const top = fMod.length - 1;
		const mod = fMod[top];
		const deps = fDeps[top];
		let i = fIdx[top];
		let current = fCur[top];

		// Apply a popped child's result to the dep that spawned it.
		if (pending !== undefined) {
			const state = pending;
			pending = undefined;
			const dep = deps[i];
			if (state === true) {
				recordSideEffectsBailout(mod, moduleGraph, dep);
				mod._sideEffectsStateGraph = moduleGraph;
				mod._sideEffectsStateValue = true;
				mod._isEvaluatingSideEffects = false;
				fMod.pop();
				fDeps.pop();
				fIdx.pop();
				fCur.pop();
				result = true;
				pending = true;
				continue;
			}
			if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
				current = ModuleGraphConnection.addConnectionStates(current, state);
			}
			i++;
		}

		let descended = false;
		while (i < deps.length) {
			const dep = deps[i];
			/** @type {ConnectionState} */
			let state;

			if (dep instanceof SideEffectDep) {
				const refModule = moduleGraph.getModule(dep);
				if (!refModule) {
					state = true;
				} else if (refModule instanceof NormalModule) {
					if (refModule._isEvaluatingSideEffects) {
						// On the current stack (or an outer re-entrant walk) => cycle.
						state = ModuleGraphConnection.CIRCULAR_CONNECTION;
						const ri = indexOf.get(refModule);
						lowOf.set(
							mod,
							Math.min(
								/** @type {number} */ (lowOf.get(mod)),
								ri === undefined ? -1 : ri
							)
						);
					} else {
						const q = quick(refModule);
						if (q !== undefined) {
							state = q;
						} else {
							// Descend: pause this frame, walk the child next.
							fIdx[top] = i;
							fCur[top] = current;
							enter(refModule);
							descended = true;
							break;
						}
					}
				} else {
					// Non-NormalModule (e.g. ConcatenatedModule delegating back
					// through here) resolves via a re-entrant walk that may see our
					// in-progress modules as circular, so taint this chain: never
					// memoize it.
					state = refModule.getSideEffectsConnectionState(moduleGraph);
					lowOf.set(mod, -1);
				}
			} else {
				state = dep.getModuleEvaluationSideEffectsState(moduleGraph);
			}

			if (state === true) {
				recordSideEffectsBailout(mod, moduleGraph, dep);
				// `true` is monotonic — always safe to memoize.
				mod._sideEffectsStateGraph = moduleGraph;
				mod._sideEffectsStateValue = true;
				mod._isEvaluatingSideEffects = false;
				fMod.pop();
				fDeps.pop();
				fIdx.pop();
				fCur.pop();
				result = true;
				pending = true;
				descended = true;
				break;
			}
			if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
				current = ModuleGraphConnection.addConnectionStates(current, state);
			}
			i++;
		}

		if (descended) continue;

		// `mod` finished without a `true` bailout.
		mod._isEvaluatingSideEffects = false;
		// Memoize only when the result is context-independent: no back-edge in
		// this subtree reached above `mod` (a cycle-free module or an SCC root).
		if (lowOf.get(mod) === indexOf.get(mod)) {
			mod._sideEffectsStateGraph = moduleGraph;
			mod._sideEffectsStateValue = current;
		}
		fMod.pop();
		fDeps.pop();
		fIdx.pop();
		fCur.pop();
		result = current;
		pending = current;
		if (fMod.length > 0) {
			const parent = fMod[fMod.length - 1];
			lowOf.set(
				parent,
				Math.min(
					/** @type {number} */ (lowOf.get(parent)),
					/** @type {number} */ (lowOf.get(mod))
				)
			);
		}
	}

	return result;
};

/**
 * @typedef {object} LoaderItem
 * @property {string} loader
 * @property {string | null | undefined | Record<string, EXPECTED_ANY>} options
 * @property {string | null=} ident
 * @property {string | null=} type
 */

/**
 * @param {string} context absolute context path
 * @param {string} source a source path
 * @param {AssociatedObjectForCache=} associatedObjectForCache an object to which the cache will be attached
 * @returns {string} new source path
 */
const contextifySourceUrl = (context, source, associatedObjectForCache) => {
	if (source.startsWith("webpack://")) return source;
	return `webpack://${makePathsRelative(
		context,
		source,
		associatedObjectForCache
	)}`;
};

/**
 * @param {string} context absolute context path
 * @param {string | RawSourceMap} sourceMap a source map
 * @param {AssociatedObjectForCache=} associatedObjectForCache an object to which the cache will be attached
 * @returns {string | RawSourceMap} new source map
 */
const contextifySourceMap = (context, sourceMap, associatedObjectForCache) => {
	if (typeof sourceMap === "string" || !Array.isArray(sourceMap.sources)) {
		return sourceMap;
	}
	const { sourceRoot } = sourceMap;
	/** @type {(source: string) => string} */
	const mapper = !sourceRoot
		? (source) => source
		: sourceRoot.endsWith("/")
			? (source) =>
					source.startsWith("/")
						? `${sourceRoot.slice(0, -1)}${source}`
						: `${sourceRoot}${source}`
			: (source) =>
					source.startsWith("/")
						? `${sourceRoot}${source}`
						: `${sourceRoot}/${source}`;
	const newSources = sourceMap.sources.map((source) =>
		contextifySourceUrl(context, mapper(source), associatedObjectForCache)
	);
	return {
		...sourceMap,
		file: "x",
		sourceRoot: undefined,
		sources: newSources
	};
};

/**
 * @param {string | Buffer} input the input
 * @returns {string} the converted string
 */
const asString = (input) => {
	if (Buffer.isBuffer(input)) {
		return input.toString("utf8");
	}
	return input;
};

/**
 * @param {string | Buffer} input the input
 * @returns {Buffer} the converted buffer
 */
const asBuffer = (input) => {
	if (!Buffer.isBuffer(input)) {
		return Buffer.from(input, "utf8");
	}
	return input;
};

/** @typedef {[string | Buffer, string | RawSourceMap | undefined, PreparsedAst | undefined]}  Result */

/** @typedef {LoaderContext<EXPECTED_ANY>} AnyLoaderContext */

/**
 * @deprecated Use the `readResource` hook instead.
 * @typedef {HookMap<FakeHook<AsyncSeriesBailHook<[string, NormalModule], string | Buffer | null>>>} DeprecatedReadResourceForScheme
 */

/**
 * @typedef {object} NormalModuleCompilationHooks
 * @property {SyncHook<[AnyLoaderContext, NormalModule]>} loader
 * @property {SyncHook<[LoaderItem[], NormalModule, AnyLoaderContext]>} beforeLoaders
 * @property {SyncHook<[NormalModule]>} beforeParse
 * @property {SyncHook<[NormalModule]>} beforeSnapshot
 * @property {DeprecatedReadResourceForScheme} readResourceForScheme
 * @property {HookMap<AsyncSeriesBailHook<[AnyLoaderContext], string | Buffer | null>>} readResource
 * @property {SyncWaterfallHook<[Result, NormalModule]>} processResult
 * @property {AsyncSeriesBailHook<[NormalModule, NeedBuildContext], boolean>} needBuild
 */

/**
 * @template {NormalModuleTypes | ""} [T=NormalModuleTypes | ""]
 * @typedef {object} NormalModuleCreateData
 * @property {string=} layer an optional layer in which the module is
 * @property {T} type module type. When deserializing, this is set to an empty string "".
 * @property {string} request request string
 * @property {string} userRequest request intended by user (without loaders from config)
 * @property {string} rawRequest request without resolving
 * @property {LoaderItem[]} loaders list of loaders
 * @property {string} resource path + query of the real resource
 * @property {(ResourceSchemeData & Partial<ResolveRequest>)=} resourceResolveData resource resolve data
 * @property {string} context context directory for resolving
 * @property {string=} matchResource path + query of the matched resource (virtual)
 * @property {ParserByType[T]} parser the parser used
 * @property {ParserOptionsByType[T]=} parserOptions the options of the parser used
 * @property {GeneratorByType[T]} generator the generator used
 * @property {GeneratorOptionsByType[T]=} generatorOptions the options of the generator used
 * @property {ResolveOptions=} resolveOptions options used for resolving requests from this module
 * @property {boolean} extractSourceMap enable/disable extracting source map
 */

/**
 * @typedef {(resourcePath: string, getLoaderContext: (resourcePath: string) => AnyLoaderContext) => Promise<string | Buffer<ArrayBufferLike>>} ReadResource
 */

/**
 * Defines the build info properties of normal modules (filesystem-backed, loader-processed).
 * @typedef {object} KnownNormalModuleBuildInfo
 * @property {boolean=} parsed
 * @property {string=} hash
 * @property {FileSystemDependencies=} fileDependencies
 * @property {FileSystemDependencies=} contextDependencies
 * @property {FileSystemDependencies=} missingDependencies
 * @property {FileSystemDependencies=} buildDependencies
 * @property {ValueCacheVersions=} valueDependencies
 * @property {(Snapshot | null)=} snapshot
 * @property {string=} resourceIntegrity using in HttpUriPlugin
 */

/** @typedef {BuildInfo & KnownNormalModuleBuildInfo} NormalModuleBuildInfo */

const normalModuleHooksRegistry = createHooksRegistry(() => {
	// TODO webpack 6 deprecate
	/** @type {Partial<NormalModuleCompilationHooks>} */
	const hooks = {};
	hooks.readResourceForScheme = new HookMap((scheme) => {
		const hook =
			/** @type {NormalModuleCompilationHooks} */
			(hooks).readResource.for(scheme);
		return createFakeHook(
			/** @type {AsyncSeriesBailHook<[string, NormalModule], string | Buffer | null>} */ ({
				tap: (options, fn) =>
					hook.tap(options, (loaderContext) =>
						fn(
							loaderContext.resource,
							/** @type {NormalModule} */ (loaderContext._module)
						)
					),
				tapAsync: (options, fn) =>
					hook.tapAsync(options, (loaderContext, callback) =>
						fn(
							loaderContext.resource,
							/** @type {NormalModule} */ (loaderContext._module),
							callback
						)
					),
				tapPromise: (options, fn) =>
					hook.tapPromise(options, (loaderContext) =>
						fn(
							loaderContext.resource,
							/** @type {NormalModule} */ (loaderContext._module)
						)
					)
			})
		);
	});
	hooks.readResource = new HookMap(
		() => new AsyncSeriesBailHook(["loaderContext"])
	);
	hooks.loader = new SyncHook(["loaderContext", "module"]);
	hooks.beforeLoaders = new SyncHook(["loaders", "module", "loaderContext"]);
	hooks.beforeParse = new SyncHook(["module"]);
	hooks.beforeSnapshot = new SyncHook(["module"]);
	hooks.processResult = new SyncWaterfallHook(["result", "module"]);
	hooks.needBuild = new AsyncSeriesBailHook(["module", "context"]);
	return /** @type {NormalModuleCompilationHooks} */ (hooks);
});

class NormalModule extends Module {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {NormalModuleCompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		return normalModuleHooksRegistry(compilation);
	}

	/**
	 * @param {NormalModuleCreateData} options options object
	 */
	constructor({
		layer,
		type,
		request,
		userRequest,
		rawRequest,
		loaders,
		resource,
		resourceResolveData,
		context,
		matchResource,
		parser,
		parserOptions,
		generator,
		generatorOptions,
		resolveOptions,
		extractSourceMap
	}) {
		super(type, context || getContext(resource), layer);

		// Info from Factory
		/** @type {NormalModuleCreateData['request']} */
		this.request = request;
		/** @type {NormalModuleCreateData['userRequest']} */
		this.userRequest = userRequest;
		/** @type {NormalModuleCreateData['rawRequest']} */
		this.rawRequest = rawRequest;
		/** @type {boolean} */
		this.binary = /^(?:asset|webassembly)\b/.test(type);
		/** @type {NormalModuleCreateData['parser'] | undefined} */
		this.parser = parser;
		/** @type {NormalModuleCreateData['parserOptions']} */
		this.parserOptions = parserOptions;
		/** @type {NormalModuleCreateData['generator'] | undefined} */
		this.generator = generator;
		/** @type {NormalModuleCreateData['generatorOptions']} */
		this.generatorOptions = generatorOptions;
		/** @type {NormalModuleCreateData['resource']} */
		this.resource = resource;
		/** @type {NormalModuleCreateData['resourceResolveData']} */
		this.resourceResolveData = resourceResolveData;
		/** @type {NormalModuleCreateData['matchResource']} */
		this.matchResource = matchResource;
		/** @type {NormalModuleCreateData['loaders']} */
		this.loaders = loaders;
		if (resolveOptions !== undefined) {
			// already declared in super class
			/** @type {NormalModuleCreateData['resolveOptions']} */
			this.resolveOptions = resolveOptions;
		}
		/** @type {NormalModuleCreateData['extractSourceMap']} */
		this.extractSourceMap = extractSourceMap;

		// Set by HotModuleReplacementPlugin via NormalModuleFactory's `module` hook
		/** @type {boolean} */
		this.hot = false;

		// Info from Build
		// Redeclared with the normal module specific shape (see KnownNormalModuleBuildInfo)
		/** @type {NormalModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {Error | null} */
		this.error = null;
		/**
		 * @private
		 * @type {Source | null}
		 */
		this._source = null;
		/**
		 * @private
		 * @type {Map<undefined | SourceType, number> | undefined}
		 */
		this._sourceSizes = undefined;
		/**
		 * @private
		 * @type {undefined | SourceTypes}
		 */
		this._sourceTypes = undefined;
		// Cache
		/**
		 * @private
		 * @type {BuildMeta}
		 */
		this._lastSuccessfulBuildMeta = {};
		/**
		 * @private
		 * @type {boolean}
		 */
		this._forceBuild = true;
		/**
		 * @type {boolean}
		 */
		this._isEvaluatingSideEffects = false;
		/**
		 * @type {WeakSet<ModuleGraph> | undefined}
		 */
		this._addedSideEffectsBailout = undefined;
		/**
		 * Memoizes the result of `getSideEffectsConnectionState`. The
		 * graph slot keys the cached value to the `ModuleGraph` it was
		 * computed against so stale values never leak across compilations
		 * — a walk that targets a different graph just overwrites both
		 * slots. Populated only for context-independent results (cycle-free
		 * or SCC-root modules; see `walkSideEffects`).
		 * @type {ModuleGraph | undefined}
		 */
		this._sideEffectsStateGraph = undefined;
		/** @type {ConnectionState | undefined} */
		this._sideEffectsStateValue = undefined;
		/**
		 * @private
		 * @type {CodeGenerationResultData}
		 */
		this._codeGeneratorData = new Map();
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		if (this.layer === null) {
			if (this.type === JAVASCRIPT_MODULE_TYPE_AUTO) {
				return this.request;
			}
			return `${this.type}|${this.request}`;
		}
		return `${this.type}|${this.request}|${this.layer}`;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return /** @type {string} */ (requestShortener.shorten(this.userRequest));
	}

	/**
	 * @returns {string | null} return the resource path
	 */
	getResource() {
		return this.matchResource || this.resource;
	}

	/**
	 * Gets the library identifier.
	 * @param {LibIdentOptions} options options
	 * @returns {LibIdent | null} an identifier for library inclusion
	 */
	libIdent(options) {
		let ident = contextify(
			options.context,
			this.userRequest,
			options.associatedObjectForCache
		);
		if (this.layer) ident = `(${this.layer})/${ident}`;
		return ident;
	}

	/**
	 * Returns the path used when matching this module against rule conditions.
	 * @returns {NameForCondition | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		const resource = /** @type {string} */ (this.getResource());
		const idx = resource.indexOf("?");
		if (idx >= 0) return resource.slice(0, idx);
		return resource;
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
		const m = /** @type {NormalModule} */ (module);
		this.binary = m.binary;
		this.request = m.request;
		this.userRequest = m.userRequest;
		this.rawRequest = m.rawRequest;
		this.parser = m.parser;
		this.parserOptions = m.parserOptions;
		this.generator = m.generator;
		this.generatorOptions = m.generatorOptions;
		this.resource = m.resource;
		this.resourceResolveData = m.resourceResolveData;
		this.context = m.context;
		this.matchResource = m.matchResource;
		this.loaders = m.loaders;
		this.extractSourceMap = m.extractSourceMap;
	}

	/**
	 * Assuming this module is in the cache. Remove internal references to allow freeing some memory.
	 */
	cleanupForCache() {
		// Make sure to cache types and sizes before cleanup when this module has been built
		// They are accessed by the stats and we don't want them to crash after cleanup
		// TODO reconsider this for webpack 6
		if (this.buildInfo) {
			if (this._sourceTypes === undefined) this.getSourceTypes();
			for (const type of /** @type {SourceTypes} */ (this._sourceTypes)) {
				this.size(type);
			}
		}
		super.cleanupForCache();
		this.parser = undefined;
		this.parserOptions = undefined;
		this.generator = undefined;
		this.generatorOptions = undefined;
		// Drop the side-effects memoization so a long-lived module doesn't
		// strong-reference a stale `ModuleGraph`/`Compilation` for graphs
		// that never get re-queried with a fresh one.
		this._sideEffectsStateGraph = undefined;
		this._sideEffectsStateValue = undefined;
	}

	/**
	 * Module should be unsafe cached. Get data that's needed for that.
	 * This data will be passed to restoreFromUnsafeCache later.
	 * @returns {UnsafeCacheData} cached data
	 */
	getUnsafeCacheData() {
		const data = super.getUnsafeCacheData();
		data.parserOptions = this.parserOptions;
		data.generatorOptions = this.generatorOptions;
		return data;
	}

	/**
	 * restore unsafe cache data
	 * @param {UnsafeCacheData} unsafeCacheData data from getUnsafeCacheData
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory handling the unsafe caching
	 */
	restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory) {
		this._restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory);
	}

	/**
	 * restore unsafe cache data
	 * @param {UnsafeCacheData} unsafeCacheData data from getUnsafeCacheData
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory handling the unsafe caching
	 */
	_restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory) {
		super._restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory);
		this.parserOptions = unsafeCacheData.parserOptions;
		this.parser = normalModuleFactory.getParser(this.type, this.parserOptions);
		this.generatorOptions = unsafeCacheData.generatorOptions;
		this.generator = normalModuleFactory.getGenerator(
			this.type,
			this.generatorOptions
		);
		// we assume the generator behaves identically and keep cached sourceTypes/Sizes
	}

	/**
	 * @param {string} context the compilation context
	 * @param {string} name the asset name
	 * @param {string | Buffer} content the content
	 * @param {(string | RawSourceMap)=} sourceMap an optional source map
	 * @param {AssociatedObjectForCache=} associatedObjectForCache object for caching
	 * @returns {Source} the created source
	 */
	createSourceForAsset(
		context,
		name,
		content,
		sourceMap,
		associatedObjectForCache
	) {
		if (sourceMap) {
			if (
				typeof sourceMap === "string" &&
				(this.useSourceMap || this.useSimpleSourceMap)
			) {
				return new OriginalSource(
					content,
					contextifySourceUrl(context, sourceMap, associatedObjectForCache)
				);
			}

			if (this.useSourceMap) {
				return new SourceMapSource(
					content,
					name,
					contextifySourceMap(
						context,
						/** @type {RawSourceMap} */
						(sourceMap),
						associatedObjectForCache
					)
				);
			}
		}

		return new RawSource(content);
	}

	/**
	 * @private
	 * @template T
	 * @param {ResolverWithOptions} resolver a resolver
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {InputFileSystem} fs file system from reading
	 * @param {NormalModuleCompilationHooks} hooks the hooks
	 * @returns {import("../declarations/LoaderContext").LoaderContext<T>} loader context
	 */
	_createLoaderContext(resolver, options, compilation, fs, hooks) {
		const { requestShortener } = compilation.runtimeTemplate;
		const getCurrentLoaderName = () => {
			const currentLoader = this.getCurrentLoader(
				/** @type {AnyLoaderContext} */
				(loaderContext)
			);
			if (!currentLoader) return "(not in loader scope)";
			return requestShortener.shorten(currentLoader.loader);
		};
		/**
		 * @returns {ResolveContext} resolve context
		 */
		const getResolveContext = () => ({
			fileDependencies: {
				add: (d) =>
					/** @type {AnyLoaderContext} */
					(loaderContext).addDependency(d)
			},
			contextDependencies: {
				add: (d) =>
					/** @type {AnyLoaderContext} */
					(loaderContext).addContextDependency(d)
			},
			missingDependencies: {
				add: (d) =>
					/** @type {AnyLoaderContext} */
					(loaderContext).addMissingDependency(d)
			}
		});
		const getAbsolutify = memoize(() =>
			absolutify.bindCache(compilation.compiler.root)
		);
		const getAbsolutifyInContext = memoize(() =>
			absolutify.bindContextCache(
				/** @type {string} */
				(this.context),
				compilation.compiler.root
			)
		);
		const getContextify = memoize(() =>
			contextify.bindCache(compilation.compiler.root)
		);
		const getContextifyInContext = memoize(() =>
			contextify.bindContextCache(
				/** @type {string} */
				(this.context),
				compilation.compiler.root
			)
		);
		const utils = {
			/**
			 * @param {string} context context
			 * @param {string} request request
			 * @returns {string} result
			 */
			absolutify: (context, request) =>
				context === this.context
					? getAbsolutifyInContext()(request)
					: getAbsolutify()(context, request),
			/**
			 * @param {string} context context
			 * @param {string} request request
			 * @returns {string} result
			 */
			contextify: (context, request) =>
				context === this.context
					? getContextifyInContext()(request)
					: getContextify()(context, request),
			/**
			 * @param {HashFunction=} type type
			 * @returns {Hash} hash
			 */
			createHash: (type) =>
				createHash(type || compilation.outputOptions.hashFunction)
		};
		/** @type {NormalModuleLoaderContext<T>} */
		const loaderContext = {
			version: 2,
			/** @type {LoaderContext<EXPECTED_ANY>["getOptions"]} */
			getOptions: (/** @type {EXPECTED_ANY} */ schema = undefined) => {
				const loader = this.getCurrentLoader(
					/** @type {AnyLoaderContext} */
					(loaderContext)
				);

				let { options } = /** @type {LoaderItem} */ (loader);

				if (typeof options === "string") {
					if (options.startsWith("{") && options.endsWith("}")) {
						try {
							options =
								/** @type {LoaderItem["options"]} */
								(parseJson(options));
						} catch (err) {
							throw new Error(
								`Cannot parse string options: ${/** @type {Error} */ (err).message}`,
								{ cause: err }
							);
						}
					} else {
						options = querystring.parse(options, "&", "=", {
							maxKeys: 0
						});
					}
				}

				if (options === null || options === undefined) {
					options = {};
				}

				if (schema && compilation.options.validate) {
					let name = "Loader";
					let baseDataPath = "options";
					/** @type {RegExpExecArray | null} */
					let match;
					if (schema.title && (match = /^(.+) (.+)$/.exec(schema.title))) {
						[, name, baseDataPath] = match;
					}
					getValidate()(schema, /** @type {EXPECTED_OBJECT} */ (options), {
						name,
						baseDataPath
					});
				}

				return /** @type {T} */ (options);
			},
			/** @type {LoaderContext<EXPECTED_ANY>["emitWarning"]} */
			emitWarning: (warning) => {
				if (!(warning instanceof Error)) {
					warning = new NonErrorEmittedError(warning);
				}
				this.addWarning(
					new ModuleWarning(warning, {
						from: getCurrentLoaderName()
					})
				);
			},
			/** @type {LoaderContext<EXPECTED_ANY>["emitError"]} */
			emitError: (error) => {
				if (!(error instanceof Error)) {
					error = new NonErrorEmittedError(error);
				}
				this.addError(
					new ModuleError(error, {
						from: getCurrentLoaderName()
					})
				);
			},
			/** @type {LoaderContext<EXPECTED_ANY>["getLogger"]} */
			getLogger: (name) => {
				const currentLoader = this.getCurrentLoader(
					/** @type {AnyLoaderContext} */
					(loaderContext)
				);
				return compilation.getLogger(() =>
					[currentLoader && currentLoader.loader, name, this.identifier()]
						.filter(Boolean)
						.join("|")
				);
			},
			/** @type {LoaderContext<EXPECTED_ANY>["resolve"]} */
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, getResolveContext(), callback);
			},
			/** @type {LoaderContext<EXPECTED_ANY>["getResolve"]} */
			getResolve(options) {
				const child = options ? resolver.withOptions(options) : resolver;
				return /** @type {ReturnType<import("../declarations/LoaderContext").NormalModuleLoaderContext<T>["getResolve"]>} */ (
					(context, request, callback) => {
						if (callback) {
							child.resolve(
								{},
								context,
								request,
								getResolveContext(),
								callback
							);
						} else {
							return new Promise((resolve, reject) => {
								child.resolve(
									{},
									context,
									request,
									getResolveContext(),
									(err, result) => {
										if (err) reject(err);
										else resolve(result);
									}
								);
							});
						}
					}
				);
			},
			/** @type {LoaderContext<EXPECTED_ANY>["emitFile"]} */
			emitFile: (name, content, sourceMap, assetInfo) => {
				const buildInfo = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);

				if (!buildInfo.assets) {
					buildInfo.assets = Object.create(null);
					buildInfo.assetsInfo = new Map();
				}

				const assets =
					/** @type {NonNullable<KnownBuildInfo["assets"]>} */
					(buildInfo.assets);
				const assetsInfo =
					/** @type {NonNullable<KnownBuildInfo["assetsInfo"]>} */
					(buildInfo.assetsInfo);

				assets[name] = this.createSourceForAsset(
					options.context,
					name,
					content,
					sourceMap,
					compilation.compiler.root
				);
				assetsInfo.set(name, assetInfo);
			},
			addBuildDependency: (dep) => {
				const buildInfo = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);

				if (buildInfo.buildDependencies === undefined) {
					buildInfo.buildDependencies = new LazySet();
				}
				buildInfo.buildDependencies.add(dep);
			},
			utils,
			rootContext: options.context,
			webpack: true,
			sourceMap: Boolean(this.useSourceMap),
			mode: options.mode || "production",
			hashFunction: options.output.hashFunction,
			hashDigest: options.output.hashDigest,
			hashDigestLength: options.output.hashDigestLength,
			hashSalt: options.output.hashSalt,
			_module: this,
			_compilation: compilation,
			_compiler: compilation.compiler,
			fs
		};

		Object.assign(loaderContext, options.loader);
		createLoaderContext(loaderContext);

		hooks.loader.call(
			/** @type {AnyLoaderContext} */
			(loaderContext),
			this
		);

		return /** @type {AnyLoaderContext} */ (loaderContext);
	}

	/**
	 * @param {AnyLoaderContext} loaderContext loader context
	 * @param {number} index index
	 * @returns {LoaderItem | null} loader
	 */
	getCurrentLoader(loaderContext, index = loaderContext.loaderIndex) {
		if (
			this.loaders &&
			this.loaders.length &&
			index < this.loaders.length &&
			index >= 0 &&
			this.loaders[index]
		) {
			return this.loaders[index];
		}
		return null;
	}

	/**
	 * @param {string} context the compilation context
	 * @param {string | Buffer} content the content
	 * @param {(string | RawSourceMap | null)=} sourceMap an optional source map
	 * @param {AssociatedObjectForCache=} associatedObjectForCache object for caching
	 * @returns {Source} the created source
	 */
	createSource(context, content, sourceMap, associatedObjectForCache) {
		if (Buffer.isBuffer(content)) {
			return new RawSource(content);
		}

		// if there is no identifier return raw source
		if (!this.identifier) {
			return new RawSource(content);
		}

		// from here on we assume we have an identifier
		const identifier = this.identifier();

		if (this.useSourceMap && sourceMap) {
			return new SourceMapSource(
				content,
				contextifySourceUrl(context, identifier, associatedObjectForCache),
				contextifySourceMap(context, sourceMap, associatedObjectForCache)
			);
		}

		if (this.useSourceMap || this.useSimpleSourceMap) {
			return new OriginalSource(
				content,
				contextifySourceUrl(context, identifier, associatedObjectForCache)
			);
		}

		return new RawSource(content);
	}

	/**
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {NormalModuleCompilationHooks} hooks the hooks
	 * @param {BuildCallback} callback callback function
	 * @returns {void}
	 */
	_doBuild(options, compilation, resolver, fs, hooks, callback) {
		const loaderContext = this._createLoaderContext(
			resolver,
			options,
			compilation,
			fs,
			hooks
		);

		/**
		 * @param {Error | null} err err
		 * @param {(Result | null)=} result_ result
		 * @returns {void}
		 */
		const processResult = (err, result_) => {
			if (err) {
				if (!(err instanceof Error)) {
					err = new NonErrorEmittedError(err);
				}
				const currentLoader = this.getCurrentLoader(loaderContext);
				const error = new ModuleBuildError(err, {
					from:
						currentLoader &&
						compilation.runtimeTemplate.requestShortener.shorten(
							currentLoader.loader
						)
				});
				return callback(error);
			}
			const result = hooks.processResult.call(
				/** @type {Result} */
				(result_),
				this
			);
			const source = result[0];
			const sourceMap = result.length >= 1 ? result[1] : null;
			const extraInfo = result.length >= 2 ? result[2] : null;

			if (!Buffer.isBuffer(source) && typeof source !== "string") {
				const currentLoader = this.getCurrentLoader(loaderContext, 0);
				const err = new Error(
					`Final loader (${
						currentLoader
							? compilation.runtimeTemplate.requestShortener.shorten(
									currentLoader.loader
								)
							: "unknown"
					}) didn't return a Buffer or String`
				);
				const error = new ModuleBuildError(err);
				return callback(error);
			}

			const isBinaryModule =
				this.generatorOptions && this.generatorOptions.binary !== undefined
					? this.generatorOptions.binary
					: this.binary;

			this._source = this.createSource(
				options.context,
				isBinaryModule ? asBuffer(source) : asString(source),
				sourceMap,
				compilation.compiler.root
			);
			if (this._sourceSizes !== undefined) this._sourceSizes.clear();
			/** @type {PreparsedAst | null} */
			this._ast =
				typeof extraInfo === "object" &&
				extraInfo !== null &&
				extraInfo.webpackAST !== undefined
					? extraInfo.webpackAST
					: null;
			return callback();
		};

		const buildInfo = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);

		buildInfo.fileDependencies = new LazySet();
		buildInfo.contextDependencies = new LazySet();
		buildInfo.missingDependencies = new LazySet();
		buildInfo.cacheable = true;

		try {
			hooks.beforeLoaders.call(
				this.loaders,
				this,
				/** @type {AnyLoaderContext} */
				(loaderContext)
			);
		} catch (err) {
			processResult(/** @type {Error} */ (err));
			return;
		}

		if (this.loaders.length > 0) {
			/** @type {NormalModuleBuildInfo} */
			(this.buildInfo).buildDependencies = new LazySet();
		}

		runLoaders(
			{
				resource: this.resource,
				loaders: this.loaders,
				context: loaderContext,
				/**
				 * @param {AnyLoaderContext} loaderContext the loader context
				 * @param {string} resourcePath the resource Path
				 * @param {(err: Error | null, result?: string | Buffer, sourceMap?: Result[1]) => void} callback callback
				 * @returns {Promise<void>}
				 */
				processResource: async (loaderContext, resourcePath, callback) => {
					/** @type {ReadResource} */
					const readResource = (resourcePath, getLoaderContext) => {
						const scheme = getScheme(resourcePath);
						return new Promise((resolve, reject) => {
							hooks.readResource
								.for(scheme)
								.callAsync(getLoaderContext(resourcePath), (err, result) => {
									if (err) {
										reject(err);
									} else {
										if (typeof result !== "string" && !result) {
											return reject(
												new UnhandledSchemeError(
													/** @type {string} */
													(scheme),
													resourcePath
												)
											);
										}
										resolve(result);
									}
								});
						});
					};
					try {
						const result = await readResource(
							resourcePath,
							() => loaderContext
						);
						if (
							this.extractSourceMap &&
							(this.useSourceMap || this.useSimpleSourceMap)
						) {
							try {
								const { source, sourceMap } = await getExtractSourceMap()(
									result,
									resourcePath,
									/** @type {ReadResource} */
									(resourcePath) =>
										readResource(
											resourcePath,
											(resourcePath) =>
												/** @type {AnyLoaderContext} */
												({
													addDependency(dependency) {
														loaderContext.addDependency(dependency);
													},
													fs: loaderContext.fs,
													_module: undefined,
													resourcePath,
													resource: resourcePath
												})
										).catch((err) => {
											throw new Error(
												`Failed to parse source map. ${/** @type {Error} */ (err).message}`
											);
										})
								);
								return callback(null, source, sourceMap);
							} catch (err) {
								this.addWarning(new ModuleWarning(/** @type {Error} */ (err)));
								return callback(null, result);
							}
						}
						return callback(null, result);
					} catch (error) {
						return callback(/** @type {Error} */ (error));
					}
				}
			},
			(err, result) => {
				// Cleanup loaderContext to avoid leaking memory in ICs
				loaderContext._compilation =
					loaderContext._compiler =
					loaderContext._module =
					loaderContext.fs =
						/** @type {EXPECTED_ANY} */
						(undefined);

				if (!result) {
					/** @type {NormalModuleBuildInfo} */
					(this.buildInfo).cacheable = false;
					return processResult(
						err || new Error("No result from loader-runner processing"),
						null
					);
				}

				const buildInfo = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);

				const fileDependencies =
					/** @type {NonNullable<KnownNormalModuleBuildInfo["fileDependencies"]>} */
					(buildInfo.fileDependencies);
				const contextDependencies =
					/** @type {NonNullable<KnownNormalModuleBuildInfo["contextDependencies"]>} */
					(buildInfo.contextDependencies);
				const missingDependencies =
					/** @type {NonNullable<KnownNormalModuleBuildInfo["missingDependencies"]>} */
					(buildInfo.missingDependencies);

				fileDependencies.addAll(result.fileDependencies);
				contextDependencies.addAll(result.contextDependencies);
				missingDependencies.addAll(result.missingDependencies);
				for (const loader of this.loaders) {
					const buildDependencies =
						/** @type {NonNullable<KnownNormalModuleBuildInfo["buildDependencies"]>} */
						(buildInfo.buildDependencies);

					buildDependencies.add(loader.loader);
				}
				buildInfo.cacheable = buildInfo.cacheable && result.cacheable;
				if (result.notCacheableReasons.length > 0) {
					buildInfo.notCacheableReasons = result.notCacheableReasons;
				}
				processResult(err, result.result);
			}
		);
	}

	/**
	 * @param {Error} error the error
	 * @returns {void}
	 */
	markModuleAsErrored(error) {
		// Restore build meta from successful build to keep importing state
		this.buildMeta = { ...this._lastSuccessfulBuildMeta };
		this.error = error;
		this.addError(error);
	}

	/**
	 * @param {Exclude<NoParse, EXPECTED_ANY[]>} rule rule
	 * @param {string} content content
	 * @returns {boolean} result
	 */
	applyNoParseRule(rule, content) {
		// must start with "rule" if rule is a string
		if (typeof rule === "string") {
			return content.startsWith(rule);
		}

		if (typeof rule === "function") {
			return rule(content);
		}
		// we assume rule is a regexp
		return rule.test(content);
	}

	/**
	 * @param {undefined | NoParse} noParseRule no parse rule
	 * @param {string} request request
	 * @returns {boolean} check if module should not be parsed, returns "true" if the module should !not! be parsed, returns "false" if the module !must! be parsed
	 */
	shouldPreventParsing(noParseRule, request) {
		// if no noParseRule exists, return false
		// the module !must! be parsed.
		if (!noParseRule) {
			return false;
		}

		// we only have one rule to check
		if (!Array.isArray(noParseRule)) {
			// returns "true" if the module is !not! to be parsed
			return this.applyNoParseRule(noParseRule, request);
		}

		for (let i = 0; i < noParseRule.length; i++) {
			const rule = noParseRule[i];
			// early exit on first truthy match
			// this module is !not! to be parsed
			if (this.applyNoParseRule(rule, request)) {
				return true;
			}
		}
		// no match found, so this module !should! be parsed
		return false;
	}

	/**
	 * @param {Compilation} compilation compilation
	 * @private
	 */
	_initBuildHash(compilation) {
		const hash = createHash(compilation.outputOptions.hashFunction);
		if (this._source) {
			hash.update("source");
			this._source.updateHash(hash);
		}
		hash.update("meta");
		hash.update(JSON.stringify(this.buildMeta));
		/** @type {NormalModuleBuildInfo} */
		(this.buildInfo).hash = hash.digest("hex");
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
		this._forceBuild = false;
		this._source = null;
		if (this._sourceSizes !== undefined) this._sourceSizes.clear();
		this._sourceTypes = undefined;
		this._ast = null;
		this.error = null;
		this.clearWarningsAndErrors();
		this.clearDependenciesAndBlocks();
		this.buildMeta = {
			exportsType: undefined,
			defaultObject: undefined,
			strictHarmonyModule: undefined,
			async: undefined
		};
		this.buildInfo = {
			cacheable: false,
			notCacheableReasons: undefined,
			parsed: true,
			fileDependencies: undefined,
			contextDependencies: undefined,
			missingDependencies: undefined,
			buildDependencies: undefined,
			valueDependencies: undefined,
			hash: undefined,
			assets: undefined,
			assetsInfo: undefined,
			snapshot: undefined,
			strict: undefined,
			exportsArgument: undefined,
			moduleArgument: undefined,
			topLevelDeclarations: undefined,
			pureFunctions: undefined,
			inlineExports: undefined,
			moduleConcatenationBailout: undefined,
			needCreateRequire: undefined
		};

		const startTime = compilation.compiler.fsStartTime || Date.now();

		const hooks = NormalModule.getCompilationHooks(compilation);

		return this._doBuild(options, compilation, resolver, fs, hooks, (err) => {
			// if we have an error mark module as failed and exit
			if (err) {
				this.markModuleAsErrored(err);
				this._initBuildHash(compilation);
				return callback();
			}

			/**
			 * @param {Error} e error
			 * @returns {void}
			 */
			const handleParseError = (e) => {
				const source = /** @type {Source} */ (this._source).source();
				const loaders = this.loaders.map((item) =>
					contextify(options.context, item.loader, compilation.compiler.root)
				);
				const error = new ModuleParseError(source, e, loaders, this.type);
				this.markModuleAsErrored(error);
				this._initBuildHash(compilation);
				return callback();
			};

			const handleParseResult = () => {
				this.dependencies.sort(
					concatComparators(
						Dependency.compareLocations,
						keepOriginalOrder(this.dependencies)
					)
				);
				sortWithSourceOrder(this.dependencies, new WeakMap());
				this._initBuildHash(compilation);
				this._lastSuccessfulBuildMeta =
					/** @type {BuildMeta} */
					(this.buildMeta);
				return handleBuildDone();
			};

			const handleBuildDone = () => {
				try {
					hooks.beforeSnapshot.call(this);
				} catch (err) {
					this.markModuleAsErrored(/** @type {Error} */ (err));
					return callback();
				}

				const snapshotOptions = compilation.options.snapshot.module;
				const { cacheable } = /** @type {NormalModuleBuildInfo} */ (
					this.buildInfo
				);
				if (!cacheable || !snapshotOptions) {
					return callback();
				}
				// add warning for all non-absolute paths in fileDependencies, etc
				// This makes it easier to find problems with watching and/or caching
				/** @type {undefined | Set<string>} */
				let nonAbsoluteDependencies;
				/**
				 * @param {FileSystemDependencies} deps deps
				 */
				const checkDependencies = (deps) => {
					for (const dep of deps) {
						if (!ABSOLUTE_PATH_REGEXP.test(dep)) {
							if (nonAbsoluteDependencies === undefined) {
								nonAbsoluteDependencies = new Set();
							}
							nonAbsoluteDependencies.add(dep);
							deps.delete(dep);
							try {
								const depWithoutGlob = dep.replace(/[\\/]?\*.*$/, "");
								const absolute = join(
									compilation.fileSystemInfo.fs,
									/** @type {string} */
									(this.context),
									depWithoutGlob
								);
								if (absolute !== dep && ABSOLUTE_PATH_REGEXP.test(absolute)) {
									(depWithoutGlob !== dep
										? /** @type {NonNullable<KnownNormalModuleBuildInfo["contextDependencies"]>} */
											(
												/** @type {NormalModuleBuildInfo} */
												(this.buildInfo).contextDependencies
											)
										: deps
									).add(absolute);
								}
							} catch (_err) {
								// ignore
							}
						}
					}
				};
				const buildInfo = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);
				const fileDependencies =
					/** @type {NonNullable<KnownNormalModuleBuildInfo["fileDependencies"]>} */
					(buildInfo.fileDependencies);
				const contextDependencies =
					/** @type {NonNullable<KnownNormalModuleBuildInfo["contextDependencies"]>} */
					(buildInfo.contextDependencies);
				const missingDependencies =
					/** @type {NonNullable<KnownNormalModuleBuildInfo["missingDependencies"]>} */
					(buildInfo.missingDependencies);
				checkDependencies(fileDependencies);
				checkDependencies(missingDependencies);
				checkDependencies(contextDependencies);
				if (nonAbsoluteDependencies !== undefined) {
					const InvalidDependenciesModuleWarning =
						getInvalidDependenciesModuleWarning();
					this.addWarning(
						new InvalidDependenciesModuleWarning(this, nonAbsoluteDependencies)
					);
				}
				// convert file/context/missingDependencies into filesystem snapshot
				compilation.fileSystemInfo.createSnapshot(
					startTime,
					fileDependencies,
					contextDependencies,
					missingDependencies,
					snapshotOptions,
					(err, snapshot) => {
						if (err) {
							this.markModuleAsErrored(err);
							return;
						}
						buildInfo.fileDependencies = undefined;
						buildInfo.contextDependencies = undefined;
						buildInfo.missingDependencies = undefined;
						buildInfo.snapshot = snapshot;
						return callback();
					}
				);
			};

			try {
				hooks.beforeParse.call(this);
			} catch (err) {
				this.markModuleAsErrored(/** @type {Error} */ (err));
				this._initBuildHash(compilation);
				return callback();
			}

			// check if this module should !not! be parsed.
			// if so, exit here;
			const noParseRule = options.module && options.module.noParse;
			if (this.shouldPreventParsing(noParseRule, this.request)) {
				// We assume that we need module and exports
				/** @type {NormalModuleBuildInfo} */
				(this.buildInfo).parsed = false;
				this._initBuildHash(compilation);
				return handleBuildDone();
			}

			try {
				const source = /** @type {Source} */ (this._source).source();
				/** @type {Parser} */
				(this.parser).parse(this._ast || source, {
					source,
					current: this,
					module: this,
					compilation,
					options,
					harmonyNamedExports: undefined,
					harmonyStarExports: undefined,
					lastHarmonyImportOrder: undefined,
					localModules: undefined
				});
			} catch (parseErr) {
				handleParseError(/** @type {Error} */ (parseErr));
				return;
			}
			handleParseResult();
		});
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(context) {
		return /** @type {Generator} */ (
			this.generator
		).getConcatenationBailoutReason(this, context);
	}

	/**
	 * Gets side effects connection state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		// Each call owns its Tarjan bookkeeping; re-entrant calls (e.g.
		// `ConcatenatedModule.getSideEffectsConnectionState` delegating back
		// through here) can't clobber the outer walk.
		return walkSideEffects(
			this,
			moduleGraph,
			getHarmonyImportSideEffectDependency()
		);
	}

	/**
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		if (this._sourceTypes === undefined) {
			this._sourceTypes = /** @type {Generator} */ (this.generator).getTypes(
				this
			);
		}
		return this._sourceTypes;
	}

	/**
	 * Freshly recomputed source types when they depend on incoming connections, for chunk-graph cache invalidation; undefined otherwise. #20800
	 * @returns {SourceTypes | undefined} source types or undefined
	 */
	getReferencedSourceTypes() {
		const generator = /** @type {Generator} */ (this.generator);
		// Bypass the _sourceTypes cache: it may be stale when the module is not rebuilt.
		return generator.getTypesDependOnIncomingConnections()
			? generator.getTypes(this)
			: undefined;
	}

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
		runtime,
		concatenationScope,
		codeGenerationResults,
		sourceTypes
	}) {
		/** @type {RuntimeRequirements} */
		const runtimeRequirements = new Set();

		const { parsed } = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);

		if (!parsed) {
			runtimeRequirements.add(RuntimeGlobals.module);
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.thisAsExports);
		}

		const getData = () => this._codeGeneratorData;

		/** @type {Sources} */
		const sources = new Map();
		for (const type of sourceTypes || chunkGraph.getModuleSourceTypes(this)) {
			// TODO webpack@6 make generateError required
			const generator =
				/** @type {Generator & { generateError?: GenerateErrorFn }} */
				(this.generator);
			const source = this.error
				? generator.generateError
					? generator.generateError(this.error, this, {
							dependencyTemplates,
							runtimeTemplate,
							moduleGraph,
							chunkGraph,
							runtimeRequirements,
							runtime,
							concatenationScope,
							codeGenerationResults,
							getData,
							type
						})
					: new RawSource(
							`throw new Error(${JSON.stringify(this.error.message)});`
						)
				: generator.generate(this, {
						dependencyTemplates,
						runtimeTemplate,
						moduleGraph,
						chunkGraph,
						runtimeRequirements,
						runtime,
						concatenationScope,
						codeGenerationResults,
						getData,
						type
					});

			if (source) {
				sources.set(type, new CachedSource(source));
			}
		}

		/** @type {CodeGenerationResult} */
		const resultEntry = {
			sources,
			runtimeRequirements,
			data: this._codeGeneratorData,
			hash: undefined
		};
		return resultEntry;
	}

	/**
	 * Gets the original source.
	 * @returns {Source | null} the original source for the module before webpack transformation
	 */
	originalSource() {
		return this._source;
	}

	/**
	 * Invalidates the cached state associated with this value.
	 * @returns {void}
	 */
	invalidateBuild() {
		this._forceBuild = true;
	}

	/**
	 * Checks whether the module needs to be rebuilt for the current build state.
	 * @param {NeedBuildContext} context context info
	 * @param {NeedBuildCallback} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		const { fileSystemInfo, compilation, valueCacheVersions } = context;
		// build if enforced
		if (this._forceBuild) return callback(null, true);

		// always try to build in case of an error
		if (this.error) return callback(null, true);

		const { cacheable, snapshot, valueDependencies } =
			/** @type {NormalModuleBuildInfo} */ (this.buildInfo);

		// always build when module is not cacheable
		if (!cacheable) return callback(null, true);

		// build when there is no snapshot to check
		if (!snapshot) return callback(null, true);

		// build when valueDependencies have changed
		if (valueDependencies) {
			if (!valueCacheVersions) return callback(null, true);
			for (const [key, value] of valueDependencies) {
				if (value === undefined) return callback(null, true);
				const current = valueCacheVersions.get(key);
				if (
					value !== current &&
					(typeof value === "string" ||
						typeof current === "string" ||
						current === undefined ||
						!isSubset(value, current))
				) {
					return callback(null, true);
				}
			}
		}

		// check snapshot for validity
		fileSystemInfo.checkSnapshotValid(snapshot, (err, valid) => {
			if (err) return callback(err);
			if (!valid) return callback(null, true);
			const hooks = NormalModule.getCompilationHooks(compilation);
			hooks.needBuild.callAsync(this, context, (err, needBuild) => {
				if (err) {
					return callback(
						HookWebpackError.makeWebpackError(
							err,
							"NormalModule.getCompilationHooks().needBuild"
						)
					);
				}
				callback(null, Boolean(needBuild));
			});
		});
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		const cachedSize =
			this._sourceSizes === undefined ? undefined : this._sourceSizes.get(type);
		if (cachedSize !== undefined) {
			return cachedSize;
		}
		const size = Math.max(
			1,
			/** @type {Generator} */ (this.generator).getSize(this, type)
		);
		if (this._sourceSizes === undefined) {
			this._sourceSizes = new Map();
		}
		this._sourceSizes.set(type, size);
		return size;
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
		const { snapshot, buildDependencies: buildDeps } =
			/** @type {NormalModuleBuildInfo} */ (this.buildInfo);
		if (snapshot) {
			fileDependencies.addAll(snapshot.getFileIterable());
			contextDependencies.addAll(snapshot.getContextIterable());
			missingDependencies.addAll(snapshot.getMissingIterable());
		} else {
			const {
				fileDependencies: fileDeps,
				contextDependencies: contextDeps,
				missingDependencies: missingDeps
			} = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);
			if (fileDeps !== undefined) fileDependencies.addAll(fileDeps);
			if (contextDeps !== undefined) contextDependencies.addAll(contextDeps);
			if (missingDeps !== undefined) missingDependencies.addAll(missingDeps);
		}
		if (buildDeps !== undefined) {
			buildDependencies.addAll(buildDeps);
		}
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const buildInfo = /** @type {NormalModuleBuildInfo} */ (this.buildInfo);
		hash.update(
			/** @type {string} */
			(buildInfo.hash)
		);
		// Clear cached source types and re-compute so that changes in incoming
		// connections (e.g. asset module newly referenced from JS via lazy
		// compilation) are reflected in the hash and trigger code generation
		// cache invalidation.
		// https://github.com/webpack/webpack/issues/20800
		this._sourceTypes = undefined;
		for (const type of this.getSourceTypes()) {
			hash.update(type);
		}
		/** @type {Generator} */
		(this.generator).updateHash(hash, {
			module: this,
			...context
		});
		super.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		// deserialize
		write(this._source);
		write(this.error);
		write(this._lastSuccessfulBuildMeta);
		write(this._forceBuild);
		write(this._codeGeneratorData);
		write(this.hot);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {NormalModule} module
	 */
	static deserialize(context) {
		// `new this` so subclasses without extra constructor options inherit this method
		const obj = new this({
			// will be deserialized by Module
			layer: /** @type {EXPECTED_ANY} */ (null),
			type: "",
			// will be filled by updateCacheModule
			resource: "",
			context: "",
			request: /** @type {EXPECTED_ANY} */ (null),
			userRequest: /** @type {EXPECTED_ANY} */ (null),
			rawRequest: /** @type {EXPECTED_ANY} */ (null),
			loaders: /** @type {EXPECTED_ANY} */ (null),
			matchResource: /** @type {EXPECTED_ANY} */ (null),
			parser: /** @type {EXPECTED_ANY} */ (null),
			parserOptions: /** @type {EXPECTED_ANY} */ (null),
			generator: /** @type {EXPECTED_ANY} */ (null),
			generatorOptions: /** @type {EXPECTED_ANY} */ (null),
			resolveOptions: /** @type {EXPECTED_ANY} */ (null),
			extractSourceMap: /** @type {EXPECTED_ANY} */ (null)
		});
		obj.deserialize(context);
		return obj;
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this._source = read();
		this.error = read();
		this._lastSuccessfulBuildMeta = read();
		this._forceBuild = read();
		this._codeGeneratorData = read();
		this.hot = read();
		super.deserialize(context);
	}
}

makeSerializable(NormalModule, "webpack/lib/NormalModule");

module.exports = NormalModule;
