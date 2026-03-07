/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Parser = require("../Parser");
const HtmlUrlDependency = require("../dependencies/HtmlUrlDependency");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

class HtmlParser extends Parser {
	/**
	 * @param {object | undefined} options options
	 */
	constructor(options) {
		super();
		this.options = options;
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		const content =
			typeof source === "string"
				? source
				: source instanceof Buffer
					? source.toString("utf8")
					: "";

		// Common patterns for assets in HTML
		// We use groups to precisely locate the URL
		const patterns = [
			{
				regex: /(<script\s+[^>]*src=["'])([^"']+)(["'])/gi,
				prefixGroup: 1,
				urlGroup: 2
			},
			{
				regex: /(<link\s+[^>]*href=["'])([^"']+)(["'])/gi,
				prefixGroup: 1,
				urlGroup: 2
			},
			{
				regex: /(<img\s+[^>]*src=["'])([^"']+)(["'])/gi,
				prefixGroup: 1,
				urlGroup: 2
			}
		];

		for (const { regex, prefixGroup, urlGroup } of patterns) {
			let match;
			while ((match = regex.exec(content)) !== null) {
				const prefix = match[prefixGroup];
				const url = match[urlGroup];
				const start = match.index + prefix.length;
				const end = start + url.length;
				const dep = new HtmlUrlDependency(url, [start, end]);
				state.module.addDependency(dep);
				state.module.addCodeGenerationDependency(dep);
			}
		}

		return state;
	}
}

module.exports = HtmlParser;
