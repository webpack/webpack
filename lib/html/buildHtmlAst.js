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

// Formatting elements that require Adoption Agency Algorithm handling
const FORMATTING_ELEMENTS = new Set([
	"a",
	"b",
	"big",
	"code",
	"em",
	"font",
	"i",
	"nobr",
	"s",
	"small",
	"strike",
	"strong",
	"tt",
	"u"
]);

// Elements that trigger foster parenting for misplaced content
const TABLE_FOSTER_PARENTS = new Set([
	"table",
	"tbody",
	"tfoot",
	"thead",
	"tr"
]);

// Elements allowed inside table contexts without triggering foster parenting
const TABLE_ALLOWED_CHILDREN = new Set([
	"tbody",
	"tfoot",
	"thead",
	"tr",
	"td",
	"th",
	"caption",
	"colgroup",
	"col",
	"script",
	"style",
	"template"
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

	/** @type {HtmlElement[]} */
	const openElements = [];

	/** @type {HtmlElement[]} */
	const activeFormattingElements = [];

	/** @type {HtmlAttribute[]} */
	const pendingAttrs = [];

	/**
	 * Inserts a node into the appropriate parent, handling Foster Parenting.
	 * @param {HtmlNode} node the node to insert
	 */
	const insertNode = (node) => {
		if (openElements.length === 0) {
			doc.children.push(node);
			return;
		}
		const parent = openElements[openElements.length - 1];

		let isFosterParenting = false;
		if (
			TABLE_FOSTER_PARENTS.has(parent.tagName) &&
			(node.type === "text" ||
				(node.type === "element" && !TABLE_ALLOWED_CHILDREN.has(node.tagName)))
		) {
			isFosterParenting = true;
		}

		if (isFosterParenting) {
			for (let i = openElements.length - 1; i >= 0; i--) {
				if (openElements[i].tagName === "table") {
					const table = openElements[i];
					const parentChildren =
						i > 0 ? openElements[i - 1].children : doc.children;
					const idx = parentChildren.indexOf(table);
					if (
						node.type === "text" &&
						idx > 0 &&
						parentChildren[idx - 1].type === "text"
					) {
						/** @type {HtmlText} */ (parentChildren[idx - 1]).data += node.data;
						/** @type {HtmlText} */ (parentChildren[idx - 1]).end = node.end;
					} else {
						parentChildren.splice(idx, 0, node);
					}
					return;
				}
			}
		}

		parent.children.push(node);
	};

	/**
	 * Pushes an element to the active formatting elements list.
	 * @param {HtmlElement} element formatting element
	 */
	const pushActiveFormattingElement = (element) => {
		let count = 0;
		for (let i = activeFormattingElements.length - 1; i >= 0; i--) {
			const formattingElement = activeFormattingElements[i];
			if (formattingElement.tagName === "marker") break;
			if (formattingElement.tagName === element.tagName) {
				if (formattingElement.attributes.length === element.attributes.length) {
					count++;
				}
				if (count === 3) {
					activeFormattingElements.splice(i, 1);
					break;
				}
			}
		}
		activeFormattingElements.push(element);
	};

	/**
	 * Reconstructs active formatting elements.
	 * @param {number} start source start offset
	 */
	const reconstructActiveFormattingElements = (start) => {
		if (activeFormattingElements.length === 0) return;
		let idx = activeFormattingElements.length - 1;
		let formattingElement = activeFormattingElements[idx];
		if (
			formattingElement.tagName === "marker" ||
			openElements.includes(formattingElement)
		) {
			return;
		}

		while (idx > 0) {
			idx--;
			formattingElement = activeFormattingElements[idx];
			if (
				formattingElement.tagName === "marker" ||
				openElements.includes(formattingElement)
			) {
				idx++;
				break;
			}
		}

		while (idx < activeFormattingElements.length) {
			formattingElement = activeFormattingElements[idx];
			/** @type {HtmlElement} */
			const clone = {
				type: "element",
				tagName: formattingElement.tagName,
				namespace: formattingElement.namespace,
				attributes: [...formattingElement.attributes],
				children: [],
				selfClosing: formattingElement.selfClosing,
				start,
				end: start
			};
			insertNode(clone);
			openElements.push(clone);
			activeFormattingElements[idx] = clone;
			idx++;
		}
	};

	/**
	 * Adoption Agency Algorithm for unclosed formatting tags crossing block boundaries.
	 * @param {string} tagName tag name being closed
	 * @param {number} end end position
	 * @returns {boolean} true if AAA handled the tag
	 */
	const adoptionAgencyAlgorithm = (tagName, end) => {
		let fmtIdx = activeFormattingElements.length - 1;
		let formattingElement = null;
		while (fmtIdx >= 0) {
			const activeElement = activeFormattingElements[fmtIdx];
			if (activeElement.tagName === "marker") break;
			if (activeElement.tagName === tagName) {
				formattingElement = activeElement;
				break;
			}
			fmtIdx--;
		}
		if (!formattingElement) return false;
		if (!openElements.includes(formattingElement)) {
			activeFormattingElements.splice(fmtIdx, 1);
			return true;
		}

		const formattingElementIdx = openElements.indexOf(formattingElement);
		let furthestBlock = null;
		for (let j = formattingElementIdx + 1; j < openElements.length; j++) {
			const openElement = openElements[j];
			if (P_CLOSING_ELEMENTS.has(openElement.tagName)) {
				furthestBlock = openElement;
				break;
			}
		}

		if (!furthestBlock) {
			return false;
		}

		formattingElement.end = end;

		activeFormattingElements.splice(fmtIdx, 1);
		openElements.splice(formattingElementIdx, 1);

		/** @type {HtmlElement} */
		const clone = {
			type: "element",
			tagName: formattingElement.tagName,
			namespace: formattingElement.namespace,
			attributes: [...formattingElement.attributes],
			children: furthestBlock.children,
			selfClosing: formattingElement.selfClosing,
			start: furthestBlock.start,
			end
		};
		// TODO: In strict WHATWG, furthestBlock should be moved to a new parent.
		// For now, leaving it inside simplifies the AST logic while satisfying our current use case.
		furthestBlock.children = [clone];

		return true;
	};

	/**
	 * Auto-close elements that should be implicitly closed when
	 * encountering a new start tag.
	 * @param {string} tagName the incoming tag name (lowercase)
	 * @param {number} start the start offset of the incoming tag
	 */
	const implicitlyCloseElements = (tagName, start) => {
		// Auto-close <p> when a block-level element is opened inside it
		if (P_CLOSING_ELEMENTS.has(tagName)) {
			for (let i = openElements.length - 1; i >= 0; i--) {
				if (openElements[i].tagName === "p") {
					for (let j = i; j < openElements.length; j++) {
						openElements[j].end = start;
					}
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
				const popped = openElements.pop();
				if (popped) popped.end = start;
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
			insertNode({
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
				insertNode({
					type: "comment",
					data: input.slice(contentStart, contentEnd),
					start,
					end
				});
			} else {
				// Bogus comment (DOCTYPE, PI, etc.) — still add as comment
				insertNode({
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

			// If not a whitespace text node, reconstruct active formatting elements
			if (data.trim() !== "") {
				reconstructActiveFormattingElements(start);
			}

			insertNode({ type: "text", data, start, end });
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

			reconstructActiveFormattingElements(start);
			implicitlyCloseElements(tagName, start);

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

			insertNode(element);

			if (!isVoid) {
				openElements.push(element);
				if (FORMATTING_ELEMENTS.has(tagName)) {
					pushActiveFormattingElement(element);
				} else if (
					tagName === "button" ||
					tagName === "marquee" ||
					tagName === "object" ||
					tagName === "td" ||
					tagName === "th" ||
					tagName === "svg" ||
					tagName === "math"
				) {
					// Scoping markers
					/** @type {HtmlElement} */
					const marker = {
						type: "element",
						tagName: "marker",
						namespace: NS_HTML,
						attributes: [],
						children: [],
						selfClosing: true,
						start,
						end
					};
					activeFormattingElements.push(marker);
				}
			}

			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			const tagName = input.slice(nameStart, nameEnd).toLowerCase();

			if (
				FORMATTING_ELEMENTS.has(tagName) &&
				adoptionAgencyAlgorithm(tagName, end)
			) {
				return end;
			}

			// Walk the stack backwards to find the matching open element
			for (let i = openElements.length - 1; i >= 0; i--) {
				if (openElements[i].tagName === tagName) {
					for (let j = i; j < openElements.length; j++) {
						openElements[j].end = end;
					}
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
