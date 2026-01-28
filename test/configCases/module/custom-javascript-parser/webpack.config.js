"use strict";

const meriyah = require("meriyah");

let counter = 0;

/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("estree").Program & { start: number, end: number, loc: SourceLocation }} Program */
/** @typedef {import("estree").Comment & { start: number, end: number, loc: SourceLocation }} Comment */

/**
 * @param {string} sourceCode source code
 * @param {{ sourceType: "module", comments: boolean, locations: boolean, semicolons: boolean }} options options
 * @returns {{ ast: Program, comments: Comment[], semicolons: Set<number> }} parsed source code
 */
const parse = (sourceCode, options) => {
	/** @type {Comment[]} */
	const comments = [];
	const semicolons = new Set();
	/**
	 * @param {number} pos pos
	 */
	const addSemicolons = (pos) => {
		semicolons.add(pos);
	};
	const parseOptions = {
		...options,
		module: options.sourceType === "module",
		loc: options.locations,
		onComment: options.comments ? comments : undefined,
		onInsertedSemicolon: options.semicolons ? addSemicolons : undefined
	};
	// @ts-expect-error meriyah types for comments are not align with estree
	const ast = meriyah.parse(sourceCode, parseOptions);

	counter++;

	// @ts-expect-error meriyah types for ClassExpression is not align with estree
	return { ast, comments, semicolons };
};

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: ["es2020", "node"],
	output: {
		module: true
	},
	module: {
		parser: {
			javascript: {
				parse
			}
		},
		rules: [
			{
				test: /module1\.js$/,
				parser: {
					parse
				}
			}
		]
	},
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: true,
		avoidEntryIife: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.shutdown.tap("TestPlugin", () => {
					// 5 - parse module
					// 2 - concatenate module
					// 4 - inline
					expect(counter).toBe(11);
				});
			}
		}
	]
};
