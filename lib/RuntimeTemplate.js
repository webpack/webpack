/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { CachedSource, ReplaceSource } = require("webpack-sources");
const APIPlugin = require("./APIPlugin");

const InitFragment = require("./InitFragment");
const {
	ASSET_TYPE,
	ASSET_URL_TYPE,
	CSS_TYPE,
	HTML_TYPE,
	JAVASCRIPT_TYPE,
	RUNTIME_TYPE
} = require("./ModuleSourceTypeConstants");
const { WEBASSEMBLY_MODULE_TYPE_ASYNC } = require("./ModuleTypeConstants");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const {
	getOutgoingAsyncModules
} = require("./async-modules/AsyncModuleHelpers");
const HarmonyImportDependency = require("./dependencies/HarmonyImportDependency");
const ImportDependency = require("./dependencies/ImportDependency");
const { ImportPhaseUtils } = require("./dependencies/ImportPhase");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");
const { InlinedUsedName } = require("./optimize/InlineExports");
const {
	getDeferredCycleModuleIds,
	getDeferredCycleModules,
	getMakeDeferredNamespaceModeFromExportsType,
	getOptimizedDeferredModule
} = require("./runtime/MakeDeferredNamespaceObjectRuntime");
const {
	isAbsoluteBaseUri,
	isChunkRelativeBaseUri
} = require("./runtime/baseUri");
const { equals } = require("./util/ArrayHelpers");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const { compareIds } = require("./util/comparators");
const compileBooleanMatcher = require("./util/compileBooleanMatcher");
const { getUndoPath, toJsStringLiteral } = require("./util/identifier");
const memoize = require("./util/memoize");
const { propertyAccess, propertyName } = require("./util/property");
const {
	forEachRuntime,
	getRuntimeKey,
	intersectRuntime,
	subtractRuntime
} = require("./util/runtime");

const getCssModulesPlugin = memoize(() => require("./css/CssModulesPlugin"));
// `Compilation` requires this module, so its stage constants are read lazily.
const getCompilation = memoize(() => require("./Compilation"));
const getExternalModule = memoize(() => require("./ExternalModule"));

/**
 * @typedef {object} ChunkAssetNaming
 * @property {(chunk: Chunk, outputOptions: OutputOptions) => ChunkFilenameTemplate} template what names the asset
 * @property {SpecifierPartKind} standIn the stand-in kind that spells it once the hashes exist
 */

/**
 * What names the asset a chunk emits for one source type. Keyed rather than branched
 * on, so a type nothing here answers for keeps the runtime form instead of silently
 * taking another type's name and hash. A plugin emitting a new kind of chunk asset
 * registers it here to have its urls baked.
 * @type {Map<string, ChunkAssetNaming>}
 */
const CHUNK_ASSET_NAMING = new Map([
	[
		JAVASCRIPT_TYPE,
		{
			template: (chunk, outputOptions) =>
				JavascriptModulesPlugin.getChunkFilenameTemplate(chunk, outputOptions),
			standIn: "chunk"
		}
	],
	[
		CSS_TYPE,
		{
			template: (chunk, outputOptions) =>
				getCssModulesPlugin().getChunkFilenameTemplate(chunk, outputOptions),
			standIn: "cssChunk"
		}
	]
]);
const getTemplatedPathPlugin = memoize(() => require("./TemplatedPathPlugin"));
const getConcatenatedModule = memoize(() =>
	require("./optimize/ConcatenatedModule")
);

// Any `[hash]`/`[fullhash]`/`[chunkhash]`/`[contenthash]` token, incl. a `:<length>`
// or `:<digest>[:<length>]` suffix (e.g. `[contenthash:base64:8]`). Its value is only
// resolved after code generation, so a filename using one can't be an inline literal.
const HASH_IN_FILENAME = /\[(?:full|chunk|content)?hash(?::[^\]]+)?\]/;
// Two stand-ins for every hash a filename function might read: a name built from one
// is hash-dependent exactly when the two calls disagree.
const HASH_PROBE = "0123456789abcdef0123";
// Reversed, so the two differ at every position and no slice of one equals the other.
const HASH_PROBE_ALTERNATE = "3210fedcba9876543210";
const HASH_IN_FILENAME_GLOBAL = /\[(?:full|chunk|content)?hash(?::[^\]]+)?\]/g;

/**
 * @param {SpecifierPart} part one piece of a reserved name
 * @returns {boolean} true when it is text the deferred pass adds nothing to
 */
const isLiteralPart = (part) => part[0] === "literal";

/**
 * The text these parts spell, or `null` when one of them is a stand-in that only
 * the deferred pass can fill in.
 * @param {SpecifierPart[] | null} parts pieces of a name
 * @returns {string | null} the text, or `null` when they are not all literal
 */
const literalText = (parts) => {
	if (parts === null) return null;
	// Built in one pass rather than tested and then joined: every specifier asks, and
	// a stand-in in the first part answers without reading the rest.
	let text = "";
	for (const part of parts) {
		if (!isLiteralPart(part)) return null;
		text += part[1];
	}
	return text;
};

/**
 * Whether a public path reaches the same place from any base. A relative one does
 * not, and is equivalent only behind the `../` path back to the output root.
 * @param {string} publicPath the resolved public path, or the shape of one
 * @returns {boolean} true when no base is needed
 */
const isBaseIndependent = (publicPath) =>
	publicPath.startsWith("/") || getScheme(publicPath) !== undefined;

/**
 * Drops the `./` a public path may open with: what follows it is already walked back
 * to the output root, so it would only lengthen the name.
 * @param {SpecifierPart[]} parts a public path's pieces
 * @returns {SpecifierPart[]} them, without that `./`
 */
const rootedParts = (parts) =>
	parts.length > 0 &&
	isLiteralPart(parts[0]) &&
	/** @type {string} */ (parts[0][1]).startsWith("./")
		? [
				/** @type {SpecifierPart} */ ([
					"literal",
					/** @type {string} */ (parts[0][1]).slice(2)
				]),
				...parts.slice(1)
			]
		: parts;

// Types that ride the chunk itself or render their own asset, so no `.f` handler
// fetches them; every other type may install one, so the map has to exist for it.
/** @type {Set<string>} */
const TYPES_WITHOUT_CHUNK_HANDLER = new Set([
	JAVASCRIPT_TYPE,
	RUNTIME_TYPE,
	ASSET_TYPE,
	ASSET_URL_TYPE,
	HTML_TYPE
]);

// Why a name only the deferred pass could settle was not deferred.
const DEFER_BAILOUT =
	"a hashed name needs optimization.realContentHash, or no emitted javascript named by its content";

/**
 * Where a literal is read from — the `../` path back to the output root, and whether
 * the chunk loader fetched the chunk it sits in through `output.publicPath`.
 * @typedef {object} Placement
 * @property {string | null} undo the path back to the output root
 * @property {boolean | null} loaded whether the chunk loader fetched the chunk
 */

/**
 * @typedef {object} AnalyzableChunkUrls
 * @property {Map<ChunkId, string>} urls the urls that could be written, by chunk id
 * @property {boolean} complete false when some chunk kept the runtime form, whose
 * ids the consumer then still resolves through the runtime name lookup
 */

/**
 * @typedef {object} WasmGroups
 * @property {(key: string) => string} groupOf the group a runtime key answers with
 * @property {Set<string>} fetching groups an entry of which reads binaries with `fetch`
 * @property {Map<string, boolean>} onlyFetching groups every entry of which fetches
 */

// A reference in no chunk at all: nothing is known about where it is read from.
/** @type {Placement} */
const NO_PLACEMENT = { undo: null, loaded: null };

/**
 * Which of `createHash`'s four rounds settles this chunk's hash. A hash may only be
 * read from an earlier round, which is what lets one chunk's name be folded into
 * another's hash.
 * @param {Chunk} chunk the chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {number} the round, ascending
 */
const hashRound = (chunk, chunkGraph) => {
	if (chunk.hasRuntime()) return 2;
	if (chunkGraph.getNumberOfEntryModules(chunk) > 0) return 3;
	return chunk.canBeInitial() ? 1 : 0;
};

// The round runtime chunks are settled in, ordered by references between them rather
// than by id, so id says nothing about the order inside it.
const RUNTIME_HASH_ROUND = 2;

// Why a public path needing a base could not be spelled from the chunk holding it.
const SERVED_BAILOUT =
	"this module is in a chunk webpack loads through output.publicPath and in one it does not, so no one path back to the output root fits both";

/**
 * @import {
 * 	OutputNormalizedWithDefaults as OutputOptions
 * } from "./config/defaults"
 */
/** @import { PublicPath, WasmLoading } from "../declarations/WebpackOptions" */
/** @import ModuleDependency from "./dependencies/ModuleDependency" */
/**
 * @import Module, {
 * 	ReadOnlyRuntimeRequirements,
 * 	BuildMeta,
 * 	RuntimeRequirements
 * } from "./Module"
 */
/** @typedef {"import" | "url" | "url-runtime" | "url-inline" | "wasm" | "wasm-relative"} AnalyzableForm */
/**
 * One piece of a name only the deferred pass can spell: text as it stands, the `../`
 * path from the asset it sits in to the output root, a template or `output.publicPath`
 * resolved once the hashes exist, one of the assets the chunk with this id emits, or
 * the base everything else is resolved against once it is spelled.
 * @typedef {"literal" | "undo" | "template" | "publicPath" | "unserved" | "chunk" | "cssChunk" | "base"} SpecifierPartKind
 */
/** @typedef {[SpecifierPartKind, string | number]} SpecifierPart */

const SPECIFIER_PART_KINDS = new Set([
	"literal",
	"undo",
	"template",
	"publicPath",
	"unserved",
	"base",
	"chunk",
	"cssChunk"
]);

// Only these carry a chunk id, which is the one part value that may be a number.
const CHUNK_SPECIFIER_PART_KINDS = new Set(["chunk", "cssChunk"]);

// Only these are spelled out of the compilation hash, so a stand-in holding one moves
// the chunk it lands in into the round after that hash settles.
const FULL_HASH_PART_KINDS = new Set(["publicPath", "template", "unserved"]);

// What the deferred pass scans for — the other half of what the class spells.
const ANALYZABLE_TOKEN_REGEXP = /\.\/@@webpackAnalyzableChunk:([\w-]+)@@/g;

// Stands in for the compilation hash inside an otherwise resolved filename, with the
// requested length when the placeholder asked for one.
const FULL_HASH_TOKEN_REGEXP = /@@webpackFullHash(?:-(\d+))?@@/g;

const FULL_HASH_TOKEN_PREFIX = "@@webpackFullHash";

/**
 * @param {number=} length how many characters the placeholder asked for
 * @returns {string} the stand-in to emit
 */
const reserveFullHash = (length) =>
	`${FULL_HASH_TOKEN_PREFIX}${length === undefined ? "" : `-${length}`}@@`;

// `getPath` data that leaves every compilation-hash placeholder as a stand-in while the
// rest of the name resolves — a module's own hash and id are settled during code
// generation, the compilation's is not. Shared: it closes over nothing.
const DEFERRED_FULL_HASH_PATH_DATA = {
	hash: reserveFullHash(),
	hashWithLength: reserveFullHash
};

// The same table read by stand-in, for the pass that spells one: a chunk's content hash
// is keyed by source type, so the type it is keyed under here is the hash to read.
const CHUNK_ASSET_NAMING_BY_STAND_IN = new Map(
	[...CHUNK_ASSET_NAMING].map(([contentHashType, naming]) => [
		naming.standIn,
		{ template: naming.template, contentHashType }
	])
);

/**
 * first character, last character, replacement.
 * @typedef {[number, number, string]} Replacement
 */

const PASS_NAME = "analyzableChunkNaming";

/** @import AsyncDependenciesBlock from "./AsyncDependenciesBlock" */
/** @import { Source } from "webpack-sources" */
/** @import Compiler from "./Compiler" */
/** @import Chunk, { ChunkFilenameTemplate, ChunkId } from "./Chunk" */
/** @import ChunkGroup from "./ChunkGroup" */
/** @import ChunkGraph from "./ChunkGraph" */
/** @import Compilation from "./Compilation" */
/** @import Dependency from "./Dependency" */
/** @import ModuleGraph from "./ModuleGraph" */
/** @import RequestShortener from "./RequestShortener" */
/** @import Hash from "./util/Hash" */
/** @import CodeGenerationResults from "./CodeGenerationResults" */
/** @import { RuntimeSpec } from "./util/runtime" */

/**
 * A stand-in whose every hash reads back as `hash`. Which content hashes a chunk
 * carries is settled after code generation, so `present` makes the two probes disagree
 * about that too — a name built by enumerating them then reads as hash-dependent.
 * Shadows the chunk rather than mutating it, so a filename function still reads every
 * other field and method straight off it.
 * @param {Chunk} chunk the chunk being referenced
 * @param {string} hash the stand-in hash
 * @param {boolean} present whether the chunk is claimed to carry content hashes
 * @returns {Chunk} the stand-in chunk
 */
const createHashProbeChunk = (chunk, hash, present) => {
	const probeChunk = Object.create(chunk);
	probeChunk.hash = hash;
	probeChunk.renderedHash = hash;
	probeChunk.contentHash = new Proxy(
		present ? { [JAVASCRIPT_TYPE]: hash } : {},
		{
			// Any content-hash type, not only the ones this chunk happens to carry.
			get: (target, key) => (typeof key === "string" ? hash : undefined),
			has: () => present,
			getOwnPropertyDescriptor: () =>
				present
					? {
							value: hash,
							writable: true,
							enumerable: true,
							configurable: true
						}
					: undefined
		}
	);
	return probeChunk;
};

/**
 * A filename function's answer to the stand-in hash, which says what shape the name
 * has before any real hash exists.
 * @param {Exclude<ChunkFilenameTemplate, string>} template the filename function
 * @param {Chunk} chunk the chunk being referenced
 * @param {string} contentHashType which of the chunk's hashes the name reads
 * @param {string} hash the stand-in hash
 * @param {boolean} present whether the chunk is claimed to carry content hashes
 * @returns {string} what the function names it
 */
const probeTemplateName = (template, chunk, contentHashType, hash, present) =>
	template({
		chunk: createHashProbeChunk(chunk, hash, present),
		runtime: chunk.runtime,
		contentHashType,
		hash,
		contentHash: hash
	});

/**
 * No module id error message.
 * @param {Module} module the module
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {string} error message
 */
const noModuleIdErrorMessage = (
	module,
	chunkGraph
) => `Module ${module.identifier()} has no id assigned.
This should not happen.
It's in these chunks: ${
	Array.from(
		chunkGraph.getModuleChunksIterable(module),
		(c) => c.name || c.id || c.debugId
	).join(", ") || "none"
} (If module is in no chunk this indicates a bug in some chunk/module optimization logic)
Module has these incoming connections: ${Array.from(
	chunkGraph.moduleGraph.getIncomingConnections(module),
	(connection) =>
		`\n - ${connection.originModule && connection.originModule.identifier()} ${
			connection.dependency && connection.dependency.type
		} ${
			(connection.explanations && [...connection.explanations].join(", ")) || ""
		}`
).join("")}`;

// `this` as a value, not as a property name or part of a longer identifier
// (identifier characters per `getGlobalObject` below, so `globalThis` is not one)
const THIS_REFERENCE_REGEXP = /(?:^|[^\p{L}\p{N}_$.])this(?![\p{L}\p{N}_$])/u;

/**
 * Gets global object.
 * @param {string | undefined} definition global object definition
 * @returns {string | undefined} save to use global object
 */
function getGlobalObject(definition) {
	if (!definition) return definition;
	const trimmed = definition.trim();

	if (
		// identifier, we do not need real identifier regarding ECMAScript/Unicode
		/^[_\p{L}][_0-9\p{L}]*$/iu.test(trimmed) ||
		// iife
		// call expression
		// expression in parentheses
		/^(?:[_\p{L}][_0-9\p{L}]*)?\(.*\)$/iu.test(trimmed)
	) {
		return trimmed;
	}

	return `Object(${trimmed})`;
}

// An async external is a promise, not a module record with an evaluating state.
const isAsyncExternal = (/** @type {Module} */ module) =>
	Boolean(/** @type {BuildMeta} */ (module.buildMeta).async) &&
	module instanceof getExternalModule();

class RuntimeTemplate {
	/**
	 * Creates an instance of RuntimeTemplate.
	 * @param {Compilation} compilation the compilation
	 * @param {OutputOptions} outputOptions the compilation output options
	 * @param {RequestShortener} requestShortener the request shortener
	 */
	constructor(compilation, outputOptions, requestShortener) {
		/** @type {Compilation} */
		this.compilation = compilation;
		this.outputOptions = /** @type {OutputOptions} */ (outputOptions || {});
		/** @type {RequestShortener} */
		this.requestShortener = requestShortener;
		/** @type {string} */
		this.globalObject =
			/** @type {string} */
			(getGlobalObject(outputOptions.globalObject));
		/** @type {string} */
		this.contentHashReplacement = "X".repeat(outputOptions.hashDigestLength);
		/** @type {boolean | undefined} */
		this._javascriptNamedWithoutContent = undefined;
		/** @type {WeakMap<Chunk, boolean>} */
		this._chunkNamedWithoutContent = new WeakMap();
		/** @type {WeakMap<Chunk, string>} */
		this._foldedAnalyzableNames = new WeakMap();
		/** @type {WeakMap<Chunk, Map<string, string>>} */
		this._analyzableAssetNames = new WeakMap();
		/** @type {Map<Chunk, Set<string>> | undefined} */
		this._namesBakedInto = undefined;
		/** @type {Map<string, Chunk> | undefined} */
		this._chunksByIdForFold = undefined;
		/** @type {Set<Chunk> | undefined} */
		this._chunksBakingFullHash = undefined;
		/** @type {string | false | undefined} */
		this._publicPathShapeText = undefined;
		/** @type {string | null | undefined} */
		this._publicPathClimbText = undefined;
		/** @type {WeakMap<Chunk, Placement>} */
		this._placementByChunk = new WeakMap();
		/** @type {Map<string, string | null | undefined>} */
		this._entryBaseUriByRuntime = new Map();
		/** @type {WasmGroups | undefined} */
		this._wasmGroupsValue = undefined;
		/** @type {Map<string, boolean> | undefined} */
		this._wasmAnchorKnownByGroup = undefined;
	}

	isIIFE() {
		return this.outputOptions.iife;
	}

	/**
	 * Whether the global object expression reads the `this` binding, which only
	 * refers to the global object outside of strict mode.
	 * @returns {boolean} true, when it reads `this`
	 */
	globalObjectUsesThis() {
		return THIS_REFERENCE_REGEXP.test(this.globalObject);
	}

	isModule() {
		return this.outputOptions.module;
	}

	isNeutralPlatform() {
		return (
			!this.compilation.compiler.platform.web &&
			!this.compilation.compiler.platform.node
		);
	}

