/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const ConstDependency = require("./ConstDependency");
const CreateScriptUrlDependency = require("./CreateScriptUrlDependency");
const WorkerDependency = require("./WorkerDependency");
const WorkerPluginBase = require("./WorkerPluginBase");

/** @typedef {import("./WorkerPluginBase").WorkerPluginCreateWorkerContext} WorkerPluginCreateWorkerContext */

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModuleFactory")} NormalModuleFactory */

/** @typedef {import("../javascript/JavascriptParser").Range} Range */

/** @typedef {import("../../declarations/WebpackOptions").ChunkLoading} ChunkLoading */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").OutputModule} OutputModule */
/** @typedef {import("../../declarations/WebpackOptions").WasmLoading} WasmLoading */
/** @typedef {import("../../declarations/WebpackOptions").WorkerPublicPath} WorkerPublicPath */

const DEFAULT_SYNTAX = [
	"Worker",
	"SharedWorker",
	"navigator.serviceWorker.register()",
	"Worker from worker_threads"
];

const PLUGIN_NAME = "WorkerPlugin";

class WorkerPlugin extends WorkerPluginBase {
	/**
	 * @param {ChunkLoading=} chunkLoading chunk loading
	 * @param {WasmLoading=} wasmLoading wasm loading
	 * @param {OutputModule=} module output module
	 * @param {WorkerPublicPath=} workerPublicPath worker public path
	 */
	constructor(chunkLoading, wasmLoading, module, workerPublicPath) {
		super(PLUGIN_NAME, DEFAULT_SYNTAX, workerPublicPath);
		this._module = module;
		this._chunkLoading = chunkLoading;
		this._wasmLoading = wasmLoading;
	}

	/**
	 * When overridden, registers the dependencies of this plugin in the compiler.
	 * @param {Compilation} compilation the compilation
	 * @param {NormalModuleFactory} normalModuleFactory the module factory
	 */
	registerDependency(compilation, normalModuleFactory) {
		compilation.dependencyFactories.set(WorkerDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(
			WorkerDependency,
			new WorkerDependency.Template()
		);
		compilation.dependencyTemplates.set(
			CreateScriptUrlDependency,
			new CreateScriptUrlDependency.Template()
		);
	}

	/**
	 * When overridden, unwraps and creates the right options to be used in the plugin.
	 * @param {JavascriptParserOptions} parserOptions parserOptions
	 * @returns {string[]|false} The options for this plugin
	 */
	getOptions(parserOptions) {
		if (parserOptions.worker === false) return parserOptions.worker;
		return !Array.isArray(parserOptions.worker)
			? ["..."]
			: parserOptions.worker;
	}

	/**
	 * Handles the creation of a new worker as a matching syntax could be found and decoded.
	 * @param {WorkerPluginCreateWorkerContext} context The context holding all information about the worker that should be created.
	 * @returns {boolean | void} true when handled
	 */
	handleNewWorker(context) {
		const { entryOptions, expression: expr, url, urlRange } = context;
		const { parser, compilation } = context.pluginContext;

		const block = new AsyncDependenciesBlock({
			name: entryOptions.name,
			entryOptions: {
				chunkLoading: this._chunkLoading,
				wasmLoading: this._wasmLoading,
				...entryOptions
			}
		});
		block.loc = expr.loc;
		const dep = new WorkerDependency(url, urlRange, {
			publicPath: this.workerPublicPath
		});
		dep.loc = /** @type {DependencyLocation} */ (expr.loc);
		block.addDependency(dep);
		parser.state.module.addBlock(block);

		if (compilation.outputOptions.trustedTypes) {
			const dep = new CreateScriptUrlDependency(
				/** @type {Range} */ (expr.arguments[0].range)
			);
			dep.loc = /** @type {DependencyLocation} */ (expr.loc);
			parser.state.module.addDependency(dep);
		}

		// inject { type: "module" } or { type: "undefined" } into worker options via
		// { ...originalOptions, type: "module" } or simply adding { type: "module" } as parameter
		const moduleType = `type: ${this._module ? '"module"' : "undefined"}`;

		// combine with existing options
		if (expr.arguments.length > 1) {
			const dep1 = new ConstDependency(
				"{ ...",
				/** @type {Range} */ (expr.arguments[1].range)[0]
			);
			dep1.loc = /** @type {DependencyLocation} */ (expr.loc);
			parser.state.module.addPresentationalDependency(dep1);

			const dep2 = new ConstDependency(
				`, ${moduleType} }`,
				/** @type {Range} */ (expr.arguments[1].range)[1]
			);
			dep2.loc = /** @type {DependencyLocation} */ (expr.loc);
			parser.state.module.addPresentationalDependency(dep2);
		} else {
			const dep1 = new ConstDependency(
				`, { ${moduleType} }`,
				/** @type {Range} */ (expr.arguments[0].range)[1]
			);
			dep1.loc = /** @type {DependencyLocation} */ (expr.loc);
			parser.state.module.addPresentationalDependency(dep1);
		}

		return true;
	}
}
module.exports = WorkerPlugin;
