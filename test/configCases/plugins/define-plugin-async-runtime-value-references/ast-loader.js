"use strict";

const { parse } = require("acorn");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	/** @type {import("acorn").Comment[]} */
	const comments = [];
	const webpackAST = parse(source.replace("AST_INPUT", "AST_VALUE"), {
		ecmaVersion: "latest",
		sourceType: "script",
		ranges: true,
		onComment: comments
	});
	// a preparsed AST carries its comments so the parser need not re-scan
	/** @type {import("acorn").Node & { comments?: import("acorn").Comment[] }} */
	(webpackAST).comments = comments;
	this.callback(null, source, undefined, { webpackAST });
};
