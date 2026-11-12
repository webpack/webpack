/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { pathToFileURL } = require("url");
const AsyncDependenciesBlock = require("../../graph/AsyncDependenciesBlock");
const EnableChunkLoadingPlugin = require("../../javascript/EnableChunkLoadingPlugin");
const {
	getArgumentsRangeByPath
} = require("../../javascript/JavascriptParserHelpers");
const { Field, Flag, NodeType } = require("../../javascript/syntax").parser;
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../../module/ModuleTypeConstants");
const parseResourceHintOptions = require("../../prefetch/parseResourceHintOptions");
const { equals } = require("../../util/ArrayHelpers");
const createHash = require("../../util/createHash");
const { contextify } = require("../../util/identifier");
const memoize = require("../../util/memoize");
const EnableWasmLoadingPlugin = require("../../wasm/EnableWasmLoadingPlugin");
const ConstDependency = require("../core/ConstDependency");
const {
	harmonySpecifierTag
} = require("../esm/ESMImportDependencyParserPlugin");
const { isImportMetaFieldEnabled } = require("../import-meta/ImportMetaPlugin");
const CreateScriptUrlDependency = require("./CreateScriptUrlDependency");
const WorkerDependency = require("./WorkerDependency");
const WorkletDependency = require("./WorkletDependency");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../../errors/UnsupportedFeatureWarning")
);

const getCommentCompilationWarning = memoize(() =>
	require("../../errors/CommentCompilationWarning")
);

/**
 * @import {
 * 	ChunkLoading,
 * 	JavascriptParserOptions,
 * 	OutputModule,
 * 	WasmLoading,
 * 	WorkerPublicPath
 * } from "../../../declarations/WebpackOptions"
 */
/** @import Compiler from "../../Compiler" */
/** @import { EntryOptions } from "../../graph/Entrypoint" */
/** @import NormalModule from "../../module/NormalModule" */
/**
 * @import JavascriptParser, {
 * 	JavascriptNodeReader,
 * 	JavascriptParserState,
 * 	Range
 * } from "../../javascript/JavascriptParser"
 */
/** @import Parser from "../../javascript/JavascriptParser" */
/** @import BasicEvaluatedExpression from "../../javascript/BasicEvaluatedExpression" */
/** @import { ESMSettings } from "../esm/ESMImportDependencyParserPlugin" */
/** @import { ResourceHint } from "./WorkerDependency" */

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

// A worklet is always a module script loaded through `addModule`, and unlike a
// Web Worker cannot load further chunks at runtime, so WorkletDependency wraps
// the call and pre-adds every chunk from the calling scope.
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

/**
 * Whether a node is a pattern, which a worker's options never evaluate.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} node the node
 * @returns {boolean} true for an object, array or assignment pattern
 */
