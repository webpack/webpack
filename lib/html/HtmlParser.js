/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const Parser = require("../Parser");
const HtmlLinkDependency = require("../dependencies/HtmlLinkDependency");
const HtmlScriptDependency = require("../dependencies/HtmlScriptDependency");
const HtmlUrlDependency = require("../dependencies/HtmlUrlDependency");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

/**
 * @typedef {object} HtmlTag
 * @property {string} tagName
 * @property {Record<string, string>} attributes
 * @property {number} start start position of the tag
 * @property {number} end end position of the tag
 */

// Matches opening HTML tags (self-closing or not)
const TAG_REGEX =
	/<(script|link|img|source|video|audio|object|embed|iframe)\b([^>]*?)(\/?)>/gi;
// Matches attributes within a tag
const ATTR_REGEX =
	/\b(src|href|srcset|data|poster|action)(?:\s*)=(?:\s*)(?:"([^"]*)"|'([^']*)')/gi;
// Matches all attributes for parsing tag context
const ALL_ATTR_REGEX =
	/\b([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))|(?:\b([a-zA-Z_:][-a-zA-Z0-9_:.]*))\b/gi;

/**
 * Check if a URL is external (absolute URL with protocol, data URI, or fragment)
 * @param {string} url the URL to check
 * @returns {boolean} true if the URL is external
 */
const isExternalUrl = (url) =>
	/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|#|data:|about:)/.test(url);

/**
 * Parse all attributes from a tag's attribute string
 * @param {string} attrString the attribute string
 * @returns {Record<string, string>} parsed attributes
 */
const parseAttributes = (attrString) => {
	/** @type {Record<string, string>} */
	const attrs = {};
	let match;
	ALL_ATTR_REGEX.lastIndex = 0;
	while ((match = ALL_ATTR_REGEX.exec(attrString)) !== null) {
		if (match[1]) {
			attrs[match[1].toLowerCase()] = match[2] || match[3] || match[4] || "";
		} else if (match[5]) {
			attrs[match[5].toLowerCase()] = "";
		}
	}
	return attrs;
};

class HtmlParser extends Parser {
	/**
	 * @param {object} options parser options
	 */
	constructor(options = {}) {
		super();
		this.options = options;
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf8");
		}
		if (typeof source === "object") {
			throw new Error("HtmlParser does not support preparsed AST");
		}

		const buildInfo = /** @type {BuildInfo} */ (state.module.buildInfo);
		buildInfo.strict = true;

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);
		buildMeta.exportsType = "default";

		// Store the raw HTML source for the generator
		buildInfo.htmlSource = source;

		/** @type {string} */
		const html = source;
		let tagMatch;

		TAG_REGEX.lastIndex = 0;
		while ((tagMatch = TAG_REGEX.exec(html)) !== null) {
			const tagName = tagMatch[1].toLowerCase();
			const attrString = tagMatch[2];
			const tagStart = tagMatch.index;
			const attributes = parseAttributes(attrString);

			// Parse URL-bearing attributes from this tag
			let attrMatch;
			ATTR_REGEX.lastIndex = 0;
			while ((attrMatch = ATTR_REGEX.exec(attrString)) !== null) {
				const attrName = attrMatch[1].toLowerCase();
				const attrValue = attrMatch[2] || attrMatch[3];

				if (!attrValue || isExternalUrl(attrValue)) continue;

				// Compute the range of the attribute value within the source
				// The attribute match is relative to attrString; attrString starts
				// after '<tagName' in the source
				// Find the attribute value position in the original source
				// Search for the attribute in the tag from the tag start
				const fullAttrStr = attrMatch[0];
				const fullAttrPos = html.indexOf(
					fullAttrStr,
					tagStart + 1 + tagName.length
				);
				if (fullAttrPos === -1) continue;

				// The value is either match[2] (double-quoted) or match[3] (single-quoted)
				const quote = attrMatch[2] !== undefined ? '"' : "'";
				const valueInAttr = attrValue;
				const valueStart = fullAttrPos + fullAttrStr.indexOf(quote) + 1;
				const valueEnd = valueStart + valueInAttr.length;

				/** @type {[number, number]} */
				const range = [valueStart, valueEnd];

				if (tagName === "script" && attrName === "src") {
					const dep = new HtmlScriptDependency(attrValue, range, {
						async: "async" in attributes,
						defer: "defer" in attributes,
						type: attributes.type
					});
					dep.loc = {
						start: { line: -1, column: -1 },
						end: { line: -1, column: -1 }
					};
					state.module.addDependency(dep);
				} else if (tagName === "link" && attrName === "href") {
					const dep = new HtmlLinkDependency(attrValue, range, {
						rel: attributes.rel,
						type: attributes.type
					});
					dep.loc = {
						start: { line: -1, column: -1 },
						end: { line: -1, column: -1 }
					};
					state.module.addDependency(dep);
				} else if (
					attrName === "src" ||
					attrName === "href" ||
					attrName === "poster" ||
					attrName === "data"
				) {
					const dep = new HtmlUrlDependency(
						attrValue,
						range,
						/** @type {"src" | "href" | "srcset"} */ (attrName)
					);
					dep.loc = {
						start: { line: -1, column: -1 },
						end: { line: -1, column: -1 }
					};
					state.module.addDependency(dep);
				}
			}
		}

		return state;
	}
}

module.exports = HtmlParser;
