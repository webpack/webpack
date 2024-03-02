/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const ConstDependency = require("./ConstDependency");
const WorkerPluginBase = require("./WorkerPluginBase");
const WorkletDependency = require("./WorkletDependency");
const { WORKLET_ADD_MODULE_ARGS } = require("./WorkletDependency");

/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Pattern} Pattern */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").SpreadElement} SpreadElement */
/** @typedef {import("../../declarations/WebpackOptions").ChunkLoading} ChunkLoading */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").OutputModule} OutputModule */
/** @typedef {import("../../declarations/WebpackOptions").WasmLoading} WasmLoading */
/** @typedef {import("../../declarations/WebpackOptions").WorkerPublicPath} WorkerPublicPath */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../NormalModuleFactory")} NormalModuleFactory */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser")} Parser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */
/** @typedef {import("./WorkerPluginBase").WorkerPluginCreateWorkerContext} WorkerPluginCreateWorkerContext */

const DEFAULT_SYNTAX = [
	"*context.audioWorklet.addModule()",
	"*audioWorklet.addModule()",
	"*CSS.paintWorklet.addModule()",
	"*CSS.layoutWorklet.addModule()",
	"*CSS.animationWorklet.addModule()"
];

const PLUGIN_NAME = "WorkletPlugin";

class WorkletPlugin extends WorkerPluginBase {
	/**
	 * @param {WorkerPublicPath=} workerPublicPath worker public path
	 */
	constructor(workerPublicPath) {
		super(PLUGIN_NAME, DEFAULT_SYNTAX, workerPublicPath);
	}

	/**
	 * When overridden, registers the dependencies of this plugin in the compiler.
	 * @param {Compilation} compilation the compilation
	 * @param {NormalModuleFactory} normalModuleFactory the module factory
	 */
	registerDependency(compilation, normalModuleFactory) {
		compilation.dependencyFactories.set(WorkletDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(
			WorkletDependency,
			new WorkletDependency.Template()
		);
	}

	/**
	 * When overridden, unwraps and creates the right options to be used in the plugin.
	 * @param {JavascriptParserOptions} parserOptions parserOptions
	 * @returns {string[]|false} The options for this plugin
	 */
	getOptions(parserOptions) {
		if (parserOptions.worklet === false) return parserOptions.worklet;
		return !Array.isArray(parserOptions.worklet)
			? ["..."]
			: parserOptions.worklet;
	}

	/**
	 * Handles the creation of a new worker as a matching syntax could be found and decoded.
	 * @param {WorkerPluginCreateWorkerContext} context The context holding all information about the worker that should be created.
	 * @returns {boolean | void} true when handled
	 */
	handleNewWorker(context) {
		const { entryOptions, expression: expr, url } = context;
		const { parser, compilation } = context.pluginContext;

		const block = new AsyncDependenciesBlock({
			name: entryOptions.name,
			entryOptions: {
				chunkLoading: "import-scripts",
				...entryOptions
			}
		});
		block.loc = expr.loc;

		// Input:         context.audioWorklet.addModule (new URL('./as', import.meta.url), { options } )
		// Kept parts:    \--------<addmodule>---------/                                  \---<opts>----/
		// Result (look close at the parenthesis kept above):
		//                (async function(addModule, options) {
		//                    await addModule(<inline worklet init script blob>, options));
		//                    await addModule(<all worklet chunk urls>, options));
		//                }})( (...x) => <addmodule>(...x)<opts>
		//

		const injectBefore = new WorkletDependency(
			url,
			[expr.range[0], expr.range[0]],
			{
				publicPath: this.workerPublicPath,
				getChunkFileName: chunk => {
					// ensure content hash, it might not yet be computed but needed
					// for the chunk URL
					const hashHook = compilation.hooks.contentHash;
					hashHook.call(chunk);

					return compilation.getPath(
						JavascriptModulesPlugin.getChunkFilenameTemplate(
							chunk,
							compilation.outputOptions
						),
						{
							chunk: chunk,
							contentHashType: "javascript"
						}
					);
				}
			}
		);
		injectBefore.loc = /** @type {DependencyLocation} */ (expr.loc);
		block.addDependency(injectBefore);

		const replaceCallPart = new ConstDependency(
			`(...${WORKLET_ADD_MODULE_ARGS})`,
			[expr.callee.range[1], expr.arguments[0].range[1]]
		);
		replaceCallPart.loc = /** @type {DependencyLocation} */ (expr.loc);
		block.addDependency(replaceCallPart);

		parser.state.module.addBlock(block);

		return true;
	}
}
module.exports = WorkletPlugin;
