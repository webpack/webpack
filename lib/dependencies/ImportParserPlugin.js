/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportContextDependency = require("./ImportContextDependency");
const ImportWeakDependency = require("./ImportWeakDependency");
const ImportDependenciesBlock = require("./ImportDependenciesBlock");
const ImportEagerDependency = require("./ImportEagerDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");

class ImportParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		parser.hooks.importCall.tap("ImportParserPlugin", expr => {
			if (expr.arguments.length !== 1)
				throw new Error(
					"Incorrect number of arguments provided to 'import(module: string) -> Promise'."
				);

			const param = parser.evaluateExpression(expr.arguments[0]);

			let chunkName = null;
			let mode = "lazy";
			let include = null;
			let exclude = null;
			const groupOptions = {};

			const importOptions = parser.getCommentOptions(expr.range);
			if (importOptions) {
				if (typeof importOptions.webpackChunkName !== "undefined") {
					if (typeof importOptions.webpackChunkName !== "string") {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								parser.state.module,
								`\`webpackChunkName\` expected a string, but received: ${
									importOptions.webpackChunkName
								}.`
							)
						);
					} else {
						chunkName = importOptions.webpackChunkName;
					}
				}
				if (typeof importOptions.webpackMode !== "undefined") {
					if (typeof importOptions.webpackMode !== "string") {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								parser.state.module,
								`\`webpackMode\` expected a string, but received: ${
									importOptions.webpackMode
								}.`
							)
						);
					} else {
						mode = importOptions.webpackMode;
					}
				}
				if (typeof importOptions.webpackPrefetch !== "undefined") {
					if (importOptions.webpackPrefetch === true) {
						groupOptions.prefetchOrder = 0;
					} else if (typeof importOptions.webpackPrefetch === "number") {
						groupOptions.prefetchOrder = importOptions.webpackPrefetch;
					} else {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								parser.state.module,
								`\`webpackPrefetch\` expected true or a number, but received: ${
									importOptions.webpackPrefetch
								}.`
							)
						);
					}
				}
				if (typeof importOptions.webpackPreload !== "undefined") {
					if (importOptions.webpackPreload === true) {
						groupOptions.preloadOrder = 0;
					} else if (typeof importOptions.webpackPreload === "number") {
						groupOptions.preloadOrder = importOptions.webpackPreload;
					} else {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								parser.state.module,
								`\`webpackPreload\` expected true or a number, but received: ${
									importOptions.webpackPreload
								}.`
							)
						);
					}
				}
				if (typeof importOptions.webpackInclude !== "undefined") {
					if (
						!importOptions.webpackInclude ||
						importOptions.webpackInclude.constructor.name !== "RegExp"
					) {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								parser.state.module,
								`\`webpackInclude\` expected a regular expression, but received: ${
									importOptions.webpackInclude
								}.`
							)
						);
					} else {
						include = new RegExp(importOptions.webpackInclude);
					}
				}
				if (typeof importOptions.webpackExclude !== "undefined") {
					if (
						!importOptions.webpackExclude ||
						importOptions.webpackExclude.constructor.name !== "RegExp"
					) {
						parser.state.module.warnings.push(
							new UnsupportedFeatureWarning(
								parser.state.module,
								`\`webpackExclude\` expected a regular expression, but received: ${
									importOptions.webpackExclude
								}.`
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
							parser.state.module,
							`\`webpackMode\` expected 'lazy', 'eager' or 'weak', but received: ${mode}.`
						)
					);
				}

				if (mode === "eager") {
					const dep = new ImportEagerDependency(
						param.string,
						parser.state.module,
						expr.range
					);
					parser.state.current.addDependency(dep);
				} else if (mode === "weak") {
					const dep = new ImportWeakDependency(
						param.string,
						parser.state.module,
						expr.range
					);
					parser.state.current.addDependency(dep);
				} else {
					const depBlock = new ImportDependenciesBlock(
						param.string,
						expr.range,
						Object.assign(groupOptions, {
							name: chunkName
						}),
						parser.state.module,
						expr.loc,
						parser.state.module
					);
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
							parser.state.module,
							`\`webpackMode\` expected 'lazy', 'lazy-once', 'eager' or 'weak', but received: ${mode}.`
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
					}
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
