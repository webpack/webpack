"use strict";

const meriyah = require("meriyah");

let parses = 0;

/** @import { SourceLocation } from "estree" */
/** @typedef {import("estree").Program & { start: number, end: number, loc: SourceLocation }} Program */
/** @typedef {import("estree").Comment & { start: number, end: number, loc: SourceLocation }} Comment */

/**
 * Counts every parse webpack asks for: at build, for concatenation and at render.
 * @param {string} sourceCode source code
 * @param {{ sourceType: "module", comments: boolean, locations: boolean }} options options
 * @returns {{ ast: Program, comments: Comment[] }} parsed source code
 */
const parse = (sourceCode, options) => {
	parses++;
	/** @type {Comment[]} */
	const comments = [];
	const parseOptions = {
		...options,
		module: options.sourceType === "module",
		loc: options.locations,
		onComment: options.comments ? comments : undefined
	};
	// @ts-expect-error meriyah types for comments are not align with estree
	const ast = meriyah.parse(sourceCode, parseOptions);

	// @ts-expect-error meriyah types for ClassExpression is not align with estree
	return { ast, comments };
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: ["es2020", "node"],
	output: {
		module: true
	},
	cache: {
		type: "memory"
	},
	module: {
		parser: {
			javascript: {
				parse
			}
		}
	},
	optimization: {
		minimize: false,
		concatenateModules: true,
		avoidEntryIife: true
	},
	plugins: [
		{
			apply(compiler) {
				let step = 0;
				compiler.hooks.thisCompilation.tap("TestPlugin", () => {
					parses = 0;
				});
				compiler.hooks.done.tap("TestPlugin", () => {
					if (step++ === 0) {
						// 5 - parse module, 2 - concatenate module, 4 - inline
						expect(parses).toBe(11);
					} else {
						// 1 - parse the changed module2, 1 - inline it again, 1 -
						// inline the entry; module3 and module4 render to the same
						// source as before, so their free names are not recomputed
						expect(parses).toBe(3);
					}
				});
			}
		}
	]
};
