"use strict";

const acorn = require("acorn");
const acornParser = acorn.Parser;

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function (source) {
	/** @type {acorn.Comment[]} */
	const comments = [];

	const ast = acornParser.parse(source, {
		ranges: true,
		locations: true,
		ecmaVersion: 11,
		sourceType: "module",
		onComment: comments
	});

	// `module.exports = require("./wrong")`: point the request elsewhere to
	// test that the AST from the loader is really used
	const [statement] = ast.body;
	if (
		statement.type !== "ExpressionStatement" ||
		statement.expression.type !== "AssignmentExpression" ||
		statement.expression.right.type !== "CallExpression" ||
		statement.expression.right.arguments[0].type !== "Literal"
	) {
		throw new Error("unexpected module source");
	}
	const request = statement.expression.right.arguments[0];
	request.value = "./ok";
	request.raw = '"./ok"';

	this.callback(null, source, null, {
		webpackAST: Object.assign(ast, { comments })
	});
};
