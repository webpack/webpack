/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @import {
 * 	WebpackOptionsNormalizedWithDefaults as WebpackOptions
 * } from "../config/defaults"
 */
/** @import Compilation from "../Compilation" */
/** @import NormalModule from "./NormalModule" */

/** @typedef {Record<string, EXPECTED_ANY>} PreparsedAst */

/**
 * Defines the parser state base type used by this module.
 * @template {NormalModule} [TModule=NormalModule]
 * @typedef {object} ParserStateBase
 * @property {string | Buffer} source
 * @property {NormalModule} current
 * @property {TModule} module the module being parsed
 * @property {Compilation} compilation
 * @property {WebpackOptions} options
 */

/**
 * @template {NormalModule} [TModule=NormalModule]
 * @typedef {ParserStateBase<TModule> & Record<string, EXPECTED_ANY>} ParserState
 */

/**
 * @template {NormalModule} [TModule=NormalModule] the module class this parser parses
 */
class Parser {
	/* istanbul ignore next */
	/**
	 * Parses the provided source and updates the parser state.
	 * @abstract
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		const AbstractMethodError = require("../errors/AbstractMethodError");

		throw new AbstractMethodError();
	}
}

module.exports = Parser;
