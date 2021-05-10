/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CommentCompilationWarning = require("../CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");

/** @typedef {import("estree").Expression} ExpressionNode */
/** @typedef {import("../ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {import("../ContextModule").ContextMode} ContextMode */
/** @typedef {import("../javascript/JavascriptParser")} Parser */

/**
 * @param {Parser} parser The parser
 * @param {ExpressionNode} expr The expression
 * @param {ContextMode} mode The default context mode
 * @param {boolean} allowIgnore Should we allow 'webpackIgnore'
 *
 * @returns {{chunkName: null | string, mode: ContextMode, include: null | RegExp, exports: string[][] | null, exclude: null | RegExp, groupOptions: RawChunkGroupOptions}|false} All the parsed properties
 */
module.exports = (parser, expr, mode = "lazy", allowIgnore = false) => {
	let chunkName = null;
	let include = null;
	let exclude = null;

	/** @type {string[][] | null} */
	let exports = null;

	/** @type {RawChunkGroupOptions} */
	const groupOptions = {};

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

	if (importOptions) {
		if (allowIgnore) {
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
	return { chunkName, mode, exports, include, exclude, groupOptions };
};
