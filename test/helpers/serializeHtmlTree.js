"use strict";

const {
	A,
	NS_MATHML,
	NS_SVG,
	NodeType,
	decodeEntities
} = require("../../lib/html/syntax");

/** @import { HtmlNodeRef } from "../../lib/html/syntax" */

const NS_PREFIX = {
	[NS_SVG]: "svg ",
	[NS_MATHML]: "math "
};

/**
 * Serialize an AST in the html5lib tree-construction format, reading the SoA
 * tree through the accessor `A`. Shared by the html5lib conformance suite and
 * the tree-construction unit suite so both read one tree the same way.
 * @param {HtmlNodeRef} root node whose children are serialized
 * @returns {string} serialized tree
 */
const serializeHtmlTree = (root) => {
	/** @type {string[]} */
	const lines = [];
	/**
	 * @param {HtmlNodeRef} node node
	 * @param {number} depth depth
	 */
	const walk = (node, depth) => {
		const indent = `| ${"  ".repeat(depth)}`;
		const type = A.type(node);
		if (type === NodeType.Doctype) {
			let s = `<!DOCTYPE ${A.doctypeName(node) || ""}`;
			const publicId = A.doctypePublicId(node);
			const systemId = A.doctypeSystemId(node);
			if (publicId !== null || systemId !== null) {
				s += ` "${publicId || ""}" "${systemId || ""}"`;
			}
			lines.push(`${indent}${s}>`);
			return;
		}
		if (type === NodeType.Comment) {
			lines.push(`${indent}<!-- ${A.data(node)} -->`);
			return;
		}
		if (type === NodeType.ProcessingInstruction) {
			lines.push(`${indent}<?${A.piTarget(node)} ${A.data(node)}?>`);
			return;
		}
		if (type === NodeType.Text) {
			lines.push(`${indent}"${A.data(node)}"`);
			return;
		}
		const prefix =
			/** @type {Record<number, string>} */ (NS_PREFIX)[A.namespace(node)] ||
			"";
		lines.push(`${indent}<${prefix}${A.tagName(node)}>`);
		const attrs = [...A.attributes(node)].sort((a, b) => {
			const an = a.serializedName || a.name;
			const bn = b.serializedName || b.name;
			return an < bn ? -1 : an > bn ? 1 : 0;
		});
		for (const a of attrs) {
			lines.push(
				`| ${"  ".repeat(depth + 1)}${
					a.serializedName || a.name
				}="${decodeEntities(a.value, true)}"`
			);
		}
		const tc = A.templateContent(node);
		if (tc !== 0) {
			lines.push(`| ${"  ".repeat(depth + 1)}content`);
			for (let c = A.firstChild(tc); c !== 0; c = A.nextSibling(c)) {
				walk(c, depth + 2);
			}
			return;
		}
		for (let c = A.firstChild(node); c !== 0; c = A.nextSibling(c)) {
			walk(c, depth + 1);
		}
	};
	for (let c = A.firstChild(root); c !== 0; c = A.nextSibling(c)) walk(c, 0);
	return lines.join("\n");
};

module.exports = serializeHtmlTree;
