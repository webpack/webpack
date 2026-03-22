/*
    MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Parser = require("../Parser");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

class HtmlParser extends Parser {
	/**
	 * Parse HTML source and register dependencies
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		// TODO: walk HTML and find <script src=""> tags
		//       create HtmlScriptDependency for each one
		//       these become JS entries in the dependency graph

		// TODO: walk HTML and find <link href=""> tags
		//       create HtmlLinkDependency for each one
		//       these become CSS entries in the dependency graph

		// TODO: walk HTML and find <img src=""> tags
		//       create HtmlImgDependency for each one
		//       these become asset entries in the dependency graph

		// TODO: handle <script type="module"> with ESM semantics
		// TODO: handle <img srcset=""> with multiple resources
		// TODO: handle <base href=""> changing base path for all relative URLs

		return state;
	}
}

module.exports = HtmlParser;
