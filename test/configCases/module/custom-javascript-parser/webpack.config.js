"use strict";

const meriyah = require("meriyah");

let counter = 0;

const parse = (sourceCode, options) => {
	const comments = [];
	const semicolons = new Set();
	const parseOptions = {
		...options,
		module: options.sourceType === "module",
		loc: options.locations,
		onComment: options.comments ? comments : undefined,
		onInsertedSemicolon: options.semicolons
			? (pos) => semicolons.add(pos)
			: undefined
	};
	const ast = meriyah.parse(sourceCode, parseOptions);

	counter++;

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
