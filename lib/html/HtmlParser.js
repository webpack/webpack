/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Soumyaraj Bag @soumyarajbag - Webpack HTML Entry Points
*/

"use strict";

const Parser = require("../Parser");
const HtmlUrlDependency = require("../dependencies/HtmlUrlDependency");

/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

/**
 * Tags whose URL attributes we process, and the referenceType they produce.
 *
 * referenceType:
 *   "script" – the file should be bundled as a JS module
 *   "link"   – the file should be bundled as CSS (or whatever the rule says)
 *   "url"    – the file should be treated as an asset/resource
 *
 * @type {Map<string, Array<{ attr: string, type: import("../dependencies/HtmlUrlDependency")["referenceType"] }>>}
 */
const TAG_ATTRS = new Map([
	["script", [{ attr: "src", type: "script" }]],
	["link", [{ attr: "href", type: "link" }]],
	["img", [{ attr: "src", type: "url" }]],
	["source", [{ attr: "src", type: "url" }]],
	["video", [
		{ attr: "src", type: "url" },
		{ attr: "poster", type: "url" }
	]],
	["audio", [{ attr: "src", type: "url" }]],
	["embed", [{ attr: "src", type: "url" }]],
	["object", [{ attr: "data", type: "url" }]],
	["track", [{ attr: "src", type: "url" }]],
	["input", [{ attr: "src", type: "url" }]],
	["use", [{ attr: "href", type: "url" }]],
	["image", [{ attr: "href", type: "url" }]]
]);

// ─── Minimal HTML tokenizer ───────────────────────────────────────────────────

/**
 * Skip whitespace at position `i` in `source`.
 * @param {string} source
 * @param {number} i
 * @returns {number}
 */
const skipWS = (source, i) => {
	while (i < source.length && /[\t\n\r\f ]/.test(source[i])) i++;
	return i;
};

/**
 * Read an identifier (tag name / attribute name) starting at `i`.
 * Returns [value, newPos] or null if nothing to read.
 * @param {string} source
 * @param {number} i
 * @returns {[string, number] | null}
 */
const readIdent = (source, i) => {
	const start = i;
	while (i < source.length && /[a-zA-Z0-9:_\-.]/.test(source[i])) i++;
	if (i === start) return null;
	return [source.slice(start, i), i];
};

/**
 * Read a quoted attribute value starting at `i` (which must be `"` or `'`).
 * Returns { value, range, newPos } where range is [valueStart, valueEnd]
 * (positions of the content inside the quotes in `source`).
 * @param {string} source
 * @param {number} i
 * @returns {{ value: string, range: [number, number], newPos: number } | null}
 */
const readQuotedValue = (source, i) => {
	const q = source[i];
	if (q !== '"' && q !== "'") return null;
	const start = i + 1; // skip the opening quote
	const end = source.indexOf(q, start);
	if (end === -1) return null;
	return {
		value: source.slice(start, end),
		range: /** @type {[number, number]} */ ([start, end]),
		newPos: end + 1
	};
};

/**
 * Parse a single HTML opening tag (tag content after `<`, before `>` or `/>`)
 * and yield { attrName, value, range } for each attribute found.
 *
 * @param {string} source  full HTML source
 * @param {number} tagStart  index of `<` in source
 * @returns {{ tagName: string, attrs: Map<string, { value: string, range: [number, number] }>, tagEnd: number } | null}
 */
const parseOpenTag = (source, tagStart) => {
	let i = tagStart + 1; // skip '<'

	// Read tag name
	const nameResult = readIdent(source, i);
	if (!nameResult) return null;
	const [tagName, afterName] = nameResult;
	i = afterName;

	/** @type {Map<string, { value: string, range: [number, number] }>} */
	const attrs = new Map();

	// Read attributes until '>' or '/>'
	while (i < source.length) {
		i = skipWS(source, i);
		const ch = source[i];

		if (ch === ">" || ch === undefined) break;
		if (ch === "/" && source[i + 1] === ">") break;

		// Read attribute name
		const attrResult = readIdent(source, i);
		if (!attrResult) {
			i++; // skip unknown character
			continue;
		}
		const [attrName, afterAttr] = attrResult;
		i = afterAttr;
		i = skipWS(source, i);

		if (source[i] !== "=") {
			// Boolean attribute (no value)
			attrs.set(attrName.toLowerCase(), { value: "", range: /** @type {[number,number]} */ ([i, i]) });
			continue;
		}
		i++; // skip '='
		i = skipWS(source, i);

		const val = readQuotedValue(source, i);
		if (val) {
			attrs.set(attrName.toLowerCase(), { value: val.value, range: val.range });
			i = val.newPos;
		} else {
			// Unquoted value: read until whitespace or '>'
			const start = i;
			while (i < source.length && !/[\t\n\r\f >]/.test(source[i])) i++;
			attrs.set(attrName.toLowerCase(), {
				value: source.slice(start, i),
				range: /** @type {[number,number]} */ ([start, i])
			});
		}
	}

	// Find tag end '>'
	let tagEnd = source.indexOf(">", i);
	if (tagEnd === -1) tagEnd = source.length - 1;

	return { tagName: tagName.toLowerCase(), attrs, tagEnd };
};

