/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AbstractMethodError = require("./AbstractMethodError");

/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./NormalModule")} NormalModule */

/** @typedef {Record<string, any>} PreparsedAst */

/**
 * @typedef {Object} ParserStateBase
 * @property {NormalModule} current
 * @property {NormalModule} module
 * @property {Compilation} compilation
 * @property {TODO} options
 */

/** @typedef {Record<string, any> & ParserStateBase} ParserState */

class Parser {
	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		throw new AbstractMethodError();
	}
}

module.exports = Parser;
