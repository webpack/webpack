/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const querystring = require("querystring");
const { getContext, runLoaders } = require("loader-runner");
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
const Compilation = require("./Compilation");
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
const LazySet = require("./util/LazySet");
const { isSubset } = require("./util/SetHelpers");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const {
	concatComparators,
	keepOriginalOrder,
	sortWithSourceOrder
} = require("./util/comparators");
const createHash = require("./util/createHash");
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

// Maximum recursive descent depth before switching to the iterative walker.
// #20986 reported overflow around 1300 modules in webpack 5.107.0 where each
// step consumed two stack frames (`NormalModule.getSideEffectsConnectionState`
// plus `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState`).
// `walkSideEffectsRecursive` folds the second call into the first and uses
// one frame per module, so this limit caps the native stack at half the depth
// where the original code overflowed — well within the safe range across
// platforms while keeping the common (shallow) case purely recursive.
const SIDE_EFFECTS_RECURSION_LIMIT = 2000;

/**
 * Iterative form of the side-effects walker. Used as a fallback once the
 * recursive form reaches `SIDE_EFFECTS_RECURSION_LIMIT` so deep chains
 * (#20986) don't overflow V8's stack. Safe to enter while ancestors set
 * `_isEvaluatingSideEffects` on their own modules — those are treated as
 * `CIRCULAR_CONNECTION` if revisited, matching the original recursive
 * behavior.
 * @param {NormalModule} rootMod the module to walk
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {SideEffectsWalkContext} ctx per-walk cycle-tracking context
 * @returns {ConnectionState} the side-effects connection state
 */
const walkSideEffectsIterative = (rootMod, moduleGraph, ctx) => {
	const SideEffectDep = getHarmonyImportSideEffectDependency();

	/** @type {NormalModule[]} */
	const modStack = [rootMod];
	/** @type {Dependency[][]} */
	const depsStack = [rootMod.dependencies];
	const indexStack = [0];
	/** @type {ConnectionState[]} */
	const currentStack = [false];
	rootMod._isEvaluatingSideEffects = true;

	/**
	 * Result from a just-popped child frame, to be applied to the new
	 * top's current dep. `undefined` means "no pending; advance".
	 * @type {ConnectionState | undefined}
	 */
	let pending;

	while (modStack.length > 0) {
		const top = modStack.length - 1;
		const topMod = modStack[top];
		const deps = depsStack[top];
		let index = indexStack[top];
		let current = currentStack[top];

		if (pending !== undefined) {
			const state = pending;
			pending = undefined;
			const dep = deps[index];

			if (state === true) {
				recordSideEffectsBailout(topMod, moduleGraph, dep);
				topMod._isEvaluatingSideEffects = false;
				// `true` is monotonic — safe to memoize regardless of cycle
				// status, matching the direct-bailout branch below.
				topMod._sideEffectsStateGraph = moduleGraph;
				topMod._sideEffectsStateValue = true;
				modStack.pop();
				depsStack.pop();
				indexStack.pop();
				currentStack.pop();
				pending = true;
				continue;
			}
			if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
				current = ModuleGraphConnection.addConnectionStates(current, state);
			}
			index++;
		}

		let descended = false;
		const depCount = deps.length;
		while (index < depCount) {
			const dep = deps[index];
			/** @type {ConnectionState} */
			let state;

			if (dep instanceof SideEffectDep) {
				const refModule = moduleGraph.getModule(dep);
				if (!refModule) {
					state = true;
				} else if (refModule instanceof NormalModule) {
					// Cache hit
					if (refModule._sideEffectsStateGraph === moduleGraph) {
						state = /** @type {ConnectionState} */ (
							refModule._sideEffectsStateValue
						);
					}
					// Fast-path checks inlined to avoid the helper call.
					else if (refModule.factoryMeta !== undefined) {
						if (refModule.factoryMeta.sideEffectFree) {
							state = false;
						} else if (refModule.factoryMeta.sideEffectFree === false) {
							state = true;
						} else if (
							!(
								refModule.buildMeta !== undefined &&
								refModule.buildMeta.sideEffectFree
							)
						) {
							state = true;
						} else if (refModule._isEvaluatingSideEffects) {
							ctx.circular = true;
							state = ModuleGraphConnection.CIRCULAR_CONNECTION;
						} else {
							// Descend
							indexStack[top] = index;
							currentStack[top] = current;
							refModule._isEvaluatingSideEffects = true;
							modStack.push(refModule);
							depsStack.push(refModule.dependencies);
							indexStack.push(0);
							currentStack.push(false);
							descended = true;
							break;
						}
					} else if (
						!(
							refModule.buildMeta !== undefined &&
							refModule.buildMeta.sideEffectFree
						)
					) {
						state = true;
					} else if (refModule._isEvaluatingSideEffects) {
						ctx.circular = true;
						state = ModuleGraphConnection.CIRCULAR_CONNECTION;
					} else {
						// Descend
						indexStack[top] = index;
						currentStack[top] = current;
						refModule._isEvaluatingSideEffects = true;
						modStack.push(refModule);
						depsStack.push(refModule.dependencies);
						indexStack.push(0);
						currentStack.push(false);
						descended = true;
						break;
					}
				} else {
					ctx.circular = true;
					state = refModule.getSideEffectsConnectionState(moduleGraph);
				}
			} else {
				state = dep.getModuleEvaluationSideEffectsState(moduleGraph);
			}

			if (state === true) {
				recordSideEffectsBailout(topMod, moduleGraph, dep);
				topMod._isEvaluatingSideEffects = false;
				topMod._sideEffectsStateGraph = moduleGraph;
				topMod._sideEffectsStateValue = true;
				modStack.pop();
				depsStack.pop();
				indexStack.pop();
				currentStack.pop();
				pending = true;
				descended = true;
				break;
			}
			if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
				current = ModuleGraphConnection.addConnectionStates(current, state);
			}
			index++;
		}

		if (descended) continue;

		topMod._isEvaluatingSideEffects = false;
		if (!ctx.circular) {
			topMod._sideEffectsStateGraph = moduleGraph;
			topMod._sideEffectsStateValue = current;
		}
		pending = current;
		modStack.pop();
		depsStack.pop();
		indexStack.pop();
		currentStack.pop();
	}

	return /** @type {ConnectionState} */ (pending);
};

