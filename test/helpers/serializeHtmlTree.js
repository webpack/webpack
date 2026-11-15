"use strict";

const {
	A,
	Field,
	Namespace,
	NodeType,
	Part,
	_attributeList,
	_namespaceOf,
	decodeEntities
} = require("../../lib/html/syntax-parser");

/** @import { HtmlNodeRef } from "../../lib/html/syntax-parser" */

const NS_PREFIX = {
	[Namespace.SVG]: "svg ",
	[Namespace.MathML]: "math "
};

/**
 * Write a tree's html5lib lines one at a time, each as its depth and its text
 * after the `| ` and indent, so a tree too deep for one string can be digested.
 * @param {HtmlNodeRef} root node whose children are serialized
 * @param {(depth: number, text: string) => void} line takes each line in order
 * @returns {void}
 */
const writeHtmlTree = (root, line) => {
	// Depth first from a stack of its own, so a tree nested past the call
	// stack serializes too; children go on in reverse to come off in order.
	/** @type {[HtmlNodeRef, number][]} */
	const stack = [];
	/**
	 * @param {HtmlNodeRef} parent the node whose children are next
	 * @param {number} depth their depth
	 * @returns {void}
	 */
	const pushChildren = (parent, depth) => {
		const start = stack.length;
		for (
			let cIndex = 0, c = A.child(0, parent);
			c !== 0;
			c = A.child(++cIndex, parent)
		) {
			stack.push([c, depth]);
		}
		for (let i = start, j = stack.length - 1; i < j; i++, j--) {
			const swap = stack[i];
			stack[i] = stack[j];
			stack[j] = swap;
		}
	};
	pushChildren(root, 0);
	while (stack.length > 0) {
		const [node, depth] = /** @type {[HtmlNodeRef, number]} */ (stack.pop());
		const type = A.type(node);
		if (type === NodeType.Doctype) {
			let s = `<!DOCTYPE ${A.name(node) || ""}`;
			const publicId = A.textOf(Part.publicId, node);
			const systemId = A.textOf(Part.systemId, node);
			if (publicId !== null || systemId !== null) {
				s += ` "${publicId || ""}" "${systemId || ""}"`;
			}
			line(depth, `${s}>`);
			continue;
		}
		if (type === NodeType.Comment) {
			line(depth, `<!-- ${A.value(node)} -->`);
			continue;
		}
		if (type === NodeType.ProcessingInstruction) {
			line(depth, `<?${A.name(node)} ${A.value(node)}?>`);
			continue;
		}
		if (type === NodeType.Text) {
			line(depth, `"${A.value(node)}"`);
			continue;
		}
		const prefix =
			/** @type {Record<number, string>} */ (NS_PREFIX)[_namespaceOf(node)] ||
			"";
		line(depth, `<${prefix}${A.name(node)}>`);
		const attrs = _attributeList(node).sort((a, b) => {
			const an = a.serializedName || a.name;
			const bn = b.serializedName || b.name;
			return an < bn ? -1 : an > bn ? 1 : 0;
		});
		for (const a of attrs) {
			line(
				depth + 1,
				`${a.serializedName || a.name}="${decodeEntities(a.value, true)}"`
			);
		}
		const tc = A.field(0, Field.content, node);
		if (tc !== 0) {
			line(depth + 1, "content");
			pushChildren(tc, depth + 2);
		} else {
			pushChildren(node, depth + 1);
		}
	}
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
	writeHtmlTree(root, (depth, text) => {
		lines.push(`| ${"  ".repeat(depth)}${text}`);
	});
	return lines.join("\n");
};

module.exports = Object.assign(serializeHtmlTree, { writeHtmlTree });
