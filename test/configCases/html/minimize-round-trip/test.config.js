"use strict";

const fs = require("fs");
const path = require("path");
const cssSyntax = require("../../../../lib/css/syntax");
const {
	BOOLEAN_ATTRIBUTES,
	COMMA_LIST_ATTRIBUTES,
	INTEGER_ATTRIBUTES,
	SIGNED_INTEGER_ATTRIBUTES,
	SRCSET_ATTRIBUTES,
	TOKEN_LIST_ATTRIBUTES,
	URL_ATTRIBUTES
} = require("../../../../lib/html/data");
const {
	NodeType,
	SourceProcessor,
	decodeEntities,
	parseSrcset
} = require("../../../../lib/html/syntax");

/**
 * The HTML integer parse rules, spelled out here rather than reused from `lib/`
 * so the check does not inherit the minifier's own idea of what an integer is.
 * They skip ASCII whitespace only, and stop at the first non-digit.
 * @param {string} value attribute value
 * @param {boolean} signed whether the signed rules apply
 * @returns {string} the parsed integer, or `<invalid>` when there is none
 */
const parseHtmlInteger = (value, signed) => {
	let i = 0;
	while (i < value.length && "\t\n\f\r ".includes(value[i])) i++;
	let sign = 1;
	if (signed && (value[i] === "-" || value[i] === "+")) {
		if (value[i] === "-") sign = -1;
		i++;
	}
	const start = i;
	while (i < value.length && value[i] >= "0" && value[i] <= "9") i++;
	if (i === start) return `<invalid>${value}`;
	return String(sign * Number(value.slice(start, i)));
};

/**
 * @param {Set<string> | null | undefined} on the elements a table entry covers
 * @param {string} tagName lowercased element name
 * @returns {boolean} whether the entry covers this element
 */
const appliesTo = (on, tagName) =>
	on !== undefined && (on === null || on.has(tagName));

/**
 * An attribute value reduced to what it means, so a transform that rewrites the
 * bytes without changing the meaning does not read as a difference.
 * @param {string} tagName lowercased element name
 * @param {string} name attribute name
 * @param {string} rawValue attribute value, as the source spells it
 * @returns {string} its canonical form
 */
const canonicalValue = (tagName, name, rawValue) => {
	// `attributes()` reports the source bytes, so the references have to go
	// before anything below reads the value the parser actually builds.
	const value = decodeEntities(rawValue, true);
	if (appliesTo(BOOLEAN_ATTRIBUTES.get(name), tagName)) return "<boolean>";
	if (appliesTo(TOKEN_LIST_ATTRIBUTES.get(name), tagName)) {
		// The ordered set parser splits on ASCII whitespace and drops the empties.
		return value
			.split(/[\t\n\f\r ]+/)
			.filter(Boolean)
			.join(" ");
	}
	if (name === "style") {
		try {
			return new cssSyntax.SourceProcessor().process(`a{${value}}`, {
				mode: "minify"
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
		return value
			.replace(/[\t\n\f\r ]*([,;=])[\t\n\f\r ]*/g, "$1")
			.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");
	}
	if (appliesTo(URL_ATTRIBUTES.get(name), tagName)) {
		// The URL parser strips C0 controls and space — not NBSP.
		return value.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");
	}
	if (appliesTo(INTEGER_ATTRIBUTES.get(name), tagName)) {
		return parseHtmlInteger(value, SIGNED_INTEGER_ATTRIBUTES.has(name));
	}
	if (COMMA_LIST_ATTRIBUTES.has(name)) {
		// "Split a string on commas" strips each token's edges, nothing inside it.
		return value
			.split(",")
			.map((item) => item.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, ""))
			.join(",");
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
				const tagName = nodePath.tagName();
				const attributes = nodePath
					.attributes()
					.map(
						(attribute) =>
							`${attribute.name}=${canonicalValue(
								tagName,
								attribute.name,
								attribute.value
							)}`
					)
					.sort()
					.join(" ");
				out.push(`<${tagName} ${attributes}>`);
			},
			[NodeType.Text]: (nodePath) => {
				const parent = nodePath.parentOf();
				const parentName = parent === 0 ? "" : nodePath.tagName(parent);
				if (parentName === "style") {
					out.push(`#css:${canonicalValue("", "style", nodePath.data())}`);
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
		/** @type {string[]} */
		const untouched = [];
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
			if (minified === source) untouched.push(file);
		}
		// Every document here is written with something for minifying to change,
		// so one handed back byte for byte is one the round-trip guard refused —
		// which is silent otherwise, and costs the whole document.
		expect(untouched).toEqual([]);
	}
};