/**
 * @typedef {object} SideEffectsWalkContext
 * @property {boolean} circular whether a cycle was seen anywhere in this walk
 */

/**
 * Walks back up a stack of linear-chain ancestors, applying the result
 * `state` of the chain's tail to each ancestor. Each ancestor in the
 * stack had exactly one `HarmonyImportSideEffectDependency` returning
 * `state`, so its result is just `state` (with the usual aggregation
 * rules) and we can avoid building per-frame `current` accumulators.
 * @param {(NormalModule | Dependency)[] | null} ancestors interleaved stack of `[mod, sideEffectDep, mod, sideEffectDep, …]` in descent order; `null` if there were none
 * @param {ConnectionState} state result from the chain's tail
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {SideEffectsWalkContext} ctx per-walk cycle-tracking context
 * @returns {ConnectionState} the root ancestor's result
 */
const propagateLinearResult = (ancestors, state, moduleGraph, ctx) => {
	if (ancestors === null) return state;
	while (ancestors.length > 0) {
		const dep = /** @type {Dependency} */ (ancestors.pop());
		const ancestor = /** @type {NormalModule} */ (ancestors.pop());
		ancestor._isEvaluatingSideEffects = false;

		if (state === true) {
			recordSideEffectsBailout(ancestor, moduleGraph, dep);
			// `true` is monotonic — safe to cache regardless of cycle status.
			ancestor._sideEffectsStateGraph = moduleGraph;
			ancestor._sideEffectsStateValue = true;
		} else if (state === ModuleGraphConnection.CIRCULAR_CONNECTION) {
			// CIRCULAR_CONNECTION is filtered before folding into `current`,
			// so the ancestor's `current` stays at its initial `false`. From
			// this point upward the propagated state is `false`, and the
			// cycle taint prevents memoization further up (handled by
			// `ctx.circular`).
			state = false;
		} else if (!ctx.circular) {
			ancestor._sideEffectsStateGraph = moduleGraph;
			ancestor._sideEffectsStateValue = state;
		}
	}
	return state;
};

/**
 * Recursive form of the side-effects walker. Folds the descent through
 * `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState`
 * directly into the loop so each module costs only one V8 stack frame
 * (vs. two in the original recursive code).
 *
 * Linear-chain heads (modules with exactly one
 * `HarmonyImportSideEffectDependency` to another `NormalModule`) are
 * walked iteratively inside the function via an explicit
 * `linearAncestors` stack — no additional V8 frame per descent — and
 * their results are propagated back up by `propagateLinearResult`. This
 * keeps stack consumption at O(1) for the common deep-import-chain
 * pattern that motivated #20986 and also avoids the heavier iterative
 * fallback.
 *
 * Falls back to `walkSideEffectsIterative` only when a *non-linear*
 * walk reaches `SIDE_EFFECTS_RECURSION_LIMIT` — i.e. a deep tree, where
 * each level genuinely needs its own recursion frame.
 *
 * Caches the result on the module when the walk did not encounter a
 * cycle, so subsequent queries (e.g. repeated lookups during
 * `SideEffectsFlagPlugin`'s incoming-connection optimization and its
 * `exportInfo.getTarget` callbacks) return in O(1).
 * @param {NormalModule} mod the module being walked
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {number} depth current recursion depth (only counts true V8 frames)
 * @param {EXPECTED_ANY} SideEffectDep `HarmonyImportSideEffectDependency` constructor, resolved once at the public entry to avoid repeated `require` lookups in the recursive call
 * @param {SideEffectsWalkContext} ctx per-walk cycle-tracking context
 * @returns {ConnectionState} the side-effects connection state
 */
