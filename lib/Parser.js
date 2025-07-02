/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./NormalModule")} NormalModule */

/** @typedef {Record<string, EXPECTED_ANY>} PreparsedAst */

/**
 * @typedef {object} ParserStateBase
 * @property {string | Buffer} source
 * @property {NormalModule} current
 * @property {NormalModule} module
 * @property {Compilation} compilation
 * @property {WebpackOptions} options
 */

/** @typedef {Record<string, EXPECTED_ANY> & ParserStateBase} ParserState */

class Parser {
	/* istanbul ignore next */
	/**
	 * @abstract
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		const AbstractMethodError = require("./AbstractMethodError");

		throw new AbstractMethodError();
	}
}

module.exports = Parser;
