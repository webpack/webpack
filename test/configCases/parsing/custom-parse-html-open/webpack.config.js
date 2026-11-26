"use strict";

const meriyah = require("meriyah");

/** @import { Program, Comment as EstreeComment } from "estree" */
/** @import { Configuration } from "../../../../types.d.ts" */

/**
 * @param {string} sourceCode source code
 * @param {{ sourceType: "module" | "script", comments: boolean }} options options
 * @returns {{ ast: Program, comments: EstreeComment[] }} parsed source code
 */
const parse = (sourceCode, options) => {
	/** @type {EstreeComment[]} */
	const comments = [];
	const ast = meriyah.parse(sourceCode, {
		module: options.sourceType === "module",
		ranges: true,
		// @ts-expect-error meriyah types for comments are not align with estree
		onComment: options.comments ? comments : undefined
	});
	// @ts-expect-error meriyah types are not align with estree
	return { ast, comments };
};

/** @type {Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				parse
			}
		}
	}
};