	/**
	 * Whether the bundle targets node and web at once (universal `["node", "web"]` + `output.module`), like `isUniversalTarget` in `WebpackOptionsApply`.
	 * @returns {boolean} true for a universal target
	 */
	isUniversalTarget() {
		const { platform } = this.compilation.compiler;
		return (
			Boolean(this.outputOptions.module) &&
			platform.node === null &&
			platform.web === null
		);
	}

	/**
	 * Runtime expression that is truthy in browser-like environments (a DOM
	 * `document` or a worker `self`) and falsy in Node.js. Single source of
	 * truth for branching a universal ("node-or-web") target at runtime.
	 * @returns {string} runtime condition expression
	 */
	isWebLikePlatformExpression() {
		return "typeof document !== 'undefined' || typeof self !== 'undefined'";
	}

	/**
	 * Expression for the global registry that collects CSS server-side when there
	 * is no DOM (SSR). Read it with `__webpack_css_server_styles__`; it is keyed
	 * by the style/chunk identifier and namespaced by `output.uniqueName`.
	 * Targets without `globalThis` go through the `__webpack_require__.g`
	 * polyfill, so consumers must also require `RuntimeGlobals.global`.
	 * @returns {string} runtime expression evaluating to the registry object
	 */
	cssServerStyleRegistry() {
		const name = this.outputOptions.uniqueName;
		const key = JSON.stringify(
			name ? `__webpack_css__${name}` : "__webpack_css__"
		);
		const global = this.outputOptions.environment.globalThis
			? "globalThis"
			: RuntimeGlobals.global;
		return `(${this.assignOr(`${global}[${key}]`, "{}")})`;
	}

	supportsConst() {
		return this.outputOptions.environment.const;
	}

	supportsLet() {
		return this.outputOptions.environment.let;
	}

	supportsMethodShorthand() {
		return this.outputOptions.environment.methodShorthand;
	}

	supportsLogicalAssignment() {
		return this.outputOptions.environment.logicalAssignment;
	}

	supportsArrowFunction() {
		return this.outputOptions.environment.arrowFunction;
	}

	supportsAsyncFunction() {
		return this.outputOptions.environment.asyncFunction;
	}

	supportsGenerator() {
		return this.outputOptions.environment.generator;
	}

	supportsOptionalChaining() {
		return this.outputOptions.environment.optionalChaining;
	}

	supportsSpread() {
		return this.outputOptions.environment.spread;
	}

	supportsObjectHasOwn() {
		return this.outputOptions.environment.hasOwn;
	}

	supportsSymbol() {
		return this.outputOptions.environment.symbol;
	}

	supportsForOf() {
		return this.outputOptions.environment.forOf;
	}

	supportsDestructuring() {
		return this.outputOptions.environment.destructuring;
	}

	supportsBigIntLiteral() {
		return this.outputOptions.environment.bigIntLiteral;
	}

	supportsDynamicImport() {
		return this.outputOptions.environment.dynamicImport;
	}

	supportsEcmaScriptModuleSyntax() {
		return this.outputOptions.environment.module;
	}

	supportsDeferImport() {
		return this.outputOptions.environment.deferImport;
	}

	supportsSourceImport() {
		return this.outputOptions.environment.sourceImport;
	}

	supportsModulePreload() {
		return this.outputOptions.environment.modulePreload;
	}

	/**
	 * Whether a reference a foreign bundler can follow without running webpack's runtime
	 * may be emitted — the one question every caller asks, in the form it is asking for:
	 *
	 * - `"import"` — a literal `import("./chunk.js")` in place of `ensureChunk(id)`
	 * - `"url"` — a literal `new URL(<file>, import.meta.url)`
	 * - `"url-runtime"` — the same, written into a runtime module rather than a module
	 * - `"url-inline"` — whether such a reference names the file at the call site
	 * - `"wasm"` — the same, fully baked for a wasm binary the runtime would name
	 * - `"wasm-relative"` — a wasm path built at runtime under an `import.meta.url` base
	 *
	 * `"url-inline"` differs from `"url"` only in taking the `.p + <file>` fallback as
	 * an answer too — both name the file where it is used rather than through the
	 * asset's javascript wrapper, which is what decides whether that wrapper is emitted.
	 *
	 * A name code generation cannot settle may still be baked, through a stand-in the
	 * deferred pass fills in. Not covered here, because only the reference can tell: a
	 * chunk with no id, and one this compilation emits no javascript for.
	 * @param {AnalyzableForm} form which reference is being emitted
	 * @param {ChunkGraph=} chunkGraph the chunk graph, to place `module` in its runtimes
	 * @param {Module=} module the module the reference is emitted into
	 * @param {RuntimeSpec=} runtime the runtime the reference is emitted for; the wasm forms answer for the loader it shares rather than for every loader in the compilation
	 * @returns {boolean} true when the literal form may be emitted
	 */
	supportsAnalyzable(form, chunkGraph, module, runtime) {
		// Analyzable output is ESM output — anything else is a different feature.
		if (!this.isModule()) return false;
		// Build-time execution keeps the runtime form — `import.meta` does not parse in its
		// vm wrapper. Unreported on purpose: its chunk graph shares the real module graph.
		if (chunkGraph && chunkGraph.buildTimeExecution) return false;
		const { outputOptions } = this;
		// One loader per runtime serves every wasm module in it, so the answer has to
		// hold compilation-wide — else a baked url reaches the id-and-hash signature.
		const scoped = form !== "wasm" && form !== "wasm-relative";
		// Resolved once: concatenation may have absorbed the module that wrote the
		// reference, and both the scope below and the worker loop ask about the same one.
		const placedModule =
			scoped && module !== undefined
				? getConcatenatedModule().getChunkGraphModule(this.compilation, module)
				: undefined;
		// A reassigned `__webpack_public_path__` cannot reach a baked literal, and `.p`
		// belongs to a runtime, so only the runtimes it reaches keep the runtime form.
		// `url-inline` is unaffected: that form falls back to `.p + <file>`, which reads
		// the reassigned value at the call site rather than through the wrapper.
		if (
			form !== "url-inline" &&
			APIPlugin.runtimeUsesPublicPathOverride(
				this.compilation,
				scoped ? chunkGraph : undefined,
				placedModule
			)
		) {
			return this._analyzableBailout(
				module,
				"__webpack_public_path__ is reassigned in a runtime this module belongs to",
				false
			);
		}

		if (form === "import") {
			// Read through a native `import()`, or it is not this feature at all.
			if (outputOptions.chunkFormat !== "module") {
				return this._analyzableBailout(
					module,
					`output.chunkFormat is ${JSON.stringify(outputOptions.chunkFormat)}, so chunks are not read through a native import()`,
					false
				);
			}
			if (outputOptions.importFunctionName !== "import") {
				return this._analyzableBailout(
					module,
					`output.importFunctionName is ${JSON.stringify(outputOptions.importFunctionName)}, so the call site is not a native import()`,
					false
				);
			}
			// A worker loading its own chunks some other way keeps that runtime; one on
			// `import` uses the same ESM loader as the main graph, so it can be analyzable.
			for (const originChunk of /** @type {ChunkGraph} */ (
				chunkGraph
			).getModuleChunksIterable(/** @type {Module} */ (placedModule))) {
				const entryOptions = originChunk.getEntryOptions();
				if (!entryOptions || !entryOptions.worker) continue;
				// `WorkerAndWorkletPlugin` always seeds this from `output.workerChunkLoading`.
				if (entryOptions.chunkLoading !== "import") {
					return this._analyzableBailout(
						module,
						`this worker loads its chunks with ${JSON.stringify(entryOptions.chunkLoading)}, not "import"`,
						false
					);
				}
			}
			return true;
		}

		// `url-inline` asks whether the file can be named at the call site at all, and
		// its `.p + <file>` fallback spells that without `import.meta` — so the gate
		// below does not rule it out, and the asset's javascript wrapper stays dropped.
		// `environment.module` is deliberately not consulted: ESM output writes
		// `import.meta` regardless (the public path, the chunk loader), so the url forms
		// only match what the rest of the bundle already assumes the target reads.
		if (form === "url-inline") return true;
		// `eval` devtool wraps each module in `eval(...)`, where `import.meta` is a
		// syntax error. Runtime modules are emitted beside them, never wrapped.
		const { devtool } = this.compilation.options;
		if (
			form !== "url-runtime" &&
			typeof devtool === "string" &&
			devtool.includes("eval")
		) {
			return this._analyzableBailout(
				module,
				`devtool ${JSON.stringify(devtool)} wraps the module in eval(), where import.meta does not parse`,
				false
			);
		}
		if (form === "url" || form === "url-runtime") return true;
		// A bare relative URL is what `__webpack_require__.p + path` means only under an
		// `auto` public path; anything else has to be baked, which is the "wasm" form.
		if (form === "wasm-relative") {
			if (outputOptions.publicPath === "auto") return true;
			return this._analyzableBailout(
				module,
				"output.publicPath is set, so a bare relative url no longer means what the public path would have resolved to",
				false
			);
		}

		// The rest is the `"wasm"` form: whether the whole binary url can be spelled
		// here, rather than built at runtime under an `import.meta.url` base.
		const { publicPath, webassemblyModuleFilename } = outputOptions;
		if (publicPath !== "auto") {
			// A public path that needs no base names the same place from the chunk as from
			// the document, so a literal spells what `fetch` would have reached.
			if (this._publicPathNeedsNoBase()) {
				// Settled no earlier than the hash it reads or is called with, so it is
				// baked only where the deferred pass may finish it.
				if (this._resolvePublicPathPrefix(publicPath, module) === null) {
					return false;
				}
			} else if (
				this._anyWasmChunkFetches(runtime) &&
				!this._wasmFetchAnchorIsKnown(runtime)
			) {
				return this._analyzableBailout(
					module,
					"output.publicPath needs a base, and no one path back to the document fits every chunk `fetch` reads it from",
					false
				);
			}
		}
		// The compilation hash is settled after code generation, so a name carrying one
		// is baked only where the deferred pass can fill it in. `[hash]` is the module's
		// own here, which code generation already knows.
		if (
			getTemplatedPathPlugin()
				.getPresentKinds(/** @type {string} */ (webassemblyModuleFilename))
				.has("fullhash") &&
			!this._canDeferOrBakeFullHash(true, undefined, module)
		) {
			return false;
		}
		return true;
	}

	/**
	 * Records why a reference kept the runtime form, on the module that wrote it —
	 * the channel `ModuleConcatenationPlugin` already reports through, so it reaches
	 * `stats.optimizationBailout`. Silent unless the build asked for ESM output, where
	 * alone the answer is actionable; deduplicated because a module may write many.
	 * Answers with `answer` so a caller states the refusal and its reason at once —
	 * `false` where it answers a question, `null` where it was building a specifier.
	 * @template {false | null} T
	 * @param {Module | undefined} module the module the reference is emitted into
	 * @param {string} reason why no literal could be baked
	 * @param {T} answer what the caller hands back
	 * @returns {T} that answer
	 */
	_analyzableBailout(module, reason, answer) {
		if (module !== undefined && this.outputOptions.module) {
			const text = `Analyzable ESM bailout: ${reason}`;
			const bailouts =
				this.compilation.moduleGraph.getOptimizationBailout(module);
			if (!bailouts.includes(text)) bailouts.push(text);
		}
		return answer;
	}

	/**
	 * Whether a name that code generation cannot settle may be reserved as a stand-in
	 * and filled in once the hashes exist. Substituting rewrites a chunk after its own
	 * content hash was taken, so either `RealContentHashPlugin` has to bring the two
	 * back in line, or no emitted javascript may be named by its content in the first
	 * place — with a name like `[name].js` there is nothing to go stale. Asked of the
	 * names the chunks actually carry rather than of `output`, so a template nothing is
	 * emitted under does not rule the rewrite out and a `chunk.filenameTemplate` does
	 * not slip past it.
	 * @param {Iterable<Chunk>=} chunks the chunks the stand-in is written into; omit
	 * where the answer has to hold for the whole compilation, as it does for a gate a
	 * runtime module asks from the other end
	 * @returns {boolean} true when deferring is safe
	 */
	_canDeferAnalyzableName(chunks) {
		if (chunks === undefined) {
			// Memoized: the chunk graph is settled before any caller asks compilation-wide.
			if (this._javascriptNamedWithoutContent === undefined) {
				this._javascriptNamedWithoutContent = this._canDeferAnalyzableName(
					this.compilation.chunks
				);
			}
			return this._javascriptNamedWithoutContent;
		}
		let found = false;
		for (const chunk of chunks) {
			found = true;
			if (!this._chunkNameIndependentOfContent(chunk)) return false;
		}
		// None at all names nothing to reason about — the asset is unknown, not safe.
		return found;
	}

	/**
	 * `_canDeferAnalyzableName`, recording why not when the answer is no — what every
	 * caller with a module to report against does with it.
	 * @param {Iterable<Chunk>=} chunks the chunks the stand-in is written into
	 * @param {Module=} module the module the reference is emitted into
	 * @returns {boolean} true when deferring is safe
	 */
	_canDeferOrBail(chunks, module) {
		if (this._canDeferAnalyzableName(chunks)) return true;
		return this._analyzableBailout(module, DEFER_BAILOUT, false);
	}

	/**
	 * These parts as a quoted specifier: the text itself where they spell one already,
	 * and a stand-in for the deferred pass where they do not.
	 * @param {SpecifierPart[]} parts the whole specifier
	 * @param {Iterable<Chunk>} chunks the chunks it is written into
	 * @param {Module=} module the module the reference is emitted into
	 * @returns {string | null} it already quoted, or `null` when no stand-in may be
	 * reserved
	 */
	_specifierOf(parts, chunks, module) {
		const text = literalText(parts);
		if (text !== null) return toJsStringLiteral(text);
		if (
			!this._canDeferOrBakeFullHash(
				this._partsBakeFullHash(parts),
				chunks,
				module
			)
		) {
			return null;
		}
		return toJsStringLiteral(this._reserveAnalyzableSpecifier(parts));
	}

	/**
	 * `_canDeferOrBail` for a name the fill builds out of the compilation hash. Such a
	 * stand-in settles the name it lands in for us: `_markChunksBakingFullHash` reads it
	 * back and moves that chunk into the round after that hash, which is the same place a
	 * chunk reaching for `__webpack_require__.p` ends up without asking.
	 * @param {boolean} carriesFullHash whether the fill builds this one out of that hash
	 * @param {Iterable<Chunk>=} chunks the chunks the stand-in is written into
	 * @param {Module=} module the module the reference is emitted into
	 * @returns {boolean} true when deferring is safe
	 */
	_canDeferOrBakeFullHash(carriesFullHash, chunks, module) {
		return carriesFullHash || this._canDeferOrBail(chunks, module);
	}

