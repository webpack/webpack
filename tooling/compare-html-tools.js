/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Compare webpack's own HTML parser and printer against the ecosystem's, over
// real documents, in the three stages a tool can be asked for.

//   node tooling/compare-html-tools.js

// `parse` builds the tree and stops; `beautify` and `minify` print it back out.
// Every table reports best-of-3 wall/cpu ms and the worker's own peak RSS.

// The two printing tables add what the output weighs and whether the DOM it
// parses back to still says what the input's did.

// `FIXTURE=`, `TOOL=` and `STAGE=` narrow the run to rows whose name contains
// what they name, so one cell is re-measured without the whole matrix.

// Each cell runs in a fresh worker, so cost is attributable to that one tool.
// The packages compared against install into `node_modules/.cache/`.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const htmlMinify = require("../lib/html/htmlMinify");
const { SourceProcessor } = require("../lib/html/syntax");
const {
	STAGES,
	compress,
	filterFrom,
	formatCost,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker
} = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "html-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);

const PACKAGES = [
	"angular-html-parser@9",
	"bootstrap@5",
	"dom-serializer@2",
	"@fortawesome/fontawesome-free@6",
	"htmlparser2@10",
	"js-beautify@1",
	"@minify-html/node@0.15",
	"node-html-parser@7",
	"@picocss/pico@2",
	"@swc/html@1",
	"cssnano@7",
	"html-minifier-next@8",
	"html-minifier-terser@7",
	"html5-boilerplate@9",
	"htmlnano@2",
	"linkedom@0.18",
	"marked@15",
	"parse5@7",
	"postcss@8",
	"prettier@3",
	"svgo@3",
	"swagger-ui-dist@5",
	"water.css@2"
];

const setup = () => installPackages(CACHE_NAME, PACKAGES);
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

// An app shell, whose weight is inline critical CSS and form markup: without
// it no fixture carries a `<style>`, a `srcset` or a boolean attribute.
// The documents the comparison installs rather than builds.
/** @type {[string, string][]} */
const INSTALLED_DOCUMENTS = [
	["HTML5 Boilerplate 9", "html5-boilerplate/dist/index.html"],
	["Swagger UI 5", "swagger-ui-dist/index.html"]
];

// Real framework stylesheets, inlined whole into a page of their own.
/** @type {[string, string][]} */
const INLINED_STYLESHEETS = [
	["Pico 2 classless (inlined)", "@picocss/pico/css/pico.classless.css"],
	["Water.css 2 (inlined)", "water.css/out/water.css"],
	["Bootstrap 5 (inlined)", "bootstrap/dist/css/bootstrap.css"]
];

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

// Component markup from a class-per-utility framework: the only fixture with
// long token lists and the empty wrappers a component library emits.
const COMPONENT_CARD = `		<div class="card bg-base-100 shadow-md rounded-lg">
			<div class="card-body flex flex-col gap-4">
				<h2 class="card-title text-lg font-bold truncate">Item %N%</h2>
				<div class="divider my-2"></div>
				<p class="text-sm text-gray-600 leading-6">Description for item %N%.</p>
				<span class="badge badge-primary badge-sm"></span>
				<div class="card-actions justify-between items-center">
					<button class="btn btn-primary btn-sm" type="button">Open</button>
					<button class="btn btn-ghost btn-sm" type="button" disabled="disabled">Wait</button>
					<a class="link link-hover text-blue-600 underline" href="/item/%N%">Details</a>
				</div>
				<label class="form-control w-full max-w-2xl">
					<span class="label-text text-sm"></span>
					<input class="input input-bordered w-full" type="text" name="q%N%" placeholder="Search">
				</label>
			</div>
		</div>
`;

// The classes a card varies by, so the page carries thousands of distinct token
// lists: a fixture whose lists all match measures a cache a real page misses.
const COMPONENT_UTILITIES = [
	["p-2", "p-4", "p-6", "px-3", "py-2", "m-0", "mt-2", "mb-4"],
	["text-xs", "text-sm", "text-base", "text-lg", "text-xl"],
	["text-gray-500", "text-slate-700", "text-blue-600", "text-red-500"],
	["rounded", "rounded-md", "rounded-lg", "rounded-xl"],
	["shadow-none", "shadow-sm", "shadow", "shadow-lg"],
	["w-full", "w-auto", "max-w-md", "max-w-2xl"]
];