const walkSideEffectsRecursive = (
	mod,
	moduleGraph,
	depth,
	SideEffectDep,
	ctx
) => {
	// Interleaved `[mod, linearDep, mod, linearDep, …]` for the linear
	// chain head; `null` until the first descent.
	/** @type {(NormalModule | Dependency)[] | null} */
	let linearAncestors = null;

	// Walk the linear-chain head iteratively. Every loop iteration peels
	// off one module without consuming a V8 stack frame.
	while (true) {
		if (mod._sideEffectsStateGraph === moduleGraph) {
			return propagateLinearResult(
				linearAncestors,
				/** @type {ConnectionState} */ (mod._sideEffectsStateValue),
				moduleGraph,
				ctx
			);
		}

		if (mod.factoryMeta !== undefined) {
			if (mod.factoryMeta.sideEffectFree) {
				return propagateLinearResult(linearAncestors, false, moduleGraph, ctx);
			}
			if (mod.factoryMeta.sideEffectFree === false) {
				return propagateLinearResult(linearAncestors, true, moduleGraph, ctx);
			}
		}
		if (!(mod.buildMeta !== undefined && mod.buildMeta.sideEffectFree)) {
			return propagateLinearResult(linearAncestors, true, moduleGraph, ctx);
		}
		if (mod._isEvaluatingSideEffects) {
			ctx.circular = true;
			return propagateLinearResult(
				linearAncestors,
				ModuleGraphConnection.CIRCULAR_CONNECTION,
				moduleGraph,
				ctx
			);
		}

		// A real ESM module's `dependencies` typically include one
		// `HarmonyImportSideEffectDependency` plus several non-recursive deps
		// (export specifiers, const dependencies, …) that report
		// `false`/`CIRCULAR_CONNECTION` from
		// `getModuleEvaluationSideEffectsState`. Walk the deps in order
		// here: as long as at most one is a `SideEffectDep` and no
		// non-recursive dep triggers a bailout or contributes a non-`false`
		// state, we can still tail-call iteratively through that one
		// `SideEffectDep` — no V8 frame needed. This is what keeps the
		// 1300-module cyclic chain from #20986 from overflowing V8's stack
		// even though each generated module has multiple `dependencies`.
		const deps = mod.dependencies;
		/** @type {Dependency | null} */
		let linearDep = null;
		/** @type {ConnectionState} */
		let nonRecursiveCurrent = false;
		let linearOk = true;
		for (let i = 0; i < deps.length; i++) {
			const dep = deps[i];
			if (dep instanceof SideEffectDep) {
				if (linearDep !== null) {
					// Two `SideEffectDep`s in the same module — fall back to
					// the general walk so each can recurse normally.
					linearOk = false;
					break;
				}
				linearDep = dep;
			} else {
				const state = dep.getModuleEvaluationSideEffectsState(moduleGraph);
				if (state === true) {
					recordSideEffectsBailout(mod, moduleGraph, dep);
					mod._sideEffectsStateGraph = moduleGraph;
					mod._sideEffectsStateValue = true;
					return propagateLinearResult(linearAncestors, true, moduleGraph, ctx);
				}
				if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
					nonRecursiveCurrent = ModuleGraphConnection.addConnectionStates(
						nonRecursiveCurrent,
						state
					);
				}
			}
		}

		if (!linearOk || nonRecursiveCurrent !== false) {
			// Multiple `SideEffectDep`s, or a non-recursive dep contributed
			// a non-`false` state (e.g. `TRANSITIVE_ONLY`). The linear
			// propagation rule "ancestor's current = chain state" no longer
			// holds, so fall back to the general walk.
			break;
		}

		if (linearDep === null) {
			// No `SideEffectDep` — the module is a leaf as far as the
			// side-effects graph is concerned. Cache and propagate `false`.
			if (!ctx.circular) {
				mod._sideEffectsStateGraph = moduleGraph;
				mod._sideEffectsStateValue = false;
			}
			return propagateLinearResult(linearAncestors, false, moduleGraph, ctx);
		}

		const refModule = moduleGraph.getModule(linearDep);
		if (!refModule) {
			recordSideEffectsBailout(mod, moduleGraph, linearDep);
			mod._sideEffectsStateGraph = moduleGraph;
			mod._sideEffectsStateValue = true;
			return propagateLinearResult(linearAncestors, true, moduleGraph, ctx);
		}
		if (!(refModule instanceof NormalModule)) {
			// Non-NormalModule's `getSideEffectsConnectionState` re-enters
			// the public method; defer to the general walk for safety.
			break;
		}

		mod._isEvaluatingSideEffects = true;
		if (linearAncestors === null) linearAncestors = [];
		// Push (mod, linearDep) so `propagateLinearResult` records bailouts
		// against the actual `SideEffectDep` that triggered the descent —
		// which may not be `dependencies[0]` when the module also has
		// export / const dependencies.
		linearAncestors.push(mod, linearDep);
		mod = refModule;
		continue;
	}

	// Non-linear walk. Each genuine recursive call costs one V8 frame, so
	// honour the depth limit here.
	if (depth >= SIDE_EFFECTS_RECURSION_LIMIT) {
		return propagateLinearResult(
			linearAncestors,
			walkSideEffectsIterative(mod, moduleGraph, ctx),
			moduleGraph,
			ctx
		);
	}

	mod._isEvaluatingSideEffects = true;
	/** @type {ConnectionState} */
	let current = false;

	for (const dep of mod.dependencies) {
		/** @type {ConnectionState} */
		let state;
		if (dep instanceof SideEffectDep) {
			const refModule = moduleGraph.getModule(dep);
			if (!refModule) {
				state = true;
			} else if (refModule instanceof NormalModule) {
				state = walkSideEffectsRecursive(
					refModule,
					moduleGraph,
					depth + 1,
					SideEffectDep,
					ctx
				);
			} else {
				// Non-NormalModule's `getSideEffectsConnectionState` (notably
				// `ConcatenatedModule` delegating to its root) re-enters the
				// public method and may walk through modules that the outer
				// walk has marked as evaluating. We can't observe whether
				// the inner walk hit a cycle that reflected the outer's
				// state, so treat the walk as cycle-tainted and skip the
				// cache for safety.
				ctx.circular = true;
				state = refModule.getSideEffectsConnectionState(moduleGraph);
			}
		} else {
			state = dep.getModuleEvaluationSideEffectsState(moduleGraph);
		}

		if (state === true) {
			recordSideEffectsBailout(mod, moduleGraph, dep);
			mod._isEvaluatingSideEffects = false;
			// `true` is monotonic — once any dep declares side effects, the
			// answer is `true` regardless of how cycles resolve, so it's
			// always safe to memoize.
			mod._sideEffectsStateGraph = moduleGraph;
			mod._sideEffectsStateValue = true;
			return propagateLinearResult(linearAncestors, true, moduleGraph, ctx);
		}
		if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
			current = ModuleGraphConnection.addConnectionStates(current, state);
		}
	}

	mod._isEvaluatingSideEffects = false;

	// Only memoize when no cycle has been observed anywhere in the walk
	// since the public entry. A cycle anywhere can affect any ancestor's
	// result (the back-edge target's contribution is hidden by
	// CIRCULAR_CONNECTION short-circuiting), so this single flag is the
	// conservative-but-cheap approximation of "this subtree's result is
	// independent of cycle context". The public entry resets the flag.
	if (!ctx.circular) {
		mod._sideEffectsStateGraph = moduleGraph;
		mod._sideEffectsStateValue = current;
	}
	return propagateLinearResult(linearAncestors, current, moduleGraph, ctx);
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

