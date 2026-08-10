/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const APIPlugin = require("./APIPlugin");

const InitFragment = require("./InitFragment");
const {
	JAVASCRIPT_TYPE,
	RUNTIME_TYPE
} = require("./ModuleSourceTypeConstants");
const {
	WEBPACK_MODULE_TYPE_CONSUME_SHARED_MODULE,
	WEBPACK_MODULE_TYPE_FALLBACK,
	WEBPACK_MODULE_TYPE_PROVIDE,
	WEBPACK_MODULE_TYPE_REMOTE
} = require("./ModuleTypeConstants");
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
const { equals } = require("./util/ArrayHelpers");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const compileBooleanMatcher = require("./util/compileBooleanMatcher");
const { getUndoPath, toJsStringLiteral } = require("./util/identifier");
const memoize = require("./util/memoize");
const { propertyAccess, propertyName } = require("./util/property");
const { forEachRuntime, subtractRuntime } = require("./util/runtime");

const getTemplatedPathPlugin = memoize(() => require("./TemplatedPathPlugin"));
const getAnalyzableChunkHashPlugin = memoize(() =>
	require("./esm/AnalyzableChunkHashPlugin")
);

// Module-federation module types whose chunks load through the federation runtime.
/** @type {Set<string>} */
const FEDERATION_MODULE_TYPES = new Set([
	WEBPACK_MODULE_TYPE_REMOTE,
	WEBPACK_MODULE_TYPE_PROVIDE,
	WEBPACK_MODULE_TYPE_CONSUME_SHARED_MODULE,
	WEBPACK_MODULE_TYPE_FALLBACK
]);

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