/**
 * Rotate a token list and mix in utilities picked by `by`, so the same component
 * reaches the page written differently each time, as a real page's do.
 * @param {string} list a space-separated token list
 * @param {number} by which variation to emit
 * @returns {string} the varied list
 */
const varyTokens = (list, by) => {
	const tokens = list.split(" ");
	const at = by % tokens.length;
	const rotated = [...tokens.slice(at), ...tokens.slice(0, at)];
	for (let i = 0; i < COMPONENT_UTILITIES.length; i++) {
		const bucket = COMPONENT_UTILITIES[i];
		// A different stride per bucket, so the combinations do not fall into step.
		if ((by >> i) % 3 === 0) {
			rotated.push(bucket[(by * (i + 2)) % bucket.length]);
		}
	}
	return rotated.join(" ");
};

/**
 * A component-library page: many elements, several classes on each, and the
 * empty wrappers such libraries emit.
 * @param {number} count how many cards to lay out
 * @returns {string} the document
 */
const componentPage = (count) => {
	let cards = "";
	for (let i = 0; i < count; i++) {
		cards += COMPONENT_CARD.replace(/%N%/g, `${i}`).replace(
			/class="([^"]*)"/g,
			(_, list) => `class="${varyTokens(list, i)}"`
		);
	}
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Components</title>
</head>
<body class="min-h-screen bg-base-200">
	<nav class="navbar bg-base-100 shadow sticky top-0 z-10">
		<div class="navbar-start flex items-center gap-2"><a class="btn btn-ghost text-2xl" href="/">App</a></div>
		<div class="navbar-center hidden md:flex"><ul class="menu menu-horizontal gap-1"><li><a class="link" href="/a">A</a></li><li><a class="link" href="/b">B</a></li></ul></div>
		<div class="navbar-end"></div>
	</nav>
	<main class="grid grid-cols-3 gap-4 p-8">
${cards}	</main>
	<footer class="footer p-8 bg-neutral text-neutral-content"><span class="text-sm"></span></footer>
	<script src="app.js" type="text/javascript"></script>
</body>
</html>`;
};

/**
 * A page whose weight is a framework stylesheet inlined whole as critical CSS —
 * the shape where an HTML minifier's nested CSS handling dominates the result.
 * @param {string} title page title
 * @param {string} css the framework stylesheet
 * @returns {string} the document
 */
const inlineCssPage = (title, css) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${title}</title>
	<style>
${css}
	</style>
</head>
<body>
	<header><nav><a href="/">Home</a> <a href="/docs">Docs</a></nav><h1>${title}</h1></header>
	<main>
		<section><h2>Form</h2><form method="post"><label>Name <input type="text" required></label><button type="submit">Send</button></form></section>
		<section><h2>Table</h2><table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody><tr><td>a</td><td>1</td></tr></tbody></table></section>
	</main>
	<footer><small>&copy; example</small></footer>
</body>
</html>`;

/**
 * A page of nothing but tables: rows a parser has to put in an implied
 * `<tbody>`, cells that span, and a `<caption>` and `<colgroup>` before them.
 * @param {number} rows how many rows to write
 * @returns {string} the page
 */
