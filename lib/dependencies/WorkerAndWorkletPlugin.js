/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { pathToFileURL } = require("url");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const CommentCompilationWarning = require("../errors/CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");
const EnableChunkLoadingPlugin = require("../javascript/EnableChunkLoadingPlugin");
const parseResourceHintOptions = require("../prefetch/parseResourceHintOptions");
const { equals } = require("../util/ArrayHelpers");
const createHash = require("../util/createHash");
const { contextify } = require("../util/identifier");
const EnableWasmLoadingPlugin = require("../wasm/EnableWasmLoadingPlugin");
const ConstDependency = require("./ConstDependency");
const CreateScriptUrlDependency = require("./CreateScriptUrlDependency");
const {
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");
const { isImportMetaFieldEnabled } = require("./ImportMetaPlugin");
const WorkerDependency = require("./WorkerDependency");
const WorkletDependency = require("./WorkletDependency");

/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Pattern} Pattern */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").SpreadElement} SpreadElement */
/** @typedef {import("../../declarations/WebpackOptions").ChunkLoading} ChunkLoading */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").OutputModule} OutputModule */
/** @typedef {import("../../declarations/WebpackOptions").WasmLoading} WasmLoading */
/** @typedef {import("../../declarations/WebpackOptions").WorkerPublicPath} WorkerPublicPath */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser")} Parser */
/** @typedef {import("../javascript/JavascriptParser").JavascriptParserState} JavascriptParserState */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */
/** @typedef {import("./WorkerDependency").ResourceHint} ResourceHint */

/**
 * Returns url.
 * @param {NormalModule} module module
 * @returns {string} url
 */
const getUrl = (module) => pathToFileURL(module.resource).toString();

const WorkerSpecifierTag = Symbol("worker specifier tag");
const WorkletSpecifierTag = Symbol("worklet specifier tag");

const WORKER_DEFAULT_SYNTAX = [
	"Worker",
	"SharedWorker",
	"navigator.serviceWorker.register()",
	"Worker from worker_threads"
];

// Worklets are always module scripts loaded through `addModule` and — unlike Web
// Workers — cannot load additional chunks at runtime (no `importScripts`, no
// dynamic `import()`). The WorkletDependency wraps the call so every chunk is
// pre-added via `addModule` from the calling scope (see WorkletDependency).
const WORKLET_DEFAULT_SYNTAX = [
	"*context.audioWorklet.addModule()",
	"*audioWorklet.addModule()",
	"CSS.paintWorklet.addModule()",
	"CSS.layoutWorklet.addModule()",
	"CSS.animationWorklet.addModule()"
];

/** @type {WeakMap<JavascriptParserState, number>} */
const workerIndexMap = new WeakMap();

const PLUGIN_NAME = "WorkerAndWorkletPlugin";

class WorkerAndWorkletPlugin {
	/**
	 * Creates an instance of WorkerAndWorkletPlugin.
	 * @param {ChunkLoading=} chunkLoading chunk loading
	 * @param {WasmLoading=} wasmLoading wasm loading
	 * @param {OutputModule=} module output module
	 * @param {WorkerPublicPath=} workerPublicPath worker public path
	 * @param {boolean=} workletDefault whether worklet parsing is on when `parser.worklet` is unset (enabled by `futureDefaults`)
	 */
	constructor(
		chunkLoading,
		wasmLoading,
		module,
		workerPublicPath,
		workletDefault
	) {
		/** @type {ChunkLoading | undefined} */
		this._chunkLoading = chunkLoading;
		/** @type {WasmLoading | undefined} */
		this._wasmLoading = wasmLoading;
		/** @type {boolean | undefined} */
		this._module = module;
		/** @type {string | undefined} */
		this._workerPublicPath = workerPublicPath;
		/** @type {boolean} */
		this._workletDefault = Boolean(workletDefault);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		if (this._chunkLoading) {
			new EnableChunkLoadingPlugin(this._chunkLoading).apply(compiler);
		}
		if (this._wasmLoading) {
			new EnableWasmLoadingPlugin(this._wasmLoading).apply(compiler);
		}
		const cachedContextify = contextify.bindContextCache(
			compiler.context,
			compiler.root
		);
		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					WorkerDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					WorkerDependency,
					new WorkerDependency.Template()
				);
				compilation.dependencyFactories.set(
					WorkletDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					WorkletDependency,
					new WorkletDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CreateScriptUrlDependency,
					new CreateScriptUrlDependency.Template()
				);

