/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Compare webpack's own HTML minifier against the ecosystem's on real documents,
// reporting size, speed and — the part a size table hides — whether the output
// still parses to the same DOM.
//
//   node tooling/compare-html-minifiers.js
//
// The comparison packages are NOT webpack dependencies: they are installed into
// `node_modules/.cache/html-minifier-comparison` on first run, so nothing here
// reaches webpack's own dependency tree.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const htmlMinify = require("../lib/html/htmlMinify");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "node_modules/.cache/html-minifier-comparison");
const MODULES = path.join(CACHE, "node_modules");

const PACKAGES = [
	"@minify-html/node@0.15",
	"@swc/html@1",
	"cssnano@7",
	"html-minifier-terser@7",
	"html5-boilerplate@9",
	"htmlnano@2",
	"marked@15",
	"parse5@7",
	"postcss@8",
	"svgo@3",
	"swagger-ui-dist@5"
];

/**
 * @param {string} message progress line
 */
const log = (message) => {
	process.stderr.write(`${message}\n`);
};

const setup = () => {
	if (fs.existsSync(MODULES)) return;
	log(`installing comparison packages into ${path.relative(ROOT, CACHE)} …`);
	fs.mkdirSync(CACHE, { recursive: true });
	fs.writeFileSync(
		path.join(CACHE, "package.json"),
		`${JSON.stringify({ name: "html-minifier-comparison", private: true }, null, 2)}\n`
	);
	execFileSync("npm", ["install", "--no-audit", "--no-fund", ...PACKAGES], {
		cwd: CACHE,
		stdio: "inherit"
	});
};

/**
 * @param {string} name package name
 * @returns {EXPECTED_ANY} the package's export
 */
const load = (name) => require(path.join(MODULES, name));

/**
 * The parse5 node shape this walk reads. parse5 ships its own types, but it is
 * installed outside the repo (see `setup`), so tsc cannot resolve them.
 * @typedef {object} Parse5Node
 * @property {string} nodeName
 * @property {string=} tagName
 * @property {string=} value text, on a `#text` node
 * @property {{ name: string, value: string }[]=} attrs
 * @property {Parse5Node[]=} childNodes
 * @property {Parse5Node=} content a `<template>`'s document fragment
 */
/** @typedef {{ parse: (html: string) => Parse5Node }} Parse5 */

/**
 * Two kinds of real HTML: an app shell (attribute- and `<meta>`-heavy, little
 * text) and a document (mostly text, with the `<pre>` blocks whose whitespace no
 * minifier may touch). The documents are rendered from Markdown by `marked`
 * rather than written here, so they are as messy as a real docs page.
 * @returns {[string, string][]} `[label, html]` for every fixture
 */
