/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { pathToFileURL } = require("url");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const EnableChunkLoadingPlugin = require("../javascript/EnableChunkLoadingPlugin");
const { equals } = require("../util/ArrayHelpers");
const createHash = require("../util/createHash");
const { contextify } = require("../util/identifier");
const EnableWasmLoadingPlugin = require("../wasm/EnableWasmLoadingPlugin");
const ConstDependency = require("./ConstDependency");
const CreateScriptUrlDependency = require("./CreateScriptUrlDependency");
const {
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");
const WorkerDependency = require("./WorkerDependency");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Pattern} Pattern */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").SpreadElement} SpreadElement */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */

const getUrl = module => {
	return pathToFileURL(module.resource).toString();
};

const DEFAULT_SYNTAX = [
	"Worker",
	"SharedWorker",
	"navigator.serviceWorker.register()",
	"Worker from worker_threads"
];

/** @type {WeakMap<ParserState, number>} */
const workerIndexMap = new WeakMap();

class WorkerPlugin {
	constructor(chunkLoading, wasmLoading, module, workerPublicPath) {
		this._chunkLoading = chunkLoading;
		this._wasmLoading = wasmLoading;
		this._module = module;
		this._workerPublicPath = workerPublicPath;
	}
	/**
	 * Apply the plugin
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
			"WorkerPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					WorkerDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					WorkerDependency,
					new WorkerDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CreateScriptUrlDependency,
					new CreateScriptUrlDependency.Template()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {Expression} expr expression
				 * @returns {[BasicEvaluatedExpression, [number, number]]} parsed
				 */
				const parseModuleUrl = (parser, expr) => {
					if (
						expr.type !== "NewExpression" ||
						expr.callee.type === "Super" ||
						expr.arguments.length !== 2
					)
						return;
					const [arg1, arg2] = expr.arguments;
					if (arg1.type === "SpreadElement") return;
					if (arg2.type === "SpreadElement") return;
					const callee = parser.evaluateExpression(expr.callee);
					if (!callee.isIdentifier() || callee.identifier !== "URL") return;
					const arg2Value = parser.evaluateExpression(arg2);
					if (
						!arg2Value.isString() ||
						!arg2Value.string.startsWith("file://") ||
						arg2Value.string !== getUrl(parser.state.module)
					) {
						return;
					}
					const arg1Value = parser.evaluateExpression(arg1);
					return [arg1Value, [arg1.range[0], arg2.range[1]]];
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {ObjectExpression} expr expression
				 * @returns {{ expressions: Record<string, Expression | Pattern>, otherElements: (Property | SpreadElement)[], values: Record<string, any>, spread: boolean, insertType: "comma" | "single", insertLocation: number }} parsed object
				 */
				const parseObjectExpression = (parser, expr) => {
					/** @type {Record<string, any>} */
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
									/** @type {Expression} */ (prop.value)
								);
								if (value.isCompileTimeValue())
									values[prop.key.name] = value.asCompileTimeValue();
							}
						} else {
							otherElements.push(prop);
						}
					}
					const insertType = expr.properties.length > 0 ? "comma" : "single";
					const insertLocation =
						expr.properties[expr.properties.length - 1].range[1];
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
				 * @param {JavascriptParser} parser the parser
				 * @param {object} parserOptions options
				 */
				const parserPlugin = (parser, parserOptions) => {
					if (parserOptions.worker === false) return;
					const options = !Array.isArray(parserOptions.worker)
						? ["..."]
						: parserOptions.worker;
					const handleNewWorker = expr => {
						if (expr.arguments.length === 0 || expr.arguments.length > 2)
							return;
						const [arg1, arg2] = expr.arguments;
						if (arg1.type === "SpreadElement") return;
						if (arg2 && arg2.type === "SpreadElement") return;
						const parsedUrl = parseModuleUrl(parser, arg1);
						if (!parsedUrl) return;
						const [url, range] = parsedUrl;
						if (!url.isString()) return;
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
									/** @type {Record<string, Expression | Pattern>} */
									expressions: {},
									otherElements: [],
									/** @type {Record<string, any>} */
									values: {},
									spread: false,
									insertType: arg2 ? "spread" : "argument",
									insertLocation: arg2 ? arg2.range : arg1.range[1]
							  };
						const { options: importOptions, errors: commentErrors } =
							parser.parseCommentOptions(expr.range);

						if (commentErrors) {
							for (const e of commentErrors) {
								const { comment } = e;
								parser.state.module.addWarning(
									new CommentCompilationWarning(
										`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
										comment.loc
									)
								);
							}
						}

						/** @type {EntryOptions} */
						let entryOptions = {};

						if (importOptions) {
							if (importOptions.webpackIgnore !== undefined) {
								if (typeof importOptions.webpackIgnore !== "boolean") {
									parser.state.module.addWarning(
										new UnsupportedFeatureWarning(
											`\`webpackIgnore\` expected a boolean, but received: ${importOptions.webpackIgnore}.`,
											expr.loc
										)
									);
								} else {
									if (importOptions.webpackIgnore) {
										return false;
									}
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
											expr.loc
										)
									);
								} else {
									Object.assign(
										entryOptions,
										importOptions.webpackEntryOptions
									);
								}
							}
							if (importOptions.webpackChunkName !== undefined) {
								if (typeof importOptions.webpackChunkName !== "string") {
									parser.state.module.addWarning(
										new UnsupportedFeatureWarning(
											`\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`,
											expr.loc
										)
									);
								} else {
									entryOptions.name = importOptions.webpackChunkName;
								}
							}
						}

						if (
							!Object.prototype.hasOwnProperty.call(entryOptions, "name") &&
							options &&
							typeof options.name === "string"
						) {
							entryOptions.name = options.name;
						}

						if (entryOptions.runtime === undefined) {
							let i = workerIndexMap.get(parser.state) || 0;
							workerIndexMap.set(parser.state, i + 1);
							let name = `${cachedContextify(
								parser.state.module.identifier()
							)}|${i}`;
							const hash = createHash(compilation.outputOptions.hashFunction);
							hash.update(name);
							const digest = /** @type {string} */ (
								hash.digest(compilation.outputOptions.hashDigest)
							);
							entryOptions.runtime = digest.slice(
								0,
								compilation.outputOptions.hashDigestLength
							);
						}

						const block = new AsyncDependenciesBlock({
							name: entryOptions.name,
							entryOptions: {
								chunkLoading: this._chunkLoading,
								wasmLoading: this._wasmLoading,
								...entryOptions
							}
						});
						block.loc = expr.loc;
						const dep = new WorkerDependency(url.string, range, {
							publicPath: this._workerPublicPath
						});
						dep.loc = expr.loc;
						block.addDependency(dep);
						parser.state.module.addBlock(block);

						if (compilation.outputOptions.trustedTypes) {
							const dep = new CreateScriptUrlDependency(
								expr.arguments[0].range
							);
							dep.loc = expr.loc;
							parser.state.module.addDependency(dep);
						}

						if (expressions.type) {
							const expr = expressions.type;
							if (options.type !== false) {
								const dep = new ConstDependency(
									this._module ? '"module"' : "undefined",
									expr.range
								);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);
								expressions.type = undefined;
							}
						} else if (insertType === "comma") {
							if (this._module || hasSpreadInOptions) {
								const dep = new ConstDependency(
									`, type: ${this._module ? '"module"' : "undefined"}`,
									insertLocation
								);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);
							}
						} else if (insertType === "spread") {
							const dep1 = new ConstDependency(
								"Object.assign({}, ",
								insertLocation[0]
							);
							const dep2 = new ConstDependency(
								`, { type: ${this._module ? '"module"' : "undefined"} })`,
								insertLocation[1]
							);
							dep1.loc = expr.loc;
							dep2.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep1);
							parser.state.module.addPresentationalDependency(dep2);
						} else if (insertType === "argument") {
							if (this._module) {
								const dep = new ConstDependency(
									', { type: "module" }',
									insertLocation
								);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);
							}
						}

						parser.walkExpression(expr.callee);
						for (const key of Object.keys(expressions)) {
							if (expressions[key]) parser.walkExpression(expressions[key]);
						}
						for (const prop of otherElements) {
							parser.walkProperty(prop);
						}
						if (insertType === "spread") {
							parser.walkExpression(arg2);
						}

						return true;
					};
					const processItem = item => {
						if (item.endsWith("()")) {
							parser.hooks.call
								.for(item.slice(0, -2))
								.tap("WorkerPlugin", handleNewWorker);
						} else {
							const match = /^(.+?)(\(\))?\s+from\s+(.+)$/.exec(item);
							if (match) {
								const ids = match[1].split(".");
								const call = match[2];
								const source = match[3];
								(call ? parser.hooks.call : parser.hooks.new)
									.for(harmonySpecifierTag)
									.tap("WorkerPlugin", expr => {
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
										return handleNewWorker(expr);
									});
							} else {
								parser.hooks.new.for(item).tap("WorkerPlugin", handleNewWorker);
							}
						}
					};
					for (const item of options) {
						if (item === "...") {
							DEFAULT_SYNTAX.forEach(processItem);
						} else processItem(item);
					}
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("WorkerPlugin", parserPlugin);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("WorkerPlugin", parserPlugin);
			}
		);
	}
}
module.exports = WorkerPlugin;
