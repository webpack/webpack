"use strict";

const meriyah = require("meriyah");

/**
 * @param {string} sourceCode source code
 * @param {{ sourceType: "module" | "script", comments: boolean }} options options
 * @returns {{ ast: import("estree").Program, comments: import("estree").Comment[] }} parsed source code
 */
const parse = (sourceCode, options) => {
	/** @type {import("estree").Comment[]} */
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

/** @type {import("../../../../types").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				parse
			}
		}
	}
};
