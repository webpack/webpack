/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

const walkHtmlTokens = require("./walkHtmlTokens");

// Namespaces (mirrors swc_html_ast::Namespace)
const NS_HTML = 0;
const NS_MATHML = 1;
const NS_SVG = 2;

// Void elements that cannot have children
const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);

// Elements that auto-close a <p> when opened inside one
const P_CLOSING_ELEMENTS = new Set([
	"address",
	"article",
	"aside",
	"blockquote",
	"details",
	"dialog",
	"dd",
	"div",
	"dl",
	"dt",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"hr",
	"li",
	"main",
	"menu",
	"nav",
	"ol",
	"p",
	"pre",
	"section",
	"summary",
	"table",
	"ul"
]);

// Elements whose same-name start tag auto-closes them
const SELF_CLOSING_PAIRS = new Set([
	"dd",
	"dt",
	"li",
	"optgroup",
	"option",
	"p",
	"rb",
	"rp",
	"rt",
	"rtc",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"tr"
]);

// Raw text elements: their children are always a single text node
const RAW_TEXT_ELEMENTS = new Set([
	"script",
	"style",
	"textarea",
	"title",
	"xmp",
	"iframe",
	"noembed",
	"noframes",
	"noscript",
	"plaintext"
]);

/**
 * @typedef {object} HtmlAttribute
 * @property {string} name
 * @property {string} value
 * @property {number} nameStart
 * @property {number} nameEnd
 * @property {number} valueStart
 * @property {number} valueEnd
 */

/**
 * @typedef {object} HtmlElement
 * @property {"element"} type
 * @property {string} tagName
 * @property {number} namespace
 * @property {HtmlAttribute[]} attributes
 * @property {HtmlNode[]} children
 * @property {boolean} selfClosing
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlText
 * @property {"text"} type
 * @property {string} data
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlComment
 * @property {"comment"} type
 * @property {string} data
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlDoctype
 * @property {"doctype"} type
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlDocument
 * @property {"document"} type
 * @property {HtmlNode[]} children
 */

/** @typedef {HtmlElement | HtmlText | HtmlComment | HtmlDoctype} HtmlNode */

/**
 * Builds a WHATWG-aligned AST from an HTML source string.
 * Uses walkHtmlTokens as the tokenizer and constructs a tree
 * following the simplified tree construction algorithm from the
 * WHATWG HTML spec (modeled after SWC's swc_html_parser).
 * @param {string} source HTML source
 * @returns {HtmlDocument} the document AST
 */
