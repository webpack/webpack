/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CommentCompilationWarning = require("../CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const ImportContextDependency = require("./ImportContextDependency");
const ImportDependenciesBlock = require("./ImportDependenciesBlock");
const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportWeakDependency = require("./ImportWeakDependency");

/** @typedef {import("../../declarations/WebpackOptions").ModuleOptions} ModuleOptions */
/** @typedef {"lazy"|"weak"|"eager"|"lazy-once"|"async-weak"} WebpackMode */

class ImportParserPlugin {
	/**
	 * @param {ModuleOptions} options Normal Module Factory options
	 */
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		parser.hooks.importCall.tap("ImportParserPlugin", expr => {
			if (expr.arguments.length !== 1) {
				throw new Error(
					"Incorrect number of arguments provided to 'import(module: string) -> Promise'."
				);
			}

			const param = parser.evaluateExpression(expr.arguments[0]);

			let chunkName = null;
			/** @type {WebpackMode} */
			let mode = this.options.asyncChunkMode;
			let include = null;
			let exclude = null;
			const groupOptions = {};

			const {
				options: importOptions,
				errors: commentErrors
			} = parser.parseCommentOptions(expr.range);

			if (commentErrors) {
				for (const e of commentErrors) {
					const { comment } = e;
					parser.state.module.warnings.push(
						new CommentCompilationWarning(
							`Compilation error while processing magic comment(-s): /*${
								comment.value
							}*/: ${e.message}`,
							comment.loc
						)
					);
				}
			}

			if (importOptions) {
				if (importOptions.webpackIgnore !== undefined) {
					if (typeof importOptions.webpackIgnore !== "boolean") {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackIgnore\` expected a boolean, but received: ${
									importOptions.webpackIgnore
								}.`,
								expr.loc
							)
						);
					} else {
						// Do not instrument `import()` if `webpackIgnore` is `true`
						if (importOptions.webpackIgnore) {
							return false;
						}
					}
				}
				if (importOptions.webpackChunkName !== undefined) {
					if (typeof importOptions.webpackChunkName !== "string") {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackChunkName\` expected a string, but received: ${
									importOptions.webpackChunkName
								}.`,
								expr.loc
							)
						);
					} else {
						chunkName = importOptions.webpackChunkName;
					}
				}
				if (importOptions.webpackMode !== undefined) {
					if (typeof importOptions.webpackMode !== "string") {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackMode\` expected a string, but received: ${
									importOptions.webpackMode
								}.`,
								expr.loc
							)
						);
					} else {
						mode = importOptions.webpackMode;
					}
				}
				if (importOptions.webpackPrefetch !== undefined) {
					if (importOptions.webpackPrefetch === true) {
						groupOptions.prefetchOrder = 0;
					} else if (typeof importOptions.webpackPrefetch === "number") {
						groupOptions.prefetchOrder = importOptions.webpackPrefetch;
					} else {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackPrefetch\` expected true or a number, but received: ${
									importOptions.webpackPrefetch
								}.`,
								expr.loc
							)
						);
					}
				}
				if (importOptions.webpackPreload !== undefined) {
					if (importOptions.webpackPreload === true) {
						groupOptions.preloadOrder = 0;
					} else if (typeof importOptions.webpackPreload === "number") {
						groupOptions.preloadOrder = importOptions.webpackPreload;
					} else {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackPreload\` expected true or a number, but received: ${
									importOptions.webpackPreload
								}.`,
								expr.loc
							)
						);
					}
				}
				if (importOptions.webpackInclude !== undefined) {
					if (
						!importOptions.webpackInclude ||
						importOptions.webpackInclude.constructor.name !== "RegExp"
					) {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackInclude\` expected a regular expression, but received: ${
									importOptions.webpackInclude
								}.`,
								expr.loc
							)
						);
					} else {
						include = new RegExp(importOptions.webpackInclude);
					}
				}
				if (importOptions.webpackExclude !== undefined) {
					if (
						!importOptions.webpackExclude ||
						importOptions.webpackExclude.constructor.name !== "RegExp"
					) {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								`\`webpackExclude\` expected a regular expression, but received: ${
									importOptions.webpackExclude
								}.`,
								expr.loc
							)
						);
					} else {
						exclude = new RegExp(importOptions.webpackExclude);
					}
				}
			}

			if (param.isString()) {
				if (mode !== "lazy" && mode !== "eager" && mode !== "weak") {
					parser.state.module.warnings.push(
						new UnsupportedFeatureWarning(
							`\`webpackMode\` expected 'lazy', 'eager' or 'weak', but received: ${mode}.`,
							expr.loc
						)
					);
				}

				if (mode === "eager") {
					const dep = new ImportEagerDependency(param.string, expr.range);
					parser.state.current.addDependency(dep);
				} else if (mode === "weak") {
					const dep = new ImportWeakDependency(param.string, expr.range);
					parser.state.current.addDependency(dep);
				} else {
					const depBlock = new ImportDependenciesBlock(
						Object.assign(groupOptions, {
							name: chunkName
						}),
						expr.loc,
						param.string,
						expr.range
					);
					const dep = new ImportDependency(param.string);
					dep.loc = expr.loc;
					depBlock.addDependency(dep);
					parser.state.current.addBlock(depBlock);
				}
				return true;
			} else {
				if (
					mode !== "lazy" &&
					mode !== "lazy-once" &&
					mode !== "eager" &&
					mode !== "weak"
				) {
					parser.state.module.warnings.push(
						new UnsupportedFeatureWarning(
							`\`webpackMode\` expected 'lazy', 'lazy-once', 'eager' or 'weak', but received: ${mode}.`,
							expr.loc
						)
					);
					mode = "lazy";
				}

				if (mode === "weak") {
					mode = "async-weak";
				}
				const dep = ContextDependencyHelpers.create(
					ImportContextDependency,
					expr.range,
					param,
					expr,
					this.options,
					{
						chunkName,
						groupOptions,
						include,
						exclude,
						mode,
						namespaceObject: parser.state.module.buildMeta.strictHarmonyModule
							? "strict"
							: true
					},
					parser
				);
				if (!dep) return;
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
	}
}

module.exports = ImportParserPlugin;
