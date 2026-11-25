"use strict";

const MAX_DEPTH = 6;
const ELEMENTS = [
	"root",
	"node",
	"item",
	"entry",
	"data",
	"group",
	"value",
	"meta",
	"svg",
	"path",
	"book",
	"title"
];
const PREFIXES = ["", "", "", "ns", "x", "a"];
const ATTRIBUTES = [
	"id",
	"class",
	"name",
	"value",
	"lang",
	"type",
	"href",
	"role",
	"data-x",
	"data-y"
];
const TEXTS = [
	"alpha",
	"hello world",
	"1 < 2 & 3 > 2",
	"é 😀",
	"line\nbreak",
	"tabs\tand\r\nspace",
	"&#x26;",
	"&#169;",
	"&ent;",
	"&amp;",
	"&lt;tag&gt;"
];
const XML_DECLARATIONS = [
	'<?xml version="1.0"?>',
	'<?xml version="1.0" encoding="UTF-8"?>',
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
	'<?xml version="1.0" standalone="yes"?>',
	'<?xml version="1.1"?>',
	""
];
const DOCUMENT_TYPES = [
	"<!DOCTYPE root>",
	'<!DOCTYPE root SYSTEM "about:legacy-compat">',
	'<!DOCTYPE root [<!ENTITY ent "value">]>',
	'<!DOCTYPE root [<!ENTITY ent "v&amp;a"><!ENTITY e2 "x">]>',
	""
];

/**
 * @template T
 * @param {() => number} random a number in [0, 1) per call
 * @param {readonly T[]} list choices
 * @returns {T} one of them
 */
const pick = (random, list) => list[Math.floor(random() * list.length)];

/**
 * @param {string} text source text
 * @returns {string} text escaped for XML text content
 */
const escapeText = (text) =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * @param {string} value an attribute value
 * @returns {string} value escaped for XML attributes
 */
const escapeAttribute = (value) =>
	escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * A generator of XML documents for a seed.
 * @param {number} seed the seed
 * @param {(seed: number) => () => number} createRandom the seeded number source
 * @returns {() => string} the next document per call
 */
const createXmlDocumentGenerator = (seed, createRandom) => {
	const random = createRandom(seed);

	/**
	 * @param {number} n choice count
	 * @returns {number} one of `0` to `n - 1`
	 */
	const below = (n) => Math.floor(random() * n);
	/**
	 * @param {number} probability chance of true
	 * @returns {boolean} whether the chance came up
	 */
	const chance = (probability) => random() < probability;
	/**
	 * @returns {string} a random prefix or ""
	 */
	const prefix = () => pick(random, PREFIXES);
	/**
	 * @param {string} name local name
	 * @returns {string} qualified name
	 */
	const qualifiedName = (name) => {
		if (name.includes(":")) return name;
		const p = prefix();
		return p === "" ? name : `${p}:${name}`;
	};
	/**
	 * @param {number} depth current depth
	 * @param {boolean} hasEntityDeclaration whether the document declares `ent`
	 * @returns {string} a text node
	 */
	const text = (depth, hasEntityDeclaration) => {
		const raw = pick(random, TEXTS);
		const expanded =
			chance(0.3) && depth < MAX_DEPTH ? `${raw} ${pick(random, TEXTS)}` : raw;
		if (hasEntityDeclaration) return escapeText(expanded);
		return escapeText(expanded.replace(/&ent;/g, "&amp;"));
	};
	/**
	 * @returns {string} a processing instruction
	 */
	const processingInstruction = () =>
		`<?${pick(random, ["pi", "x", "meta", "proc"])} ${escapeText(pick(random, ["a=1", "name='x'", "x y"]))}?>`;
	/**
	 * @returns {string} a comment
	 */
	const comment = () => `<!-- ${pick(random, ["a", "b c", "xml", "note"])} -->`;
	/**
	 * @returns {string} a CDATA section
	 */
	const cdata = () =>
		`<![CDATA[${pick(random, ["x<y", "a&b", "raw text", "line\nbreak", "1 < 2 & 3 > 2"])}]]>`;
	/**
	 * @param {boolean} hasEntityDeclaration whether the document declares `ent`
	 * @returns {string} attributes for one element
	 */
	const attributes = (hasEntityDeclaration) => {
		/** @type {string[]} */
		const out = [];
		/** @type {Set<string>} */
		const names = new Set();
		if (chance(0.35)) {
			out.push('xmlns="urn:fuzz:default"');
		}
		if (chance(0.35)) {
			out.push(`xmlns:${pick(random, ["ns", "x", "a"])}="urn:fuzz:ns"`);
		}
		if (chance(0.35)) {
			out.push('xmlns:xlink="http://www.w3.org/1999/xlink"');
		}
		for (let i = 0; i < below(5); i++) {
			const base = pick(random, [...ATTRIBUTES, "xml:lang", "xlink:href"]);
			const name = qualifiedName(base);
			if (names.has(name)) {
				continue;
			}
			names.add(name);
			let raw = pick(random, TEXTS);
			if (!hasEntityDeclaration) raw = raw.replace(/&ent;/g, "&amp;");
			const value = escapeAttribute(raw);
			out.push(`${name}="${value}"`);
		}
		return out.length === 0 ? "" : ` ${out.join(" ")}`;
	};
	/**
	 * @param {number} depth current depth
	 * @param {boolean} hasEntityDeclaration whether the document declares `ent`
	 * @returns {string} one XML node
	 */
	const node = (depth, hasEntityDeclaration) => {
		const elementName = qualifiedName(pick(random, ELEMENTS));
		const attrs = attributes(hasEntityDeclaration);
		if (depth >= MAX_DEPTH || chance(0.2)) {
			return `<${elementName}${attrs}/>`;
		}
		let body = "";
		for (let i = 0; i < below(6) + 1; i++) {
			const kind = below(10);
			if (kind < 2) {
				body += text(depth, hasEntityDeclaration);
			} else if (kind === 2) {
				body += comment();
			} else if (kind === 3) {
				body += processingInstruction();
			} else if (kind === 4) {
				body += cdata();
			} else if (kind === 5) {
				body += pick(
					random,
					hasEntityDeclaration
						? ["&ent;", "&#x26;", "&amp;"]
						: ["&#x26;", "&amp;"]
				);
			} else {
				body += node(depth + 1, hasEntityDeclaration);
			}
		}
		return `<${elementName}${attrs}>${body}</${elementName}>`;
	};

	return () => {
		const prolog = pick(random, XML_DECLARATIONS);
		const doctype = pick(random, DOCUMENT_TYPES);
		const hasEntityDeclaration = doctype.includes("<!ENTITY ent ");
		const leading = chance(0.3) ? `${comment()}${processingInstruction()}` : "";
		const trailing = chance(0.3)
			? `${comment()}${chance(0.2) ? processingInstruction() : ""}`
			: "";
		return `${prolog}${doctype}${leading}${node(0, hasEntityDeclaration)}${trailing}`;
	};
};

module.exports = { createXmlDocumentGenerator };
