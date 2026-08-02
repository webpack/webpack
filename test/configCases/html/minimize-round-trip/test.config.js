"use strict";

const fs = require("fs");
const path = require("path");
const cssSyntax = require("../../../../lib/css/syntax");
const {
	BOOLEAN_ATTRIBUTES,
	SRCSET_ATTRIBUTES
} = require("../../../../lib/html/data");
const {
	NodeType,
	SourceProcessor,
	parseSrcset
} = require("../../../../lib/html/syntax");

/**
 * An attribute value reduced to what it means, so a transform that rewrites the
 * bytes without changing the meaning does not read as a difference.
 * @param {string} name attribute name
 * @param {string} value attribute value
 * @returns {string} its canonical form
 */
const canonicalValue = (name, value) => {
	if (BOOLEAN_ATTRIBUTES.has(name)) return "<boolean>";
	if (name === "class") {
		return value
			.trim()
			.split(/[\t\n\f\r ]+/)
			.join(" ");
	}
	if (name === "style") {
		try {
			return new cssSyntax.SourceProcessor().process(`a{${value}}`, {
				minimize: true
			}).code;
		} catch (_err) {
			return value;
		}
	}
	if (SRCSET_ATTRIBUTES.has(name)) {
		try {
			return parseSrcset(value)
				.map((candidate) => candidate[0])
				.join(",");
		} catch (_err) {
			return value;
		}
	}
	if (name === "content") {
		return value.replace(/[\t\n\f\r ]*([,;=])[\t\n\f\r ]*/g, "$1").trim();
	}
	return value;
};

/**
 * The document's tree, as the parser builds it: every element with its
 * attributes and every text node, in order. Two documents with the same tree
 * mean the same thing, whatever bytes they were written with.
 * @param {string} html a document
 * @returns {string[]} its tree
 */
const tree = (html) => {
	/** @type {string[]} */
	const out = [];
	new SourceProcessor()
		.use({
			[NodeType.Element]: (nodePath) => {
				const attributes = nodePath
					.attributes()
					.map(
						(attribute) =>
							`${attribute.name}=${canonicalValue(attribute.name, attribute.value)}`
					)
					.sort()
					.join(" ");
				out.push(`<${nodePath.tagName()} ${attributes}>`);
			},
			[NodeType.Text]: (nodePath) => {
				const parent = nodePath.parentOf();
				const parentName = parent === 0 ? "" : nodePath.tagName(parent);
				if (parentName === "style") {
					out.push(`#css:${canonicalValue("style", nodePath.data())}`);
					return;
				}
				// Whitespace nothing renders is dropped by design.
				if (
					(parentName === "head" || parentName === "html") &&
					nodePath.data().trim() === ""
				) {
					return;
				}
				out.push(`#text:${nodePath.data()}`);
			},
			[NodeType.Doctype]: (nodePath) =>
				out.push(`#doctype:${nodePath.doctypeName()}`)
		})
		.process(html, {});
	return out;
};

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const cases = path.resolve(__dirname, "cases");
		for (const file of fs.readdirSync(cases)) {
			const emitted = path.join(options.output.path, file);
			if (!fs.existsSync(emitted)) continue;
			const source = fs.readFileSync(path.join(cases, file), "utf8");
			const minified = fs.readFileSync(emitted, "utf8");
			// Minification may drop inert nodes (comments, whitespace nothing
			// renders) and rewrite a value to an equal one, so the trees are
			// compared after the same normalization the transforms are allowed.
			expect({ file, tree: tree(minified) }).toEqual({
				file,
				tree: tree(source)
			});
		}
	}
};
