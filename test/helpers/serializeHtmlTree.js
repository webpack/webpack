"use strict";

const {
	A,
	Field,
	NS_MATHML,
	NS_SVG,
	NodeType,
	Part,
	_attributeList,
	_namespaceOf,
	decodeEntities
} = require("../../lib/html/syntax-parser");

/** @import { HtmlNodeRef } from "../../lib/html/syntax-parser" */

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
			let s = `<!DOCTYPE ${A.name(node) || ""}`;
			const publicId = A.textOf(Part.publicId, node);
			const systemId = A.textOf(Part.systemId, node);
			if (publicId !== null || systemId !== null) {
				s += ` "${publicId || ""}" "${systemId || ""}"`;
			}
			lines.push(`${indent}${s}>`);
			return;
		}
		if (type === NodeType.Comment) {
			lines.push(`${indent}<!-- ${A.value(node)} -->`);
			return;
		}
		if (type === NodeType.ProcessingInstruction) {
			lines.push(`${indent}<?${A.name(node)} ${A.value(node)}?>`);
			return;
		}
		if (type === NodeType.Text) {
			lines.push(`${indent}"${A.value(node)}"`);
			return;
		}
		const prefix =
			/** @type {Record<number, string>} */ (NS_PREFIX)[_namespaceOf(node)] ||
			"";
		lines.push(`${indent}<${prefix}${A.name(node)}>`);
		const attrs = _attributeList(node).sort((a, b) => {
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
		const tc = A.field(0, Field.content, node);
		if (tc !== 0) {
			lines.push(`| ${"  ".repeat(depth + 1)}content`);
			for (
				let cIndex = 0, c = A.child(0, tc);
				c !== 0;
				c = A.child(++cIndex, tc)
			) {
				walk(c, depth + 2);
			}
			return;
		}
		for (
			let cIndex = 0, c = A.child(0, node);
			c !== 0;
			c = A.child(++cIndex, node)
		) {
			walk(c, depth + 1);
		}
	};
	for (
		let cIndex = 0, c = A.child(0, root);
		c !== 0;
		c = A.child(++cIndex, root)
	) {
		walk(c, 0);
	}
	return lines.join("\n");
};

module.exports = serializeHtmlTree;
