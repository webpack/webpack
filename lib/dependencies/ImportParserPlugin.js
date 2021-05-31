/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const ImportContextDependency = require("./ImportContextDependency");
const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportWeakDependency = require("./ImportWeakDependency");

/** @typedef {import("../ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {import("../ContextModule").ContextMode} ContextMode */

class ImportParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		parser.hooks.importCall.tap("ImportParserPlugin", expr => {
			const param = parser.evaluateExpression(expr.source);

			let chunkName = null;
			/** @type {ContextMode} */
			let mode = "lazy";
			let include = null;
			let exclude = null;
			/** @type {string[][] | null} */
			let exports = null;
			/** @type {RawChunkGroupOptions} */
			const groupOptions = {};

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
						// Do not instrument `import()` if `webpackIgnore` is `true`
						if (importOptions.webpackIgnore) {
							return false;
						}
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
						chunkName = importOptions.webpackChunkName;
					}
				}
				if (importOptions.webpackMode !== undefined) {
					if (typeof importOptions.webpackMode !== "string") {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackMode\` expected a string, but received: ${importOptions.webpackMode}.`,
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
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackPrefetch\` expected true or a number, but received: ${importOptions.webpackPrefetch}.`,
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
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackPreload\` expected true or a number, but received: ${importOptions.webpackPreload}.`,
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
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackInclude\` expected a regular expression, but received: ${importOptions.webpackInclude}.`,
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
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackExclude\` expected a regular expression, but received: ${importOptions.webpackExclude}.`,
								expr.loc
							)
						);
					} else {
						exclude = new RegExp(importOptions.webpackExclude);
					}
				}
				if (importOptions.webpackExports !== undefined) {
					if (
						!(
							typeof importOptions.webpackExports === "string" ||
							(Array.isArray(importOptions.webpackExports) &&
								importOptions.webpackExports.every(
									item => typeof item === "string"
								))
						)
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackExports\` expected a string or an array of strings, but received: ${importOptions.webpackExports}.`,
								expr.loc
							)
						);
					} else {
						if (typeof importOptions.webpackExports === "string") {
							exports = [[importOptions.webpackExports]];
						} else {
							exports = Array.from(importOptions.webpackExports, e => [e]);
						}
					}
				}
			}

			if (param.isString()) {
				if (mode !== "lazy" && mode !== "eager" && mode !== "weak") {
					parser.state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackMode\` expected 'lazy', 'eager' or 'weak', but received: ${mode}.`,
							expr.loc
						)
					);
				}

				if (mode === "eager") {
					const dep = new ImportEagerDependency(
						param.string,
						expr.range,
						exports
					);
					parser.state.current.addDependency(dep);
				} else if (mode === "weak") {
					const dep = new ImportWeakDependency(
						param.string,
						expr.range,
						exports
					);
					parser.state.current.addDependency(dep);
				} else {
					const depBlock = new AsyncDependenciesBlock(
						{
							...groupOptions,
							name: chunkName
						},
						expr.loc,
						param.string
					);
					const dep = new ImportDependency(param.string, expr.range, exports);
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
					parser.state.module.addWarning(
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
							: true,
						typePrefix: "import()",
						category: "esm",
						referencedExports: exports
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
