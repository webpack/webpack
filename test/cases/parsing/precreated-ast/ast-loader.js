"use strict";

const parseModule = require("cherow").parseModule;

module.exports = function(source) {
	const comments = [];
	const ast = parseModule(source, {
		ranges: true,
		loc: true,
		next: true
	});
	// change something to test if it's really used
	ast.body[0].expression.right.arguments[0].value = "./ok";
	ast.body[0].expression.right.arguments[0].raw = "\"./ok\"";

	ast.comments = comments;
	this.callback(null, source, null, {
		webpackAST: ast
	});
};
