/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	Author Daniel Kuschny @danielku15
*/

"use strict";

const { pathToFileURL } = require("url");

const {
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");

const CommentCompilationWarning = require("../CommentCompilationWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");

const { equals } = require("../util/ArrayHelpers");
const createHash = require("../util/createHash");
const { contextify } = require("../util/identifier");

/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Pattern} Pattern */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").SpreadElement} SpreadElement */

/** @typedef {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").OutputModule} OutputModule */
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
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

/** @typedef {{compilation:Compilation, parser:JavascriptParser, cachedContextify: (value: string) => string}} WorkerPluginBaseContext */
/** @typedef {{pluginContext: WorkerPluginBaseContext, url: string, urlRange:Range, expression:CallExpression, entryOptions:EntryOptions}} WorkerPluginCreateWorkerContext */

/**
 * @param {NormalModule} module module
 * @returns {string} url
 */
const getUrl = module => {
	return pathToFileURL(module.resource).toString();
};

/**
 * This is the base class for plugins providing Web Worker and Worklet support.
 * It handles common aspects like the syntax parsing and setting up the dependencies.
 */
class WorkerPluginBase {
	/**
	 * Initialize the plugin.
	 * @param {string} pluginName The name of the plugin used for all registrations.
	 * @param {string[]} defaultSyntax The list of default syntax constructs to support on parsing.
	 * @param {WorkerPublicPath=} workerPublicPath The public path to the worker files.
	 */
	constructor(pluginName, defaultSyntax, workerPublicPath) {
		this.pluginName = pluginName;
		this.defaultSyntax = defaultSyntax;
		this.workerPublicPath = workerPublicPath;
		this.workerSpecifierTag = Symbol(`${pluginName} specifier tag`);
		/** @type {WeakMap<ParserState, number>} */
		this.workerIndexMap = new WeakMap();
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const cachedContextify = contextify.bindContextCache(
			compiler.context,
			compiler.root
		);

		compiler.hooks.thisCompilation.tap(
			this.pluginName,
			(compilation, { normalModuleFactory }) => {
				this.registerDependency(compilation, normalModuleFactory);

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(this.pluginName, (parser, parserOption) => {
						/**@type {WorkerPluginBaseContext} */
						const pluginContext = {
							compilation,
							parser,
							cachedContextify
						};
						this.parserPlugin(pluginContext, parserOption);
					});
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(this.pluginName, (parser, parserOption) => {
						/**@type {WorkerPluginBaseContext} */
						const pluginContext = {
							compilation,
							parser,
							cachedContextify
						};
						this.parserPlugin(pluginContext, parserOption);
					});
			}
		);
	}

	/**
	 * Initializes the parsing for all registered syntax items.
	 * @param {WorkerPluginBaseContext} pluginContext The context within the plugin is operating.
	 * @param {JavascriptParserOptions} parserOptions The parser options to respect.
	 * @returns {void}
	 */
	parserPlugin(pluginContext, parserOptions) {
		const options = this.getOptions(parserOptions);
		if (!options) {
			return;
		}

		for (const item of options) {
			if (item === "...") {
				this.defaultSyntax.forEach(defaultItem =>
					this.processItem(pluginContext, defaultItem)
				);
			} else {
				this.processItem(pluginContext, item);
			}
		}
	}

	/**
	 * Registers the right hooks in the parser for the given syntax item.
	 * @param {WorkerPluginBaseContext} pluginContext The context within the plugin is operating.
	 * @param {string} item The syntax to register for parsing.
	 */
	processItem(pluginContext, item) {
		const { parser } = pluginContext;

		if (item.startsWith("*") && item.includes(".") && item.endsWith("()")) {
			const firstDot = item.indexOf(".");
			const pattern = item.slice(1, firstDot);
			const itemMembers = item.slice(firstDot + 1, -2);

			parser.hooks.preDeclarator.tap(this.pluginName, (decl, statement) => {
				if (decl.id.type === "Identifier" && decl.id.name === pattern) {
					parser.tagVariable(decl.id.name, this.workerSpecifierTag);
					return true;
				}
			});
			parser.hooks.pattern.for(pattern).tap(this.pluginName, pattern => {
				parser.tagVariable(pattern.name, this.workerSpecifierTag);
				return true;
			});
			parser.hooks.callMemberChain
				.for(this.workerSpecifierTag)
				.tap(this.pluginName, (expression, members) => {
					if (itemMembers !== members.join(".")) {
						return;
					}

					return this.handleNewWorkerExpression(pluginContext, expression);
				});
		} else if (item.endsWith("()")) {
			parser.hooks.call
				.for(item.slice(0, -2))
				.tap(this.pluginName, expr =>
					this.handleNewWorkerExpression(pluginContext, expr)
				);
		} else {
			const match = /^(.+?)(\(\))?\s+from\s+(.+)$/.exec(item);
			if (match) {
				const ids = match[1].split(".");
				const call = match[2];
				const source = match[3];
				(call ? parser.hooks.call : parser.hooks.new)
					.for(harmonySpecifierTag)
					.tap(this.pluginName, expr => {
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
						return this.handleNewWorkerExpression(pluginContext, expr);
					});
			} else {
				parser.hooks.new
					.for(item)
					.tap(this.pluginName, expr =>
						this.handleNewWorkerExpression(pluginContext, expr)
					);
			}
		}
	}

