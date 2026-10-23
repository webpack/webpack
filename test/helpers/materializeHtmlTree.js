"use strict";

const {
	A,
	Field,
	Flag,
	NodeType,
	Part,
	_attributeList,
	_namespaceOf,
	parseHtml: parseHtmlRefs
} = require("../../lib/html/syntax-parser");

/** @import { HtmlNodeRef, HtmlAttribute } from "../../lib/html/syntax-parser" */

/**
 * Materialized plain-object views of the struct-of-arrays AST — the shape
 * `parseHtml` used to return, rebuilt through the accessor `A`. Shared by the
 * HTML tokenizer, parser and printer unit suites.
 * @typedef {object} MatElement
 * @property {typeof NodeType.Element} type
 * @property {string} tagName
 * @property {number} namespace
 * @property {HtmlAttribute[]} attributes
 * @property {MatNode[]} children
 * @property {boolean} selfClosing
 * @property {number} start
 * @property {number} end
 * @property {number} tagEnd
 * @property {number} nameEnd
 * @property {number} contentEnd
 * @property {MatFragment=} templateContent
 */
/** @typedef {{ type: typeof NodeType.Text | typeof NodeType.Comment, data: string, start: number, end: number }} MatText */
/** @typedef {MatText} MatComment */
/** @typedef {{ type: typeof NodeType.ProcessingInstruction, target: string, data: string, start: number, end: number }} MatProcessingInstruction */
/** @typedef {{ type: typeof NodeType.Doctype, name: string, publicId: string | null, systemId: string | null, start: number, end: number }} MatDoctype */
/** @typedef {{ type: typeof NodeType.Document, children: MatNode[] }} MatDocument */
/** @typedef {{ type: typeof NodeType.DocumentFragment, children: MatNode[] }} MatFragment */
/** @typedef {MatElement | MatText | MatComment | MatDoctype | MatProcessingInstruction} MatNode */

/**
 * @param {number} ref node
 * @returns {number[]} its children, read one by one through the path
 */
const childrenOf = (ref) => {
	const out = [];
	for (let i = 0, c = A.child(0, ref); c !== 0; c = A.child(++i, ref)) {
		out.push(c);
	}
	return out;
};

/**
 * `parseHtml` hands back integer refs into reused module-level columns, valid
 * only until the next parse, so each tree is materialized eagerly. Every field
 * is read through `A`, which is how this suite reaches the whole accessor
 * surface.
 * @param {HtmlNodeRef} ref node ref
 * @returns {MatNode} plain-object node
 */
const materialize = (ref) => {
	const type = A.type(ref);
	switch (type) {
		case NodeType.Element: {
			const tc = A.field(0, Field.content, ref);
			return {
				type,
				tagName: A.name(ref),
				namespace: _namespaceOf(ref),
				attributes: _attributeList(ref),
				children: childrenOf(ref).map(materialize),
				selfClosing: A.flag(Flag.selfClosing, ref),
				start: A.start(ref),
				end: A.end(ref),
				tagEnd: A.startOf(Part.content, ref),
				nameEnd: A.endOf(Part.name, ref),
				contentEnd: A.endOf(Part.content, ref),
				templateContent:
					tc !== 0
						? {
								type: NodeType.DocumentFragment,
								children: childrenOf(tc).map(materialize)
							}
						: undefined
			};
		}
		case NodeType.ProcessingInstruction:
			return {
				type,
				target: A.name(ref),
				data: A.value(ref),
				start: A.range(ref)[0],
				end: A.range(ref)[1]
			};
		case NodeType.Doctype:
			return {
				type,
				name: A.name(ref),
				publicId: A.textOf(Part.publicId, ref),
				systemId: A.textOf(Part.systemId, ref),
				start: A.range(ref)[0],
				end: A.range(ref)[1]
			};
		default:
			// Text / Comment
			return {
				type: /** @type {typeof NodeType.Text | typeof NodeType.Comment} */ (
					type
				),
				data: A.value(ref),
				start: A.range(ref)[0],
				end: A.range(ref)[1]
			};
	}
};

/**
 * @param {string} src source
 * @param {string=} fragmentContext fragment context
 * @param {import("../../lib/html/syntax-parser").HtmlAstSkip=} skip skip options
 * @returns {MatDocument} materialized document
 */
const parseHtml = (src, fragmentContext, skip) => {
	const doc = parseHtmlRefs(src, 0, { fragmentContext, skip });
	return {
		type: NodeType.Document,
		children: childrenOf(doc).map(materialize)
	};
};

/**
 * @param {MatNode[]} children children
 * @param {string} tagName tag name
 * @returns {MatElement} the element
 */
const child = (children, tagName) =>
	/** @type {MatElement} */ (
		children.find((c) => c.type === NodeType.Element && c.tagName === tagName)
	);

// The tree builder always produces a full document (html > head, body); these
// helpers reach the interesting subtrees.
/**
 * @param {string} src source
 * @returns {MatElement} html element
 */
const html = (src) => child(parseHtml(src).children, "html");
/**
 * @param {string} src source
 * @returns {MatElement[]} body children
 */
const body = (src) =>
	/** @type {MatElement[]} */ (child(html(src).children, "body").children);

module.exports = { body, child, childrenOf, html, materialize, parseHtml };