				/**
				 * Checks whether the expression is `import.meta.url`.
				 * @param {JavascriptParser} parser the parser
				 * @param {MemberExpression} expr expression
				 * @returns {boolean} is `import.meta.url`
				 */
				const isMetaUrl = (parser, expr) => {
					const chain = parser.extractMemberExpressionChain(expr);

					if (
						chain.members.length !== 1 ||
						chain.object.type !== "MetaProperty" ||
						chain.object.meta.name !== "import" ||
						chain.object.property.name !== "meta" ||
						chain.members[0] !== "url"
					) {
						return false;
					}

					return true;
				};

				/**
				 * Resolves a `new URL(..., import.meta.url)` argument to its module url.
				 * @param {JavascriptParser} parser the parser
				 * @param {Expression} expr expression
				 * @param {boolean} importMetaUrlEnabled true when import.meta.url should be handled
				 * @returns {[string, Range] | void} parsed
				 */
				const parseModuleUrl = (parser, expr, importMetaUrlEnabled) => {
					if (expr.type !== "NewExpression" || expr.callee.type === "Super") {
						return;
					}
					if (
						importMetaUrlEnabled &&
						expr.arguments.length === 1 &&
						expr.arguments[0].type === "MemberExpression" &&
						isMetaUrl(parser, expr.arguments[0])
					) {
						const arg1 = expr.arguments[0];
						return [
							getUrl(parser.state.module),
							[
								/** @type {Range} */ (arg1.range)[0],
								/** @type {Range} */ (arg1.range)[1]
							]
						];
					} else if (expr.arguments.length === 2) {
						const [arg1, arg2] = expr.arguments;
						if (arg1.type === "SpreadElement") return;
						if (arg2.type === "SpreadElement") return;
						const callee = parser.evaluateExpression(expr.callee);
						if (!callee.isIdentifier() || callee.identifier !== "URL") return;
						const arg2Value = parser.evaluateExpression(arg2);
						if (
							!arg2Value.isString() ||
							!(
								/** @type {string} */ (arg2Value.string).startsWith("file://")
							) ||
							arg2Value.string !== getUrl(parser.state.module)
						) {
							return;
						}
						const arg1Value = parser.evaluateExpression(arg1);
						if (!arg1Value.isString()) return;
						return [
							/** @type {string} */ (arg1Value.string),
							[
								/** @type {Range} */ (arg1.range)[0],
								/** @type {Range} */ (arg2.range)[1]
							]
						];
					}
				};

				/** @typedef {Record<string, EXPECTED_ANY>} Values */

				/**
				 * Parses object expression.
				 * @param {JavascriptParser} parser the parser
				 * @param {ObjectExpression} expr expression
				 * @returns {{ expressions: Record<string, Expression | Pattern>, otherElements: (Property | SpreadElement)[], values: Values, spread: boolean, insertType: "comma" | "single", insertLocation: number }} parsed object
				 */
				const parseObjectExpression = (parser, expr) => {
					/** @type {Values} */
					const values = {};
					/** @type {Record<string, Expression | Pattern>} */
					const expressions = {};
					/** @type {(Property | SpreadElement)[]} */
					const otherElements = [];
					let spread = false;
					for (const prop of expr.properties) {
						if (prop.type === "SpreadElement") {
							spread = true;
						} else if (
							prop.type === "Property" &&
							!prop.method &&
							!prop.computed &&
							prop.key.type === "Identifier"
						) {
							expressions[prop.key.name] = prop.value;
							if (!prop.shorthand && !prop.value.type.endsWith("Pattern")) {
								const value = parser.evaluateExpression(
									/** @type {Expression} */
									(prop.value)
								);
								if (value.isCompileTimeValue()) {
									values[prop.key.name] = value.asCompileTimeValue();
								}
							}
						} else {
							otherElements.push(prop);
						}
					}
					const insertType = expr.properties.length > 0 ? "comma" : "single";
					const insertLocation =
						expr.properties.length > 0
							? /** @type {Range} */ (
									expr.properties[expr.properties.length - 1].range
								)[1]
							: /** @type {Range} */ (expr.range)[0] + 1;
					return {
						expressions,
						otherElements,
						values,
						spread,
						insertType,
						insertLocation
					};
				};