const buildHtmlAst = (source) => {
	/** @type {HtmlDocument} */
	const doc = { type: "document", children: [] };

	// Stack of open elements. Each entry is an HtmlElement node.
	// The current parent is always openElements[openElements.length - 1].
	/** @type {HtmlElement[]} */
	const openElements = [];

	// Pending attributes for the current tag being parsed
	/** @type {HtmlAttribute[]} */
	const pendingAttrs = [];

	/**
	 * Returns the current parent node's children array.
	 * @returns {HtmlNode[]} children array
	 */
	const currentChildren = () =>
		openElements.length > 0
			? openElements[openElements.length - 1].children
			: doc.children;

	/**
	 * Auto-close elements that should be implicitly closed when
	 * encountering a new start tag.
	 * @param {string} tagName the incoming tag name (lowercase)
	 */
	const implicitlyCloseElements = (tagName) => {
		// TODO: Implement WHATWG Active Formatting Elements and Adoption Agency Algorithm
		// for resolving unclosed formatting tags (e.g., <b>, <i>) crossing block boundaries.

		// Auto-close <p> when a block-level element is opened inside it
		if (P_CLOSING_ELEMENTS.has(tagName)) {
			for (let i = openElements.length - 1; i >= 0; i--) {
				if (openElements[i].tagName === "p") {
					openElements.splice(i);
					break;
				}
				// Don't cross non-phrasing boundaries
				if (!isPhrasingContent(openElements[i].tagName)) break;
			}
		}

		// Auto-close same-name elements (e.g. <li> inside <li>)
		if (SELF_CLOSING_PAIRS.has(tagName)) {
			const top =
				openElements.length > 0 ? openElements[openElements.length - 1] : null;
			if (top && top.tagName === tagName) {
				openElements.pop();
			}
		}
	};

	/**
	 * @param {string} name tag name
	 * @returns {boolean} true if the element is phrasing content
	 */
	const isPhrasingContent = (name) =>
		!P_CLOSING_ELEMENTS.has(name) || name === "p";

	/**
	 * Determines the namespace for a tag based on its parent context.
	 * @param {string} tagName the tag name
	 * @returns {number} namespace constant
	 */
	const getNamespace = (tagName) => {
		if (tagName === "svg") return NS_SVG;
		if (tagName === "math") return NS_MATHML;
		// Inherit parent namespace for foreign content children
		if (openElements.length > 0) {
			const parentNs = openElements[openElements.length - 1].namespace;
			if (parentNs !== NS_HTML) {
				// HTML integration points switch back to HTML
				const parentTag = openElements[openElements.length - 1].tagName;
				if (parentNs === NS_SVG && parentTag === "foreignobject") {
					return NS_HTML;
				}
				if (parentNs === NS_SVG && parentTag === "desc") return NS_HTML;
				return parentNs;
			}
		}
		return NS_HTML;
	};

	walkHtmlTokens(source, 0, {
		doctype: (input, start, end) => {
			currentChildren().push({
				type: "doctype",
				start,
				end
			});
			return end;
		},
		comment: (input, start, end) => {
			const contentStart = start + 4; // after <!--
			const contentEnd = end - 3; // before -->
			// Only treat proper <!-- --> comments as comments
			if (
				end - start >= 7 &&
				input.charCodeAt(start) === 0x3c &&
				input.charCodeAt(start + 1) === 0x21 &&
				input.charCodeAt(start + 2) === 0x2d &&
				input.charCodeAt(start + 3) === 0x2d &&
				input.charCodeAt(end - 1) === 0x3e &&
				input.charCodeAt(end - 2) === 0x2d &&
				input.charCodeAt(end - 3) === 0x2d
			) {
				currentChildren().push({
					type: "comment",
					data: input.slice(contentStart, contentEnd),
					start,
					end
				});
			} else {
				// Bogus comment (DOCTYPE, PI, etc.) — still add as comment
				currentChildren().push({
					type: "comment",
					data: input.slice(start, end),
					start,
					end
				});
			}
			return end;
		},
		text: (input, start, end) => {
			const data = input.slice(start, end);
			const children = currentChildren();
			// Merge adjacent text nodes
			if (
				children.length > 0 &&
				children[children.length - 1].type === "text"
			) {
				const prev = /** @type {HtmlText} */ (children[children.length - 1]);
				prev.data += data;
				prev.end = end;
			} else {
				children.push({ type: "text", data, start, end });
			}
			return end;
		},
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			pendingAttrs.push({
				name: input.slice(nameStart, nameEnd).toLowerCase(),
				value: valueStart !== -1 ? input.slice(valueStart, valueEnd) : "",
				nameStart,
				nameEnd,
				valueStart,
				valueEnd
			});
			if (valueStart === -1) return nameEnd;
			return quoteType !== walkHtmlTokens.QUOTE_NONE ? valueEnd + 1 : valueEnd;
		},
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			const tagName = input.slice(nameStart, nameEnd).toLowerCase();
			const isVoid = VOID_ELEMENTS.has(tagName) || selfClosing;

			// TODO: Implement WHATWG Foster Parenting algorithm for handling
			// misplaced content inside <table>, <tbody>, <tr> contexts.

			implicitlyCloseElements(tagName);

			/** @type {HtmlElement} */
			const element = {
				type: "element",
				tagName,
				namespace: getNamespace(tagName),
				attributes: [...pendingAttrs],
				children: [],
				selfClosing: isVoid,
				start,
				end
			};

			pendingAttrs.length = 0;

			currentChildren().push(element);

			if (!isVoid && !RAW_TEXT_ELEMENTS.has(tagName)) {
				openElements.push(element);
			}

			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			const tagName = input.slice(nameStart, nameEnd).toLowerCase();

			// Walk the stack backwards to find the matching open element
			for (let i = openElements.length - 1; i >= 0; i--) {
				if (openElements[i].tagName === tagName) {
					openElements[i].end = end;
					openElements.splice(i);
					break;
				}
			}

			return end;
		}
	});

	return doc;
};

buildHtmlAst.NS_HTML = NS_HTML;
buildHtmlAst.NS_MATHML = NS_MATHML;
buildHtmlAst.NS_SVG = NS_SVG;

module.exports = buildHtmlAst;