	/**
	 * Whether the fill will build these parts out of the compilation hash — the same
	 * question `_markChunksBakingFullHash` asks of what was generated, so a stand-in this
	 * says yes to is one that moves its chunk into the round after that hash.
	 * @param {SpecifierPart[]} parts what the stand-in resolves to
	 * @returns {boolean} true when that hash reaches the text
	 */
	_partsBakeFullHash(parts) {
		for (const [kind, value] of parts) {
			if (FULL_HASH_PART_KINDS.has(kind)) return true;
			if (kind === "literal" && this._hasReservedFullHash(String(value))) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether the name this chunk is emitted under is settled before its own content
	 * is, which is what leaves it right after a later rewrite. A filename function is
	 * asked rather than assumed to read a hash — the same two probes the chunk
	 * specifier is resolved with. Memoized per chunk: answering calls that function
	 * twice, and a reference asks once for every chunk it is written into.
	 * @param {Chunk} chunk a chunk the stand-in is written into
	 * @returns {boolean} true when the name does not move with the content
	 */
	_chunkNameIndependentOfContent(chunk) {
		const cached = this._chunkNamedWithoutContent.get(chunk);
		if (cached !== undefined) return cached;
		const template = this._resolveChunkFilenameTemplate(
			JavascriptModulesPlugin.getChunkFilenameTemplate(
				chunk,
				this.outputOptions
			),
			chunk,
			JAVASCRIPT_TYPE
		);
		let independent = false;
		if (typeof template === "string") {
			const kinds = getTemplatedPathPlugin().getPresentKinds(template);
			// `[chunkhash]` is taken from this chunk's own modules and nothing repairs it
			// afterwards, so such a name stays put while the reference it holds moves.
			independent =
				!kinds.has("chunkhash") &&
				(!kinds.has("contenthash") ||
					Boolean(this.compilation.options.optimization.realContentHash));
		}
		this._chunkNamedWithoutContent.set(chunk, independent);
		return independent;
	}

	/**
	 * Builds the analyzable `new URL(specifier, import.meta.url)` expression the ESM
	 * wasm/asset loader backends use to reference an emitted binary relative to the
	 * current module (via `output.importMetaName`) instead of the runtime public-path
	 * global — the form other bundlers and webpack itself can statically follow.
	 * @param {string} specifier already-rendered URL argument (a literal or expression)
	 * @returns {string} the `new URL(...)` expression
	 */
	importMetaUrl(specifier) {
		return `new URL(${specifier}, ${this.outputOptions.importMetaName}.url)`;
	}

	/**
	 * Whether a baked asset url resolves against the entry `baseUri` at all. A public
	 * path that reaches the same place from any base never reads `.b` — and `auto`
	 * resolves to an absolute url too — while output with no baked form has nothing to
	 * resolve. Where this is false, what `baseUri` is set to cannot reach the generated
	 * code, so it must not reach the module hash either: `URLDependency.updateHash`
	 * asks this before contributing one.
	 * @returns {boolean} true when the base can change what is generated
	 */
	analyzableUrlReadsBaseUri() {
		if (!this.isModule()) return false;
		const { publicPath } = this.outputOptions;
		if (publicPath === "auto") return false;
		return !this._publicPathNeedsNoBase();
	}

	/**
	 * Whether `output.publicPath` reaches the same place from any base, so a literal may
	 * carry it without walking back to the output root first. One whose shape nothing
	 * answers needs a base as far as anything here can tell. Never asked of `auto`,
	 * which is no path of its own.
	 * @returns {boolean} true when no base is needed
	 */
	_publicPathNeedsNoBase() {
		const shape = this._publicPathShape();
		return shape !== undefined && isBaseIndependent(shape);
	}

	/**
	 * Static literal specifier (already quoted) for the `new URL(<here>, import.meta.url)`
	 * an asset reference bakes to, or `null` to keep the runtime form. Unlike a wasm
	 * binary, the runtime resolves an asset url against `__webpack_require__.b` — the
	 * output root, or an entry `baseUri` where one is set — so that base is settled here
	 * before the rest of the name is.
	 * @param {Module} module the module the reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {string} filename the asset's name, relative to the output root
	 * @param {RuntimeSpec} runtime the runtime the code is generated for
	 * @returns {string | null} a quoted literal, or `null` to fall back
	 */
	getAnalyzableAssetUrl(module, chunkGraph, filename, runtime) {
		const { publicPath } = this.outputOptions;
		const base = this.analyzableUrlReadsBaseUri()
			? this.entryBaseUri(runtime)
			: undefined;
		// No base of its own: the name is spelled against the output root, as a chunk is.
		if (base === undefined) {
			return this._getAnalyzableFileSpecifier(
				module,
				chunkGraph,
				[["literal", filename]],
				true
			);
		}
		if (base === null) {
			return this._analyzableBailout(
				module,
				"the entries this module is generated for set different baseUri values, so no one url resolves for all of them",
				null
			);
		}
		// A relative one is no base of its own: the runtime reads it against the
		// chunk, so the literal spells it there rather than resolving against it.
		if (isChunkRelativeBaseUri(base)) {
			return this._getAnalyzableFileSpecifier(
				module,
				chunkGraph,
				[["literal", filename]],
				true,
				base
			);
		}
		const chunks = this._moduleChunks(module, chunkGraph);
		const parts = this._resolvePublicPathPrefix(publicPath, module, chunks);
		if (parts === null) return null;
		// A protocol-relative base names a host but no scheme, and the runtime reads it
		// against the chunk's own url to get one — the very url this literal is
		// resolved against — so it may stay protocol-relative instead of being settled
		// here. Nothing walks back to the output root first: the base replaces it.
		if (base.startsWith("//")) {
			return this._specifierOf(
				[["literal", base], ...rootedParts(parts), ["literal", filename]],
				chunks,
				module
			);
		}
		if (!isAbsoluteBaseUri(base)) {
			return this._analyzableBailout(
				module,
				`an entry sets a baseUri of ${JSON.stringify(base)}, whose scheme names no base anything can be resolved against`,
				null
			);
		}
		// Resolved here rather than against the output root, and only an absolute base
		// settles it — a relative one has no base of its own to be read against.
		const spelled = literalText(parts);
		// A hash the deferred pass still has to fill in cannot be resolved against the
		// base here: the fill would land inside an already-resolved url, where a hash
		// opening with a letter reads as a scheme and drops the base entirely.
		const text =
			spelled !== null && !this._hasReservedFullHash(spelled) ? spelled : null;
		/** @type {URL} */
		let resolved;
		try {
			// Empty where only the deferred pass can spell the rest, which still settles
			// whether the base itself is one anything may be resolved against.
			resolved = new URL(text === null ? "" : text + filename, base);
		} catch (_error) {
			return this._analyzableBailout(
				module,
				`an entry sets a baseUri of ${JSON.stringify(base)}, which is not absolute, so no url can be resolved against it here`,
				null
			);
		}
		if (text !== null) return toJsStringLiteral(resolved.href);
		if (!this._canDeferOrBail(chunks, module)) return null;
		return toJsStringLiteral(
			this._reserveAnalyzableSpecifier([
				["base", base],
				...parts,
				["literal", filename]
			])
		);
	}

	/**
	 * The `baseUri` the entries this code runs under agree on, which replaces the output
	 * root an asset url resolves against. Asked per runtime, because that is what the
	 * module is generated for: two entries with different bases each get their own
	 * source. `undefined` when none of them sets one, `null` when they disagree — an
	 * entry that omits it disagrees with one that sets it.
	 * @param {RuntimeSpec} runtime the runtime the code is generated for
	 * @returns {string | null | undefined} the base those entries agree on
	 */
	entryBaseUri(runtime) {
		const key = getRuntimeKey(runtime);
		if (this._entryBaseUriByRuntime.has(key)) {
			return this._entryBaseUriByRuntime.get(key);
		}
		/** @type {string | null | undefined} */
		let base;
		let found = false;
		for (const chunk of this.compilation.chunks) {
			// What a literal has to agree with is the one value `BaseUriRuntimeModule`
			// writes out, and it reads the entry options off the chunk it is emitted into
			// — so only a chunk carrying a runtime has a say. Entries sharing one runtime
			// chunk already share the base it sets, however their descriptors differ.
			if (!chunk.hasRuntime()) continue;
			const entryOptions = chunk.getEntryOptions();
			// An entry this code cannot run under has no say in the base it resolves to.
			if (
				!entryOptions ||
				intersectRuntime(chunk.runtime, runtime) === undefined
			) {
				continue;
			}
			if (found && base !== entryOptions.baseUri) {
				base = null;
				break;
			}
			base = entryOptions.baseUri;
			found = true;
		}
		this._entryBaseUriByRuntime.set(key, base);
		return base;
	}

	/**
	 * `output.publicPath` as the constant it will be, for code that would otherwise read
	 * `__webpack_require__.p` for a value that never changes. `undefined` when only the
	 * hash could say, or when a runtime reassigns `__webpack_public_path__` — then the
	 * global is the only thing that knows.
	 * @returns {string | undefined} the settled public path
	 */
	constantPublicPath() {
		const { publicPath } = this.outputOptions;
		if (
			publicPath === "auto" ||
			APIPlugin.usesRuntimePublicPathOverride(this.compilation)
		) {
			return undefined;
		}
		if (typeof publicPath === "function") {
			const resolved = this._resolveHashIndependent(
				publicPath,
				this._publicPathShape()
			);
			return resolved === null ? undefined : resolved;
		}
		return publicPath.includes("[") ? undefined : publicPath;
	}

	/**
	 * Runtime keys grouped by the binaries they share, with what the entries of each
	 * group asked for. Code generation runs once for runtimes a module hashes alike in,
	 * and nothing in a binary's hash knows which loader will read it — so a binary two
	 * runtimes reach carries one shape into both, and a third runtime sharing another
	 * binary with either is pulled in after them. Only an entry names a loader; every
	 * other chunk of the runtime is served by the one its entry asked for. Asked of the
	 * same modules the loaders are created for, and only once per compilation.
	 * @returns {WasmGroups} the grouping, and which groups fetch
	 */
	_wasmGroups() {
		if (this._wasmGroupsValue === undefined) {
			const { chunkGraph, chunks, modules } = this.compilation;
			/** @type {Map<string, string>} */
			const parent = new Map();
			/**
			 * @param {string} key runtime key
			 * @returns {string} the key naming its group
			 */
			const find = (key) => {
				let root = key;
				let seen = parent.get(root);
				while (seen !== undefined && seen !== root) {
					root = seen;
					seen = parent.get(root);
				}
				// Path compression keeps a long share chain from costing more than once.
				let walk = key;
				let next = parent.get(walk);
				while (next !== undefined && next !== root) {
					parent.set(walk, root);
					walk = next;
					next = parent.get(walk);
				}
				return root;
			};
			/** @type {string[]} */
			const keys = [];
			for (const module of modules) {
				if (module.type !== WEBASSEMBLY_MODULE_TYPE_ASYNC) continue;
				keys.length = 0;
				for (const runtime of chunkGraph.getModuleRuntimes(module)) {
					forEachRuntime(runtime, (key) => {
						keys.push(/** @type {string} */ (key));
					});
				}
				for (const key of keys) if (!parent.has(key)) parent.set(key, key);
				// Every runtime this binary reaches answers with the first one.
				for (let i = 1; i < keys.length; i++) {
					parent.set(find(keys[i]), find(keys[0]));
				}
			}
			// Flattened once, so a lookup is a single `get` rather than a chain walk.
			for (const key of parent.keys()) parent.set(key, find(key));
			/**
			 * @param {string} key a runtime key
			 * @returns {string} the group it answers with, or itself when it shares nothing
			 */
			const groupOf = (key) => {
				const group = parent.get(key);
				// An entry named "" makes "" a runtime key, so test absence, not a falsy value.
				return group === undefined ? key : group;
			};
			/** @type {Set<string>} */
			const fetching = new Set();
			/** @type {Map<string, boolean>} */
			const onlyFetching = new Map();
			for (const chunk of chunks) {
				if (!chunk.getEntryOptions()) continue;
				const fetches = this._chunkWasmLoading(chunk) === "fetch";
				forEachRuntime(chunk.runtime, (key) => {
					const group = groupOf(/** @type {string} */ (key));
					if (fetches) fetching.add(group);
					onlyFetching.set(group, onlyFetching.get(group) !== false && fetches);
				});
			}
			this._wasmGroupsValue = { groupOf, fetching, onlyFetching };
		}
		return this._wasmGroupsValue;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime being asked about
	 * @returns {string[]} the wasm runtime groups it reaches
	 */
	_wasmGroupsOf(runtime) {
		const { groupOf } = this._wasmGroups();
		/** @type {string[]} */
		const reached = [];
		forEachRuntime(runtime, (key) => {
			reached.push(groupOf(/** @type {string} */ (key)));
		});
		return reached;
	}

	/**
	 * Whether a chunk loads WebAssembly through `fetch`, which is the only loader the
	 * public path reaches: `readFile` resolves the binary's name against the chunk it is
	 * read from, exactly as a baked literal does, so a public path is irrelevant to it.
	 * Answered per group rather than per chunk on purpose — a module's generated source
	 * and the runtime module of every chunk holding it have to agree on the shape, and
	 * they ask from opposite ends; one loader serves a whole group, so that is the finest
	 * scope on which they can. Without a runtime the answer covers the compilation.
	 * @param {RuntimeSpec=} runtime the runtime being asked about
	 * @returns {boolean} true when a chunk of that runtime fetches its binaries
	 */
	_anyWasmChunkFetches(runtime) {
		const { fetching } = this._wasmGroups();
		if (fetching.size === 0) return false;
		// Without a runtime to place it in there is nothing to narrow by, so any chunk
		// answers for all of them.
		if (runtime === undefined) return true;
		return this._wasmGroupsOf(runtime).some((group) => fetching.has(group));
	}

	/**
	 * Whether a public path needing a base can be spelled from the chunk every binary of
	 * a runtime sits in — `fetch` reads it against the document, so a literal climbs back
	 * there first. Per group, as `_anyWasmChunkFetches` is, since the two ends must agree.
	 * @param {RuntimeSpec=} runtime the runtime being asked about
	 * @returns {boolean} true when every binary of that group can be spelled
	 */
	_wasmFetchAnchorIsKnown(runtime) {
		if (this._wasmAnchorKnownByGroup === undefined) {
			const { chunkGraph, modules } = this.compilation;
			const { groupOf, onlyFetching } = this._wasmGroups();
			/** @type {Map<string, boolean>} */
			const known = new Map();
			for (const module of modules) {
				if (module.type !== WEBASSEMBLY_MODULE_TYPE_ASYNC) continue;
				// Probed through the very builder the generator runs, so the gate is
				// exact: a prefix it can spell — the per-asset deferrals included — is
				// one the group may bake. The probe name stands in for the binary's.
				const spellable =
					this._getAnalyzableFileSpecifier(
						module,
						/** @type {ChunkGraph} */ (chunkGraph),
						[["literal", "x"]],
						true
					) !== null;
				for (const moduleRuntime of chunkGraph.getModuleRuntimes(module)) {
					forEachRuntime(moduleRuntime, (key) => {
						const group = groupOf(/** @type {string} */ (key));
						known.set(group, known.get(group) !== false && spellable);
					});
				}
			}
			// A group one entry reads with `readFile` cannot take a prefix meant for the
			// document, and only an entry names its loader.
			for (const [group, only] of onlyFetching) {
				if (!only) known.set(group, false);
			}
			this._wasmAnchorKnownByGroup = known;
		}
		const known = this._wasmAnchorKnownByGroup;
		// No runtime to place it in leaves every group answering, so one that cannot be
		// spelled speaks for all of them.
		if (runtime === undefined) {
			for (const value of known.values()) if (!value) return false;
			return known.size > 0;
		}
		return this._wasmGroupsOf(runtime).every(
			(group) => known.get(group) === true
		);
	}

	supportTemplateLiteral() {
		return this.outputOptions.environment.templateLiteral;
	}

	supportNodePrefixForCoreModules() {
		return this.outputOptions.environment.nodePrefixForCoreModules;
	}

	/**
	 * Renders node prefix for core module.
	 * @param {string} mod a module
	 * @returns {string} a module with `node:` prefix when supported, otherwise an original name
	 */
	renderNodePrefixForCoreModule(mod) {
		return this.outputOptions.environment.nodePrefixForCoreModules
			? `"node:${mod}"`
			: `"${mod}"`;
	}

	/**
	 * Renders return const when it is supported, otherwise let when supported, otherwise var.
	 * @returns {"const" | "let" | "var"} return `const` when it is supported, otherwise `let` when supported, otherwise `var`
	 */
	renderConst() {
		return this.supportsConst() ? "const" : this.supportsLet() ? "let" : "var";
	}

	/**
	 * Renders return let when it is supported, otherwise var.
	 * @returns {"let" | "var"} return `let` when it is supported, otherwise `var`
	 */
	renderLet() {
		return this.supportsLet() ? "let" : "var";
	}

	/**
	 * Returning function.
	 * @param {string} returnValue return value
	 * @param {string} args arguments
	 * @returns {string} returning function
	 */
	returningFunction(returnValue, args = "") {
		return this.supportsArrowFunction()
			? `(${args}) => (${returnValue})`
			: `function(${args}) { return ${returnValue}; }`;
	}

	/**
	 * Returns basic function.
	 * @param {string} args arguments
	 * @param {string | string[]} body body
	 * @returns {string} basic function
	 */
	basicFunction(args, body) {
		return this.supportsArrowFunction()
			? `(${args}) => {\n${Template.indent(body)}\n}`
			: `function(${args}) {\n${Template.indent(body)}\n}`;
	}

	/**
	 * Returns result expression.
	 * @param {(string | { expr: string })[]} args args
	 * @returns {string} result expression
	 */
	concatenation(...args) {
		const len = args.length;

		if (len === 2) return this._es5Concatenation(args);
		if (len === 0) return '""';
		if (len === 1) {
			return typeof args[0] === "string"
				? JSON.stringify(args[0])
				: `"" + ${args[0].expr}`;
		}
		if (!this.supportTemplateLiteral()) return this._es5Concatenation(args);

		// cost comparison between template literal and concatenation:
		// both need equal surroundings: `xxx` vs "xxx"
		// template literal has constant cost of 3 chars for each expression
		// es5 concatenation has cost of 3 + n chars for n expressions in row
		// when a es5 concatenation ends with an expression it reduces cost by 3
		// when a es5 concatenation starts with an single expression it reduces cost by 3
		// e. g. `${a}${b}${c}` (3*3 = 9) is longer than ""+a+b+c ((3+3)-3 = 3)
		// e. g. `x${a}x${b}x${c}x` (3*3 = 9) is shorter than "x"+a+"x"+b+"x"+c+"x" (4+4+4 = 12)

		let templateCost = 0;
		let concatenationCost = 0;

		let lastWasExpr = false;
		for (const arg of args) {
			const isExpr = typeof arg !== "string";
			if (isExpr) {
				templateCost += 3;
				concatenationCost += lastWasExpr ? 1 : 4;
			}
			lastWasExpr = isExpr;
		}
		if (lastWasExpr) concatenationCost -= 3;
		if (typeof args[0] !== "string" && typeof args[1] === "string") {
			concatenationCost -= 3;
		}

		if (concatenationCost <= templateCost) return this._es5Concatenation(args);

		return `\`${args
			.map((arg) => (typeof arg === "string" ? arg : `\${${arg.expr}}`))
			.join("")}\``;
	}

	/**
	 * Returns result expression.
	 * @param {(string | { expr: string })[]} args args (len >= 2)
	 * @returns {string} result expression
	 * @private
	 */
	_es5Concatenation(args) {
		const str = args
			.map((arg) => (typeof arg === "string" ? JSON.stringify(arg) : arg.expr))
			.join(" + ");

		// when the first two args are expression, we need to prepend "" + to force string
		// concatenation instead of number addition.
		return typeof args[0] !== "string" && typeof args[1] !== "string"
			? `"" + ${str}`
			: str;
	}

	/**
	 * Expression function.
	 * @param {string} expression expression
	 * @param {string} args arguments
	 * @returns {string} expression function code
	 */
	expressionFunction(expression, args = "") {
		return this.supportsArrowFunction()
			? `(${args}) => (${expression})`
			: `function(${args}) { ${expression}; }`;
	}

	/**
	 * Returns empty function code.
	 * @returns {string} empty function code
	 */
	emptyFunction() {
		// `x => {}` over `() => {}`: a minifier keeps the parameter, so the named
		// one is a byte shorter.
		return this.supportsArrowFunction() ? "x => {}" : "function() {}";
	}

	/**
	 * Guards an access/call on `object` with optional chaining when supported,
	 * otherwise an equivalent `&&` short-circuit. `object` is evaluated twice in
	 * the fallback, so it must be side-effect free.
	 * @param {string} object base expression (side-effect free)
	 * @param {string} access continuation after the optional point, e.g. `()`, `prop`, `method(arg)` or `[key]`
	 * @returns {string} guarded access expression
	 */
	optionalChaining(object, access) {
		if (this.supportsOptionalChaining()) {
			return `${object}?.${access}`;
		}
		const sep = access[0] === "(" || access[0] === "[" ? "" : ".";
		return `${object} && ${object}${sep}${access}`;
	}

	/**
	 * Reads a node builtin via `process.getBuiltinModule()`, guarded to stay falsy off node so universal `["node", "web"]` bundles don't crash (also falsy on node <22.3).
	 * @param {string} request builtin module request as a JS string expression, e.g. from `renderNodePrefixForCoreModule`
	 * @param {string=} access member/call chain appended to the module, e.g. `.Worker` or `.createRequire(url)`
	 * @returns {string} guarded expression
	 */
	getBuiltinModule(request, access = "") {
		const getter = `process.getBuiltinModule(${request})${access}`;
		if (this.outputOptions.environment.nodeBuiltinModuleGetter) {
			return `typeof process !== "undefined" && ${getter}`;
		}
		return `typeof process !== "undefined" && typeof process.getBuiltinModule === "function" && ${getter}`;
	}

	/**
	 * Renders a `then` callback calling `fn` with `args`. An arrow keeps the `this`
	 * a method call gives; the bound form is shorter without arrows.
	 * @param {string} fn callee, a member of `__webpack_require__` or itself
	 * @param {string} args arguments
	 * @returns {string} callback expression
	 */
	deferredCall(fn, args) {
		return this.supportsArrowFunction()
			? this.returningFunction(`${fn}(${args})`)
			: `${fn}.bind(${RuntimeGlobals.require}, ${args})`;
	}

	/**
	 * Renders an object-literal method, using method shorthand when supported
	 * and falling back to a `prop: function/arrow` property otherwise.
	 * @param {string} prop property name (or computed key like `[x]`)
	 * @param {string} args arguments
	 * @param {string | string[]} body body
	 * @returns {string} method code
	 */
	method(prop, args, body) {
		return this.supportsMethodShorthand()
			? `${prop}(${args}) {\n${Template.indent(body)}\n}`
			: `${prop}: ${this.basicFunction(args, body)}`;
	}

	/**
	 * Returns an own-property check, using `Object.hasOwn` when supported and
	 * falling back to `Object.prototype.hasOwnProperty.call` otherwise.
	 * @param {string} object object expression
	 * @param {string} property property expression
	 * @returns {string} own-property check expression
	 */
	objectHasOwn(object, property) {
		return this.supportsObjectHasOwn()
			? `Object.hasOwn(${object}, ${property})`
			: `Object.prototype.hasOwnProperty.call(${object}, ${property})`;
	}

	/**
	 * Returns a self-defaulting assignment, using the `||=` logical assignment
	 * operator when supported and falling back to `target = target || value`
	 * otherwise. `target` is evaluated twice in the fallback, so it must be
	 * side-effect free. The expression evaluates to the resulting value.
	 * Models `||` only, so `target` must never hold a legitimate falsy value
	 * (`0`, `""`, `false`) — it would be overwritten; use it for object/array defaults.
	 * @param {string} target assignment target (side-effect free)
	 * @param {string} value default value expression
	 * @returns {string} assignment expression
	 */
	assignOr(target, value) {
		return this.supportsLogicalAssignment()
			? `${target} ||= ${value}`
			: `${target} = ${target} || ${value}`;
	}

	/**
	 * Returns destructure array code.
	 * @param {string[]} items items
	 * @param {string} value value
	 * @returns {string} destructure array code
	 */
	destructureArray(items, value) {
		const decl = this.renderLet();
		return this.supportsDestructuring()
			? `${decl} [${items.join(", ")}] = ${value};`
			: Template.asString(
					items.map((item, i) => `${decl} ${item} = ${value}[${i}];`)
				);
	}

	/**
	 * Destructure object.
	 * @param {string[]} items items
	 * @param {string} value value
	 * @returns {string} destructure object code
	 */
	destructureObject(items, value) {
		const decl = this.renderLet();
		return this.supportsDestructuring()
			? `${decl} {${items.join(", ")}} = ${value};`
			: Template.asString(
					items.map(
						(item) => `${decl} ${item} = ${value}${propertyAccess([item])};`
					)
				);
	}

	/**
	 * Returns iIFE code.
	 * @param {string} args arguments
	 * @param {string} body body
	 * @returns {string} IIFE code
	 */
	iife(args, body) {
		return `(${this.basicFunction(args, body)})()`;
	}

	/**
	 * Returns for each code.
	 * @param {string} variable variable
	 * @param {string} array array
	 * @param {string | string[]} body body
	 * @returns {string} for each code
	 */
	forEach(variable, array, body) {
		return this.supportsForOf()
			? `for(const ${variable} of ${array}) {\n${Template.indent(body)}\n}`
			: `${array}.forEach(function(${variable}) {\n${Template.indent(
					body
				)}\n});`;
	}

	/**
	 * Returns comment.
	 * @param {object} options Information content of the comment
	 * @param {string=} options.request request string used originally
	 * @param {(string | null)=} options.chunkName name of the chunk referenced
	 * @param {string=} options.chunkReason reason information of the chunk
	 * @param {string=} options.message additional message
	 * @param {string=} options.exportName name of the export
	 * @returns {string} comment
	 */
	comment({ request, chunkName, chunkReason, message, exportName }) {
		/** @type {string} */
		let content;
		if (this.outputOptions.pathinfo) {
			content = [message, request, chunkName, chunkReason]
				.filter(Boolean)
				.map((item) => this.requestShortener.shorten(item))
				.join(" | ");
		} else {
			content = [message, chunkName, chunkReason]
				.filter(Boolean)
				.map((item) => this.requestShortener.shorten(item))
				.join(" | ");
		}
		if (!content) return "";
		if (this.outputOptions.pathinfo) {
			return `${Template.toComment(content)} `;
		}
		return `${Template.toNormalComment(content)} `;
	}

	/**
	 * Throw missing module error block.
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error block
	 */
	throwMissingModuleErrorBlock({ request }) {
		const err = `Cannot find module '${request}'`;
		return `${this.renderConst()} e = new Error(${JSON.stringify(
			err
		)}); e.code = 'MODULE_NOT_FOUND'; throw e;`;
	}

	/**
	 * Throw missing module error function.
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error function
	 */
	throwMissingModuleErrorFunction({ request }) {
		return `function webpackMissingModule() { ${this.throwMissingModuleErrorBlock(
			{ request }
		)} }`;
	}

	/**
	 * Returns generated error IIFE.
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error IIFE
	 */
	missingModule({ request }) {
		return `Object(${this.throwMissingModuleErrorFunction({ request })}())`;
	}

	/**
	 * Missing module statement.
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error statement
	 */
	missingModuleStatement({ request }) {
		return `${this.missingModule({ request })};\n`;
	}

	/**
	 * Missing module promise.
	 * @param {object} options generation options
	 * @param {string=} options.request request string used originally
	 * @returns {string} generated error code
	 */
	missingModulePromise({ request }) {
		return `Promise.resolve().then(${this.throwMissingModuleErrorFunction({
			request
		})})`;
	}

	/**
	 * Returns the code.
	 * @param {object} options options object
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {Module} options.module the module
	 * @param {string=} options.request the request that should be printed as comment
	 * @param {string=} options.idExpr expression to use as id expression
	 * @param {"expression" | "promise" | "statements"} options.type which kind of code should be returned
	 * @returns {string} the code
	 */
	weakError({ module, chunkGraph, request, idExpr, type }) {
		const moduleId = chunkGraph.getModuleId(module);
		const errorMessage =
			moduleId === null
				? JSON.stringify("Module is not available (weak dependency)")
				: idExpr
					? `"Module '" + ${idExpr} + "' is not available (weak dependency)"`
					: JSON.stringify(
							`Module '${moduleId}' is not available (weak dependency)`
						);
		const comment = request ? `${Template.toNormalComment(request)} ` : "";
		const errorStatements = `${this.renderConst()} e = new Error(${errorMessage}); ${comment}e.code = 'MODULE_NOT_FOUND'; throw e;`;
		switch (type) {
			case "statements":
				return errorStatements;
			case "promise":
				return `Promise.resolve().then(${this.basicFunction(
					"",
					errorStatements
				)})`;
			case "expression":
				return this.iife("", errorStatements);
		}
	}

	/**
	 * Returns the expression.
	 * @param {object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string=} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @returns {string} the expression
	 */
	moduleId({ module, chunkGraph, request, weak }) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId === null) {
			if (weak) {
				return "null /* weak dependency, without id */";
			}
			throw new Error(
				`RuntimeTemplate.moduleId(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		return `${this.comment({ request })}${JSON.stringify(moduleId)}`;
	}

	/**
	 * Returns the expression.
	 * @param {object} options options object
	 * @param {Module | null} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string=} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the expression
	 */
	moduleRaw({ module, chunkGraph, request, weak, runtimeRequirements }) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return this.weakError({
					module,
					chunkGraph,
					request,
					type: "expression"
				});
			}
			throw new Error(
				`RuntimeTemplate.moduleId(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		runtimeRequirements.add(RuntimeGlobals.require);
		return `${RuntimeGlobals.require}(${this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		})})`;
	}

	/**
	 * Returns the expression.
	 * @param {object} options options object
	 * @param {Module | null} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the expression
	 */
	moduleExports({ module, chunkGraph, request, weak, runtimeRequirements }) {
		return this.moduleRaw({
			module,
			chunkGraph,
			request,
			weak,
			runtimeRequirements
		});
	}

	/**
	 * Returns the expression.
	 * @param {object} options options object
	 * @param {Module} options.module the module
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {string} options.request the request that should be printed as comment
	 * @param {boolean=} options.strict if the current module is in strict esm mode
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} the expression
	 */
	moduleNamespace({
		module,
		chunkGraph,
		request,
		strict,
		weak,
		runtimeRequirements
	}) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		if (chunkGraph.getModuleId(module) === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return this.weakError({
					module,
					chunkGraph,
					request,
					type: "expression"
				});
			}
			throw new Error(
				`RuntimeTemplate.moduleNamespace(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		const moduleId = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		const exportsType = module.getExportsType(chunkGraph.moduleGraph, strict);
		switch (exportsType) {
			case "namespace":
				return this.moduleRaw({
					module,
					chunkGraph,
					request,
					weak,
					runtimeRequirements
				});
			case "default-with-named":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 3)`;
			case "default-only":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 1)`;
			case "dynamic":
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				return `${RuntimeGlobals.createFakeNamespaceObject}(${moduleId}, 7)`;
		}
	}

	/**
	 * Module namespace promise.
	 * @param {object} options options object
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {AsyncDependenciesBlock=} options.block the current dependencies block
	 * @param {Module} options.module the module
	 * @param {string} options.request the request that should be printed as comment
	 * @param {string} options.message a message for the comment
	 * @param {boolean=} options.strict if the current module is in strict esm mode
	 * @param {boolean=} options.weak if the dependency is weak (will create a nice error message)
	 * @param {Dependency} options.dependency dependency
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {Module=} options.originModule the module the `import()` is emitted into
	 * @returns {string} the promise expression
	 */
	moduleNamespacePromise({
		chunkGraph,
		block,
		module,
		request,
		message,
		strict,
		weak,
		dependency,
		runtimeRequirements,
		originModule
	}) {
		if (!module) {
			return this.missingModulePromise({
				request
			});
		}
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return this.weakError({
					module,
					chunkGraph,
					request,
					type: "promise"
				});
			}
			throw new Error(
				`RuntimeTemplate.moduleNamespacePromise(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		const promise = this.blockPromise({
			chunkGraph,
			block,
			message,
			runtimeRequirements,
			originModule
		});

		/** @type {string} */
		let appending;
		let idExpr = JSON.stringify(chunkGraph.getModuleId(module));
		const comment = this.comment({
			request
		});
		let header = "";
		if (weak) {
			if (idExpr.length > 8) {
				// 'var x="nnnnnn";x,"+x+",x' vs '"nnnnnn",nnnnnn,"nnnnnn"'
				header += `${this.renderConst()} id = ${idExpr}; `;
				idExpr = "id";
			}
			runtimeRequirements.add(RuntimeGlobals.moduleFactories);
			header += `if(!${
				RuntimeGlobals.moduleFactories
			}[${idExpr}]) { ${this.weakError({
				module,
				chunkGraph,
				request,
				idExpr,
				type: "statements"
			})} } `;
		}
		const exportsType = module.getExportsType(chunkGraph.moduleGraph, strict);

		const isModuleDeferred =
			(dependency instanceof HarmonyImportDependency ||
				dependency instanceof ImportDependency) &&
			ImportPhaseUtils.isDefer(dependency.phase) &&
			!(/** @type {BuildMeta} */ (module.buildMeta).async);

		if (isModuleDeferred) {
			runtimeRequirements.add(RuntimeGlobals.makeDeferredNamespaceObject);

			let mode = getMakeDeferredNamespaceModeFromExportsType(exportsType);
			if (mode) mode = `${mode} | 16`;

			const asyncDeps = Array.from(
				getOutgoingAsyncModules(chunkGraph.moduleGraph, module),
				(m) => chunkGraph.getModuleId(m)
			).filter((id) => id !== null);
			if (asyncDeps.length) {
				runtimeRequirements.add(
					RuntimeGlobals.deferredModuleAsyncTransitiveDependencies
				);
				if (header) {
					appending = `.then(${this.basicFunction(
						"",
						`${header}return ${
							RuntimeGlobals.deferredModuleAsyncTransitiveDependencies
						}(${JSON.stringify(asyncDeps)});`
					)})`;
				} else {
					runtimeRequirements.add(RuntimeGlobals.require);
					appending = `.then(${this.returningFunction(
						`${
							RuntimeGlobals.deferredModuleAsyncTransitiveDependencies
						}(${JSON.stringify(asyncDeps)})`
					)})`;
				}
				appending += `.then(${this.deferredCall(
					RuntimeGlobals.makeDeferredNamespaceObject,
					`${comment}${idExpr}, ${mode}`
				)})`;
			} else if (header) {
				appending = `.then(${this.basicFunction(
					"",
					`${header}return ${RuntimeGlobals.makeDeferredNamespaceObject}(${comment}${idExpr}, ${mode});`
				)})`;
			} else {
				runtimeRequirements.add(RuntimeGlobals.require);
				appending = `.then(${this.deferredCall(
					RuntimeGlobals.makeDeferredNamespaceObject,
					`${comment}${idExpr}, ${mode}`
				)})`;
			}
		} else {
			let fakeType = 16;
			switch (exportsType) {
				case "namespace":
					if (header) {
						const rawModule = this.moduleRaw({
							module,
							chunkGraph,
							request,
							weak,
							runtimeRequirements
						});
						appending = `.then(${this.basicFunction(
							"",
							`${header}return ${rawModule};`
						)})`;
					} else {
						runtimeRequirements.add(RuntimeGlobals.require);
						appending = `.then(${this.deferredCall(
							RuntimeGlobals.require,
							`${comment}${idExpr}`
						)})`;
					}
					break;
				case "dynamic":
					fakeType |= 4;
				/* fall through */
				case "default-with-named":
					fakeType |= 2;
				/* fall through */
				case "default-only":
					runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
					if (chunkGraph.moduleGraph.isAsync(module)) {
						if (header) {
							const rawModule = this.moduleRaw({
								module,
								chunkGraph,
								request,
								weak,
								runtimeRequirements
							});
							appending = `.then(${this.basicFunction(
								"",
								`${header}return ${rawModule};`
							)})`;
						} else {
							runtimeRequirements.add(RuntimeGlobals.require);
							appending = `.then(${this.deferredCall(
								RuntimeGlobals.require,
								`${comment}${idExpr}`
							)})`;
						}
						appending += `.then(${this.returningFunction(
							`${RuntimeGlobals.createFakeNamespaceObject}(m, ${fakeType})`,
							"m"
						)})`;
					} else {
						fakeType |= 1;
						if (header) {
							const moduleIdExpr = this.moduleId({
								module,
								chunkGraph,
								request,
								weak
							});
							const returnExpression = `${RuntimeGlobals.createFakeNamespaceObject}(${moduleIdExpr}, ${fakeType})`;
							appending = `.then(${this.basicFunction(
								"",
								`${header}return ${returnExpression};`
							)})`;
						} else {
							appending = `.then(${this.deferredCall(
								RuntimeGlobals.createFakeNamespaceObject,
								`${comment}${idExpr}, ${fakeType}`
							)})`;
						}
					}
					break;
			}
		}

		return `${promise || "Promise.resolve()"}${appending}`;
	}

	/**
	 * Runtime condition expression.
	 * @param {object} options options object
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {RuntimeSpec=} options.runtime runtime for which this code will be generated
	 * @param {RuntimeSpec | boolean=} options.runtimeCondition only execute the statement in some runtimes
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} expression
	 */
	runtimeConditionExpression({
		chunkGraph,
		runtimeCondition,
		runtime,
		runtimeRequirements
	}) {
		if (runtimeCondition === undefined) return "true";
		if (typeof runtimeCondition === "boolean") return `${runtimeCondition}`;
		/** @type {Set<string>} */
		const positiveRuntimeIds = new Set();
		forEachRuntime(runtimeCondition, (runtime) =>
			positiveRuntimeIds.add(
				`${chunkGraph.getRuntimeId(/** @type {string} */ (runtime))}`
			)
		);
		/** @type {Set<string>} */
		const negativeRuntimeIds = new Set();
		forEachRuntime(subtractRuntime(runtime, runtimeCondition), (runtime) =>
			negativeRuntimeIds.add(
				`${chunkGraph.getRuntimeId(/** @type {string} */ (runtime))}`
			)
		);
		runtimeRequirements.add(RuntimeGlobals.runtimeId);
		return compileBooleanMatcher.fromLists(
			[...positiveRuntimeIds],
			[...negativeRuntimeIds]
		)(RuntimeGlobals.runtimeId);
	}

	/**
	 * Returns the import statement and the compat statement.
	 * @param {object} options options object
	 * @param {boolean=} options.update whether a new variable should be created or the existing one updated
	 * @param {Module} options.module the module
	 * @param {Module} options.originModule module in which the statement is emitted
	 * @param {ModuleGraph} options.moduleGraph the module graph
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {string} options.importVar name of the import variable
	 * @param {string=} options.request the request that should be printed as comment
	 * @param {boolean=} options.weak true, if this is a weak dependency
	 * @param {ModuleDependency=} options.dependency module dependency
	 * @returns {[string, string]} the import statement and the compat statement
	 */
	importStatement({
		update,
		module,
		moduleGraph,
		chunkGraph,
		request,
		importVar,
		originModule,
		weak,
		dependency,
		runtimeRequirements
	}) {
		if (!module) {
			return [
				this.missingModuleStatement({
					request
				}),
				""
			];
		}

		if (chunkGraph.getModuleId(module) === null) {
			if (weak) {
				// only weak referenced modules don't get an id
				// we can always emit an error emitting code here
				return [
					this.weakError({
						module,
						chunkGraph,
						request,
						type: "statements"
					}),
					""
				];
			}
			throw new Error(
				`RuntimeTemplate.importStatement(): ${noModuleIdErrorMessage(
					module,
					chunkGraph
				)}`
			);
		}
		const moduleId = this.moduleId({
			module,
			chunkGraph,
			request,
			weak
		});
		// Harmony imports may be wrapped in runtime-condition `if` blocks
		// but referenced outside those blocks (e.g. by harmony reexport),
		// so they must remain function-scoped (`var`) rather than
		// block-scoped (`let`/`const`).
		const optDeclaration = update ? "" : "var ";

		const exportsType = module.getExportsType(
			chunkGraph.moduleGraph,
			/** @type {BuildMeta} */
			(originModule.buildMeta).strictHarmonyModule
		);
		runtimeRequirements.add(RuntimeGlobals.require);

		/** @type {string} */
		let importContent;

		const isModuleDeferred =
			(dependency instanceof HarmonyImportDependency ||
				dependency instanceof ImportDependency) &&
			ImportPhaseUtils.isDefer(dependency.phase) &&
			!isAsyncExternal(module);

		if (isModuleDeferred) {
			/** @type {Set<Module>} */
			const outgoingAsyncModules = getOutgoingAsyncModules(moduleGraph, module);
			// A module deferring itself is already evaluating, so awaiting it here
			// would deadlock; forcing the namespace throws instead.
			outgoingAsyncModules.delete(originModule);

			importContent = `/* deferred harmony import */ ${optDeclaration}${importVar} = ${getOptimizedDeferredModule(
				moduleId,
				exportsType,
				Array.from(outgoingAsyncModules, (mod) => chunkGraph.getModuleId(mod)),
				getDeferredCycleModuleIds(
					getDeferredCycleModules(moduleGraph, module),
					(mod) => chunkGraph.getModuleId(mod)
				),
				runtimeRequirements
			)};\n`;

			return [importContent, ""];
		}
		importContent = `/* harmony import */ ${optDeclaration}${importVar} = ${RuntimeGlobals.require}(${moduleId});\n`;

		if (exportsType === "dynamic") {
			runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
			return [
				importContent,
				`/* harmony import */ ${optDeclaration}${importVar}_default = /*#__PURE__*/${RuntimeGlobals.compatGetDefaultExport}(${importVar});\n`
			];
		}
		return [importContent, ""];
	}

	/**
	 * Export from import.
	 * @template GenerateContext
	 * @param {object} options options
	 * @param {ModuleGraph} options.moduleGraph the module graph
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {Module} options.module the module
	 * @param {string} options.request the request
	 * @param {string | string[]} options.exportName the export name
	 * @param {Module} options.originModule the origin module
	 * @param {boolean | undefined} options.asiSafe true, if location is safe for ASI, a bracket can be emitted
	 * @param {boolean | undefined} options.isCall true, if expression will be called
	 * @param {boolean | null} options.callContext when false, call context will not be preserved
	 * @param {boolean} options.defaultInterop when true and accessing the default exports, interop code will be generated
	 * @param {string} options.importVar the identifier name of the import variable
	 * @param {InitFragment<GenerateContext>[]} options.initFragments init fragments will be added here
	 * @param {RuntimeSpec} options.runtime runtime for which this code will be generated
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {ModuleDependency} options.dependency module dependency
	 * @param {boolean=} options.mangleableNamespace true, when a whole-namespace value may use a decoupled namespace object that keeps the original export names
	 * @returns {string} expression
	 */
	exportFromImport({
		moduleGraph,
		chunkGraph,
		module,
		request,
		exportName,
		originModule,
		asiSafe,
		isCall,
		callContext,
		defaultInterop,
		importVar,
		initFragments,
		runtime,
		runtimeRequirements,
		dependency,
		mangleableNamespace = false
	}) {
		if (!module) {
			return this.missingModule({
				request
			});
		}
		if (!Array.isArray(exportName)) {
			exportName = exportName ? [exportName] : [];
		}
		const exportsType = module.getExportsType(
			moduleGraph,
			/** @type {BuildMeta} */
			(originModule.buildMeta).strictHarmonyModule
		);

		const isModuleDeferred =
			(dependency instanceof HarmonyImportDependency ||
				dependency instanceof ImportDependency) &&
			ImportPhaseUtils.isDefer(dependency.phase) &&
			!isAsyncExternal(module);

		if (defaultInterop) {
			// when the defaultInterop is used (when a ESM imports a CJS module),
			if (exportName.length > 0 && exportName[0] === "default") {
				if (isModuleDeferred && exportsType !== "namespace") {
					const exportsInfo = moduleGraph.getExportsInfo(module);
					const name = exportName.slice(1);
					const used = exportsInfo.getUsedName(name, runtime);
					if (!used) {
						const comment = Template.toNormalComment(
							`unused export ${propertyAccess(exportName)}`
						);
						return `${comment} undefined`;
					}
					if (used instanceof InlinedUsedName) {
						throw new Error(
							"Can't inline the exports of defer imported module"
						);
					}
					const access = `${importVar}.a${propertyAccess(
						Array.isArray(used) ? used : [used]
					)}`;
					if (isCall || asiSafe === undefined) {
						return access;
					}
					return asiSafe ? `(${access})` : `;(${access})`;
				}
				// accessing the .default property is same thing as `require()` the module.

				// For example:
				// import mod from "cjs";    mod.default.x;
				// is translated to
				// var mod = require("cjs"); mod.x;
				switch (exportsType) {
					case "dynamic":
						if (isCall) {
							return `${importVar}_default()${propertyAccess(exportName, 1)}`;
						}
						return asiSafe
							? `(${importVar}_default()${propertyAccess(exportName, 1)})`
							: asiSafe === false
								? `;(${importVar}_default()${propertyAccess(exportName, 1)})`
								: `${importVar}_default.a${propertyAccess(exportName, 1)}`;

					case "default-only":
					case "default-with-named":
						exportName = exportName.slice(1);
						break;
				}
			} else if (exportName.length > 0) {
				// the property used is not .default.
				// For example:
				// import * as ns from "cjs"; cjs.prop;
				if (exportsType === "default-only") {
					// in the strictest case, it is a runtime error (e.g. NodeJS behavior of CJS-ESM interop).
					return `/* non-default import from non-esm module */undefined${propertyAccess(
						exportName,
						1
					)}`;
				} else if (
					exportsType !== "namespace" &&
					exportName[0] === "__esModule"
				) {
					return "/* __esModule */true";
				}
			} else if (isModuleDeferred) {
				// now exportName.length is 0
				// fall through to the end of this function, create the namespace there.
			} else if (
				exportsType === "default-only" ||
				exportsType === "default-with-named"
			) {
				// now exportName.length is 0, which means the namespace object is used in an unknown way
				// for example:
				// import * as ns from "cjs"; console.log(ns);
				// we will need to createFakeNamespaceObject that simulates ES Module namespace object
				runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
				initFragments.push(
					new InitFragment(
						`${this.renderLet()} ${importVar}_namespace_cache;\n`,
						InitFragment.STAGE_CONSTANTS,
						-1,
						`${importVar}_namespace_cache`
					)
				);
				return `/*#__PURE__*/ ${
					asiSafe ? "" : asiSafe === false ? ";" : "Object"
				}(${importVar}_namespace_cache || (${importVar}_namespace_cache = ${
					RuntimeGlobals.createFakeNamespaceObject
				}(${importVar}${exportsType === "default-only" ? "" : ", 2"})))`;
			}
		}

		if (exportName.length > 0) {
			const exportsInfo = moduleGraph.getExportsInfo(module);
			// in some case the exported item is renamed (get this by getUsedName). for example,
			// x.default might be emitted as x.Z (default is renamed to Z)
			const used = exportsInfo.getUsedName(exportName, runtime);
			if (!used) {
				const comment = Template.toNormalComment(
					`unused export ${propertyAccess(exportName)}`
				);
				return `${comment} undefined`;
			}
			if (used instanceof InlinedUsedName) {
				return used.render(
					Template.toNormalComment(
						`inlined export ${propertyAccess(exportName)}`
					)
				);
			}
			const comment = equals(used, exportName)
				? ""
				: `${Template.toNormalComment(propertyAccess(exportName))} `;
			const access = `${importVar}${
				isModuleDeferred ? ".a" : ""
			}${comment}${propertyAccess(Array.isArray(used) ? used : [used])}`;
			if (isCall && callContext === false) {
				return asiSafe
					? `(0,${access})`
					: asiSafe === false
						? `;(0,${access})`
						: `/*#__PURE__*/Object(${access})`;
			}
			return access;
		}
		if (isModuleDeferred) {
			initFragments.push(
				new InitFragment(
					`${this.renderLet()} ${importVar}_deferred_namespace_cache;\n`,
					InitFragment.STAGE_CONSTANTS,
					-1,
					`${importVar}_deferred_namespace_cache`
				)
			);

			runtimeRequirements.add(RuntimeGlobals.makeDeferredNamespaceObject);
			const id = chunkGraph.getModuleId(module);
			const type = getMakeDeferredNamespaceModeFromExportsType(exportsType);
			const init = `${
				RuntimeGlobals.makeDeferredNamespaceObject
			}(${JSON.stringify(id)}, ${type})`;

			return `/*#__PURE__*/ ${
				asiSafe ? "" : asiSafe === false ? ";" : "Object"
			}(${importVar}_deferred_namespace_cache || (${importVar}_deferred_namespace_cache = ${init}))`;
		}
		// The whole namespace object is used as a value. If the module's exports
		// were mangled, importVar's keys are the mangled names, so we materialize
		// a decoupled namespace object that exposes the original names.
		if (
			exportsType === "namespace" &&
			mangleableNamespace &&
			this.compilation.options.optimization.mangleExports
		) {
			const materialized = this._materializedNamespaceObject({
				moduleGraph,
				module,
				importVar,
				initFragments,
				runtime,
				runtimeRequirements
			});
			if (materialized !== undefined) return materialized;
		}
		// if we hit here, the importVar is either
		// - already a ES module namespace object
		// - or imported by a way that does not need interop.
		return importVar;
	}

	/**
	 * Materializes a namespace object that keeps the original export names while
	 * the module's own exports are mangled. Returns undefined when no export was
	 * mangled (then the raw namespace object can be used as-is).
	 * @template GenerateContext
	 * @param {object} options options
	 * @param {ModuleGraph} options.moduleGraph the module graph
	 * @param {Module} options.module the imported module
	 * @param {string} options.importVar the import variable referencing the module
	 * @param {InitFragment<GenerateContext>[]} options.initFragments target array for init fragments
	 * @param {RuntimeSpec} options.runtime the runtime
	 * @param {RuntimeRequirements} options.runtimeRequirements runtime requirements
	 * @returns {string | undefined} expression of the materialized namespace object, or undefined
	 */
	_materializedNamespaceObject({
		moduleGraph,
		module,
		importVar,
		initFragments,
		runtime,
		runtimeRequirements
	}) {
		const exportsInfo = moduleGraph.getExportsInfo(module);
		/** @type {string[]} */
		const definitions = [];
		let mangled = false;
		for (const exportInfo of exportsInfo.orderedExports) {
			if (exportInfo.provided === false) continue;
			const used = exportsInfo.getUsedName([exportInfo.name], runtime);
			if (!used) continue;
			if (used instanceof InlinedUsedName) {
				// An inlined export isn't reachable by name on the raw exports object,
				// so the decoupled object must expose the inlined value directly.
				mangled = true;
				definitions.push(
					`${propertyName(exportInfo.name)}: ${this.returningFunction(
						used.render(
							Template.toNormalComment(
								`inlined export ${propertyAccess([exportInfo.name])}`
							)
						)
					)}`
				);
				continue;
			}
			if (used[used.length - 1] !== exportInfo.name) mangled = true;
			definitions.push(
				`${propertyName(exportInfo.name)}: ${this.returningFunction(
					`${importVar}${propertyAccess(/** @type {string[]} */ (used))}`
				)}`
			);
		}
		if (!mangled) return;
		const name = `${importVar}_namespace_object`;
		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
		initFragments.push(
			new InitFragment(
				`var ${name} = {};\n${RuntimeGlobals.makeNamespaceObject}(${name});\n${
					RuntimeGlobals.definePropertyGetters
				}(${name}, {\n\t${definitions.join(",\n\t")}\n});\n`,
				InitFragment.STAGE_PROVIDES,
				0,
				name
			)
		);
		return name;
	}

	/**
	 * Returns expression.
	 * @param {object} options options
	 * @param {AsyncDependenciesBlock | undefined} options.block the async block
	 * @param {string} options.message the message
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {Module=} options.originModule the module the `import()` is emitted into
	 * @returns {string} expression
	 */
	blockPromise({
		block,
		message,
		chunkGraph,
		runtimeRequirements,
		originModule
	}) {
		if (!block) {
			const comment = this.comment({
				message
			});
			return `Promise.resolve(${comment.trim()})`;
		}
		const chunkGroup = chunkGraph.getBlockChunkGroup(block);
		if (!chunkGroup || chunkGroup.chunks.length === 0) {
			const comment = this.comment({
				message
			});
			return `Promise.resolve(${comment.trim()})`;
		}
		const chunks = chunkGroup.chunks.filter(
			(chunk) => !chunk.hasRuntime() && chunk.id !== null
		);
		const comment = this.comment({
			message,
			chunkName: block.chunkName
		});
		// `fetchPriority` is unsupported for ESM output (a native `import()` can't carry it,
		// and the ESM chunk loader ignores the argument), so it never blocks the analyzable form.
		// TODO recheck: browsers honor `fetchpriority` on `modulepreload` only when the
		// preload scanner sees it, so a runtime-injected hint is inert; support it here if
		// that changes.
		const fetchPriority = chunkGroup.options.fetchPriority;
		if (chunks.length === 1) {
			const analyzable = this.analyzableChunkImport(
				chunks[0],
				comment,
				runtimeRequirements,
				originModule,
				chunkGraph
			);
			if (analyzable !== null) {
				return analyzable;
			}
			const chunkId = JSON.stringify(chunks[0].id);
			runtimeRequirements.add(RuntimeGlobals.ensureChunk);

			if (fetchPriority) {
				runtimeRequirements.add(RuntimeGlobals.hasFetchPriority);
			}

			return `${RuntimeGlobals.ensureChunk}(${comment}${chunkId}${
				fetchPriority ? `, ${JSON.stringify(fetchPriority)}` : ""
			})`;
		} else if (chunks.length > 0) {
			let needEnsureChunk = false;
			/**
			 * Analyzable `import()` for a solely-owned JS chunk, else runtime ensureChunk.
			 * @param {Chunk} chunk chunk
			 * @returns {string} require chunk id code
			 */
			const requireChunkId = (chunk) => {
				const analyzable = this.analyzableChunkImport(
					chunk,
					"",
					runtimeRequirements,
					originModule,
					chunkGraph
				);
				if (analyzable !== null) return analyzable;
				needEnsureChunk = true;
				return `${RuntimeGlobals.ensureChunk}(${JSON.stringify(chunk.id)}${
					fetchPriority ? `, ${JSON.stringify(fetchPriority)}` : ""
				})`;
			};
			const items = chunks.map(requireChunkId);
			if (needEnsureChunk) {
				runtimeRequirements.add(RuntimeGlobals.ensureChunk);
				// Only needed when an `ensureChunk(id, priority)` call is actually emitted.
				if (fetchPriority) {
					runtimeRequirements.add(RuntimeGlobals.hasFetchPriority);
				}
			}
			return `Promise.all(${comment.trim()}[${items.join(", ")}])`;
		}
		return `Promise.resolve(${comment.trim()})`;
	}

	/**
	 * Whether any module of `chunk` carries a source type with a chunk handler of its
	 * own, which `.ei` dispatches alongside the javascript one.
	 * @param {Chunk} chunk the chunk being imported
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {boolean} true when a handler beyond the javascript one is reached
	 */
	_chunkLoadsBeyondJs(chunk, chunkGraph) {
		for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
			for (const type of chunkGraph.getModuleSourceTypes(module)) {
				if (!TYPES_WITHOUT_CHUNK_HANDLER.has(type)) return true;
			}
		}
		return false;
	}

	/**
	 * For ESM module output, load a single statically-named chunk through the
	 * `analyzableChunkImport` helper — a literal `import("./chunk.js")` other bundlers
	 * and webpack itself can follow, wrapped to keep `ensureChunk` timing and deduplication.
	 * Returns `null` to fall back to the runtime `ensureChunk` form.
	 * @param {Chunk} chunk the chunk to load
	 * @param {string} comment leading comment (chunk name / message)
	 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
	 * @param {Module | undefined} originModule the module the `import()` is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string | null} the import expression, or `null`
	 */
	analyzableChunkImport(
		chunk,
		comment,
		runtimeRequirements,
		originModule,
		chunkGraph
	) {
		// `blockPromise` has already dropped any chunk without an id. Without an origin
		// there is nothing the specifier could be relative to.
		if (
			!originModule ||
			!this.supportsAnalyzable("import", chunkGraph, originModule)
		) {
			return null;
		}
		// `.ei` always performs the import, where `.e` only reaches the javascript
		// loader when there is javascript to load. A module federation remote is the
		// case that matters: its chunk is emitted by the container's build, not this one.
		if (!JavascriptModulesPlugin.chunkHasJs(chunk, chunkGraph)) {
			return this._analyzableBailout(
				originModule,
				"this compilation emits no javascript for the chunk, so there is nothing to import",
				null
			);
		}
		// Relative to the consuming chunk (`import.meta.url`) for `auto`, else an
		// absolute publicPath prefix.
		const specifier = this._getAnalyzableChunkSpecifier(
			undefined,
			chunk,
			originModule,
			chunkGraph
		);
		if (specifier === null) {
			return null;
		}
		// `import()` needs a resolvable specifier — relative (`./`, `../`), absolute (`/`)
		// or a URL scheme. A bare one is a package name, so make it explicitly relative
		// the way the chunk loader does. (`new URL(...)` callers accept bare vs their base.)
		const resolvableSpecifier = /^"(?:\.{0,2}\/|[a-zA-Z][\w+.-]*:)/.test(
			specifier
		)
			? specifier
			: `"./${specifier.slice(1)}`;
		runtimeRequirements.add(RuntimeGlobals.analyzableChunkImport);
		// Prefetch/preload children and every non-javascript source type are loaded by a
		// `.f` handler, which `.ei` dispatches — but they attach to `.f`, so it has to
		// exist. The runtime `ensureChunk` around it does not.
		if (
			chunk.hasChildByOrder(chunkGraph, "prefetch", true) ||
			chunk.hasChildByOrder(chunkGraph, "preload", true) ||
			chunk.hasChildByOrder(chunkGraph, "cssPreload", true) ||
			this._chunkLoadsBeyondJs(chunk, chunkGraph)
		) {
			runtimeRequirements.add(RuntimeGlobals.ensureChunkHandlers);
		}
		// Drop-in for `ensureChunk(id)`: the literal `import()` can be statically
		// followed, the helper keeps webpack's install timing and deduplication.
		return `${RuntimeGlobals.analyzableChunkImport}(${JSON.stringify(
			chunk.id
		)}, ${this.returningFunction(`import(${comment}${resolvableSpecifier})`)})`;
	}

	/**
	 * Whether this chunk's hash settles before every chunk a stand-in would land in.
	 * That is what makes a baked name readable from the consuming chunk's own hash, and
	 * it is the tie-break that lets one direction of a cycle bake — `createHash` fixes a
	 * total order, so the answer is the same in every build.
	 * @param {Chunk} chunk the referenced chunk
	 * @param {Iterable<Chunk>} targets the chunks the stand-in is written into
	 * @returns {boolean} true when this one may bake and the others may not
	 */
	_namesBeforeAll(chunk, targets) {
		if (chunk.id === null) return false;
		for (const target of targets) {
			if (!this._hashesBefore(chunk, target)) return false;
		}
		return true;
	}

	/**
	 * Whether `createHash` settles `chunk`'s hash before `target`'s: rounds first, then
	 * id inside a round. The runtime round is ordered by references between its chunks
	 * rather than by id, which the guard below sidesteps by reading no hash from one.
	 * @param {Chunk} chunk the chunk whose hash would be read
	 * @param {Chunk} target the chunk reading it
	 * @returns {boolean} true when the hash exists by the time the target is hashed
	 */
	_hashesBefore(chunk, target) {
		if (chunk === target || target.id === null) return false;
		// One settling after the compilation hash is read only by one settling later.
		// Before the marks exist, the answer is the one the marking will bring about.
		if (this._chunksBakingFullHash !== undefined) {
			const late = this._settlesLate(chunk);
			if (late !== this._settlesLate(target)) return !late;
		}
		const chunkGraph = /** @type {ChunkGraph} */ (this.compilation.chunkGraph);
		const round = hashRound(chunk, chunkGraph);
		const targetRound = hashRound(target, chunkGraph);
		if (round !== targetRound) return round < targetRound;
		// The runtime round is ordered by references between its chunks rather than by
		// id: an async entrypoint the target reaches is settled before it, which is the
		// only order that round fixes — a worker's chunk against the one spawning it.
		if (round === RUNTIME_HASH_ROUND) {
			for (const entrypoint of target.getAllReferencedAsyncEntrypoints()) {
				const { chunks } = entrypoint;
				if (chunks[chunks.length - 1] === chunk) return true;
			}
			return false;
		}
		return (
			compareIds(
				/** @type {ChunkId} */ (chunk.id),
				/** @type {ChunkId} */ (target.id)
			) < 0
		);
	}

	/**
	 * Whether `createHash` settles this chunk's hash in the round that runs after the
	 * compilation hash rather than in one of the four before it. Asked of the chunk
	 * graph, which by then says so exactly: a chunk reaches that round by carrying a
	 * full-hash runtime module, or by being put there by `_markChunksSettlingLate`.
	 * @param {Chunk} chunk the chunk
	 * @returns {boolean} true when its hash is taken last
	 */
	_settlesLate(chunk) {
		return (
			/** @type {ChunkGraph} */
			(this.compilation.chunkGraph).getChunkFullHashModulesIterable(chunk) !==
			undefined
		);
	}

	/**
	 * Whether this chunk's name is settled only once the compilation hash exists, because
	 * the deferred pass writes that hash into its bytes. Marking it puts it in
	 * `createHash`'s full-hash round, where the name is taken again afterwards — which is
	 * what a chunk needing `__webpack_require__.p` gets for free, and what one that bakes
	 * the same text instead has to be given.
	 * @param {Chunk} chunk the chunk
	 * @returns {boolean} true when it was marked
	 */
	_bakesFullHash(chunk) {
		return (
			this._chunksBakingFullHash !== undefined &&
			this._chunksBakingFullHash.has(chunk)
		);
	}

	/**
	 * Finds the chunks whose bytes will carry the compilation hash and puts each in
	 * `createHash`'s full-hash round, so its name is taken after that hash exists rather
	 * than before. Read off what was generated rather than off what asked for it: a
	 * module restored from the persistent cache carries a stand-in without being
	 * generated again, and the token it carries is the whole question.
	 * @returns {void}
	 */
	_markChunksSettlingLate() {
		this._chunksBakingFullHash = new Set();
		const { compilation } = this;
		const chunkGraph = /** @type {ChunkGraph} */ (compilation.chunkGraph);
		const results = compilation.codeGenerationResults;
		if (results === undefined) return;
		/** @type {Map<Chunk, Set<string>>} */
		const namesBaked = new Map();
		this._namesBakedInto = namesBaked;
		/** @type {Map<string, Chunk>} */
		const chunksById = new Map();
		this._chunksByIdForFold = chunksById;
		for (const chunk of compilation.chunks) {
			if (chunk.id !== null) chunksById.set(String(chunk.id), chunk);
		}
		for (const chunk of compilation.chunks) {
			// One whose name does not move with its content has nothing to settle late.
			if (this._chunkNameIndependentOfContent(chunk)) continue;
			const demand = this._analyzableDemandOf(chunk, results, chunkGraph);
			if (demand === null) continue;
			if (demand.carriesFullHash) {
				this._chunksBakingFullHash.add(chunk);
				chunkGraph.attachFullHashModules(chunk, []);
			}
			if (demand.names.size > 0) namesBaked.set(chunk, demand.names);
		}
		// A late name makes the name it is baked into late too, and that one may be
		// baked further up — so this runs to a fixed point.
		let changed = true;
		while (changed) {
			changed = false;
			for (const [chunk, names] of namesBaked) {
				if (this._settlesLate(chunk)) continue;
				for (const id of names) {
					const other = chunksById.get(id);
					if (other === undefined || !this._settlesLate(other)) continue;
					chunkGraph.attachFullHashModules(chunk, []);
					changed = true;
					break;
				}
			}
		}
	}

	/**
	 * What the deferred pass will write into this chunk: whether any of it is built from
	 * the compilation hash, and which chunks it names. Read off what was generated rather
	 * than off what asked for it — a module restored from the persistent cache carries a
	 * stand-in without being generated again, and the stand-in spells its own recipe.
	 * @param {Chunk} chunk the chunk
	 * @param {CodeGenerationResults} results this compilation's generated code
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {{ carriesFullHash: boolean, names: Set<string> } | null} what it writes,
	 * or `null` where nothing is written
	 */
	_analyzableDemandOf(chunk, results, chunkGraph) {
		const modules = chunkGraph.getChunkModulesIterableBySourceType(
			chunk,
			JAVASCRIPT_TYPE
		);
		if (modules === undefined) return null;
		let carriesFullHash = false;
		/** @type {Set<string>} */
		const names = new Set();
		let found = false;
		// Its own copy, since `lastIndex` is walked below; reset by the loop that ends it.
		const regexp = new RegExp(
			ANALYZABLE_TOKEN_REGEXP.source,
			ANALYZABLE_TOKEN_REGEXP.flags
		);
		for (const module of modules) {
			if (!results.has(module, chunk.runtime)) continue;
			const source = results.getSource(module, chunk.runtime, JAVASCRIPT_TYPE);
			const content = source && source.source();
			if (typeof content !== "string") continue;
			if (this._hasReservedFullHash(content)) {
				carriesFullHash = true;
				found = true;
			}
			/** @type {RegExpExecArray | null} */
			let match;
			while ((match = regexp.exec(content)) !== null) {
				const parts = RuntimeTemplate._readAnalyzableSpecifier(match[1]);
				if (parts === null) continue;
				found = true;
				for (const [kind, value] of parts) {
					if (FULL_HASH_PART_KINDS.has(kind)) {
						carriesFullHash = true;
					} else if (CHUNK_SPECIFIER_PART_KINDS.has(kind)) {
						names.add(String(value));
					}
				}
			}
		}
		return found ? { carriesFullHash, names } : null;
	}

	/**
	 * Whether everything in front of a chunk's filename is text the fold can account for.
	 * `literal` is already in the chunk's modules, and `undo` is the `../` depth of the
	 * asset it lands in, which `_chunkPlacement` reads off the filename template with the
	 * hashes neutralized — so both are known while that chunk is hashed. A public path or
	 * a template is not: it resolves against the compilation hash, which by then is still
	 * being built out of this very hash.
	 * @param {SpecifierPart[]} prefix what goes in front of the filename
	 * @param {Iterable<Chunk>} chunks the chunks the stand-in is written into
	 * @returns {boolean} true when the filename is all that is left to account for
	 */
	_foldsWholeName(prefix, chunks) {
		for (const [kind] of prefix) {
			if (kind === "literal") continue;
			if (kind !== "undo") return false;
			// An `undo` resolves to each asset's own depth, so every chunk it may land in
			// has to have one this can be sure of.
			for (const chunk of chunks) {
				if (this._chunkPlacement(chunk).undo === null) return false;
			}
		}
		return true;
	}

	/**
	 * Folds the names this chunk will have filled in by the deferred pass into its own
	 * hash, so a name taken from that hash already stands for the bytes the fill leaves
	 * behind — what lets a chunk named by `[chunkhash]`, or by `[contenthash]` with
	 * nothing to repair it afterwards, hold a baked reference at all. The same thing
	 * `RuntimeModule.dependentHash` does for the runtime form of the reference.
	 *
	 * Asked of every chunk whose name could move, and answered from the chunk graph
	 * rather than from what was generated: a module restored from the persistent cache
	 * carries a stand-in without being generated again. That over-counts a chunk whose
	 * reference kept the runtime form, which costs a hash that changes when it needn't —
	 * never a name that stays put while the bytes move.
	 * Memoized because `createHash` asks twice — once for `chunk.hash` and once for
	 * `chunk.contentHash` — and nothing an earlier chunk contributes moves between the
	 * two, while the walk behind the answer is over everything the chunk reaches.
	 * @param {Chunk} chunk the chunk being hashed
	 * @param {Hash} hash its hash
	 * @returns {void}
	 */
	_foldAnalyzableNames(chunk, hash) {
		// Nothing to bring back in line where the name does not move with the content,
		// and folding there would move hashes that are settled correctly today.
		if (this._chunkNameIndependentOfContent(chunk)) return;
		// A chunk baking the compilation hash is asked twice with different answers —
		// once before that hash exists and once in the round that follows it — so the
		// memo would hand back the first one.
		const bakesFullHash = this._bakesFullHash(chunk);
		// A chunk settling late is asked once in its normal round and again in that one,
		// where what it reads has moved on, so the memo would hand back the first answer.
		const late = bakesFullHash || this._settlesLate(chunk);
		let folded = late ? undefined : this._foldedAnalyzableNames.get(chunk);
		if (folded === undefined) {
			const { compilation } = this;
			const { outputOptions } = compilation;
			// Read back off what was generated: walking the graph would fold in whatever
			// the group reaches, moving a split chunk that references nothing.
			const named = this._namesBakedInto && this._namesBakedInto.get(chunk);
			/** @type {Set<Chunk>} */
			const reachable = new Set();
			for (const id of named || []) {
				const referenced =
					this._chunksByIdForFold && this._chunksByIdForFold.get(id);
				if (referenced !== undefined) reachable.add(referenced);
			}
			// Its own `../` depth, which an `undo` stand-in in it resolves to. Constant per
			// chunk, but the bytes still move with it, so the name has to as well.
			const { undo } = this._chunkPlacement(chunk);
			const names = [undo === null ? "" : undo];
			// What the fill will write in place of every compilation-hash stand-in. Read
			// here rather than folded in as text elsewhere, because this is the one round
			// where it exists before the name is taken.
			if (bakesFullHash && compilation.hash !== undefined) {
				names.push(compilation.hash);
			}
			for (const referenced of reachable) {
				if (!this._hashesBefore(referenced, chunk)) continue;
				let byType = this._analyzableAssetNames.get(referenced);
				if (byType === undefined) {
					byType = new Map();
					this._analyzableAssetNames.set(referenced, byType);
				}
				for (const [contentHashType, naming] of CHUNK_ASSET_NAMING) {
					// No hash of that type is no asset of that type, so nothing names one.
					if (referenced.contentHash[contentHashType] === undefined) continue;
					let name = byType.get(contentHashType);
					if (name === undefined) {
						// The very call the fill makes, so what is folded in is what lands
						// there — a filename function included, which resolves to a name here
						// either way. Settled once: the hash it reads is, by `_hashesBefore`.
						name = compilation.getPath(
							naming.template(referenced, outputOptions),
							{
								chunk: referenced,
								runtime: referenced.runtime,
								contentHashType
							}
						);
						byType.set(contentHashType, name);
					}
					names.push(name);
				}
			}
			folded = names.join("\n");
			if (!late) this._foldedAnalyzableNames.set(chunk, folded);
		}
		if (folded !== "") hash.update(folded);
	}

	/**
	 * Drops what the fold cached, once `createHash` is done and nothing reads it again.
	 * Replaced rather than emptied: a `WeakMap` has no `clear`.
	 * @returns {void}
	 */
	_releaseAnalyzableNameCaches() {
		this._foldedAnalyzableNames = new WeakMap();
		this._analyzableAssetNames = new WeakMap();
		this._namesBakedInto = undefined;
		this._chunksByIdForFold = undefined;
	}

	/**
	 * Whether `chunk` can reach any of `targets` by following chunk groups, which is
	 * what turns a baked hashed name into a hash that depends on itself.
	 * @param {Chunk} chunk the referenced chunk
	 * @param {Iterable<Chunk>} targets the chunks the reference is written into
	 * @returns {boolean} true when one of them is reachable from `chunk`
	 */
	_reachesAny(chunk, targets) {
		const wanted = new Set(targets);
		if (wanted.size === 0) return false;
		if (wanted.has(chunk)) return true;
		/** @type {Set<ChunkGroup>} */
		const seen = new Set();
		/** @type {ChunkGroup[]} */
		const queue = [...chunk.groupsIterable];
		for (const group of queue) seen.add(group);
		for (let i = 0; i < queue.length; i++) {
			for (const child of queue[i].childrenIterable) {
				if (seen.has(child)) continue;
				seen.add(child);
				for (const candidate of child.chunks) {
					if (wanted.has(candidate)) return true;
				}
				queue.push(child);
			}
		}
		return false;
	}

	/**
	 * The chunks a reference emitted into `module` is written into — the assets a
	 * stand-in of ours would land in, and so the only ones a deferred fill could go
	 * stale in. Resolved through concatenation first: it may have absorbed the module
	 * that wrote the reference, and an absorbed one is in no chunk at all.
	 * @param {Module} module the module a reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {Iterable<Chunk>} the chunks holding it
	 */
	_moduleChunks(module, chunkGraph) {
		return chunkGraph.getModuleChunksIterable(
			getConcatenatedModule().getChunkGraphModule(this.compilation, module)
		);
	}

	/**
	 * The `../` path back out of a public path that needs a base, which is where the
	 * chunk loader puts what it fetches. Reads nothing but `output`, so it is answered
	 * once: `""` where the path adds no depth, `null` where its shape is unknown.
	 * @returns {string | null} the path back out of it
	 */
	_publicPathClimb() {
		if (this._publicPathClimbText === undefined) {
			const shape = this._publicPathShape();
			const undo =
				shape === undefined
					? null
					: getUndoPath(
							`${shape}x`,
							/** @type {string} */ (this.outputOptions.path),
							true
						);
			this._publicPathClimbText = undo === "./" ? "" : undo;
		}
		return this._publicPathClimbText;
	}

	/**
	 * Where a literal emitted into a chunk is read from: the `../` path back to the
	 * output root, and whether the chunk loader fetched the chunk through
	 * `output.publicPath` — such a chunk sits one public path below the root the runtime
	 * resolves against, where an initial chunk the host fetched does not. Reads only the
	 * chunk, so it is memoized on it and shared by every module in it.
	 * @param {Chunk} chunk a chunk a reference is written into
	 * @returns {Placement} where a literal in it is read from
	 */
	_chunkPlacement(chunk) {
		const cached = this._placementByChunk.get(chunk);
		if (cached !== undefined) return cached;
		const { compilation } = this;
		const { outputOptions } = compilation;
		const shape = this._chunkNameShape(chunk);
		const chunkName =
			shape === null
				? null
				: compilation.getPath(shape, {
						chunk,
						runtime: chunk.runtime,
						contentHashType: JAVASCRIPT_TYPE
					});
		const placement = {
			// A name whose shape is unknown has an unknown depth, and the deferred pass
			// reads the real one off the asset it lands in.
			undo:
				chunkName === null
					? null
					: getUndoPath(
							chunkName,
							/** @type {string} */ (outputOptions.path),
							true
						),
			// A chunk in an initial group and an async one both is served at two urls,
			// one public path apart, so no one literal in it is right for both.
			loaded: chunk.isOnlyInitial() ? false : chunk.canBeInitial() ? null : true
		};
		this._placementByChunk.set(chunk, placement);
		return placement;
	}

	/**
	 * The chunk's filename with every hash neutralized, which is all the `../` depth
	 * needs — hashes are not settled when this is asked and sit in the basename anyway.
	 * A function is asked for the template it returns rather than handed to `getPath`,
	 * which would have to resolve a placeholder in it against a hash that does not exist
	 * yet; one that builds the name out of a hash itself gets a stand-in to build from.
	 * @param {Chunk} chunk the chunk
	 * @returns {string | null} the shape, or `null` where it cannot be known
	 */
	_chunkNameShape(chunk) {
		const template = JavascriptModulesPlugin.getChunkFilenameTemplate(
			chunk,
			this.outputOptions
		);
		if (typeof template === "string") {
			return template.replace(HASH_IN_FILENAME_GLOBAL, "x");
		}
		try {
			return probeTemplateName(
				template,
				chunk,
				JAVASCRIPT_TYPE,
				HASH_PROBE,
				true
			).replace(HASH_IN_FILENAME_GLOBAL, "x");
		} catch (_error) {
			// Nothing to report: the naming call is given strictly less than this probe, so
			// one that throws here fails the build where the name is actually needed.
			return null;
		}
	}

	/**
	 * The `../` path from a chunk's own asset back to the output root. Hashes are
	 * neutralized first: a runtime module is generated once to be hashed, before any
	 * hash exists, so resolving one there throws — and `RuntimeModule.updateHash`
	 * swallows that, pinning the module's hash to the message.
	 * @param {Chunk} chunk the chunk whose asset holds the reference
	 * @param {boolean} enforceRelative whether the answer keeps a leading `./`
	 * @returns {string} the path back to the output root
	 */
	chunkRootOutputDir(chunk, enforceRelative) {
		const shape = this._chunkNameShape(chunk);
		const name = this.compilation.getPath(
			shape === null
				? JavascriptModulesPlugin.getChunkFilenameTemplate(
						chunk,
						this.outputOptions
					)
				: shape,
			{ chunk, contentHashType: JAVASCRIPT_TYPE }
		);
		return getUndoPath(
			name,
			/** @type {string} */ (this.outputOptions.path),
			enforceRelative
		);
	}

	/**
	 * The one answer every chunk holding a reference agrees on, with either half `null`
	 * where they do not — then no one literal is right for all of them.
	 * @param {Module} module the module the reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {Placement} where a literal in it is read from
	 */
	_modulePlacement(module, chunkGraph) {
		return this._placementOf(this._moduleChunks(module, chunkGraph));
	}

	/**
	 * Whether each of these chunks is served one way — either the host fetched it or the
	 * loader did, not both. One that is both is at two urls a public path apart with no
	 * answer of its own, which no per-asset stand-in can supply.
	 * @param {Iterable<Chunk>} chunks the chunks a literal is written into
	 * @returns {boolean} true when each has an answer to give
	 */
	_eachChunkServedOneWay(chunks) {
		for (const chunk of chunks) {
			if (this._chunkPlacement(chunk).loaded === null) return false;
		}
		return true;
	}

	/**
	 * The one answer every chunk in `chunks` agrees on, with either half `null` where
	 * they do not.
	 * @param {Iterable<Chunk>} chunks the chunks a literal is written into
	 * @returns {Placement} where a literal in them is read from
	 */
	_placementOf(chunks) {
		/** @type {Placement | undefined} */
		let first;
		/** @type {string | null} */
		let undo = null;
		/** @type {boolean | null} */
		let loaded = null;
		for (const chunk of chunks) {
			const own = this._chunkPlacement(chunk);
			if (first === undefined) {
				first = own;
				undo = own.undo;
				loaded = own.loaded;
				continue;
			}
			if (undo !== own.undo) undo = null;
			if (loaded !== own.loaded) loaded = null;
		}
		if (first === undefined) return NO_PLACEMENT;
		// A module in one chunk — nearly all of them — hands back what that chunk said,
		// so the common answer costs no object of its own.
		return undo === first.undo && loaded === first.loaded
			? first
			: { undo, loaded };
	}

	/**
	 * Static literal specifier (already quoted) for the `new URL(<here>, import.meta.url)`
	 * a worker or worklet entry chunk bakes to, or `null` to keep the runtime form. The
	 * gate and the build are asked together so every call site agrees on both — the
	 * `new Worker(...)` emit, and the resource hint `ResourceHintPlugin` spells for it.
	 * @param {string | undefined} overridePublicPath a `publicPath` set on the worker itself
	 * @param {Chunk} chunk the worker's entry chunk
	 * @param {Module} module the module the reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {RuntimeRequirements} runtimeRequirements what the consuming chunk needs
	 * @returns {string | null} a quoted literal, or `null` to fall back
	 */
	getAnalyzableWorkerUrl(
		overridePublicPath,
		chunk,
		module,
		chunkGraph,
		runtimeRequirements
	) {
		// Without an id nothing can name the chunk in a stand-in.
		if (
			chunk.id === null ||
			!this.supportsAnalyzable("url", chunkGraph, module)
		) {
			return null;
		}
		return this._getAnalyzableChunkSpecifier(
			overridePublicPath,
			chunk,
			module,
			chunkGraph,
			runtimeRequirements
		);
	}

	/**
	 * Static literal specifier (already quoted) for a `new URL(<here>, import.meta.url)`
	 * or `import(<here>)` pointing at `chunk`'s JS file, or `null` when it can't be known
	 * statically — a content hash in the filename, or a dynamic/templated publicPath.
	 * @param {string | undefined} overridePublicPath per-dependency public path (wins over `output.publicPath`)
	 * @param {Chunk} chunk the chunk to reference
	 * @param {Module | undefined} consumingModule the module the reference is emitted
	 * into, or `undefined` when `consumingChunks` names where it goes instead
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {RuntimeRequirements=} runtimeRequirements set when the caller wraps the result in
	 * `new URL(...)` and so accepts a runtime public path prefix around the literal filename
	 * @param {Chunk[]=} consumingChunks the chunks the reference is written into, where
	 * they are known without a module to read them from
	 * @param {string=} sourceType which half of the chunk is named — its javascript by
	 * default, or its stylesheet
	 * @returns {string | null} a JS string literal or expression, or `null` to fall back to the runtime form
	 */
	_getAnalyzableChunkSpecifier(
		overridePublicPath,
		chunk,
		consumingModule,
		chunkGraph,
		runtimeRequirements,
		consumingChunks,
		sourceType = JAVASCRIPT_TYPE
	) {
		const { compilation } = this;
		const { outputOptions } = compilation;
		const naming = CHUNK_ASSET_NAMING.get(sourceType);
		// Nothing here names this type's asset, so nothing can spell where it will be.
		if (naming === undefined) return null;
		const template = this._resolveChunkFilenameTemplate(
			naming.template(chunk, outputOptions),
			chunk,
			sourceType
		);
		if (template === null) return null;
		// A hashed name is settled long after this code is generated, so a stand-in is
		// emitted and filled in once the hash exists.
		const deferred = template === undefined || HASH_IN_FILENAME.test(template);
		// An id names the chunk in the stand-in, and one nothing could resolve would
		// reach the bundle verbatim. The whole name is re-resolved later rather than
		// carrying a stand-in of its own, so any hash spelling is fine here.
		// One of the two always names where the reference goes.
		const chunks =
			consumingChunks ||
			this._moduleChunks(/** @type {Module} */ (consumingModule), chunkGraph);
		const namesFirst = this._namesBeforeAll(chunk, chunks);
		// An id names the chunk in the stand-in. No reference reaches here without one —
		// `blockPromise` drops an id-less chunk before asking, and one the whole build
		// keeps has no name to be emitted under — so the guard carries no reason of its
		// own; it only keeps `null` out of a name. A pair naming each other is fine here:
		// `RealContentHashPlugin`, which deferring requires, re-hashes the pair as one
		// group, so neither hash chases the other.
		const canReserve =
			chunk.id !== null && this._canDeferAnalyzableName(chunks);
		// A content-named consumer bakes anyway when this chunk settles first: the fold
		// puts the name into its hash. Only what `_foldsWholeName` covers, though — and
		// a pair that reaches back has no fold order, so only the one hashing first does.
		const canFold = !canReserve && namesFirst;
		/**
		 * @returns {null} always, having recorded why no stand-in may be reserved
		 */
		const cannotReserve = () =>
			this._analyzableBailout(
				consumingModule,
				!namesFirst && this._reachesAny(chunk, chunks)
					? "this chunk and the one it references name each other, which only optimization.realContentHash could settle"
					: DEFER_BAILOUT,
				null
			);
		if (deferred && !canReserve && !canFold) return cannotReserve();
		const filename = deferred
			? ""
			: compilation.getPath(/** @type {string} */ (template), {
					chunk,
					// Matches what names the asset, or a placeholder resolved here would
					// not be the one on disk.
					runtime: chunk.runtime,
					contentHashType: sourceType
				});
		/**
		 * @param {SpecifierPart[]} prefix what goes in front of the chunk's filename
		 * @returns {string | null} the specifier already quoted, or `null` when the
		 * recipe needs a stand-in that cannot be reserved
		 */
		const specifier = (prefix) => {
			if (!deferred) {
				const text = literalText(prefix);
				if (text !== null) return toJsStringLiteral(text + filename);
			}
			if (!canReserve && !(canFold && this._foldsWholeName(prefix, chunks))) {
				return cannotReserve();
			}
			return toJsStringLiteral(
				this._reserveAnalyzableSpecifier([
					...prefix,
					[naming.standIn, /** @type {ChunkId} */ (chunk.id)]
				])
			);
		};
		if (overridePublicPath) {
			const resolved = this._resolvePublicPathPrefix(
				overridePublicPath,
				consumingModule,
				chunks
			);
			return resolved === null ? null : specifier(resolved);
		}
		const { publicPath } = outputOptions;
		if (publicPath === "auto") {
			const { undo } = this._placementOf(chunks);
			if (undo !== null) return specifier([["literal", undo]]);
			// Different depths — no one `../` path is right for every asset the reference
			// lands in, so the deferred pass builds each asset's own.
			const perAsset = specifier([["undo", ""]]);
			if (perAsset !== null) return perAsset;
			// Only a stand-in that could not be reserved reaches here, and `specifier`
			// has already recorded why.
			if (deferred || !runtimeRequirements) return null;
			// No bundler follows a concatenation, but a `new URL(...)` caller still sheds
			// the `.u(id)` lookup this way; `import()` needs a static specifier.
			runtimeRequirements.add(RuntimeGlobals.publicPath);
			return `${RuntimeGlobals.publicPath} + ${toJsStringLiteral(filename)}`;
		}
		const prefix = this._analyzablePathPrefix(
			consumingModule,
			chunkGraph,
			chunks
		);
		return prefix === null ? null : specifier(prefix);
	}

	/**
	 * The parts that go in front of a name so a literal read from the chunk holding it
	 * reaches what the runtime would. A public path needing no base is the whole answer.
	 * One that needs a base is read from the output root, so the `../` path back there
	 * comes first — and is the whole answer again where the chunk loader fetched this
	 * chunk through that same path, since climbing out of it only to spell it again
	 * names the place it started from. An entry `baseUri` sits between the two, so
	 * there both are written. Never asked of an `auto` public path, which is no path
	 * to walk back over.
	 * @param {Module | undefined} module the module the reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {Iterable<Chunk>} chunks the chunks a stand-in would be written into
	 * @param {string=} relativeBase an entry `baseUri` read against the output root
	 * @returns {SpecifierPart[] | null} the parts, or `null` having recorded why not
	 */
	_analyzablePathPrefix(module, chunkGraph, chunks, relativeBase) {
		const publicPath = /** @type {PublicPath} */ (
			this.outputOptions.publicPath
		);
		const shape = this._publicPathShape();
		if (shape === undefined) return null;
		const resolve = () =>
			this._resolvePublicPathPrefix(publicPath, module, chunks);
		if (isBaseIndependent(shape)) return resolve();
		const { undo, loaded } = this._placementOf(chunks);
		// What a chunk the loader fetched climbs back out of. One of no depth leaves
		// nothing to climb, and then both answers put the same text in front.
		const served = this._publicPathClimb();
		const climb =
			loaded === null ? (served === "" ? "" : null) : loaded ? served : "";
		/** @type {SpecifierPart[]} */
		const head = [undo === null ? ["undo", ""] : ["literal", undo]];
		if (climb === null) {
			// Each knows its own answer, so the fill asks per asset — where each has one,
			// and where nothing else goes between the two shapes.
			if (relativeBase !== undefined || !this._eachChunkServedOneWay(chunks)) {
				return this._analyzableBailout(module, SERVED_BAILOUT, null);
			}
			return [...head, ["unserved", ""]];
		}
		if (climb !== "" && relativeBase === undefined) return head;
		const resolved = resolve();
		if (resolved === null) return null;
		if (climb !== "") head.push(["literal", climb]);
		if (relativeBase !== undefined) head.push(["literal", relativeBase]);
		head.push(...rootedParts(resolved));
		return head;
	}

	/**
	 * What a public path puts in front of a filename, as the parts it is built from.
	 * A plain one is literal text. A templated one is resolved as far as code
	 * generation can, leaving the compilation hash it may carry as a stand-in exactly
	 * as `PublicPathRuntimeModule` resolves the same string once that hash exists — and
	 * a hash re-encoded to another digest, which no stand-in can carry, is handed to
	 * the deferred pass whole instead. A function is called for its value rather than
	 * read as a template, so one whose answer moves with the hash is called again there.
	 * @param {PublicPath} publicPath the configured public path
	 * @param {Module=} module the module the reference is emitted into, to record why
	 * a name no stand-in may be reserved for kept the runtime form
	 * @param {Iterable<Chunk>=} chunks the chunks a stand-in would be written into
	 * @returns {SpecifierPart[] | null} the parts, or `null` when it cannot be known
	 */
	_resolvePublicPathPrefix(publicPath, module, chunks) {
		if (typeof publicPath === "function") {
			// One that answers nothing to a probe cannot be placed, absolute or not.
			if (this._publicPathShape() === undefined) return null;
			const resolved = this._resolveHashIndependent(
				publicPath,
				this._publicPathShape()
			);
			if (resolved !== null) return [["literal", resolved]];
			// Called again by the fill against the compilation hash, so what it answers
			// there is that hash by another name.
			return this._canDeferOrBakeFullHash(true, chunks, module)
				? [["publicPath", ""]]
				: null;
		}
		if (!publicPath.includes("[")) return [["literal", publicPath]];
		// A re-encoded digest cannot be spelled by a stand-in, so it stays a template.
		if (getTemplatedPathPlugin().usesFullHashDigest(publicPath)) {
			return this._canDeferOrBakeFullHash(true, chunks, module)
				? [["template", publicPath]]
				: null;
		}
		const literal = this.compilation.getPath(
			publicPath,
			this._deferredFullHashPathData()
		);
		return this._canDeferOrBakeFullHash(
			this._hasReservedFullHash(literal),
			chunks,
			module
		)
			? [["literal", literal]]
			: null;
	}

	/**
	 * `output.publicPath` as the text it will have the shape of — a function's answer to
	 * a stand-in hash, which says whether it is absolute even when its value is not
	 * settled yet. `"auto"` reads as the empty string, which needs a base and so takes
	 * the path that needs no answer; a function that answers nothing says nothing about
	 * its shape either, and nothing may be built on it.
	 * @returns {string | undefined} the shape of the public path
	 */
	_publicPathShape() {
		if (this._publicPathShapeText === undefined) {
			const { publicPath } = this.outputOptions;
			if (typeof publicPath !== "function") {
				this._publicPathShapeText = publicPath === "auto" ? "" : publicPath;
			} else {
				try {
					this._publicPathShapeText = this.compilation.getPath(publicPath, {
						hash: HASH_PROBE
					});
				} catch (_error) {
					this._publicPathShapeText = false;
				}
			}
		}
		return this._publicPathShapeText === false
			? undefined
			: this._publicPathShapeText;
	}

	/**
	 * A path built by a function, resolved to the value it will have — or `null` when
	 * it moves with the compilation hash, which code generation does not know.
	 * @param {import("./TemplatedPathPlugin").TemplatePathFn<EXPECTED_ANY>} fn the function
	 * @param {string | undefined} value its answer to the first probe, or `undefined`
	 * when it answered nothing
	 * @returns {string | null} the settled value, or `null` when it is hash-dependent
	 */
	_resolveHashIndependent(fn, value) {
		// The shape is this function's answer to the first probe, already taken and
		// memoized, so only the second one is new here.
		if (value === undefined) return null;
		try {
			return this.compilation.getPath(fn, { hash: HASH_PROBE_ALTERNATE }) ===
				value
				? value
				: null;
		} catch (_error) {
			// One that needs more than a hash can't be resolved here.
			return null;
		}
	}

	/**
	 * Static literal specifier (already quoted) for a `new URL(<here>, import.meta.url)`
	 * pointing at an emitted file — an asset, or a wasm binary. The base is the asset the
	 * reference sits in; the runtime form resolves against the output root instead, so a
	 * public path that needs a base is put behind the `../` path back to that root rather
	 * than baked as the whole prefix.
	 * @param {Module} module the module the reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {SpecifierPart[]} file the emitted file's name, relative to the output root
	 * @param {boolean} bakePublicPath whether the public path belongs in the literal
	 * @param {string=} relativeBase an entry `baseUri` the runtime reads against the
	 * chunk, so it belongs between the path back to the output root and the public path
	 * @returns {string | null} a quoted literal, or `null` to fall back
	 */
	_getAnalyzableFileSpecifier(
		module,
		chunkGraph,
		file,
		bakePublicPath,
		relativeBase
	) {
		const { publicPath } = this.outputOptions;
		const chunks = this._moduleChunks(module, chunkGraph);
		if (bakePublicPath && publicPath !== "auto") {
			const prefix = this._analyzablePathPrefix(
				module,
				chunkGraph,
				chunks,
				relativeBase
			);
			if (prefix === null) return null;
			return this._specifierOf([...prefix, ...file], chunks, module);
		}
		// No public path to place it against, so the `../` path back to the output root
		// is the whole prefix. Different depths — no one is right for every asset the
		// reference is emitted into, so the deferred pass builds each asset's own.
		const { undo } = this._modulePlacement(module, chunkGraph);
		/** @type {SpecifierPart[]} */
		const parts = [undo === null ? ["undo", ""] : ["literal", undo]];
		if (relativeBase !== undefined) parts.push(["literal", relativeBase]);
		parts.push(...file);
		return this._specifierOf(parts, chunks, module);
	}

	/**
	 * Static `new URL(<file>, import.meta.url)` for every stylesheet a runtime can load,
	 * keyed by chunk id — one that cannot be named leaves the map incomplete, and its
	 * id keeps the runtime `publicPath + getChunkCssFilename(id)` form. Both the runtime module reading them
	 * and the plugin declaring what it needs ask this, so the two always agree. The
	 * runtime hands an absolute url string to `link.href`, and so does this — the browser
	 * resolves the element against the document, which is not where the chunk sits, and
	 * the loader reads the url as text either way. Nothing is written out for a runtime
	 * that also carries the hot handler; see below.
	 * @param {Chunk} runtimeChunk the chunk holding the stylesheet loader
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements what that chunk needs
	 * @param {Module=} consumingModule the runtime module, where one exists to report against
	 * @returns {AnalyzableChunkUrls | null} the urls, or `null` to keep the runtime form
	 */
	analyzableCssChunkUrls(
		runtimeChunk,
		chunkGraph,
		runtimeRequirements,
		consumingModule
	) {
		const { chunkHasCss } = getCssModulesPlugin();
		// An initial stylesheet is already in the document, but the hot path re-loads it
		// by id like any other, so it needs a url here too.
		const reachable = new Set([
			...runtimeChunk.getAllReferencedChunks(),
			...runtimeChunk.getAllInitialChunks()
		]);
		const chunks = [];
		for (const chunk of reachable) {
			if (chunkHasCss(chunk, chunkGraph)) chunks.push(chunk);
		}
		return this._analyzableChunkUrls(
			chunks,
			chunkGraph,
			consumingModule,
			[runtimeChunk],
			CSS_TYPE,
			runtimeRequirements
		);
	}

	/**
	 * Static `new URL(<file>, import.meta.url).href` for every javascript chunk a
	 * runtime can hint at with `<link rel="prefetch"/"modulepreload">`, keyed by chunk
	 * id — one that cannot be named leaves the map incomplete, and its id keeps the
	 * runtime `publicPath + getChunkScriptFilename(id)` form. Both the runtime module reading
	 * them and the plugin declaring what it needs ask this, so the two always agree.
	 * @param {Chunk} runtimeChunk the chunk holding the hint handlers
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements what that chunk needs
	 * @param {Module=} consumingModule the runtime module, where one exists to report against
	 * @returns {AnalyzableChunkUrls | null} the urls, or `null` to keep the runtime form
	 */
	analyzableChunkScriptUrls(
		runtimeChunk,
		chunkGraph,
		runtimeRequirements,
		consumingModule
	) {
		// Only a child some order names reaches a handler. Every order counts, not the
		// two that reach javascript today: an unknown one costs bytes, not a missing url.
		const orders = runtimeChunk.getChildIdsByOrdersMap(
			chunkGraph,
			true,
			JavascriptModulesPlugin.chunkHasJs
		);
		/** @type {Set<ChunkId>} */
		const hinted = new Set();
		for (const byParent of Object.values(orders)) {
			for (const ids of Object.values(byParent)) {
				for (const id of ids) hinted.add(id);
			}
		}
		/** @type {Chunk[]} */
		const chunks = [];
		for (const chunk of runtimeChunk.getAllReferencedChunks()) {
			if (hinted.has(/** @type {ChunkId} */ (chunk.id))) chunks.push(chunk);
		}
		return this._analyzableChunkUrls(
			chunks,
			chunkGraph,
			consumingModule,
			[runtimeChunk],
			JAVASCRIPT_TYPE,
			runtimeRequirements
		);
	}

	/**
	 * The urls of one asset of each of `chunks`, written out so they can be read by
	 * chunk id. A chunk that cannot be named here leaves the map incomplete rather
	 * than losing it — the consumer keeps the runtime form for the ids the map lacks.
	 * @param {Iterable<Chunk>} chunks the chunks whose asset is wanted
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {Module | undefined} consumingModule the runtime module, where one exists to report against
	 * @param {Chunk[]} consumingChunks the chunks the urls are written into
	 * @param {string} sourceType which asset of each chunk to name
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements what the runtime chunk needs
	 * @returns {AnalyzableChunkUrls | null} the urls, or `null` to keep the runtime form
	 */
	_analyzableChunkUrls(
		chunks,
		chunkGraph,
		consumingModule,
		consumingChunks,
		sourceType,
		runtimeRequirements
	) {
		// A map written now cannot answer for whatever id an update names, so it yields
		// to HMR — analyzable output is what ships.
		if (
			runtimeRequirements.has(RuntimeGlobals.hmrDownloadUpdateHandlers) ||
			!this.supportsAnalyzable("url-runtime", chunkGraph, consumingModule)
		) {
			return null;
		}
		/** @type {Map<ChunkId, string>} */
		const urls = new Map();
		let complete = true;
		for (const chunk of chunks) {
			if (chunk.id === null) continue;
			const specifier = this._getAnalyzableChunkSpecifier(
				undefined,
				chunk,
				consumingModule,
				chunkGraph,
				undefined,
				consumingChunks,
				sourceType
			);
			// `_getAnalyzableChunkSpecifier` has already recorded why.
			if (specifier === null) {
				complete = false;
				continue;
			}
			urls.set(chunk.id, `${this.importMetaUrl(specifier)}.href`);
		}
		return urls.size > 0 ? { urls, complete } : null;
	}

	/**
	 * Static `new URL(<file>, import.meta.url)` for the binary emitted for an async wasm
	 * module. Only called when `supportsAnalyzable("wasm")` holds.
	 * @param {Module} module the async wasm module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
	 * @returns {string} expression evaluating to the binary's URL
	 */
	getAnalyzableWasmUrl(module, chunkGraph, runtime, runtimeRequirements) {
		const { compilation } = this;
		const template = /** @type {string} */ (
			this.outputOptions.webassemblyModuleFilename
		);
		// The module's own hash and id are settled here, the compilation's is not — and
		// a placeholder nothing answers is left in the name, so what comes back is either
		// the final name or a template carrying only `[fullhash]`.
		const filename = compilation.getPath(template, {
			module,
			runtime,
			chunkGraph
		});
		// Only a fetched binary carries the public path: `readFile` addresses it relative
		// to the chunk anyway. One needing a base is spelled as an asset url is.
		const specifier = this._getAnalyzableFileSpecifier(
			module,
			chunkGraph,
			[[filename.includes("[") ? "template" : "literal", filename]],
			this._wasmModuleFetches(module, chunkGraph)
		);
		if (specifier !== null) return this.importMetaUrl(specifier);
		// No bundler follows a concatenation, but this still sheds the module id and
		// hash the runtime form would need.
		runtimeRequirements.add(RuntimeGlobals.publicPath);
		return this.importMetaUrl(
			`${RuntimeGlobals.publicPath} + ${toJsStringLiteral(
				compilation.getPath(template, {
					module,
					runtime,
					chunkGraph,
					...this._deferredFullHashPathData()
				})
			)}`
		);
	}

	/**
	 * The chunk filename template as a plain string. A function is called twice, with
	 * a different stand-in hash each time; disagreeing answers mean the name depends on
	 * a hash, which is not knowable during code generation, so it is left to the
	 * deferred pass to ask again once the hashes are settled.
	 * @param {ChunkFilenameTemplate} filenameTemplate the configured template
	 * @param {Chunk} chunk the chunk being referenced
	 * @param {string} contentHashType which of the chunk's hashes the name reads
	 * @returns {string | undefined | null} the template, `undefined` to defer, or
	 * `null` to fall back
	 */
	_resolveChunkFilenameTemplate(filenameTemplate, chunk, contentHashType) {
		if (typeof filenameTemplate === "string") return filenameTemplate;
		try {
			// Everything the naming call is given except the hashes, so only a hash can
			// make the two answers differ.
			const template = probeTemplateName(
				filenameTemplate,
				chunk,
				contentHashType,
				HASH_PROBE,
				true
			);
			const probe = probeTemplateName(
				filenameTemplate,
				chunk,
				contentHashType,
				HASH_PROBE_ALTERNATE,
				false
			);
			return template === probe ? template : undefined;
		} catch (_error) {
			// Nothing to report: the probe is given strictly more than the naming call,
			// so one that throws here throws there too and fails the build regardless.
			return null;
		}
	}

	/**
	 * Whether `module`'s binary is read through `fetch`, the one loader the public path
	 * reaches. Asked of its runtimes, not its chunks: only an entry names a loader.
	 * @param {Module} module the async wasm module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {boolean} true when every runtime reaching it fetches
	 */
	_wasmModuleFetches(module, chunkGraph) {
		const { onlyFetching } = this._wasmGroups();
		let placed = false;
		for (const moduleRuntime of chunkGraph.getModuleRuntimes(module)) {
			for (const group of this._wasmGroupsOf(moduleRuntime)) {
				placed = true;
				if (!onlyFetching.get(group)) return false;
			}
		}
		// In no runtime at all nothing named a loader, so `output` answers.
		return placed || this.outputOptions.wasmLoading === "fetch";
	}

	/**
	 * The loader a chunk's WebAssembly is read with. An entry names one, and every
	 * other chunk of the runtime is served by the one its entry asked for — so one
	 * that is no entry answers with what `output` says.
	 * @param {Chunk} chunk the chunk
	 * @returns {WasmLoading} the loader it is served by
	 */
	_chunkWasmLoading(chunk) {
		const entryOptions = chunk.getEntryOptions();
		return entryOptions && entryOptions.wasmLoading !== undefined
			? entryOptions.wasmLoading
			: this.outputOptions.wasmLoading;
	}

	/**
	 * Async module factory.
	 * @param {object} options options
	 * @param {AsyncDependenciesBlock} options.block the async block
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {string=} options.request request string used originally
	 * @param {Module=} options.originModule the module the factory is emitted into
	 * @returns {string} expression
	 */
	asyncModuleFactory({
		block,
		chunkGraph,
		runtimeRequirements,
		request,
		originModule
	}) {
		const dep = block.dependencies[0];
		const module = chunkGraph.moduleGraph.getModule(dep);
		const ensureChunk = this.blockPromise({
			block,
			message: "",
			chunkGraph,
			runtimeRequirements,
			originModule
		});
		const factory = this.returningFunction(
			this.moduleRaw({
				module,
				chunkGraph,
				request,
				runtimeRequirements
			})
		);
		return this.returningFunction(
			ensureChunk.startsWith("Promise.resolve(")
				? `${factory}`
				: `${ensureChunk}.then(${this.returningFunction(factory)})`
		);
	}

	/**
	 * Sync module factory.
	 * @param {object} options options
	 * @param {Dependency} options.dependency the dependency
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {string=} options.request request string used originally
	 * @returns {string} expression
	 */
	syncModuleFactory({ dependency, chunkGraph, runtimeRequirements, request }) {
		const module = chunkGraph.moduleGraph.getModule(dependency);
		const factory = this.returningFunction(
			this.moduleRaw({
				module,
				chunkGraph,
				request,
				runtimeRequirements
			})
		);
		return this.returningFunction(factory);
	}

	/**
	 * Define es module flag statement.
	 * @param {object} options options
	 * @param {string} options.exportsArgument the name of the exports object
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @returns {string} statement
	 */
	defineEsModuleFlagStatement({ exportsArgument, runtimeRequirements }) {
		runtimeRequirements.add(RuntimeGlobals.makeNamespaceObject);
		runtimeRequirements.add(RuntimeGlobals.exports);
		return `${RuntimeGlobals.makeNamespaceObject}(${exportsArgument});\n`;
	}

	/**
	 * Reserves a name only the deferred pass can spell, as a stand-in that looks like a
	 * relative specifier so the code around it needs no special case. It carries what it
	 * resolves to rather than an index into per-build state — a module restored from the
	 * persistent cache is never generated again.
	 * @param {SpecifierPart[]} parts what the stand-in resolves to, in order
	 * @returns {string} the stand-in to emit
	 */
	_reserveAnalyzableSpecifier(parts) {
		return `./@@webpackAnalyzableChunk:${Buffer.from(JSON.stringify(parts))
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/[=]/g, "")}@@`;
	}

	/**
	 * Whether text still carries a compilation-hash stand-in, so nothing may be resolved
	 * against it here — the fill would land inside an already-resolved result.
	 * @param {string} value text that may carry one
	 * @returns {boolean} true when one is present
	 */
	_hasReservedFullHash(value) {
		return value.includes(FULL_HASH_TOKEN_PREFIX);
	}

	/**
	 * `getPath` data that leaves every compilation-hash placeholder as a stand-in while
	 * the rest of the name resolves.
	 * @returns {typeof DEFERRED_FULL_HASH_PATH_DATA} the path data
	 */
	_deferredFullHashPathData() {
		return DEFERRED_FULL_HASH_PATH_DATA;
	}

	/**
	 * Fills in the names reserved during code generation, once the hashes they are built
	 * from exist: a chunk's own filename, and the compilation hash inside any other
	 * emitted asset's. Replaces in place so the asset keeps its mappings, and runs before
	 * anything reads it — `RealContentHashPlugin` still repairs each rewritten chunk's own
	 * name later. Registered wherever `output.module` is read, since nothing reserves a
	 * stand-in without it — a reservation cannot arrange this itself, as a module restored
	 * from the cache carries one without being generated again.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	static fillReservedNames(compiler) {
		compiler.hooks.compilation.tap(PASS_NAME, (compilation) => {
			const cache = compilation.getCache(PASS_NAME);
			// Code generation is over, so what carries the compilation hash is settled and
			// each such chunk can be moved into the round that follows that hash.
			compilation.hooks.beforeHash.tap(PASS_NAME, () => {
				compilation.runtimeTemplate._markChunksSettlingLate();
			});
			// Reaches both `chunk.hash` and `chunk.contentHash.javascript`, the two a
			// filled-in name can leave behind.
			JavascriptModulesPlugin.getCompilationHooks(compilation).chunkHash.tap(
				PASS_NAME,
				(chunk, hash) => {
					compilation.runtimeTemplate._foldAnalyzableNames(chunk, hash);
				}
			);
			// Nothing past hashing reads what the fold cached, and it holds a name per
			// edge between chunks, so it is dropped rather than kept until seal.
			compilation.hooks.afterHash.tap(PASS_NAME, () => {
				compilation.runtimeTemplate._releaseAnalyzableNameCaches();
			});
			compilation.hooks.processAssets.tapPromise(
				{
					name: PASS_NAME,
					// Before source maps are written and before a minifier runs: both read
					// the asset, and a stand-in is a different length than what replaces it.
					// Every hash it reads is already settled — `createHash` runs ahead of
					// every `processAssets` stage — and `RealContentHashPlugin` still repairs
					// the names afterwards.
					stage: getCompilation().PROCESS_ASSETS_STAGE_DERIVED
				},
				async () => {
					const { outputOptions } = compilation;
					const fullHash = compilation.hash;
					/** @type {Map<string, Chunk> | undefined} */
					let chunksById;
					/** @type {Map<string, Chunk> | undefined} */
					let chunkByAsset;
					/** @type {string | undefined} */
					let publicPathText;
					// One value for the whole pass, however many stand-ins read it.
					const resolvedPublicPath = () => {
						if (publicPathText === undefined) {
							publicPathText = compilation.getPath(
								outputOptions.publicPath || "",
								{}
							);
						}
						return publicPathText;
					};
					/**
					 * @param {string} name an emitted asset's name
					 * @returns {Chunk | undefined} the chunk it was emitted for
					 */
					const chunkOf = (name) => {
						if (chunkByAsset === undefined) {
							chunkByAsset = new Map();
							for (const chunk of compilation.chunks) {
								for (const file of chunk.files) chunkByAsset.set(file, chunk);
							}
						}
						return chunkByAsset.get(name);
					};
					/**
					 * @param {string} value text that may carry compilation-hash stand-ins
					 * @returns {string} the text with each of them filled in
					 */
					const fillFullHash = (value) => {
						if (fullHash === undefined) return value;
						FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
						return value.replace(FULL_HASH_TOKEN_REGEXP, (_match, length) =>
							length === undefined
								? fullHash
								: fullHash.slice(0, Number(length))
						);
					};
					/**
					 * @param {string} payload the encoded half of a stand-in
					 * @param {string} assetName name of the asset the stand-in sits in
					 * @returns {string | null} the specifier, or `null` if unresolvable
					 */
					const resolve = (payload, assetName) => {
						const parts = RuntimeTemplate._readAnalyzableSpecifier(payload);
						if (parts === null) return null;
						/** @type {string | undefined} */
						let base;
						let specifier = "";
						for (const [kind, value] of parts) {
							if (kind === "base") {
								base = /** @type {string} */ (value);
							} else if (kind === "literal") {
								specifier += value;
							} else if (kind === "undo") {
								specifier += getUndoPath(
									assetName,
									/** @type {string} */ (outputOptions.path),
									true
								);
							} else if (kind === "template") {
								specifier += compilation.getPath(
									/** @type {string} */ (value),
									{}
								);
							} else if (kind === "publicPath") {
								specifier += resolvedPublicPath();
							} else if (kind === "unserved") {
								const holder = chunkOf(assetName);
								if (holder === undefined) return null;
								// Only an asset the host fetched needs the public path put in
								// front. One the loader fetched already sits under it, and the
								// `../` ahead of this walked back to exactly there.
								if (
									compilation.runtimeTemplate._chunkPlacement(holder).loaded ===
									false
								) {
									const path = resolvedPublicPath();
									// The `../` already reached the root this is read from.
									specifier += path.startsWith("./") ? path.slice(2) : path;
								}
							} else {
								const naming = CHUNK_ASSET_NAMING_BY_STAND_IN.get(kind);
								// Nothing reserves a kind this pass cannot spell, so one arriving
								// here was written by something else and names no asset of ours.
								if (naming === undefined) return null;
								if (chunksById === undefined) {
									chunksById = new Map();
									for (const chunk of compilation.chunks) {
										if (chunk.id !== null) {
											chunksById.set(String(chunk.id), chunk);
										}
									}
								}
								const chunk = chunksById.get(String(value));
								if (chunk === undefined) return null;
								specifier += compilation.getPath(
									naming.template(chunk, outputOptions),
									// Matches what names the asset, or a placeholder resolved here would
									// not be the one on disk.
									{
										chunk,
										runtime: chunk.runtime,
										contentHashType: naming.contentHashType
									}
								);
							}
						}
						if (base !== undefined) {
							// An entry base replaces the output root, so the rest is read against it
							// here exactly as the runtime would have read it against `.b`.
							try {
								return new URL(fillFullHash(specifier), base).href;
							} catch (_error) {
								return null;
							}
						}
						// A bare specifier is a package name, so make it explicitly relative the way
						// the chunk loader does. A literal part may still carry a stand-in of its own,
						// so finish those here rather than scanning again.
						return fillFullHash(
							/^(?:\.{0,2}\/|[a-zA-Z][\w+.-]*:)/.test(specifier)
								? specifier
								: `./${specifier}`
						);
					};
					/** @type {{ name: string, source: Source, replacements: Replacement[] }[]} */
					const tasks = [];

					for (const name of Object.keys(compilation.assets)) {
						const source = compilation.assets[name];
						const content = source.source();
						if (typeof content !== "string") continue;
						ANALYZABLE_TOKEN_REGEXP.lastIndex = 0;
						FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
						const hasChunkToken = ANALYZABLE_TOKEN_REGEXP.test(content);
						const hasFullHashToken =
							fullHash !== undefined && FULL_HASH_TOKEN_REGEXP.test(content);
						if (!hasChunkToken && !hasFullHashToken) continue;
						/** @type {Replacement[]} */
						const replacements = [];
						/**
						 * @param {RegExp} pattern what to look for
						 * @param {(match: string, group: string) => string | null} fill what to put there
						 * @returns {void}
						 */
						const collect = (pattern, fill) => {
							// Its own instance: `fill` may run the shared one over what it
							// returns, and a `replace` there would rewind this scan.
							const regexp = new RegExp(pattern.source, pattern.flags);
							/** @type {RegExpExecArray | null} */
							let match;
							while ((match = regexp.exec(content)) !== null) {
								const value = fill(match[0], match[1]);
								if (value === null) continue;
								replacements.push([
									match.index,
									match.index + match[0].length - 1,
									value
								]);
							}
						};
						if (hasChunkToken) {
							collect(ANALYZABLE_TOKEN_REGEXP, (_match, payload) =>
								resolve(payload, name)
							);
						}
						if (hasFullHashToken) {
							collect(FULL_HASH_TOKEN_REGEXP, (match) => fillFullHash(match));
						}
						if (replacements.length === 0) continue;

						tasks.push({ name, source, replacements });
					}
					if (tasks.length === 0) return;

					await Promise.all(
						tasks.map(async ({ name, source, replacements }) => {
							const replaced = await cache.providePromise(
								name,
								cache.mergeEtags(
									cache.getLazyHashedEtag(source),
									JSON.stringify(replacements)
								),
								() => {
									const replacedSource = new ReplaceSource(source);
									for (const [start, end, value] of replacements) {
										replacedSource.replace(start, end, value);
									}
									return new CachedSource(replacedSource);
								}
							);
							compilation.updateAsset(name, replaced);
						})
					);
				}
			);
		});
	}

	/**
	 * Reads back what `_reserveAnalyzableSpecifier` wrote. Source of our own can spell the
	 * token too, so nothing about a payload is given and every shape it does not produce
	 * is refused rather than reached for.
	 * @param {string} payload the encoded half of a stand-in
	 * @returns {SpecifierPart[] | null} what it resolves to, or `null` if unreadable
	 */
	static _readAnalyzableSpecifier(payload) {
		/** @type {EXPECTED_ANY} */
		let decoded;
		try {
			decoded = JSON.parse(
				Buffer.from(
					payload.replace(/-/g, "+").replace(/_/g, "/"),
					"base64"
				).toString()
			);
		} catch (_error) {
			return null;
		}
		if (!Array.isArray(decoded)) return null;
		for (const part of decoded) {
			if (!Array.isArray(part) || part.length !== 2) return null;
			if (!SPECIFIER_PART_KINDS.has(part[0])) return null;
			// Only a chunk id may be a number; the rest are read as text.
			if (
				typeof part[1] !== "string" &&
				(!CHUNK_SPECIFIER_PART_KINDS.has(part[0]) ||
					typeof part[1] !== "number")
			) {
				return null;
			}
		}
		return decoded;
	}
}

module.exports = RuntimeTemplate;