	/**
	 * Decodes a matched syntax and validates whether a new worker should be created.
	 * @param {WorkerPluginBaseContext} pluginContext The context within the plugin is operating.
	 * @param {CallExpression} expr The matched expression from the parser.
	 * @returns {boolean | void} true when handled
	 */
	handleNewWorkerExpression(pluginContext, expr) {
		if (expr.arguments.length === 0 || expr.arguments.length > 2) {
			return;
		}
		const [arg1, arg2] = expr.arguments;
		if (arg1.type === "SpreadElement") {
			return;
		}
		if (arg2 && arg2.type === "SpreadElement") {
			return;
		}

		const { parser } = pluginContext;
		const parsedUrl = this.parseModuleUrl(parser, arg1);
		if (!parsedUrl) {
			return;
		}
		const [url, urlRange] = parsedUrl;
		if (!url.isString()) {
			return;
		}

		const { options: importOptions, errors: commentErrors } =
			parser.parseCommentOptions(/** @type {Range} */ (expr.range));

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
							/** @type {DependencyLocation} */ (expr.loc)
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
							/** @type {DependencyLocation} */ (expr.loc)
						)
					);
				} else {
					Object.assign(entryOptions, importOptions.webpackEntryOptions);
				}
			}
			if (importOptions.webpackChunkName !== undefined) {
				if (typeof importOptions.webpackChunkName !== "string") {
					parser.state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`,
							/** @type {DependencyLocation} */ (expr.loc)
						)
					);
				} else {
					entryOptions.name = importOptions.webpackChunkName;
				}
			}
		}

		// TODO: do we want to keep the feature that users can specify the entry point name in the
		// object parameter of worker/worklets? the `name` option is not part of the standard
		// and we still have the webpackChunkName comment option

		// if (
		// 	!Object.prototype.hasOwnProperty.call(entryOptions, "name") &&
		// 	options &&
		// 	typeof options.name === "string"
		// ) {
		// 	entryOptions.name = options.name;
		// }

		if (entryOptions.runtime === undefined) {
			const { compilation } = pluginContext;
			let i = this.workerIndexMap.get(parser.state) || 0;
			this.workerIndexMap.set(parser.state, i + 1);
			let name = `${pluginContext.cachedContextify(
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

		const result = this.handleNewWorker({
			pluginContext,
			entryOptions,
			url: url.string,
			urlRange,
			expression: expr
		});
		if (result) {
			// walk original expressions for other plugins to handle them
			// just not the URL of the worker
			parser.walkExpression(expr.callee);
			for (let i = 1; i < expr.arguments.length; i++) {
				parser.walkExpression(expr.arguments[i]);
			}
		}

		return result;
	}

	/**
	 * Handles the creation of a new worker as a matching syntax could be found and decoded.
	 * @abstract
	 * @param {WorkerPluginCreateWorkerContext} context The context holding all information about the worker that should be created.
	 * @returns {boolean | void} true when handled
	 */
	handleNewWorker(context) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/**
	 * When overridden, registers the dependencies of this plugin in the compiler.
	 * @abstract
	 * @param {Compilation} compilation the compilation
	 * @param {NormalModuleFactory} normalModuleFactory the module factory
	 */
	registerDependency(compilation, normalModuleFactory) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/**
	 * When overridden, unwraps and creates the right options to be used in the plugin.
	 * @abstract
	 * @param {JavascriptParserOptions} parserOptions parserOptions
	 * @returns {string[]|false} The options for this plugin
	 */
	getOptions(parserOptions) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/**
	 * Decodes the module URL which should be started as worker.
	 * @param {JavascriptParser} parser the parser
	 * @param {Expression} expr The URL argument.
	 * @returns {[BasicEvaluatedExpression, [number, number]] | void} The module URL of the worker or void if decoding failed.
	 */
	parseModuleUrl(parser, expr) {
		if (
			expr.type !== "NewExpression" ||
			expr.callee.type === "Super" ||
			expr.arguments.length !== 2
		) {
			return;
		}
		const [arg1, arg2] = expr.arguments;
		if (arg1.type === "SpreadElement") return;
		if (arg2.type === "SpreadElement") return;
		const callee = parser.evaluateExpression(expr.callee);
		if (!callee.isIdentifier() || callee.identifier !== "URL") {
			return;
		}
		const arg2Value = parser.evaluateExpression(arg2);
		if (
			!arg2Value.isString() ||
			!(/** @type {string} */ (arg2Value.string).startsWith("file://")) ||
			arg2Value.string !== getUrl(parser.state.module)
		) {
			return;
		}
		const arg1Value = parser.evaluateExpression(arg1);
		return [
			arg1Value,
			[
				/** @type {Range} */ (arg1.range)[0],
				/** @type {Range} */ (arg2.range)[1]
			]
		];
	}
}

module.exports = WorkerPluginBase;
