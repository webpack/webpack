/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { pathToFileURL } = require("url");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const formatLocation = require("../formatLocation");
const EnableChunkLoadingPlugin = require("../javascript/EnableChunkLoadingPlugin");
const { equals } = require("../util/ArrayHelpers");
const { contextify } = require("../util/identifier");
const EnableWasmLoadingPlugin = require("../wasm/EnableWasmLoadingPlugin");
const {
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");
const WorkerDependency = require("./WorkerDependency");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */
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

class WorkerPlugin {
	constructor(chunkLoading, wasmLoading) {
		this._chunkLoading = chunkLoading;
		this._wasmLoading = wasmLoading;
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
				 * @param {Expression} expr expression
				 * @returns {object | undefined} parsed object
				 */
				const parseObjectLiteral = (parser, expr) => {
					if (expr.type !== "ObjectExpression") return;
					const obj = {};
					for (const prop of expr.properties) {
						if (prop.type === "Property") {
							if (
								!prop.method &&
								!prop.computed &&
								!prop.shorthand &&
								prop.key.type === "Identifier" &&
								!prop.value.type.endsWith("Pattern")
							) {
								const value = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (value.isCompileTimeValue())
									obj[prop.key.name] = value.asCompileTimeValue();
							}
						}
					}
					return obj;
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
						if (url.isString()) {
							const options = arg2 && parseObjectLiteral(parser, arg2);
							const {
								options: importOptions,
								errors: commentErrors
							} = parser.parseCommentOptions(expr.range);

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
								options.name
							) {
								entryOptions.name = options.name;
							}

							if (!entryOptions.runtime) {
								entryOptions.runtime = `${cachedContextify(
									parser.state.module.identifier()
								)}|${formatLocation(expr.loc)}`;
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
							const dep = new WorkerDependency(url.string, range);
							dep.loc = expr.loc;
							block.addDependency(dep);
							parser.state.module.addBlock(block);
							parser.walkExpression(expr.callee);
							if (arg2) parser.walkExpression(arg2);
							return true;
						}
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
										const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
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
