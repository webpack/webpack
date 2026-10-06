"use strict";

// Hands the parser a preparsed AST, which only the JavaScript parser can take.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function astLoader(source) {
	this.callback(null, source, null, { webpackAST: { type: "Program" } });
};
