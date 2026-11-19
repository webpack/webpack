"use strict";

// cspell:ignore Aacute contenteditable notin notit

// A seeded generator of HTML documents: elements from webref's HTML, SVG and
// MathML lists, attributes from the tables the minifier reads, stylesheets and
// `style` attributes from `cssFuzzStylesheet.js`, and the markup the tree
// builder repairs (omitted and stray tags, misnested formatting, foster
// parented table text, raw text, foreign content, bogus comments, references).

const svgElements = require("@webref/elements/SVG2.json").elements;
const htmlElements = require("@webref/elements/html.json").elements;
const mathmlElements = require("@webref/elements/mathml-core.json").elements;
const {
	BOOLEAN_ATTRIBUTES,
	ENUMERATED_KEYWORDS,
	EVENT_HANDLER_ATTRIBUTES,
	FOREIGN_ATTR_NS,
	INTEGER_ATTRIBUTES,
	RAW_TEXT_ELEMENTS,
	REDUNDANT_DEFAULT_ATTRIBUTES,
	SRCSET_ATTRIBUTES,
	SVG_ATTR_ADJUST,
	SVG_TAG_ADJUST,
	URL_ATTRIBUTES,
	VOID
} = require("../../lib/html/data");
const { createStylesheetGenerator } = require("./cssFuzzStylesheet");

const MAX_DEPTH = 6;

// Elements a document gives a shape of their own, written by `special`; the
// rest are written as plain containers.
const SPECIAL = new Set([
	"html",
	"head",
	"body",
	"frameset",
	"frame",
	"noframes",
	"plaintext",
	"script",
	"style",
	"template",
	"table",
	"svg",
	"math"
]);
// Where the Chrome the suite runs builds another tree than the spec: it does
// not count `search` as special, and it reads `&#x;` and a NUL in body text as
// U+FFFD. Left out, so the parser's tree is still held to the browser's.
const CHROME_DEPARTS = new Set(["search"]);
const ELEMENTS = htmlElements
	.map(({ name }) => name)
	.filter((name) => !SPECIAL.has(name) && !CHROME_DEPARTS.has(name));
const SVG_ELEMENTS = svgElements.map(({ name }) => name);
const MATHML_ELEMENTS = mathmlElements.map(({ name }) => name);
const FORMATTING = [
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
];
const TABLE_PARTS = [
	"caption",
	"colgroup",
	"col",
	"thead",
	"tbody",
	"tfoot",
	"tr",
	"td",
	"th"
];

const WORDS = [
	"a",
	"b c",
	"Hello",
	"  ",
	"\n",
	"\t x \n",
	"é",
	"😀",
	"a  b",
	"x<y",
	"1 > 0",
	"a&b",
	"&",
	"]]>",
	"--",
	"\r\n",
	"\f"
];
const REFERENCES = [
	"&amp;",
	"&lt;",
	"&gt;",
	"&quot;",
	"&nbsp;",
	"&#38;",
	"&#x26;",
	"&#X3C;",
	"&amp",
	"&notin;",
	"&notit;",
	"&#0;",
	"&#x110000;",
	"&#128;",
	"&Aacute",
	"&unknown;",
	"&#;"
];
const COMMENTS = [
	"<!---->",
	"<!-- c -->",
	"<!-->",
	"<!--->",
	"<!-- a -- b -->",
	"<!--!-->",
	"<!-- x --!>",
	"<!x>",
	"<?php 1 ?>",
	"</ x>",
	"<!--[if IE]><p>ie<![endif]-->",
	'<!--#include file="a" -->',
	"<!--<!-- -->"
];
const DOCTYPE_SPELLINGS = [
	"<!DOCTYPE html>",
	"<!doctype HTML>",
	'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">',
	'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">',
	'<!DOCTYPE html SYSTEM "about:legacy-compat">',
	"<!DOCTYPE>",
	"<!DOCTYPE foo>",
	""
];
// eslint-disable-next-line no-script-url
const SCRIPT_URL = "javascript:a()";
// eslint-disable-next-line unicorn/text-encoding-identifier-case
const CHARSETS = ["utf-8", "UTF-8", '"utf-8"'];
const VALUES = [
	"",
	"x",
	"a b",
	" x ",
	"1",
	"-1",
	"0",
	"TRUE",
	SCRIPT_URL,
	"a.png",
	"a.png 1x, b.png 2x",
	"{a}",
	"'",
	'"',
	"=",
	"`",
	"a&amp;b",
	"a&b",
	"&quot;",
	"\t\n"
];
const SCRIPTS = [
	"var a = 1;",
	"if (a < b) {}",
	"'</scr' + 'ipt>'",
	"<!-- x",
	"document.write('<b>')",
	'{"a":1}',
	""
];
const SCRIPT_TYPES = [
	"",
	" type=module",
	' type="text/javascript"',
	" type=application/json",
	" type=importmap",
	" type=text/template",
	' TYPE="TEXT/JAVASCRIPT"'
];
const GLOBAL_ATTRIBUTES = [
	"id",
	"class",
	"title",
	"lang",
	"dir",
	"hidden",
	"tabindex",
	"data-x",
	"aria-label",
	"role",
	"slot",
	"translate",
	"draggable",
	"contenteditable",
	"xml:lang"
];