				/**
				 * Processes the provided parser.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const parserPlugin = (parser, parserOptions) => {
					const importMetaUrlEnabled = isImportMetaFieldEnabled(
						parserOptions.importMeta,
						"url"
					);

					/**
					 * Resolves the url argument (the `new URL(...)` / bare `import.meta.url`).
					 * @param {CallExpression} expr expression
					 * @returns {{ url: string, range: Range, needNewUrl: boolean, arg1: Expression | SpreadElement, arg2: Expression | SpreadElement | undefined } | void} resolved url info
					 */
					const resolveWorkerUrl = (expr) => {
						if (expr.arguments.length === 0 || expr.arguments.length > 2) {
							return;
						}
						const [arg1, arg2] = expr.arguments;
						if (arg1.type === "SpreadElement") return;
						if (arg2 && arg2.type === "SpreadElement") return;

						/** @type {string} */
						let url;
						/** @type {Range} */
						let range;
						let needNewUrl = false;

						if (
							arg1.type === "MemberExpression" &&
							importMetaUrlEnabled &&
							isMetaUrl(parser, arg1)
						) {
							url = getUrl(parser.state.module);
							range = [
								/** @type {Range} */ (arg1.range)[0],
								/** @type {Range} */ (arg1.range)[1]
							];
							needNewUrl = true;
						} else {
							const parsedUrl = parseModuleUrl(
								parser,
								arg1,
								importMetaUrlEnabled
							);
							if (!parsedUrl) return;
							[url, range] = parsedUrl;
						}

						return { url, range, needNewUrl, arg1, arg2 };
					};

					/**
					 * Reads the magic-comment entry options for the matched expression.
					 * @param {CallExpression} expr expression
					 * @returns {EntryOptions | false} entry options, or false when `webpackIgnore`
					 */
					const parseEntryOptions = (expr) => {
						const { options: importOptions, errors: commentErrors } =
							parser.parseCommentOptions(/** @type {Range} */ (expr.range));

						if (commentErrors) {
							for (const e of commentErrors) {
								const { comment } = e;
								parser.state.module.addWarning(
									new CommentCompilationWarning(
										`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
										parser.getLocation(comment)
									)
								);
							}
						}

						/** @type {EntryOptions} */
						const entryOptions = {};

						if (importOptions) {
							if (importOptions.webpackIgnore !== undefined) {
								if (typeof importOptions.webpackIgnore !== "boolean") {
									parser.state.module.addWarning(
										new UnsupportedFeatureWarning(
											`\`webpackIgnore\` expected a boolean, but received: ${importOptions.webpackIgnore}.`,
											parser.getLocation(expr)
										)
									);
								} else if (importOptions.webpackIgnore) {
									return false;
								}
							}
							if (importOptions.webpackEntryOptions !== undefined) {
								if (
									typeof importOptions.webpackEntryOptions !== "object" ||
									importOptions.webpackEntryOptions === null
								) {
									parser.state.module.addWarning(
										new UnsupportedFeatureWarning(
											`\`webpackEntryOptions\` expected a object, but received: ${importOptions.webpackEntryOptions}.`,
											parser.getLocation(expr)
										)
									);
								} else {
									// `webpackEntryOptions` is user input from a magic
									// comment, so copy only safe own keys to avoid
									// prototype pollution via `__proto__`/`constructor`/
									// `prototype`.
									const userEntryOptions = importOptions.webpackEntryOptions;
									for (const key of Object.keys(userEntryOptions)) {
										if (
											key === "__proto__" ||
											key === "constructor" ||
											key === "prototype"
										) {
											continue;
										}
										/** @type {EXPECTED_ANY} */
										(entryOptions)[key] = /** @type {EXPECTED_ANY} */ (
											userEntryOptions
										)[key];
									}
								}
							}
							if (importOptions.webpackChunkName !== undefined) {
								if (typeof importOptions.webpackChunkName !== "string") {
									parser.state.module.addWarning(
										new UnsupportedFeatureWarning(
											`\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`,
											parser.getLocation(expr)
										)
									);
								} else {
									entryOptions.name = importOptions.webpackChunkName;
								}
							}
						}

