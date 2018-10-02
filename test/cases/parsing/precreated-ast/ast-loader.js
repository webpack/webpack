"use strict";

const { Parser } = require("acorn");

const parser = Parser.extend(
	require("acorn-dynamic-import").default
)

module.exports = function(source) {
	const comments = [];

	const ast = parser.parse(source, {
		ranges: true,
		locations: true,
		ecmaVersion: 2017,
		sourceType: "module",
		onComment: comments
	});

	// change something to test if it's really used
	ast.body[0].expression.right.arguments[0].value = "./ok";
	ast.body[0].expression.right.arguments[0].raw = "\"./ok\"";

	ast.comments = comments;
	this.callback(null, source, null, {
		webpackAST: ast
	});
};