/**
 * @template T
 * @param {() => number} random a number in [0, 1) per call
 * @param {readonly T[]} list the choices
 * @returns {T} one of them
 */
const pick = (random, list) => list[Math.floor(random() * list.length)];

/**
 * The attributes a table names for an element: those it lists for any
 * element, and those it lists for this one.
 * @param {Map<string, Set<string> | null>} table attribute to the elements it applies to, `null` for all
 * @param {string} element the element
 * @returns {string[]} the attribute names
 */
const attributesFor = (table, element) => {
	/** @type {string[]} */
	const names = [];
	for (const [name, elements] of table) {
		if (elements === null || elements.has(element)) names.push(name);
	}
	return names;
};

/**
 * A generator of documents for a seed: each call writes the next one.
 * @param {number} seed the seed
 * @param {(seed: number) => () => number} createRandom the seeded number source
 * @returns {() => string} the next document per call
 */
const createDocumentGenerator = (seed, createRandom) => {
	const random = createRandom(seed);
	const css = createStylesheetGenerator(seed, createRandom);
	/**
	 * @param {number} n how many choices
	 * @returns {number} one of `0` to `n - 1`
	 */
	const below = (n) => Math.floor(random() * n);
	/**
	 * @param {number} probability the probability
	 * @returns {boolean} whether this call hit it
	 */
	const chance = (probability) => random() < probability;

	/**
	 * @param {string} name a tag or attribute name
	 * @returns {string} the name, now and then in another case
	 */
	const respell = (name) => {
		if (chance(0.05)) return name.toUpperCase();
		if (chance(0.03)) return name[0].toUpperCase() + name.slice(1);
		return name;
	};

	/**
	 * @param {string} value an attribute's value
	 * @returns {string} it quoted one of the ways a source may, with `=`
	 */
	const quoted = (value) => {
		const way = below(10);
		if (way < 3 && /^[^\s"'=<>`]+$/.test(value)) return `=${value}`;
		if (way < 5 && !value.includes("'")) return `='${value}'`;
		const escaped = value.replace(/"/g, "&quot;");
		return way === 5 ? ` = "${escaped}"` : `="${escaped}"`;
	};

	/**
	 * @param {string} element the element
	 * @param {string} name the attribute
	 * @returns {string} a value the attribute may hold
	 */
	const valueFor = (element, name) => {
		const keywords =
			(ENUMERATED_KEYWORDS[element] || {})[name] ||
			ENUMERATED_KEYWORDS["*"][name];
		if (keywords !== undefined && chance(0.7)) {
			const keyword = pick(random, [...keywords]);
			return chance(0.1) ? keyword.toUpperCase() : keyword;
		}
		const defaults = REDUNDANT_DEFAULT_ATTRIBUTES[element];
		if (defaults !== undefined && name in defaults && chance(0.5)) {
			return defaults[name];
		}
		if (name === "style") return css.declarations();
		if (name === "class") {
			return pick(random, ["a", " a  b ", "a a", "B\tc", ""]);
		}
		if (EVENT_HANDLER_ATTRIBUTES.has(name)) {
			return pick(random, ["return false", "a(1);", "a && b()"]);
		}
		if (SRCSET_ATTRIBUTES.has(name)) {
			return pick(random, [
				"a.png 1x, b.png 2x",
				" a.png  100w ,b.png 200w",
				"a.png"
			]);
		}
		if (INTEGER_ATTRIBUTES.has(name)) {
			return pick(random, ["1", "01", " 2", "-3", "4x", "+5"]);
		}
		if (URL_ATTRIBUTES.has(name)) {
			return pick(random, [
				"a.html",
				" b.html ",
				"#x",
				"http://example.com/a?b=1&amp;c=2",
				SCRIPT_URL,
				""
			]);
		}
		if (BOOLEAN_ATTRIBUTES.has(name)) {
			return pick(random, ["", name, "false", name.toUpperCase()]);
		}
		return pick(random, [...VALUES, ...REFERENCES]);
	};

	/**
	 * @param {string} element the element
	 * @param {"html" | "svg" | "math"} space the namespace it is written in
	 * @returns {string} its attributes, each with the space before it
	 */
	const attributes = (element, space) => {
		/** @type {string[]} */
		const names = [...GLOBAL_ATTRIBUTES, "style"];
		if (space === "html") {
			names.push(
				...attributesFor(BOOLEAN_ATTRIBUTES, element),
				...attributesFor(URL_ATTRIBUTES, element),
				...attributesFor(INTEGER_ATTRIBUTES, element),
				...Object.keys(ENUMERATED_KEYWORDS[element] || {}),
				...Object.keys(ENUMERATED_KEYWORDS["*"]),
				...Object.keys(REDUNDANT_DEFAULT_ATTRIBUTES[element] || {}),
				...SRCSET_ATTRIBUTES,
				"onclick"
			);
		} else {
			names.push(
				...Object.keys(SVG_ATTR_ADJUST),
				...Object.keys(FOREIGN_ATTR_NS),
				"fill",
				"d",
				"viewBox",
				"transform",
				"width"
			);
		}
		let out = "";
		const count = below(4);
		for (let i = 0; i < count; i++) {
			const name = pick(random, names);
			out += `${pick(random, [" ", " ", "\n", "  ", "/"])}${respell(name)}`;
			if (!chance(0.15)) out += quoted(valueFor(element, name));
		}
		return out;
	};

	/**
	 * @returns {string} text, now and then holding a character reference
	 */
	const text = () => {
		let out = pick(random, WORDS);
		if (chance(0.3)) out += pick(random, REFERENCES);
		return out;
	};

	/**
	 * @param {number} depth how deep the content sits
	 * @param {"html" | "svg" | "math"} space the namespace it is written in
	 * @returns {string} a run of nodes
	 */
	const content = (depth, space) => {
		let out = "";
		const count = depth >= MAX_DEPTH ? below(2) : below(5);
		for (let i = 0; i < count; i++) out += node(depth, space);
		return out;
	};

	/**
	 * @param {string} name the element
	 * @param {number} depth how deep it sits
	 * @param {"html" | "svg" | "math"} space the namespace it is written in
	 * @returns {string} the element, its end tag now and then left out
	 */
	const element = (name, depth, space) => {
		const open = `<${respell(name)}${attributes(name, space)}`;
		if (space === "html" && VOID.has(name)) {
			return `${open}${pick(random, [">", "/>", " />", `></${name}>`])}`;
		}
		if (space !== "html" && chance(0.3)) return `${open}/>`;
		if (space === "html" && RAW_TEXT_ELEMENTS.has(name)) {
			const inner =
				name === "textarea" && chance(0.3)
					? `\n${text()}`
					: pick(random, [...WORDS, "</p>", "<b>", `</${name} x>`, "<!--"]);
			return `${open}>${inner}</${respell(name)}>`;
		}
		const leading =
			name === "pre" || name === "listing"
				? pick(random, ["", "\n", "\n\n"])
				: "";
		const inner = content(depth + 1, space);
		const close = chance(0.85)
			? `</${respell(name)}${chance(0.05) ? " x=1" : ""}>`
			: "";
		return `${open}>${leading}${inner}${close}`;
	};

	/**
	 * @param {number} depth how deep it sits
	 * @returns {string} a table, now and then with text the tree builder moves out
	 */
	const table = (depth) => {
		let out = `<table${attributes("table", "html")}>`;
		const parts = below(5);
		for (let i = 0; i < parts; i++) {
			const part = pick(random, TABLE_PARTS);
			out += `<${respell(part)}${attributes(part, "html")}>`;
			if (chance(0.5)) out += content(depth + 1, "html");
			if (chance(0.4)) out += `</${part}>`;
		}
		return `${out}${chance(0.8) ? "</table>" : ""}`;
	};

	/**
	 * @param {number} depth how deep it sits
	 * @returns {string} one construct the tree builder handles on its own path
	 */
	const special = (depth) => {
		switch (below(13)) {
			case 0:
				return table(depth);
			case 1: {
				// The adoption agency: formatting closed out of order.
				const outer = pick(random, FORMATTING);
				const inner = pick(random, FORMATTING);
				return `<${outer}>${text()}<${inner}>${text()}</${outer}>${text()}</${inner}>`;
			}
			case 2:
				return `<svg${attributes("svg", "svg")}>${content(
					depth + 1,
					"svg"
				)}</svg>`;
			case 3:
				return `<math${attributes("math", "math")}>${content(
					depth + 1,
					"math"
				)}</math>`;
			case 4:
				return `<template${attributes("template", "html")}>${content(
					depth + 1,
					"html"
				)}</template>`;
			case 5:
				return `<template shadowrootmode=${pick(random, [
					"open",
					"closed"
				])}>${content(depth + 1, "html")}</template>`;
			case 6:
				return `<script${pick(random, SCRIPT_TYPES)}>${pick(
					random,
					SCRIPTS
				)}</script>`;
			case 7:
				return `<style${pick(random, [
					"",
					" media=print",
					" type=text/css"
				])}>${css.stylesheet()}</style>`;
			case 8:
				return pick(random, [
					"</p>",
					"</br>",
					"</div>",
					"</b>",
					"</html>",
					"</body>",
					"<image>",
					"<isindex>",
					"<li>",
					"<dd>",
					"<option>",
					"<p>"
				]);
			case 9:
				return `<select>${pick(random, [
					"<option>a<option selected>b",
					"<optgroup label=x><option>c</optgroup>",
					"<div>d</div>",
					"<hr><option>e"
				])}</select>`;
			case 10:
				return `<ul>${pick(random, [
					"<li>a<li>b",
					"<li>a</li> <li>b",
					"<li><ul><li>c</ul>"
				])}</ul>`;
			case 11:
				return `<p>${text()}<${pick(random, [
					"div",
					"p",
					"table",
					"h1",
					"ul",
					"pre"
				])}>${text()}`;
			default:
				return pick(random, COMMENTS);
		}
	};

	/**
	 * @param {number} depth how deep it sits
	 * @param {"html" | "svg" | "math"} space the namespace it is written in
	 * @returns {string} one node: text, a comment, an element or a special construct
	 */
	const node = (depth, space) => {
		const kind = below(10);
		if (kind < 3) return text();
		if (kind === 3) return pick(random, COMMENTS);
		if (space === "svg") {
			if (chance(0.15)) {
				return `<foreignObject>${content(depth + 1, "html")}</foreignObject>`;
			}
			if (chance(0.1)) return "<![CDATA[x<y]]>";
			const name = pick(random, [
				...SVG_ELEMENTS,
				...Object.values(SVG_TAG_ADJUST)
			]);
			return element(name, depth, "svg");
		}
		if (space === "math") {
			if (chance(0.15)) {
				return `<annotation-xml encoding=${pick(random, [
					"text/html",
					"application/xhtml+xml",
					"x"
				])}>${content(depth + 1, "html")}</annotation-xml>`;
			}
			return element(pick(random, MATHML_ELEMENTS), depth, "math");
		}
		if (kind < 6 && depth < MAX_DEPTH) return special(depth);
		return element(pick(random, ELEMENTS), depth, "html");
	};

	/**
	 * @returns {string} what a `head` holds
	 */
	const head = () => {
		let out = "";
		const count = below(4);
		for (let i = 0; i < count; i++) {
			out += pick(random, [
				`<title>${text()}</title>`,
				`<meta charset=${pick(random, CHARSETS)}>`,
				'<meta name=viewport content="width=device-width">',
				`<meta http-equiv=content-type content="text/html; charset=${pick(
					random,
					CHARSETS
				)}">`,
				`<link rel=stylesheet href=a.css${attributes("link", "html")}>`,
				"<base href=/x/>",
				`<style>${css.stylesheet()}</style>`,
				`<script${pick(random, SCRIPT_TYPES)}>${pick(
					random,
					SCRIPTS
				)}</script>`,
				"<noscript><link rel=x href=y></noscript>",
				pick(random, COMMENTS),
				" \n"
			]);
		}
		return out;
	};

	return () => {
		const body = content(0, "html");
		switch (below(6)) {
			case 0:
				return body;
			case 1:
				return `${pick(random, DOCTYPE_SPELLINGS)}${body}`;
			case 2:
				return `${pick(
					random,
					DOCTYPE_SPELLINGS
				)}<title>t</title>${head()}${body}`;
			case 3:
				return `<frameset><frame src=a>${
					chance(0.5) ? "<noframes>x</noframes>" : ""
				}</frameset>`;
			case 4:
				return `${body}<plaintext>${text()}</plaintext>`;
			default:
				return `${pick(random, DOCTYPE_SPELLINGS)}${pick(random, [
					"",
					"\n"
				])}<html${attributes("html", "html")}>${
					chance(0.8) ? `<head>${head()}</head>` : head()
				}${pick(random, ["", " ", ...COMMENTS])}${
					chance(0.8)
						? `<body${attributes("body", "html")}>${body}${
								chance(0.7) ? "</body>" : ""
							}`
						: body
				}${chance(0.7) ? "</html>" : ""}${
					chance(0.2) ? pick(random, COMMENTS) : ""
				}`;
		}
	};
};

module.exports = { createDocumentGenerator };
