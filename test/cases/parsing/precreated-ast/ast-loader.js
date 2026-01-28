"use strict";

const acorn = require("acorn");
const acornParser = acorn.Parser;

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	/** @type {acorn.Comment[]} */
	const comments = [];

	const semicolons = new Set();
	//@ts-ignore
	const ast = acornParser.parse(source, {
		ranges: true,
		locations: true,
		ecmaVersion: 11,
		sourceType: "module",
		onComment: comments,
		onInsertedSemicolon: (pos) => semicolons.add(pos)
	});

	// change something to test if it's really used
	//@ts-ignore
	ast.body[0].expression.right.arguments[0].value = "./ok";
	//@ts-ignore
	ast.body[0].expression.right.arguments[0].raw = '"./ok"';

	//@ts-ignore
	ast.comments = comments;
	//@ts-ignore
	ast.semicolons = semicolons;
	this.callback(null, source, null, {
		webpackAST: ast
	});
};
