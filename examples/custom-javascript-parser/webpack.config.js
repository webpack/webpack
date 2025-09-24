"use strict";

const meriyah = require("meriyah");

const parse = (sourceCode, options) => {
	const comments = [];
	const semicolons = new Set();
	const parseOptions = {
		...options,
		module: options.sourceType === "module",
		loc: options.locations,
		onComment: options.comments
			? comments
			: undefined,
		onInsertedSemicolon:
			options.semicolons
				? (pos) => semicolons.add(pos)
				: undefined
	}
	const ast = meriyah.parse(sourceCode, parseOptions);

	return { ast, comments, semicolons };
};

module.exports = {
	mode: "production",
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	module: {
		// Global override
		parser: {
			javascript: {
				parser: {
					parse
				}
			},
		},
		// Override on the module level, only for modules which match the `test`
		// rules: [
		// 	{
		// 		test: /\.js$/,
		// 		parser: {
		// 			parse
		// 		}
		// 	}
		// ]
	}
};