/** @typedef {import("./config/defaults").OutputNormalizedWithDefaults} OutputOptions */
/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Chunk").ChunkFilenameTemplate} ChunkFilenameTemplate */
/** @typedef {import("./Chunk").ChunkId} ChunkId */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./Module").BuildMeta} BuildMeta */
/** @typedef {import("./Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("./dependencies/ImportPhase").ImportPhaseType} ImportPhaseType */
/** @typedef {import("./NormalModuleFactory").ModuleDependency} ModuleDependency */

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
	}

	isIIFE() {
		return this.outputOptions.iife;
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

	supportsModulePreload() {
		return this.outputOptions.environment.modulePreload;
	}

	supportsAnalyzableEsm() {
		// `eval` devtool wraps each module in `eval(...)`, where `import.meta` is a
		// syntax error, so the literal `new URL(…, import.meta.url)` form can't be used.
		const { devtool } = this.compilation.options;
		return (
			this.isModule() &&
			this.supportsEcmaScriptModuleSyntax() &&
			!(typeof devtool === "string" && devtool.includes("eval")) &&
			// A runtime `__webpack_public_path__` override can't be reflected in a
			// baked literal, so keep the runtime form that reads `__webpack_require__.p`.
			!APIPlugin.usesRuntimePublicPathOverride(this.compilation)
		);
	}

	/**
	 * Whether an asset whose URL argument is only known at runtime (e.g. a wasm
	 * binary path built from `wasmModuleId`) may be referenced with the analyzable
	 * chunk-relative `new URL(path, import.meta.url)` form. Requires ESM output
	 * (`supportsAnalyzableEsm`) and an `auto` public path — only then is the bare
	 * relative URL equivalent to the runtime `__webpack_require__.p + path` form.
	 * Callers that can bake the public path into a static literal specifier should
	 * use `_getAnalyzableChunkSpecifier` instead, which also handles a fixed path.
	 * @returns {boolean} true when the analyzable chunk-relative URL applies
	 */
	supportsAnalyzableEsmUrl() {
		return (
			this.supportsAnalyzableEsm() && this.outputOptions.publicPath === "auto"
		);
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
	 * Whether async wasm binaries are referenced by a fully baked
	 * `new URL("./<file>.wasm", import.meta.url)` at the module call site, rather than
	 * by `supportsAnalyzableEsmUrl`'s runtime-built path under an `import.meta.url` base.
	 * @returns {boolean} true when the literal form is emitted
	 */
	supportsAnalyzableWasm() {
		return (
			this.supportsAnalyzableEsm() &&
			(this.outputOptions.publicPath === "auto" || this._hasUrlPublicPath()) &&
			this._canBakeWasmFullHash()
		);
	}

	/**
	 * Whether the compilation hash in `output.webassemblyModuleFilename` is one the
	 * deferred pass can fill in. It is unknown during code generation, so a stand-in is
	 * emitted and replaced once it exists — which rewrites the chunk after its own
	 * content hash was taken, so `RealContentHashPlugin` has to be there to repair it.
	 * @returns {boolean} true when a `[fullhash]` in it is no obstacle
	 */
	_canBakeWasmFullHash() {
		const filename =
			/** @type {string} */
			(this.outputOptions.webassemblyModuleFilename);
		if (!getTemplatedPathPlugin().getPresentKinds(filename).has("fullhash")) {
			return true;
		}
		const plugin = getAnalyzableChunkHashPlugin();
		return (
			plugin.canDeferFullHash(filename) &&
			plugin.canDeferSpecifier(this.compilation)
		);
	}

	/**
	 * Whether `output.publicPath` is a complete URL of its own. Baking one keeps the
	 * same target, because `new URL(...)` ignores its base for an absolute specifier.
	 * A root- or directory-relative public path does not: the runtime form resolves it
	 * against the document and a baked one against the chunk, which differ exactly
	 * where a public path is worth setting.
	 * @returns {boolean} true for a static, absolute-URL public path
	 */
	_hasUrlPublicPath() {
		const { publicPath } = this.outputOptions;
		return (
			typeof publicPath === "string" &&
			!publicPath.includes("[") &&
			(publicPath.startsWith("//") || getScheme(publicPath) !== undefined)
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
				appending += `.then(${RuntimeGlobals.makeDeferredNamespaceObject}.bind(${RuntimeGlobals.require}, ${comment}${idExpr}, ${mode}))`;
			} else if (header) {
				appending = `.then(${this.basicFunction(
					"",
					`${header}return ${RuntimeGlobals.makeDeferredNamespaceObject}(${comment}${idExpr}, ${mode});`
				)})`;
			} else {
				runtimeRequirements.add(RuntimeGlobals.require);
				appending = `.then(${RuntimeGlobals.makeDeferredNamespaceObject}.bind(${RuntimeGlobals.require}, ${comment}${idExpr}, ${mode}))`;
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
						appending = `.then(${RuntimeGlobals.require}.bind(${RuntimeGlobals.require}, ${comment}${idExpr}))`;
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
							appending = `.then(${RuntimeGlobals.require}.bind(${RuntimeGlobals.require}, ${comment}${idExpr}))`;
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
							appending = `.then(${RuntimeGlobals.createFakeNamespaceObject}.bind(${RuntimeGlobals.require}, ${comment}${idExpr}, ${fakeType}))`;
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
			!(/** @type {BuildMeta} */ (module.buildMeta).async);

		if (isModuleDeferred) {
			/** @type {Set<Module>} */
			const outgoingAsyncModules = getOutgoingAsyncModules(moduleGraph, module);

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
			!(/** @type {BuildMeta} */ (module.buildMeta).async);

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
			const analyzable = this._analyzableChunkImport(
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
				const analyzable = this._analyzableChunkImport(
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
	 * For ESM module output, load a single statically-named chunk through the
	 * `analyzableChunkImport` helper — a literal `import("./chunk.js")` other bundlers
	 * and webpack itself can follow, wrapped to keep `ensureChunk` timing and deduplication.
	 * Returns `null` to fall back to the runtime `ensureChunk` form.
	 * @param {Chunk} chunk the chunk to load
	 * @param {string} comment leading comment (chunk name / message)
	 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
	 * @param {Module=} originModule the module the `import()` is emitted into
	 * @param {ChunkGraph=} chunkGraph the chunk graph
	 * @returns {string | null} the import expression, or `null`
	 */
	_analyzableChunkImport(
		chunk,
		comment,
		runtimeRequirements,
		originModule,
		chunkGraph
	) {
		const { outputOptions } = this;
		// `blockPromise` has already dropped any chunk without an id.
		if (
			!outputOptions.module ||
			outputOptions.chunkFormat !== "module" ||
			outputOptions.importFunctionName !== "import" ||
			!originModule ||
			!chunkGraph
		) {
			return null;
		}
		// A runtime `__webpack_public_path__` override can't reach a baked literal.
		if (APIPlugin.usesRuntimePublicPathOverride(this.compilation)) {
			return null;
		}
		// A worker loading its own chunks some other way keeps that runtime; one on
		// `import` uses the same ESM loader as the main graph, so it can be analyzable.
		for (const originChunk of chunkGraph.getModuleChunksIterable(
			originModule
		)) {
			const entryOptions = originChunk.getEntryOptions();
			if (!entryOptions || !entryOptions.worker) continue;
			// `WorkerAndWorkletPlugin` always seeds this from `output.workerChunkLoading`.
			if (entryOptions.chunkLoading !== "import") {
				return null;
			}
		}
		// Prefetch/preload children are injected by the runtime `.f` handlers, which `.ei`
		// runs too — but they attach to `.f`, so it has to exist.
		const needsHintHandlers =
			chunk.hasChildByOrder(chunkGraph, "prefetch", true) ||
			chunk.hasChildByOrder(chunkGraph, "preload", true) ||
			chunk.hasChildByOrder(chunkGraph, "cssPreload", true);
		let hasNonJsTypes = false;
		for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
			// Module federation (remote/shared/provide) loads through its own runtime.
			if (FEDERATION_MODULE_TYPES.has(module.type)) {
				return null;
			}
			for (const type of chunkGraph.getModuleSourceTypes(module)) {
				if (type !== JAVASCRIPT_TYPE && type !== RUNTIME_TYPE) {
					// Loaded by that type's own `.f` handler, which `.ei` still dispatches.
					hasNonJsTypes = true;
				}
			}
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
		if (needsHintHandlers || hasNonJsTypes) {
			// Those handlers attach to the `.f` map, which has to exist — but the runtime
			// `ensureChunk` around it does not, since `.ei` dispatches them itself.
			runtimeRequirements.add(RuntimeGlobals.ensureChunkHandlers);
		}
		// Drop-in for `ensureChunk(id)`: the literal `import()` can be statically
		// followed, the helper keeps webpack's install timing and deduplication.
		return `${RuntimeGlobals.analyzableChunkImport}(${JSON.stringify(
			chunk.id
		)}, () => import(${comment}${resolvableSpecifier}))`;
	}

	/**
	 * Computes the `../`-path from the consuming module's chunk(s) back to the output
	 * root, so a chunk or asset can be referenced relative to `import.meta.url`. Returns
	 * `null` when the module lives in chunks of different depths (no single path works).
	 * @param {Module} module the consuming module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {string | null} relative undo path, or `null` when ambiguous
	 */
	_getModuleUndoPath(module, chunkGraph) {
		const { compilation } = this;
		const { outputOptions } = compilation;
		const outputPath = /** @type {string} */ (outputOptions.path);
		/** @type {string | null} */
		let result = null;
		let found = false;
		for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
			const template = JavascriptModulesPlugin.getChunkFilenameTemplate(
				chunk,
				outputOptions
			);
			const chunkName = compilation.getPath(
				// Hashes aren't known during code generation and only sit in the basename
				// (never a directory), so neutralize them — only the `../` depth matters.
				typeof template === "string"
					? template.replace(HASH_IN_FILENAME_GLOBAL, "x")
					: template,
				{ chunk, runtime: chunk.runtime, contentHashType: JAVASCRIPT_TYPE }
			);
			const undo = getUndoPath(chunkName, outputPath, true);
			if (!found) {
				result = undo;
				found = true;
			} else if (result !== undo) {
				return null;
			}
		}
		return found ? result : null;
	}

	/**
	 * Static literal specifier (already quoted) for a `new URL(<here>, import.meta.url)`
	 * or `import(<here>)` pointing at `chunk`'s JS file, or `null` when it can't be known
	 * statically — a content hash in the filename, or a dynamic/templated publicPath.
	 * @param {string | undefined} overridePublicPath per-dependency public path (wins over `output.publicPath`)
	 * @param {Chunk} chunk the chunk to reference
	 * @param {Module} consumingModule the module the reference is emitted into
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {RuntimeRequirements=} runtimeRequirements set when the caller wraps the result in
	 * `new URL(...)` and so accepts a runtime public path prefix around the literal filename
	 * @returns {string | null} a JS string literal or expression, or `null` to fall back to the runtime form
	 */
	_getAnalyzableChunkSpecifier(
		overridePublicPath,
		chunk,
		consumingModule,
		chunkGraph,
		runtimeRequirements
	) {
		const { compilation } = this;
		const { outputOptions } = compilation;
		const filenameTemplate = JavascriptModulesPlugin.getChunkFilenameTemplate(
			chunk,
			outputOptions
		);
		const template = this._resolveChunkFilenameTemplate(
			filenameTemplate,
			chunk
		);
		if (template === null) return null;
		// A hashed name is settled long after this code is generated, so a stand-in is
		// emitted and filled in once the hash exists.
		const deferred = template === undefined || HASH_IN_FILENAME.test(template);
		if (
			deferred &&
			// An id names the chunk in the stand-in, and one nothing could resolve would
			// reach the bundle verbatim.
			(chunk.id === null ||
				!getAnalyzableChunkHashPlugin().canDeferSpecifier(compilation))
		) {
			return null;
		}
		const filename = deferred
			? ""
			: compilation.getPath(/** @type {string} */ (template), {
					chunk,
					// Matches what names the asset, or a placeholder resolved here would
					// not be the one on disk.
					runtime: chunk.runtime,
					contentHashType: JAVASCRIPT_TYPE
				});
		/**
		 * @param {string} prefix what goes in front of the chunk's filename
		 * @returns {string} the specifier, already quoted
		 */
		const specifier = (prefix) =>
			toJsStringLiteral(
				deferred
					? getAnalyzableChunkHashPlugin().reserveSpecifier(
							prefix,
							/** @type {ChunkId} */ (chunk.id)
						)
					: prefix + filename
			);
		if (overridePublicPath) {
			return overridePublicPath.includes("[")
				? null
				: specifier(overridePublicPath);
		}
		const { publicPath } = outputOptions;
		if (publicPath === "auto") {
			const undo = this._getModuleUndoPath(consumingModule, chunkGraph);
			if (undo !== null) return specifier(undo);
			// Different depths — no single relative literal. No bundler follows a
			// concatenation, but a `new URL(...)` caller still sheds the `.u(id)` lookup
			// this way; `import()` needs a static specifier, so it gets nothing.
			if (deferred || !runtimeRequirements) return null;
			runtimeRequirements.add(RuntimeGlobals.publicPath);
			return `${RuntimeGlobals.publicPath} + ${toJsStringLiteral(filename)}`;
		}
		if (typeof publicPath === "string" && !publicPath.includes("[")) {
			return specifier(publicPath);
		}
		return null;
	}

	/**
	 * Static `new URL(<file>, import.meta.url)` for the binary emitted for an async wasm
	 * module. Only called when `supportsAnalyzableWasm()` holds.
	 * @param {Module} module the async wasm module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {RuntimeSpec} runtime the runtime
	 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
	 * @returns {string} expression evaluating to the binary's URL
	 */
	_getAnalyzableWasmUrl(module, chunkGraph, runtime, runtimeRequirements) {
		const { compilation } = this;
		const filename = compilation.getPath(
			/** @type {string} */ (this.outputOptions.webassemblyModuleFilename),
			{
				module,
				runtime,
				chunkGraph,
				// The module's own hash and id are settled here; the compilation's is not,
				// so it is left as a stand-in for the deferred pass to fill in.
				...getAnalyzableChunkHashPlugin().DEFERRED_FULL_HASH_PATH_DATA
			}
		);
		// Only a chunk that fetches may carry the public path into the literal: `readFile`
		// takes a `file:` URL alone, and those loaders address the binary relative to the
		// chunk anyway, ignoring the public path exactly as the runtime form does.
		if (
			this.outputOptions.publicPath !== "auto" &&
			this._wasmChunksFetch(module, chunkGraph)
		) {
			return this.importMetaUrl(
				toJsStringLiteral(
					/** @type {string} */ (this.outputOptions.publicPath) + filename
				)
			);
		}
		const undo = this._getModuleUndoPath(module, chunkGraph);
		/** @type {string} */
		let specifier;
		if (undo === null) {
			// Different depths — no single literal. No bundler follows a concatenation,
			// but this still sheds the module id and hash the runtime form would need.
			runtimeRequirements.add(RuntimeGlobals.publicPath);
			specifier = `${RuntimeGlobals.publicPath} + ${toJsStringLiteral(filename)}`;
		} else {
			specifier = toJsStringLiteral(undo + filename);
		}
		return this.importMetaUrl(specifier);
	}

	/**
	 * The chunk filename template as a plain string. A function is called twice, with
	 * a different stand-in hash each time; disagreeing answers mean the name depends on
	 * a hash, which is not knowable during code generation, so it is left to the
	 * deferred pass to ask again once the hashes are settled.
	 * @param {ChunkFilenameTemplate} filenameTemplate the configured template
	 * @param {Chunk} chunk the chunk being referenced
	 * @returns {string | undefined | null} the template, `undefined` to defer, or
	 * `null` to fall back
	 */
	_resolveChunkFilenameTemplate(filenameTemplate, chunk) {
		if (typeof filenameTemplate === "string") return filenameTemplate;
		try {
			// Everything the naming call is given except the hashes, so only a hash can
			// make the two answers differ.
			const template = filenameTemplate({
				chunk: createHashProbeChunk(chunk, HASH_PROBE, true),
				runtime: chunk.runtime,
				contentHashType: JAVASCRIPT_TYPE,
				hash: HASH_PROBE,
				contentHash: HASH_PROBE
			});
			const probe = filenameTemplate({
				chunk: createHashProbeChunk(chunk, HASH_PROBE_ALTERNATE, false),
				runtime: chunk.runtime,
				contentHashType: JAVASCRIPT_TYPE,
				hash: HASH_PROBE_ALTERNATE,
				contentHash: HASH_PROBE_ALTERNATE
			});
			return template === probe ? template : undefined;
		} catch (_error) {
			// A template that needs more than this chunk can't be resolved here.
			return null;
		}
	}

	/**
	 * Whether every chunk holding `module` loads WebAssembly through `fetch`, which is
	 * what makes an absolute URL usable — the `async-node` and `universal` loaders hand
	 * the result to `readFile`, and that accepts a `file:` URL alone.
	 * @param {Module} module the async wasm module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {boolean} true when every holding chunk fetches
	 */
	_wasmChunksFetch(module, chunkGraph) {
		const { outputOptions } = this;
		for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
			const entryOptions = chunk.getEntryOptions();
			const wasmLoading =
				entryOptions && entryOptions.wasmLoading !== undefined
					? entryOptions.wasmLoading
					: outputOptions.wasmLoading;
			if (wasmLoading !== "fetch") return false;
		}
		return true;
	}

	/**
	 * Async module factory.
	 * @param {object} options options
	 * @param {AsyncDependenciesBlock} options.block the async block
	 * @param {ChunkGraph} options.chunkGraph the chunk graph
	 * @param {RuntimeRequirements} options.runtimeRequirements if set, will be filled with runtime requirements
	 * @param {string=} options.request request string used originally
	 * @returns {string} expression
	 */
	asyncModuleFactory({ block, chunkGraph, runtimeRequirements, request }) {
		const dep = block.dependencies[0];
		const module = chunkGraph.moduleGraph.getModule(dep);
		const ensureChunk = this.blockPromise({
			block,
			message: "",
			chunkGraph,
			runtimeRequirements
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
}

module.exports = RuntimeTemplate;