/** @type {WeakMap<Compilation, NormalModuleCompilationHooks>} */
const compilationHooksMap = new WeakMap();

class NormalModule extends Module {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {NormalModuleCompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				loader: new SyncHook(["loaderContext", "module"]),
				beforeLoaders: new SyncHook(["loaders", "module", "loaderContext"]),
				beforeParse: new SyncHook(["module"]),
				beforeSnapshot: new SyncHook(["module"]),
				// TODO webpack 6 deprecate
				readResourceForScheme: new HookMap((scheme) => {
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
				}),
				readResource: new HookMap(
					() => new AsyncSeriesBailHook(["loaderContext"])
				),
				processResult: new SyncWaterfallHook(["result", "module"]),
				needBuild: new AsyncSeriesBailHook(["module", "context"])
			};
			compilationHooksMap.set(
				compilation,
				/** @type {NormalModuleCompilationHooks} */ (hooks)
			);
		}
		return /** @type {NormalModuleCompilationHooks} */ (hooks);
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
		 * slots. Populated only for results computed without encountering
		 * a circular connection (see `walkSideEffectsRecursive`).
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
		// Fresh per-walk context; re-entrant calls (e.g.
		// `ConcatenatedModule.getSideEffectsConnectionState` delegating back
		// through here) get their own and can't clobber the outer walk.
		return walkSideEffectsRecursive(
			this,
			moduleGraph,
			0,
			getHarmonyImportSideEffectDependency(),
			{ circular: false }
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