const isPatternNode = (path, node) => {
	const type = path.type(node);
	return (
		type === NodeType.ObjectPattern ||
		type === NodeType.ArrayPattern ||
		type === NodeType.AssignmentPattern
	);
};

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
				 * Checks whether the expression is `import.meta.url`, written with a
				 * name, a string or a template, as `extractMemberExpressionChain` reads it.
				 * @param {JavascriptNodeReader} path the reader of the expression
				 * @param {number} arg expression
				 * @returns {boolean} is `import.meta.url`
				 */
				const isMetaUrl = (path, arg) => {
					if (path.type(arg) !== NodeType.MemberExpression) return false;
					const property = path.field(0, Field.property, arg);
					const propertyType = path.type(property);
					if (!path.flag(Flag.computed, arg)) {
						if (
							propertyType !== NodeType.Identifier ||
							path.name(property) !== "url"
						) {
							return false;
						}
					} else if (propertyType === NodeType.Literal) {
						if (`${path.value(property)}` !== "url") return false;
					} else if (
						propertyType !== NodeType.TemplateLiteral ||
						path.fieldCount(Field.expressions, property) !== 0 ||
						/** @type {{ cooked?: string | null }} */
						(path.value(path.field(0, Field.quasis, property))).cooked !== "url"
					) {
						return false;
					}
					const object = path.field(0, Field.object, arg);
					return (
						path.type(object) === NodeType.MetaProperty &&
						path.name(path.field(0, Field.meta, object)) === "import" &&
						path.name(path.field(0, Field.property, object)) === "meta"
					);
				};

				/**
				 * Resolves a `new URL(..., import.meta.url)` argument to its module url.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptNodeReader} path the reader of the expression
				 * @param {number} expr expression
				 * @param {boolean} importMetaUrlEnabled true when import.meta.url should be handled
				 * @returns {[string, Range] | void} parsed
				 */
				const parseModuleUrl = (parser, path, expr, importMetaUrlEnabled) => {
					if (path.type(expr) !== NodeType.NewExpression) return;
					const callee = path.field(0, Field.callee, expr);
					if (path.type(callee) === NodeType.Super) return;
					const argumentCount = path.fieldCount(Field.arguments, expr);
					if (argumentCount === 1) {
						const arg1 = path.field(0, Field.arguments, expr);
						if (importMetaUrlEnabled && isMetaUrl(path, arg1)) {
							return [getUrl(parser.state.module), path.range(arg1)];
						}
					} else if (argumentCount === 2) {
						const arg1 = path.field(0, Field.arguments, expr);
						const arg2 = path.field(1, Field.arguments, expr);
						if (path.type(arg1) === NodeType.SpreadElement) return;
						if (path.type(arg2) === NodeType.SpreadElement) return;
						const calleeValue = parser.evaluateExpression(
							parser.nodeOfPath(path, callee)
						);
						if (
							!calleeValue.isIdentifier() ||
							calleeValue.identifier !== "URL"
						) {
							return;
						}
						const arg2Value = parser.evaluateExpression(
							parser.nodeOfPath(path, arg2)
						);
						if (
							!arg2Value.isString() ||
							!(
								/** @type {string} */ (arg2Value.string).startsWith("file://")
							) ||
							arg2Value.string !== getUrl(parser.state.module)
						) {
							return;
						}
						const arg1Value = parser.evaluateExpression(
							parser.nodeOfPath(path, arg1)
						);
						if (!arg1Value.isString()) return;
						return [
							/** @type {string} */ (arg1Value.string),
							getArgumentsRangeByPath(parser, path, expr)
						];
					}
				};

				/** @typedef {Record<string, ReturnType<BasicEvaluatedExpression["asCompileTimeValue"]>>} Values */

				/**
				 * The options argument of a worker call, split up: new options go at
				 * `insertLocation`, a position, or for `"spread"` the range to wrap.
				 * @template {"comma" | "single" | "spread" | "argument"} InsertType
				 * @template {number | Range} [InsertLocation=number]
				 * @typedef {{ expressions: Record<string, number>, otherElements: number[], values: Values, spread: boolean, insertType: InsertType, insertLocation: InsertLocation }} ParsedOptions
				 */

				/**
				 * Parses object expression.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptNodeReader} path the reader of the expression
				 * @param {number} expr expression
				 * @returns {ParsedOptions<"comma" | "single">} parsed object
				 */
				const parseObjectExpression = (parser, path, expr) => {
					/** @type {Values} */
					const values = {};
					/** @type {Record<string, number>} */
					const expressions = {};
					/** @type {number[]} */
					const otherElements = [];
					let spread = false;
					const count = path.fieldCount(Field.properties, expr);
					for (let i = 0; i < count; i++) {
						const prop = path.field(i, Field.properties, expr);
						const type = path.type(prop);
						const key =
							type === NodeType.Property ? path.field(0, Field.key, prop) : 0;
						if (type === NodeType.SpreadElement) {
							spread = true;
						} else if (
							key !== 0 &&
							!path.flag(Flag.method, prop) &&
							!path.flag(Flag.computed, prop) &&
							path.type(key) === NodeType.Identifier
						) {
							const name = path.name(key);
							const value = path.field(0, Field.value, prop);
							expressions[name] = value;
							if (
								!path.flag(Flag.shorthand, prop) &&
								!isPatternNode(path, value)
							) {
								const evaluated = parser.evaluateExpression(
									parser.nodeOfPath(path, value)
								);
								if (evaluated.isCompileTimeValue()) {
									values[name] = evaluated.asCompileTimeValue();
								}
							}
						} else {
							otherElements.push(prop);
						}
					}
					const insertType = count > 0 ? "comma" : "single";
					const insertLocation =
						count > 0
							? path.end(path.field(count - 1, Field.properties, expr))
							: path.start(expr) + 1;
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
					 * @param {JavascriptNodeReader} path the reader of the call
					 * @param {number} expr expression
					 * @returns {{ url: string, range: Range, needNewUrl: boolean, arg1: number, arg2: number } | void} resolved url info, `arg2` `0` for none
					 */
					const resolveWorkerUrl = (path, expr) => {
						const argumentCount = path.fieldCount(Field.arguments, expr);
						if (argumentCount === 0 || argumentCount > 2) {
							return;
						}
						const arg1 = path.field(0, Field.arguments, expr);
						const arg2 =
							argumentCount > 1 ? path.field(1, Field.arguments, expr) : 0;
						if (path.type(arg1) === NodeType.SpreadElement) return;
						if (arg2 !== 0 && path.type(arg2) === NodeType.SpreadElement) {
							return;
						}

						/** @type {string} */
						let url;
						/** @type {Range} */
						let range;
						let needNewUrl = false;

						if (importMetaUrlEnabled && isMetaUrl(path, arg1)) {
							url = getUrl(parser.state.module);
							range = path.range(arg1);
							needNewUrl = true;
						} else {
							const parsedUrl = parseModuleUrl(
								parser,
								path,
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
					 * @param {JavascriptNodeReader} path the reader of the call
					 * @param {number} node expression
					 * @returns {EntryOptions | false} entry options, or false when `webpackIgnore`
					 */
					const parseEntryOptions = (path, node) => {
						const expr = parser.nodeOfPath(path, node);
						const { options: importOptions, errors: commentErrors } =
							parser.parseCommentOptions(path.range(node));

						if (commentErrors) {
							for (const e of commentErrors) {
								const { comment } = e;
								parser.state.module.addWarning(
									new (getCommentCompilationWarning())(
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
										new (getUnsupportedFeatureWarning())(
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
										new (getUnsupportedFeatureWarning())(
											`\`webpackEntryOptions\` expected a object, but received: ${importOptions.webpackEntryOptions}.`,
											parser.getLocation(expr)
										)
									);
								} else {
									// `webpackEntryOptions` is user input from a magic comment, so
									// only safe own keys are copied, against prototype pollution
									// through `__proto__` or `constructor`.
									const userEntryOptions =
										/** @type {Record<string, EntryOptions[keyof EntryOptions]>} */ (
											importOptions.webpackEntryOptions
										);
									for (const key of Object.keys(userEntryOptions)) {
										if (
											key === "__proto__" ||
											key === "constructor" ||
											key === "prototype"
										) {
											continue;
										}
										/** @type {Record<string, EntryOptions[keyof EntryOptions]>} */
										(entryOptions)[key] = userEntryOptions[key];
									}
								}
							}
							if (importOptions.webpackChunkName !== undefined) {
								if (typeof importOptions.webpackChunkName !== "string") {
									parser.state.module.addWarning(
										new (getUnsupportedFeatureWarning())(
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
					 * @param {JavascriptNodeReader} path the reader of the call
					 * @param {number} node expression
					 * @param {string=} workerSyntax matched global constructor syntax
					 * @returns {boolean | void} true when handled
					 */
					const handleNewWorker = (path, node, workerSyntax) => {
						const expr = parser.nodeOfPath(path, node);
						const parsedUrl = resolveWorkerUrl(path, node);
						if (!parsedUrl) return;
						const { url, range, needNewUrl, arg1, arg2 } = parsedUrl;

						const {
							expressions,
							otherElements,
							values: options,
							spread: hasSpreadInOptions,
							insertType,
							insertLocation
						} = arg2 !== 0 && path.type(arg2) === NodeType.ObjectExpression
							? parseObjectExpression(parser, path, arg2)
							: /** @type {ParsedOptions<"spread", Range> | ParsedOptions<"argument">} */ ({
									expressions: {},
									otherElements: [],
									values: {},
									spread: false,
									insertType: arg2 !== 0 ? "spread" : "argument",
									insertLocation: arg2 !== 0 ? path.range(arg2) : path.end(arg1)
								});

						const entryOptions = parseEntryOptions(path, node);
						if (entryOptions === false) return false;

						/** @type {ResourceHint | undefined} */
						let resourceHint;
						// Resource-hint comments belong to the asset expression, so they are
						// read from the inner `new URL(...)` range alone. A bare
						// `import.meta.url` has none, so its hints are skipped.
						if (path.type(arg1) === NodeType.NewExpression) {
							const { options: urlImportOptions } = parser.parseCommentOptions(
								path.range(arg1)
							);
							const hints = parseResourceHintOptions(
								urlImportOptions,
								parser.state.module,
								parser.getLocation(expr)
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
							workerConstructorRange:
								workerSyntax === "Worker"
									? path.range(path.field(0, Field.callee, node))
									: undefined,
							resourceHint
						});
						dep.loc = parser.getLocation(expr);
						block.addDependency(dep);
						parser.state.module.addBlock(block);

						if (compilation.outputOptions.trustedTypes) {
							const dep = new CreateScriptUrlDependency(path.range(arg1));
							dep.loc = parser.getLocation(expr);
							parser.state.module.addDependency(dep);
						}

						if (expressions.type) {
							const typeNode = expressions.type;
							if (options.type !== false) {
								const dep = new ConstDependency(
									this._module ? '"module"' : "undefined",
									path.range(typeNode)
								);
								dep.loc = parser.getLocation(parser.nodeOfPath(path, typeNode));
								parser.state.module.addPresentationalDependency(dep);
								expressions.type = 0;
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
							let prefix = useSpread ? "{ ...(" : "Object.assign({}, ";
							let suffix = useSpread
								? `), type: ${type} }`
								: `, { type: ${type} })`;
							if (
								workerSyntax !== undefined &&
								(workerSyntax === "SharedWorker" ||
									workerSyntax.endsWith(".SharedWorker"))
							) {
								if (
									path.type(arg2) === NodeType.Literal &&
									typeof path.value(arg2) === "string"
								) {
									prefix = this._module ? "{ name: " : "";
									suffix = this._module ? `, type: ${type} }` : "";
								} else {
									const stringOptions = this._module
										? `{ name: options, type: ${type} }`
										: "options";
									// Evaluate the argument once, outside the wrapper's scope.
									prefix = `(${compilation.runtimeTemplate.returningFunction(
										`typeof options === "string" ? ${stringOptions} : ${prefix}options${suffix}`,
										"options"
									)})((`;
									suffix = "))";
								}
							}
							if (prefix) {
								const dep1 = new ConstDependency(prefix, insertLocation[0]);
								const dep2 = new ConstDependency(suffix, insertLocation[1]);
								dep1.loc = parser.getLocation(expr);
								dep2.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep1);
								parser.state.module.addPresentationalDependency(dep2);
							}
						} else if (insertType === "argument" && this._module) {
							const dep = new ConstDependency(
								', { type: "module" }',
								insertLocation
							);
							dep.loc = parser.getLocation(expr);
							parser.state.module.addPresentationalDependency(dep);
						}

						parser.walkExpression(
							parser.nodeOfPath(path, path.field(0, Field.callee, node))
						);
						for (const key of Object.keys(expressions)) {
							const value = expressions[key];
							if (value !== 0 && !isPatternNode(path, value)) {
								parser.walkExpression(parser.nodeOfPath(path, value));
							}
						}
						for (const prop of otherElements) parser._walkPropertyNode(prop);
						if (insertType === "spread") {
							parser.walkExpression(parser.nodeOfPath(path, arg2));
						}

						return true;
					};

					/**
					 * Handles a matched `addModule(...)` worklet expression.
					 * @param {JavascriptNodeReader} path the reader of the call
					 * @param {number} node expression
					 * @returns {boolean | void} true when handled
					 */
					const handleNewWorklet = (path, node) => {
						const expr = parser.nodeOfPath(path, node);
						const parsedUrl = resolveWorkerUrl(path, node);
						if (!parsedUrl) return;
						const { url } = parsedUrl;

						const entryOptions = parseEntryOptions(path, node);
						if (entryOptions === false) return false;

						const block = new AsyncDependenciesBlock({
							name: entryOptions.name,
							circular: false,
							entryOptions: {
								// A module worklet links its split chunks through native `import`
								// and keeps module chunk loading. A script worklet loads none at
								// runtime, so its chunks are pre-added from the calling scope.
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
						const callee = path.field(0, Field.callee, node);
						const dep = new WorkletDependency(
							url,
							[path.start(node), path.start(node)],
							[path.end(callee), path.end(node)],
							{ publicPath: this._workerPublicPath }
						);
						dep.loc = parser.getLocation(expr);
						block.addDependency(dep);
						parser.state.module.addBlock(block);

						parser.walkExpression(parser.nodeOfPath(path, callee));

						return true;
					};

					/**
					 * Registers the parser hooks matching a single syntax item.
					 * @param {string} item item
					 * @param {(path: JavascriptNodeReader, node: number, workerSyntax?: string) => boolean | void} handle handler invoked on a match
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

							// read by id, as every declarator comes here
							parser.hooks.preDeclarator.tap(
								{ name: PLUGIN_NAME, path: true },
								(path, decl) => {
									const id = path.field(0, Field.id, decl);
									if (
										path.type(id) === NodeType.Identifier &&
										path.name(id) === pattern
									) {
										parser.tagVariable(pattern, specifierTag);
										return true;
									}
								}
							);
							parser.hooks.pattern
								.for(pattern)
								.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
									parser.tagVariable(path.name(node), specifierTag);
									return true;
								});
							parser.hooks.callMemberChain
								.for(specifierTag)
								.tap(
									{ name: PLUGIN_NAME, path: true },
									(path, expression, members) => {
										if (itemMembers !== members.join(".")) {
											return;
										}

										return handle(path, expression);
									}
								);
						} else if (item.endsWith("()")) {
							parser.hooks.call
								.for(item.slice(0, -2))
								.tap({ name: PLUGIN_NAME, path: true }, (path, expression) =>
									handle(path, expression)
								);
						} else {
							const match = /^(.+?)(\(\))?\s+from\s+(.+)$/.exec(item);
							if (match) {
								const ids = match[1].split(".");
								const call = match[2];
								const source = match[3];
								if (call) {
									// the ESM import plugin claims an imported call in `callMemberChain`,
									// so tap ahead of it; the full id path also matches `lib.spawn()`
									parser.hooks.callMemberChain
										.for(harmonySpecifierTag)
										.tap(
											{ name: PLUGIN_NAME, stage: -10, path: true },
											(path, expr, members) => {
												const settings = /** @type {ESMSettings} */ (
													parser.currentTagData
												);
												if (
													!settings ||
													settings.source !== source ||
													!equals([...settings.ids, ...members], ids)
												) {
													return;
												}
												settings.used = true;
												return handle(path, expr);
											}
										);
									return;
								}
								parser.hooks.new
									.for(harmonySpecifierTag)
									.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
										const settings = /** @type {ESMSettings} */ (
											parser.currentTagData
										);
										if (
											!settings ||
											settings.source !== source ||
											!equals(settings.ids, ids)
										) {
											return;
										}
										settings.used = true;
										return handle(path, expr);
									});
							} else {
								parser.hooks.new
									.for(item)
									.tap({ name: PLUGIN_NAME, path: true }, (path, expr) =>
										handle(path, expr, item)
									);
							}
						}
					};

					/**
					 * Expands and registers a syntax list.
					 * @param {string[]} syntaxList syntax list (may contain "...")
					 * @param {string[]} defaultSyntax default syntax used for "..."
					 * @param {(path: JavascriptNodeReader, node: number, workerSyntax?: string) => boolean | void} handle handler
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

					// Worklet parsing is opt-in: unset falls back to `futureDefaults` and
					// `false` disables it. Not defaulted in `config/defaults.js`, which
					// would splice into a user list's `"..."` sentinel.
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