						return entryOptions;
					};

					/**
					 * Assigns a unique runtime to the entry so each worker gets its own runtime chunk.
					 * @param {EntryOptions} entryOptions entry options
					 * @returns {void}
					 */
					const ensureRuntime = (entryOptions) => {
						if (entryOptions.runtime !== undefined) return;
						const i = workerIndexMap.get(parser.state) || 0;
						workerIndexMap.set(parser.state, i + 1);
						const name = `${cachedContextify(
							parser.state.module.identifier()
						)}|${i}`;
						const hash = createHash(compilation.outputOptions.hashFunction);
						hash.update(name);
						const digest = hash.digest(compilation.outputOptions.hashDigest);
						entryOptions.runtime = digest.slice(
							0,
							compilation.outputOptions.hashDigestLength
						);
					};

					/**
					 * Handles a matched `new Worker(...)` expression.
					 * @param {CallExpression} expr expression
					 * @param {boolean=} isGlobalWorker matched the global `new Worker()` syntax (eligible for universal rewrite)
					 * @returns {boolean | void} true when handled
					 */
					const handleNewWorker = (expr, isGlobalWorker = false) => {
						const parsedUrl = resolveWorkerUrl(expr);
						if (!parsedUrl) return;
						const { url, range, needNewUrl, arg1, arg2 } = parsedUrl;

						const {
							expressions,
							otherElements,
							values: options,
							spread: hasSpreadInOptions,
							insertType,
							insertLocation
						} = arg2 && arg2.type === "ObjectExpression"
							? parseObjectExpression(parser, arg2)
							: {
									expressions:
										/** @type {Record<string, Expression | Pattern>} */ ({}),
									otherElements: [],
									/** @type {Values} */
									values: {},
									spread: false,
									insertType: arg2 ? "spread" : "argument",
									insertLocation: arg2
										? /** @type {Range} */ (arg2.range)
										: /** @type {Range} */ (arg1.range)[1]
								};

						const entryOptions = parseEntryOptions(expr);
						if (entryOptions === false) return false;

						/** @type {ResourceHint | undefined} */
						let resourceHint;
						// Resource-hint comments belong to the asset expression — read
						// them from the inner `new URL(...)` range only, never from
						// elsewhere inside `new Worker(...)`. When `arg1` is bare
						// `import.meta.url` there is no `new URL` and no place for
						// the comments to go, so resource hints are skipped.
						if (arg1.type === "NewExpression") {
							const { options: urlImportOptions } = parser.parseCommentOptions(
								/** @type {Range} */ (arg1.range)
							);
							const hints = parseResourceHintOptions(
								urlImportOptions,
								parser.state.module,
								/** @type {DependencyLocation} */ (expr.loc)
							);
							if (hints.prefetch || hints.preload) {
								resourceHint = {
									prefetch: hints.prefetch,
									preload: hints.preload,
									fetchPriority: hints.fetchPriority,
									as: hints.as,
									type: hints.type,
									media: hints.media
								};
							}
						}

						if (
							!Object.prototype.hasOwnProperty.call(entryOptions, "name") &&
							options &&
							typeof options.name === "string"
						) {
							entryOptions.name = options.name;
						}

						ensureRuntime(entryOptions);

						const block = new AsyncDependenciesBlock({
							name: entryOptions.name,
							circular: false,
							entryOptions: {
								chunkLoading: this._chunkLoading,
								wasmLoading: this._wasmLoading,
								...entryOptions,
								worker: true
							}
						});
						block.loc = parser.getLocation(expr);
						const dep = new WorkerDependency(url, range, {
							publicPath: this._workerPublicPath,
							needNewUrl,
							workerConstructorRange: isGlobalWorker
								? /** @type {Range} */ (expr.callee.range)
								: undefined,
							resourceHint
						});
						dep.loc = parser.getLocation(expr);
						block.addDependency(dep);
						parser.state.module.addBlock(block);

						if (compilation.outputOptions.trustedTypes) {
							const dep = new CreateScriptUrlDependency(
								/** @type {Range} */ (expr.arguments[0].range)
							);
							dep.loc = parser.getLocation(expr);
							parser.state.module.addDependency(dep);
						}

						if (expressions.type) {
							const expr = expressions.type;
							if (options.type !== false) {
								const dep = new ConstDependency(
									this._module ? '"module"' : "undefined",
									/** @type {Range} */ (expr.range)
								);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
								/** @type {EXPECTED_ANY} */
								(expressions).type = undefined;
							}
						} else if (insertType === "comma") {
							if (this._module || hasSpreadInOptions) {
								const dep = new ConstDependency(
									`, type: ${this._module ? '"module"' : "undefined"}`,
									insertLocation
								);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
							}
						} else if (insertType === "spread") {
							const type = this._module ? '"module"' : "undefined";
							// `{ ...(opts), type }` is equivalent to `Object.assign({}, opts, { type })`
							const useSpread = compilation.outputOptions.environment.spread;
							const dep1 = new ConstDependency(
								useSpread ? "{ ...(" : "Object.assign({}, ",
								/** @type {Range} */ (insertLocation)[0]
							);
							const dep2 = new ConstDependency(
								useSpread ? `), type: ${type} }` : `, { type: ${type} })`,
								/** @type {Range} */ (insertLocation)[1]
							);
							dep1.loc = parser.getLocation(expr);
							dep2.loc = parser.getLocation(expr);
							parser.state.module.addPresentationalDependency(dep1);
							parser.state.module.addPresentationalDependency(dep2);
						} else if (insertType === "argument" && this._module) {
							const dep = new ConstDependency(
								', { type: "module" }',
								insertLocation
							);
							dep.loc = parser.getLocation(expr);
							parser.state.module.addPresentationalDependency(dep);
						}

						parser.walkExpression(expr.callee);
						for (const key of Object.keys(expressions)) {
							if (expressions[key]) {
								if (expressions[key].type.endsWith("Pattern")) continue;
								parser.walkExpression(
									/** @type {Expression} */
									(expressions[key])
								);
							}
						}
						for (const prop of otherElements) {
							parser.walkProperty(prop);
						}
						if (insertType === "spread") {
							parser.walkExpression(/** @type {Expression} */ (arg2));
						}

						return true;
					};

					/**
					 * Handles a matched `addModule(...)` worklet expression.
					 * @param {CallExpression} expr expression
					 * @returns {boolean | void} true when handled
					 */
					const handleNewWorklet = (expr) => {
						const parsedUrl = resolveWorkerUrl(expr);
						if (!parsedUrl) return;
						const { url } = parsedUrl;

						const entryOptions = parseEntryOptions(expr);
						if (entryOptions === false) return false;

						const block = new AsyncDependenciesBlock({
							name: entryOptions.name,
							circular: false,
							entryOptions: {
								// A module worklet links its split chunks via native `import`
								// (resolved by `addModule`), so it keeps the module chunk
								// loading. A script worklet can't load chunks at runtime, so its
								// chunks use import-scripts and are pre-added from the calling scope.
								chunkLoading: this._module
									? this._chunkLoading
									: "import-scripts",
								wasmLoading: false,
								...entryOptions,
								worker: true,
								// `addModule` always loads the chunk as a module, so its
								// auto public-path can read `import.meta.url` (no shim needed).
								worklet: true
							}
						});
						block.loc = parser.getLocation(expr);
						// The dependency rewrites the call site: the fast path swaps the URL
						// argument directly, the multi-chunk path wraps it in a bootstrap.
						const dep = new WorkletDependency(
							url,
							[
								/** @type {Range} */ (expr.range)[0],
								/** @type {Range} */ (expr.range)[0]
							],
							[
								/** @type {Range} */ (expr.callee.range)[1],
								/** @type {Range} */ (expr.range)[1]
							],
							{ publicPath: this._workerPublicPath }
						);
						dep.loc = parser.getLocation(expr);
						block.addDependency(dep);
						parser.state.module.addBlock(block);

						parser.walkExpression(expr.callee);

						return true;
					};

					/**
					 * Registers the parser hooks matching a single syntax item.
					 * @param {string} item item
					 * @param {(expr: CallExpression, isGlobalWorker?: boolean) => boolean | void} handle handler invoked on a match
					 * @param {symbol} specifierTag tag used for `*variable` syntax
					 */
					const processItem = (item, handle, specifierTag) => {
						if (
							item.startsWith("*") &&
							item.includes(".") &&
							item.endsWith("()")
						) {
							const firstDot = item.indexOf(".");
							const pattern = item.slice(1, firstDot);
							const itemMembers = item.slice(firstDot + 1, -2);

							parser.hooks.preDeclarator.tap(
								PLUGIN_NAME,
								(decl, _statement) => {
									if (
										decl.id.type === "Identifier" &&
										decl.id.name === pattern
									) {
										parser.tagVariable(decl.id.name, specifierTag);
										return true;
									}
								}
							);
							parser.hooks.pattern.for(pattern).tap(PLUGIN_NAME, (pattern) => {
								parser.tagVariable(pattern.name, specifierTag);
								return true;
							});
							parser.hooks.callMemberChain
								.for(specifierTag)
								.tap(PLUGIN_NAME, (expression, members) => {
									if (itemMembers !== members.join(".")) {
										return;
									}

									return handle(expression);
								});
						} else if (item.endsWith("()")) {
							parser.hooks.call.for(item.slice(0, -2)).tap(PLUGIN_NAME, handle);
						} else {
							const match = /^(.+?)(\(\))?\s+from\s+(.+)$/.exec(item);
							if (match) {
								const ids = match[1].split(".");
								const call = match[2];
								const source = match[3];
								(call ? parser.hooks.call : parser.hooks.new)
									.for(harmonySpecifierTag)
									.tap(PLUGIN_NAME, (expr) => {
										const settings = /** @type {HarmonySettings} */ (
											parser.currentTagData
										);
										if (
											!settings ||
											settings.source !== source ||
											!equals(settings.ids, ids)
										) {
											return;
										}
										return handle(expr);
									});
							} else {
								parser.hooks.new
									.for(item)
									.tap(PLUGIN_NAME, (expr) => handle(expr, item === "Worker"));
							}
						}
					};

					/**
					 * Expands and registers a syntax list.
					 * @param {string[]} syntaxList syntax list (may contain "...")
					 * @param {string[]} defaultSyntax default syntax used for "..."
					 * @param {(expr: CallExpression, isGlobalWorker?: boolean) => boolean | void} handle handler
					 * @param {symbol} specifierTag tag used for `*variable` syntax
					 */
					const processList = (
						syntaxList,
						defaultSyntax,
						handle,
						specifierTag
					) => {
						for (const item of syntaxList) {
							if (item === "...") {
								for (const itemFromDefault of defaultSyntax) {
									processItem(itemFromDefault, handle, specifierTag);
								}
							} else {
								processItem(item, handle, specifierTag);
							}
						}
					};

					if (parserOptions.worker !== false) {
						const workerSyntax = !Array.isArray(parserOptions.worker)
							? ["..."]
							: parserOptions.worker;
						processList(
							workerSyntax,
							WORKER_DEFAULT_SYNTAX,
							handleNewWorker,
							WorkerSpecifierTag
						);
					}

					// Worklet parsing is opt-in: unset falls back to the `futureDefaults`
					// default, `false` disables it. It is not defaulted in
					// `config/defaults.js` because that would splice into the `"..."`
					// merge sentinel of a user-provided list.
					const workletOption =
						parserOptions.worklet === undefined
							? this._workletDefault
							: parserOptions.worklet;
					if (workletOption) {
						const workletSyntax = !Array.isArray(workletOption)
							? ["..."]
							: workletOption;
						processList(
							workletSyntax,
							WORKLET_DEFAULT_SYNTAX,
							handleNewWorklet,
							WorkletSpecifierTag
						);
					}
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, parserPlugin);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, parserPlugin);
			}
		);
	}
}

module.exports = WorkerAndWorkletPlugin;