// The third real shape: an app shell whose weight is inline critical CSS and
// form markup. Neither installed fixture carries an inline `<style>`, a
// `srcset` or a boolean attribute, so without this the comparison cannot see
// what a minifier does with any of them.
const APP_SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
	<title>Dashboard</title>
	<style>
		:root { --gap : 8px ; }
		body { margin : 0 0 0 0 ; font-family : system-ui , sans-serif ; }
		.header { display : flex ; padding : 8px 16px 8px 16px ; color : #ff0000 ; }
		.card { border-radius : 4px 4px 4px 4px ; background : rgb(255, 255, 255) ; }
		@media (min-width : 600px) { .card { padding : 0 0 ; } }
	</style>
</head>
<body>
	<div class="header  main   sticky" style="color: #ff0000;  padding: 0 0 0 0">
		<img srcset="logo.png 1x,   logo@2x.png 2x" src="logo.png" alt="Logo">
	</div>
	<form method="post">
		<input type="checkbox" checked="checked" disabled="disabled">
		<select multiple="multiple"><option selected="selected">a</option><option>b</option></select>
		<textarea readonly="readonly">keep  me</textarea>
	</form>
	<ul class="list   items"><li>one</li><li>two</li></ul>
	<script src="app.js" async="async" defer="defer"></script>
</body>
</html>`;

const fixtures = () => {
	const { marked } = load("marked");
	/** @type {[string, string][]} */
	const out = [];
	for (const [label, file] of [
		[
			"HTML5 Boilerplate 9",
			path.join(MODULES, "html5-boilerplate/dist/index.html")
		],
		["Swagger UI 5", path.join(MODULES, "swagger-ui-dist/index.html")]
	]) {
		out.push([label, fs.readFileSync(file, "utf8")]);
	}
	out.push(["App shell (inline critical CSS)", APP_SHELL]);
	for (const [label, file] of [
		["webpack README (rendered)", path.join(ROOT, "README.md")],
		["webpack CHANGELOG (rendered)", path.join(ROOT, "CHANGELOG.md")]
	]) {
		out.push([label, marked.parse(fs.readFileSync(file, "utf8"))]);
	}
	return out;
};

/**
 * @returns {[string, (html: string) => string | Promise<string>][]} `[label, minify]` for every minifier
 */
const minifiers = () => {
	const terser = load("html-minifier-terser");
	const minifyHtml = load("@minify-html/node");
	const htmlnano = load("htmlnano");
	const swc = load("@swc/html");
	return [
		["webpack", (html) => htmlMinify({ "input.html": html }).code],
		[
			"html-minifier-terser",
			(html) =>
				terser.minify(html, {
					collapseWhitespace: true,
					conservativeCollapse: true,
					removeComments: true
				})
		],
		[
			"html-minifier-terser (aggressive)",
			(html) =>
				terser.minify(html, {
					collapseBooleanAttributes: true,
					collapseWhitespace: true,
					removeAttributeQuotes: true,
					removeComments: true,
					removeRedundantAttributes: true
				})
		],
		[
			"minify-html",
			(html) => minifyHtml.minify(Buffer.from(html), {}).toString()
		],
		[
			"htmlnano",
			async (html) =>
				(await htmlnano.process(html, {}, htmlnano.presets.safe)).html
		],
		[
			"@swc/html",
			async (html) => (await swc.minify(Buffer.from(html), {})).code
		]
	];
};

// Text these elements hold is data, not markup whitespace, so a minifier that
// reflows it changes the rendered page.
const VERBATIM_TEXT = new Set(["pre", "textarea", "script", "style"]);

/**
 * A `<style>` body is CSS, not bytes: several of these minifiers rewrite it, so
 * comparing it verbatim would report every one of them as losing text. It is
 * canonicalized through webpack's CSS minifier instead, which compares what the
 * sheet means. That leaves a CSS-level mistake to webpack's own CSS suites —
 * this tool is checking the HTML around it.
 * @param {string} css a `<style>` body
 * @returns {string} its canonical form
 */
const canonicalCss = (css) => {
	try {
		const { SourceProcessor } = require("../lib/css/syntax");

		return new SourceProcessor().process(css, { minimize: true }).code;
	} catch (_err) {
		return css;
	}
};

/**
 * A DOM fingerprint: every element with its attributes, plus the text, walked
 * out of a real HTML parser rather than matched with a regex. Whitespace runs in
 * ordinary text collapse (that is the whole point of minifying), so only what
 * survives collapsing is compared — except inside `VERBATIM_TEXT`, where the
 * bytes have to match exactly.
 * @param {Parse5} parse5 the parse5 export
 * @param {string} html a document
 * @returns {{ elements: Map<string, number>, attributes: Map<string, number>, empty: Set<string>, text: string }} its fingerprint
 */
const fingerprint = (parse5, html) => {
	/** @type {Map<string, number>} */
	const elements = new Map();
	/** @type {Map<string, number>} */
	const attributes = new Map();
	// Attributes and elements that carried nothing. Dropping `lang=""` or an empty
	// `<title>` is a different claim from dropping content, so the report says which.
	/** @type {Set<string>} */
	const empty = new Set();
	/** @type {Set<string>} */
	const filled = new Set();
	/** @type {string[]} */
	const text = [];
	/**
	 * @param {Parse5Node} node a parse5 node
	 * @param {boolean} verbatim whether text below it keeps its bytes
	 * @param {string=} parent the enclosing element's tag name
	 */
	const walk = (node, verbatim, parent) => {
		if (node.nodeName === "#text") {
			const raw = node.value || "";
			if (parent === "style") {
				const css = canonicalCss(raw);
				if (css.length !== 0) text.push(css);
				return;
			}
			const value = verbatim ? raw : raw.replace(/\s+/g, " ").trim();
			if (value.length !== 0) text.push(value);
			return;
		}
		if (node.tagName !== undefined) {
			elements.set(node.tagName, (elements.get(node.tagName) || 0) + 1);
			for (const attribute of node.attrs || []) {
				const key = `${node.tagName}[${attribute.name}]`;
				attributes.set(key, (attributes.get(key) || 0) + 1);
				(attribute.value === "" ? empty : filled).add(key);
			}
			const children = node.childNodes || [];
			(children.length === 0 ? empty : filled).add(node.tagName);
		}
		const below = verbatim || VERBATIM_TEXT.has(node.tagName || "");
		const name = node.tagName || parent;
		for (const child of node.childNodes || []) walk(child, below, name);
		// A `<template>`'s children hang off `content`, not `childNodes`.
		if (node.content !== undefined) walk(node.content, below, name);
	};
	walk(parse5.parse(html), false, undefined);
	for (const key of filled) empty.delete(key);
	return { elements, attributes, empty, text: text.join(" ") };
};

/**
 * @param {Map<string, number>} before input counts
 * @param {Map<string, number>} after output counts
 * @param {Set<string>} empty the entries that carried nothing in the input
 * @returns {string[]} the entries the output has fewer of
 */
const missing = (before, after, empty) => {
	const out = [];
	for (const [key, count] of before) {
		const left = after.get(key) || 0;
		if (left >= count) continue;
		const times = count - left > 1 ? ` ×${count - left}` : "";
		out.push(`${key}${times}${empty.has(key) ? " (empty)" : ""}`);
	}
	return out;
};

/**
 * @param {number} bytes a byte count
 * @returns {string} the count in KB, one decimal
 */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const main = async () => {
	setup();
	const parse5 = /** @type {Parse5} */ (load("parse5"));
	for (const [label, html] of fixtures()) {
		const before = fingerprint(parse5, html);
		const gzipped = zlib.gzipSync(Buffer.from(html), { level: 9 }).length;
		process.stdout.write(
			`\n${label} — ${kb(Buffer.byteLength(html))} (${kb(gzipped)} gzip), ${before.elements.size} tags\n`
		);
		process.stdout.write(
			`${"minifier".padEnd(34)}${"minified".padStart(10)}${"saved".padStart(8)}${"gzip".padStart(10)}${"saved".padStart(8)}${"ms".padStart(7)}   differs\n`
		);
		for (const [name, run] of minifiers()) {
			let out = "";
			let best = Infinity;
			for (let i = 0; i < 3; i++) {
				const started = process.hrtime.bigint();
				out = await run(html);
				const took = Number(process.hrtime.bigint() - started) / 1e6;
				if (took < best) best = took;
			}
			const after = fingerprint(parse5, out);
			const notes = [
				...missing(before.elements, after.elements, before.empty).map(
					(entry) => `<${entry}`
				),
				...missing(before.attributes, after.attributes, before.empty)
			];
			if (before.text !== after.text) notes.push("text");
			const outGzip = zlib.gzipSync(Buffer.from(out), { level: 9 }).length;
			process.stdout.write(
				`${
					name.padEnd(34) +
					kb(Buffer.byteLength(out)).padStart(10) +
					`${(100 - (Buffer.byteLength(out) / Buffer.byteLength(html)) * 100).toFixed(1)}%`.padStart(
						8
					) +
					kb(outGzip).padStart(10) +
					`${(100 - (outGzip / gzipped) * 100).toFixed(1)}%`.padStart(8) +
					best.toFixed(0).padStart(7)
				}   ${notes.length === 0 ? "-" : notes.slice(0, 4).join(", ")}\n`
			);
		}
	}
};

main().catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});