// ─── HtmlParser class ─────────────────────────────────────────────────────────

class HtmlParser extends Parser {
	/**
	 * @param {string | Buffer | PreparsedAst} source
	 * @param {ParserState} state
	 * @returns {ParserState}
	 */
	parse(source, state) {
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf8");
		} else if (typeof source !== "string") {
			throw new Error("HtmlParser expects a string source");
		}

		const { module } = state;
		const len = source.length;
		let i = 0;

		while (i < len) {
			// Find the next '<'
			const lt = source.indexOf("<", i);
			if (lt === -1) break;

			// Skip HTML comments <!-- ... -->
			if (source.startsWith("<!--", lt)) {
				const commentEnd = source.indexOf("-->", lt + 4);
				i = commentEnd === -1 ? len : commentEnd + 3;
				continue;
			}

			// Skip DOCTYPE and CDATA
			if (source[lt + 1] === "!") {
				const gt = source.indexOf(">", lt);
				i = gt === -1 ? len : gt + 1;
				continue;
			}

			// Skip closing tags </tagname>
			if (source[lt + 1] === "/") {
				const gt = source.indexOf(">", lt);
				i = gt === -1 ? len : gt + 1;
				continue;
			}

			// Parse the opening tag
			const tag = parseOpenTag(source, lt);
			if (!tag) {
				i = lt + 1;
				continue;
			}

			const { tagName, attrs, tagEnd } = tag;

			// Check if this tag has processable URL attributes
			const tagSpec = TAG_ATTRS.get(tagName);
			if (tagSpec) {
				for (const { attr, type } of tagSpec) {
					const attrData = attrs.get(attr);
					if (!attrData || !attrData.value) continue;

					const { value, range } = attrData;

					// Skip data URIs and absolute URLs
					if (
						value.startsWith("data:") ||
						value.startsWith("http://") ||
						value.startsWith("https://") ||
						value.startsWith("//")
					) {
						continue;
					}

					// Special case: <link> — only process stylesheet/icon/manifest/preload hrefs
					if (tagName === "link") {
						const rel = attrs.get("rel");
						if (!rel) continue;
						const relVal = rel.value.toLowerCase().trim();
						const isResourceLink =
							relVal === "stylesheet" ||
							relVal === "icon" ||
							relVal === "shortcut icon" ||
							relVal === "apple-touch-icon" ||
							relVal === "manifest" ||
							relVal === "preload" ||
							relVal === "modulepreload";
						if (!isResourceLink) continue;

						// Determine type: stylesheet → "link" (bundle as CSS), others → "url" (asset)
						const resolvedType =
							relVal === "stylesheet" || relVal === "modulepreload"
								? "link"
								: "url";

						const dep = new HtmlUrlDependency(
							value,
							range,
							/** @type {import("../dependencies/HtmlUrlDependency")["referenceType"]} */(resolvedType)
						);
						module.addDependency(dep);
						continue;
					}

					// For all other tags, use the type from TAG_ATTRS
					const dep = new HtmlUrlDependency(value, range, type);
					module.addDependency(dep);
				}
			}

			i = tagEnd + 1;
		}

		// HTML modules have no JS exports
		/** @type {import("../Module").BuildMeta} */
		(module.buildMeta).exportsType = "default";
		/** @type {import("../Module").BuildInfo} */
		(module.buildInfo).strict = false;

		return state;
	}
}

module.exports = HtmlParser;