const tablePage = (rows) => {
	let body = "";
	for (let i = 0; i < rows; i++) {
		body += `\t\t<tr><th scope="row">Row ${i}</th><td>${i}</td><td colspan="2">${
			i * 2
		}</td><td><a href="/row/${i}">open</a></td></tr>\n`;
	}
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Report</title></head>
<body>
<table>
\t<caption>Rows</caption>
\t<colgroup><col><col span="2" class="numeric"><col></colgroup>
\t<thead><tr><th scope="col">Name</th><th scope="col">A</th><th scope="col">B</th><th scope="col">Link</th></tr></thead>
${body}\t<tfoot><tr><td colspan="4">${rows} rows</td></tr></tfoot>
</table>
</body>
</html>`;
};

// Every shape §13.2 has a recovery rule for: implied end tags, formatting
// elements reopened across a block, and text a table fosters out of itself.
const TAG_SOUP = `<!DOCTYPE html>
<html>
<head><title>Soup</title>
<body>
<p>One
<p>Two<b>bold<i>both</b>italic</i>
<ul>
<li>first
<li>second<div>block inside a list item
<li>third
</ul>
<table>fostered text<tr><td>cell<td>next
<tr><th>head
</table>
<div><span>unclosed
</div>
</p></span>
<form><form><input name=a><button>go
<select><option>a<option>b</select>
<a href="/x"><a href="/y">nested anchors</a>
<font size=3><p>font across a paragraph</font>
</body>`;

// A page as a component library ships it: templates that are not rendered,
// a declarative shadow root, and elements the parser knows nothing about.
const WEB_COMPONENTS = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Elements</title></head>
<body>
<my-app theme="dark">
\t<template shadowrootmode="open">
\t\t<style>:host{display:block}::slotted(p){margin:0}</style>
\t\t<slot name="header"></slot>
\t\t<slot></slot>
\t</template>
\t<h1 slot="header">Title</h1>
\t<p>Light DOM child</p>
</my-app>
<template id="row">
\t<tr><td><slot name="cell"></slot></td></tr>
</template>
<ul is="sortable-list" data-sort="asc">
\t<li><x-item value="1">One</x-item></li>
\t<li><x-item value="2">Two</x-item></li>
</ul>
<script type="module">customElements.define("x-item", class extends HTMLElement {});</script>
</body>
</html>`;

/**
 * @param {string} sprite an SVG document
 * @returns {string} it inlined into a page, as an icon sprite is used
 */
const spritePage = (sprite) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Icons</title></head>
<body>
<div hidden>
${sprite}
</div>
<p><svg width="16" height="16" aria-hidden="true"><use href="#user"></use></svg> Inline reference</p>
<math><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>
</body>
</html>`;

/**
 * Two kinds of real HTML: an app shell (attribute- and `<meta>`-heavy, little
 * text) and a document (mostly text, with the `<pre>` blocks whose whitespace no
 * minifier may touch). The documents are rendered from Markdown by `marked`
 * rather than written here, so they are as messy as a real docs page.
 * @returns {Promise<[string, string][]>} `[label, html]` for every fixture
 */
const fixtures = async () => {
	const { marked } = load("marked");
	/** @type {[string, string][]} */
	const out = [];
	for (const [label, file] of INSTALLED_DOCUMENTS) {
		out.push([
			label,
			await fs.promises.readFile(path.join(MODULES, file), "utf8")
		]);
	}
	out.push(["App shell (inline critical CSS)", APP_SHELL]);
	out.push(["Component library page", componentPage(400)]);
	// Real framework stylesheets inlined whole: whether a tool minifies, passes
	// through or mangles a large `<style>` is what decides these pages.
	for (const [label, file] of INLINED_STYLESHEETS) {
		out.push([
			label,
			inlineCssPage(
				label,
				await fs.promises.readFile(path.join(MODULES, file), "utf8")
			)
		]);
	}
	for (const [label, file] of [
		["webpack README (rendered)", path.join(ROOT, "README.md")],
		["webpack AGENTS (rendered)", path.join(ROOT, "AGENTS.md")],
		["webpack CHANGELOG (rendered)", path.join(ROOT, "CHANGELOG.md")]
	]) {
		out.push([label, marked.parse(await fs.promises.readFile(file, "utf8"))]);
	}
	out.push(["Table report (600 rows)", tablePage(600)]);
	out.push(["Tag soup", TAG_SOUP]);
	out.push(["Web components", WEB_COMPONENTS]);
	out.push([
		"Icon sprite (inlined SVG)",
		spritePage(
			await fs.promises.readFile(
				path.join(MODULES, "@fortawesome/fontawesome-free/sprites/solid.svg"),
				"utf8"
			)
		)
	]);
	return out;
};
// Each entry builds its callable on demand, so the measuring worker loads only
// the one tool it measures — anything else would land in that tool's peak RSS.
/** @type {import("./compare-tools-harness").Tool[]} */
const TOOLS = [
	{
		// `process` with no mode walks the whole document and prints nothing,
		// which is exactly the parse stage.
		name: "webpack",
		stage: "parse",
		create: () => (html) => new SourceProcessor().process(html)
	},
	{
		name: "parse5",
		stage: "parse",
		create: () => {
			const parse5 = load("parse5");
			return (html) => parse5.parse(html);
		}
	},
	{
		name: "htmlparser2",
		stage: "parse",
		create: () => {
			const htmlparser2 = load("htmlparser2");
			return (html) => htmlparser2.parseDocument(html);
		}
	},
	{
		name: "node-html-parser",
		stage: "parse",
		create: () => {
			const nodeHtmlParser = load("node-html-parser");
			return (html) => nodeHtmlParser.parse(html);
		}
	},
	{
		name: "linkedom",
		stage: "parse",
		create: () => {
			const { parseHTML } = load("linkedom");
			return (html) => parseHTML(html);
		}
	},
	{
		// Angular's parser ships no serializer, so it is measured parsing only.
		name: "angular-html-parser",
		stage: "parse",
		create: () => {
			const angular = load("angular-html-parser");
			return (html) => angular.parse(html);
		}
	},
	{
		name: "webpack",
		stage: "beautify",
		create: () => (html) =>
			new SourceProcessor().process(html, { mode: "beautify" }).code
	},
	{
		// parse5 re-serializes what it parsed without reformatting, which is the
		// round-trip floor the other printers are read against.
		name: "parse5",
		stage: "beautify",
		create: () => {
			const parse5 = load("parse5");
			return (html) => parse5.serialize(parse5.parse(html));
		}
	},
	{
		name: "htmlparser2",
		stage: "beautify",
		create: () => {
			const htmlparser2 = load("htmlparser2");
			const serializer = load("dom-serializer");
			const render = serializer.default || serializer;
			return (html) => render(htmlparser2.parseDocument(html));
		}
	},
	{
		name: "node-html-parser",
		stage: "beautify",
		create: () => {
			const nodeHtmlParser = load("node-html-parser");
			return (html) => nodeHtmlParser.parse(html).toString();
		}
	},
	{
		name: "linkedom",
		stage: "beautify",
		create: () => {
			const { parseHTML } = load("linkedom");
			return (html) => parseHTML(html).document.toString();
		}
	},
	{
		name: "prettier",
		stage: "beautify",
		create: () => {
			const prettier = load("prettier");
			return (html) => prettier.format(html, { parser: "html" });
		}
	},
	{
		name: "js-beautify",
		stage: "beautify",
		create: () => {
			const beautify = load("js-beautify");
			return (html) => beautify.html(html);
		}
	},
	{
		name: "webpack",
		stage: "minify",
		create: () => async (html) =>
			(await htmlMinify({ "input.html": html })).code
	},
	{
		name: "webpack (aggressive)",
		stage: "minify",
		create: () => async (html) =>
			(
				await htmlMinify({ "input.html": html }, undefined, {
					collapseWhitespace: "all",
					mergeStyles: true,
					minifyConditionalComments: true,
					removeEmptyAttributes: true,
					removeEmptyElements: true,
					removeRedundantAttributes: "all",
					sortAttributes: true,
					sortTokenLists: true,
					removeImpliedTags: true
				})
			).code
	},
	{
		name: "html-minifier-next",
		stage: "minify",
		create: () => {
			// ESM only, so the entry its own manifest names is imported by URL —
			// a bare specifier would resolve against this file, not the cache.
			const manifest = load("html-minifier-next/package.json");
			const loading = import(
				pathToFileURL(
					path.join(MODULES, "html-minifier-next", manifest.exports["."].import)
				).href
			);
			return async (html) => (await loading).minify(html, {});
		}
	},
	{
		name: "html-minifier-next (aggressive)",
		stage: "minify",
		create: () => {
			const manifest = load("html-minifier-next/package.json");
			const loading = import(
				pathToFileURL(
					path.join(MODULES, "html-minifier-next", manifest.exports["."].import)
				).href
			);
			// html-minifier-terser's options plus the four this fork adds that leave
			// the page alone; `removeUnusedCSS` and `minifySVG` change what renders.
			return async (html) =>
				(await loading).minify(html, {
					collapseAttributeWhitespace: true,
					collapseBooleanAttributes: true,
					collapseWhitespace: true,
					decodeEntities: true,
					mergeScripts: true,
					minifyCSS: true,
					minifyJS: true,
					removeAttributeQuotes: true,
					removeComments: true,
					removeDefaultTypeAttributes: true,
					removeEmptyAttributes: true,
					removeOptionalTags: true,
					removeRedundantAttributes: true,
					sortAttributes: true,
					sortClassNames: true,
					useShortDoctype: true
				});
		}
	},
	{
		name: "html-minifier-terser",
		stage: "minify",
		create: () => {
			const terser = load("html-minifier-terser");
			return (html) => terser.minify(html, {});
		}
	},
	{
		name: "html-minifier-terser (aggressive)",
		stage: "minify",
		create: () => {
			const terser = load("html-minifier-terser");
			return (html) =>
				terser.minify(html, {
					collapseBooleanAttributes: true,
					collapseWhitespace: true,
					decodeEntities: true,
					minifyCSS: true,
					minifyJS: true,
					removeAttributeQuotes: true,
					removeComments: true,
					removeEmptyAttributes: true,
					removeOptionalTags: true,
					removeRedundantAttributes: true,
					sortAttributes: true,
					sortClassName: true,
					useShortDoctype: true
				});
		}
	},
	{
		name: "minify-html",
		stage: "minify",
		create: () => {
			const minifyHtml = load("@minify-html/node");
			return (html) => minifyHtml.minify(Buffer.from(html), {}).toString();
		}
	},
	{
		name: "minify-html (aggressive)",
		stage: "minify",
		create: () => {
			const minifyHtml = load("@minify-html/node");
			return (html) =>
				minifyHtml
					.minify(Buffer.from(html), {
						// minify-html names its options in snake case.
						/* eslint-disable camelcase */
						minify_css: true,
						minify_js: true,
						remove_bangs: true,
						remove_processing_instructions: true
						/* eslint-enable camelcase */
					})
					.toString();
		}
	},
	{
		name: "htmlnano",
		stage: "minify",
		create: () => {
			const htmlnano = load("htmlnano");
			return async (html) =>
				(await htmlnano.process(html, {}, htmlnano.presets.safe)).html;
		}
	},
	{
		name: "htmlnano (aggressive)",
		stage: "minify",
		create: () => {
			const htmlnano = load("htmlnano");
			return async (html) =>
				(await htmlnano.process(html, {}, htmlnano.presets.max)).html;
		}
	},
	{
		name: "@swc/html",
		stage: "minify",
		create: () => {
			const swc = load("@swc/html");
			return async (html) => (await swc.minify(Buffer.from(html), {})).code;
		}
	},
	{
		name: "@swc/html (aggressive)",
		stage: "minify",
		create: () => {
			const swc = load("@swc/html");
			return async (html) =>
				(
					await swc.minify(Buffer.from(html), {
						collapseWhitespaces: "all",
						minifyCss: true,
						minifyJs: true,
						normalizeAttributes: true,
						quotes: false,
						removeComments: true,
						removeEmptyAttributes: true,
						removeEmptyMetadataElements: true,
						removeRedundantAttributes: "all",
						sortAttributes: true,
						sortSpaceSeparatedAttributeValues: true,
						tagOmission: true
					})
				).code;
		}
	}
];

// Text these elements hold is data, not markup whitespace, so a minifier that
// reflows it changes the rendered page.
const VERBATIM_TEXT = new Set(["pre", "textarea", "script", "style"]);

/**
 * A `<style>` body is CSS, not bytes: several of these minifiers rewrite it, so
 * comparing it verbatim would report every one of them as losing text. It is
 * canonicalized through webpack's CSS minifier instead, which compares what the
 * sheet means. That leaves a CSS-level mistake to webpack's own CSS suites —
 * this tool is checking the HTML around it.
 *
 * To a fixed point: one pass is not idempotent, so canonicalizing an authored
 * sheet and an already-minified one once lands them on different spellings.
 * @param {string} css a `<style>` body
 * @returns {string} its canonical form
 */
const canonicalCss = (css) => {
	try {
		const { SourceProcessor } = require("../lib/css/syntax");

		const processor = new SourceProcessor();
		let out = css;
		for (let i = 0; i < 3; i++) {
			const next = processor.process(out, { mode: "minify" }).code;
			if (next === out) break;
			out = next;
		}
		return out;
	} catch (_err) {
		return css;
	}
};

// Stands for a run of whitespace nothing else records. Not a string: every
// control character survives parsing, so a string marker could be real text.
const WHITESPACE_RUN = null;

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
	/** @type {(string | null)[]} */
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
			if (value.length !== 0) {
				text.push(value);
				return;
			}
			// A whitespace-only node between two inline boxes renders as a space, so
			// losing it differs — but nothing under `<head>` / `<html>` renders it.
			if (!verbatim && parent !== "head" && parent !== "html") {
				text.push(WHITESPACE_RUN);
			}
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
	// Adjacent runs fold into one, so a dropped comment between two whitespace
	// nodes reads as the single run both sides really have.
	return {
		elements,
		attributes,
		empty,
		text: text
			.filter(
				(part, i) => part !== WHITESPACE_RUN || text[i - 1] !== WHITESPACE_RUN
			)
			.join(" ")
	};
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

const wantedFixture = filterFrom("FIXTURE");
const wantedTool = filterFrom("TOOL");
const wantedStage = filterFrom("STAGE");

const main = async () => {
	await setup();
	const parse5 = /** @type {Parse5} */ (load("parse5"));
	for (const [label, html] of (await fixtures()).filter(([name]) =>
		wantedFixture(name)
	)) {
		const before = fingerprint(parse5, html);
		const input = await compress(Buffer.from(html));
		process.stdout.write(
			`\n${label} — ${kb(input.raw)} (${kb(input.gzip)} gzip, ${kb(
				input.brotli
			)} brotli, ${kb(input.zstd)} zstd), ${before.elements.size} tags\n`
		);
		for (const stage of STAGES.filter(wantedStage)) {
			const tools = TOOLS.filter(
				(tool) => tool.stage === stage && wantedTool(tool.name)
			);
			if (tools.length === 0) continue;
			// `saved` reads off gzip — what a user downloads — with raw the tiebreak.
			process.stdout.write(
				stage === "parse"
					? `  ${"parse".padEnd(34)}${"ms".padStart(8)}${"cpu".padStart(
							7
						)}${"peak".padStart(9)}\n`
					: `  ${stage.padEnd(34)}${"out".padStart(10)}${"gzip".padStart(
							9
						)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
							9
						)}${"ms".padStart(7)}${"cpu".padStart(6)}${"peak".padStart(
							8
						)}   differs\n`
			);
			for (const tool of tools) {
				const result = await measureInWorker(
					__filename,
					stage,
					tool.name,
					html
				);
				if ("error" in result) {
					// A tool rejecting the document outright is a comparison result too.
					process.stdout.write(
						`  ${tool.name.padEnd(34)} rejects it: ${result.error}\n`
					);
					continue;
				}
				const cost = formatCost(result, tool.external);
				if (stage === "parse") {
					process.stdout.write(
						`  ${
							tool.name.padEnd(34) +
							cost.wall.padStart(8) +
							cost.cpu.padStart(7) +
							cost.peak.padStart(9)
						}\n`
					);
					continue;
				}
				const code = /** @type {string} */ (result.code);
				const after = fingerprint(parse5, code);
				const notes = [
					...missing(before.elements, after.elements, before.empty).map(
						(entry) => `<${entry}`
					),
					...missing(before.attributes, after.attributes, before.empty)
				];
				if (before.text !== after.text) notes.push("text");
				const out = await compress(Buffer.from(code));
				process.stdout.write(
					`  ${
						tool.name.padEnd(34) +
						kb(out.raw).padStart(10) +
						kb(out.gzip).padStart(9) +
						`${(100 - (out.gzip / input.gzip) * 100).toFixed(1)}%`.padStart(8) +
						kb(out.brotli).padStart(9) +
						kb(out.zstd).padStart(9) +
						cost.wall.padStart(7) +
						cost.cpu.padStart(6) +
						cost.peak.padStart(8)
					}   ${notes.length === 0 ? "-" : notes.slice(0, 4).join(", ")}\n`
				);
			}
		}
	}
};

// Only as the entry point, so a test can read the corpus below without running
// the comparison.
if (require.main === module) {
	// `--setup` installs the fixtures and builds nothing else, so a consumer
	// that only reads them does not run the comparison to get them.
	const mode = process.argv[2];
	const started =
		mode === "--measure"
			? measure(TOOLS)
			: mode === "--setup"
				? setup()
				: main();
	started.catch((error) => {
		log(String(error && error.stack ? error.stack : error));
		process.exitCode = 1;
	});
}

// The documents the cache holds, and the page a reader builds the rest from.
module.exports = {
	APP_SHELL,
	CACHE,
	INLINED_STYLESHEETS,
	INSTALLED_DOCUMENTS,
	inlineCssPage
};
