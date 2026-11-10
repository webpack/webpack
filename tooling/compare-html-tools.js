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

// The run opens with the invariants webpack's own printer owes its output,
// which need no install; `--invariants` prints that section and stops.

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
	Field,
	NodeType,
	Part,
	_namespaceOf
} = require("../lib/html/syntax-parser");
const {
	AGGRESSIVE_OPTIONS,
	DEFAULT_OPTIONS,
	EMBEDDED_LEGACY_OPTIONS,
	EMBEDDED_OPTIONS,
	HTML_CUTS,
	PRESETS,
	htmlPurityDigest,
	htmlSlices,
	htmlSpans,
	idempotenceRepro,
	printerFor,
	sweepRespellings,
	tokenStream
} = require("../test/helpers/syntaxInvariants/html");
const {
	STAGES,
	TreeEvents,
	agreement,
	agreementInvariant,
	collectFiles,
	compress,
	cutsAt,
	filterFrom,
	findingGroups,
	formatCost,
	formatProfile,
	formatSecond,
	idempotence,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker,
	missingReport,
	oneLine,
	purityRelation,
	sweepExitCode,
	sweepMode,
	wantedExpectations
} = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "html-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);

const setup = () => installPackages(CACHE_NAME);
/**
 * The parse5 node shape this walk reads. parse5 ships its own types, but it is
 * installed outside the repo (see `setup`), so tsc cannot resolve them.
 * @typedef {object} Parse5Node
 * @property {string} nodeName
 * @property {string=} tagName
 * @property {string=} namespaceURI an element's namespace
 * @property {string=} value text, on a `#text` node
 * @property {string=} data a comment's text
 * @property {string=} name a doctype's name
 * @property {string=} publicId a doctype's public identifier, empty where it has none
 * @property {string=} systemId a doctype's system identifier, empty where it has none
 * @property {{ name: string, value: string, prefix?: string }[]=} attrs
 * @property {Parse5Node[]=} childNodes
 * @property {Parse5Node=} content a `<template>`'s document fragment
 * @property {{ startOffset: number, endOffset: number }=} sourceCodeLocation where it was written, when asked for
 */
/** @typedef {{ parse: (html: string, options?: { sourceCodeLocationInfo: boolean, scriptingEnabled: boolean }) => Parse5Node }} Parse5 */
/** @typedef {import("../lib/html/syntax-parser").HtmlPath} HtmlPath */

// An app shell, whose weight is inline critical CSS and form markup: without
// it no fixture carries a `<style>`, a `srcset` or a boolean attribute.
// The documents the comparison installs rather than builds.
/** @type {[string, string][]} */
const INSTALLED_DOCUMENTS = [
	["HTML5 Boilerplate 9", "html5-boilerplate/dist/index.html"],
	["Swagger UI 5", "swagger-ui-dist/index.html"]
];

// Where the icon sprite lands in the cache: a real shipped SVG, which is the
// only inline `<svg>` any document here carries.
const SPRITE_WITHIN = "@fortawesome/fontawesome-free/sprites/solid.svg";

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

// A `noscript` wherever the two scripting modes read it apart: in the head and
// the body, around markup and references, in a table and a select, and one the
// input ends inside.
const NOSCRIPT = `<!DOCTYPE html>
<html>
<head>
<title>Noscript</title>
<noscript><link rel="stylesheet" href="no-js.css"><style>.js{display:none}</style></noscript>
<noscript><p>flow content in the head</p></noscript>
</head>
<body>
<noscript><img src="pixel.gif" alt="tracking &amp; more"></noscript>
<p>before<noscript>inline <b>bold</b> &lt;escaped&gt;</noscript >after</p>
<table><tr><td>cell</td></tr><noscript>in a table</noscript></table>
<select><noscript><option>one</option></noscript></select>
<noscript>left open <!-- a comment --> </nos
`;

// One `noscript` opening another, which a reader with scripting off nests and
// closes at the end tag the scripting-on tree ignores: printed as written.
const NESTED_NOSCRIPT = `<!DOCTYPE html>
<title>Nested noscript</title>
<p>before</p>
<noscript><noscript>nested</noscript>tail</noscript>
<p>after</p>
`;

// A doctype decides quirks mode (§13.2.6.4.1), which shows in the tree: there a
// `<table>` stays inside the `<p>` before it, where elsewhere it closes the `<p>`.
const DOCTYPE_DECLARATIONS = [
	"<!DOCTYPE html>",
	'<!DOCTYPE html SYSTEM "about:legacy-compat">',
	'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">',
	'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "">',
	'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
	'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">',
	"<!DOCTYPE html PUBLIC 'HTML'>",
	'<!DOCTYPE html SYSTEM "HTTP://WWW.IBM.COM/data/dtd/v11/ibmxhtml1-transitional.dtd">',
	"<!DOCTYPE htm>",
	"<!DOCTYPE>"
];

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

// cspell:ignore popovertarget popovertargetaction contenteditable exportparts
// cspell:ignore autocapitalize referrerpolicy accesskey writingsuggestions

// What the corpus barely reaches: every element and attribute here is in two of
// its documents or fewer, and fourteen of them in none. Its `<style>` is the
// only one carrying CSS a target has to be lowered for.
const COLD_CONSTRUCTS = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Cold constructs</title>
<style>.a{color:red;.b{color:blue}}.c{color:light-dark(#fff,#000)}@layer x{.d{top:0}}@layer x{.e{top:0}}.f{text-decoration:underline;text-decoration:underline dotted}.g{inset:1px 2px}.h{>.i{top:0}}</style>
</head>
<body>
<search><form><fieldset><legend>Legend</legend>
	<label>Number <input name=n inputmode=numeric enterkeyhint=done autocapitalize=none spellcheck=false writingsuggestions=false list=opts></label>
	<datalist id=opts><option value=a><option value=b></datalist>
	<select><optgroup label=g><option>x</option></optgroup></select>
	<output name=o for=n>0</output>
	<progress value=1 max=2></progress><meter value=1 min=0 max=2></meter>
</fieldset></form></search>
<hgroup><h1>Title</h1><p>Subhead</p></hgroup>
<menu><li><button popovertarget=p popovertargetaction=toggle>open</button></li></menu>
<div id=p popover=auto>popped</div>
<dialog open><p>dialog</p></dialog>
<details open><summary>Summary</summary><p>body</p></details>
<picture><source srcset="a.avif" type="image/avif"><img src=a.png alt="" loading=lazy decoding=async fetchpriority=low referrerpolicy=no-referrer></picture>
<p><bdi>\u05E2\u05D1\u05E8\u05D9\u05EA</bdi> <bdo dir=rtl>rtl</bdo> long<wbr>word <ruby>\u6F22<rt>kan</rt></ruby></p>
<p draggable=true translate=no accesskey=k contenteditable=true inert>attributes</p>
<table><caption>Caption</caption><colgroup><col span=2></colgroup><thead><tr><th>a<th>b<tbody><tr><td>1<td>2<tfoot><tr><td>3<td>4</table>
<noscript><p>no script</p></noscript>
<template id=t><slot name=s></slot></template>
<span is=my-el slot=s part=label exportparts="label: outer">slotted</span>
<script nomodule type="application/ld+json">{ "a" : 1 }</script>
<script type="importmap">{ "imports" : { "a" : "./a.js" } }</script>
<script type="speculationrules">{ "prerender" : [ { "where" : { "href_matches" : "/x" } } ] }</script>
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
	out.push(["Noscript", NOSCRIPT]);
	out.push(["Nested noscript", NESTED_NOSCRIPT]);
	out.push(["Tag soup", TAG_SOUP]);
	out.push(["Web components", WEB_COMPONENTS]);
	out.push([
		"Icon sprite (inlined SVG)",
		spritePage(
			await fs.promises.readFile(path.join(MODULES, SPRITE_WITHIN), "utf8")
		)
	]);
	return out;
};
/** @typedef {import("../lib/html/syntax-printer").HtmlPrintOptions} HtmlPrintOptions */

/** @typedef {import("../lib/html/builtinEmbeddedRenderer").BuiltinEmbeddedRendererOptions} CssOptions */

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
			(await htmlMinify({ "input.html": html }, undefined, DEFAULT_OPTIONS))
				.code
	},
	{
		name: "webpack (aggressive)",
		stage: "minify",
		// `minifyConditionalComments` is the minimizer's, not the printer's, so
		// it stands here rather than in the options the invariants are held over.
		create: () => async (html) =>
			(
				await htmlMinify({ "input.html": html }, undefined, {
					...AGGRESSIVE_OPTIONS,
					minifyConditionalComments: true
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
 * @param {CssOptions=} options the CSS minifier's options, a target among them
 * @returns {string} its canonical form
 */
const canonicalCss = (css, options = {}) => {
	try {
		const { SourceProcessor } = require("../lib/css/syntax");

		const processor = new SourceProcessor();
		let out = css;
		for (let i = 0; i < 3; i++) {
			const next = processor.process(out, { ...options, mode: "minify" }).code;
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

// --- Parser agreement -------------------------------------------------------

// parse5 builds the tree §13.2 specifies, so it is the reference webpack's
// parser is held to. The other parsers build trees of their own.
const REFERENCE_PARSER = "parse5";

/** @type {Record<string, string>} */
const PARSE5_NAMESPACES = {
	"http://www.w3.org/1999/xhtml": "html",
	"http://www.w3.org/1998/Math/MathML": "math",
	"http://www.w3.org/2000/svg": "svg"
};

// webpack's namespace bits, in the order `_namespaceOf` numbers them.
const NAMESPACE_NAMES = ["html", "math", "svg", "xml"];

/**
 * @param {string} namespace the element's namespace
 * @param {string} name its name
 * @param {[string, string][]} attributes its attributes, in order
 * @returns {string} what its start tag says, as both readers write it
 */
const startOf = (namespace, name, attributes) =>
	`<${namespace}:${name}${attributes
		.map(([key, value]) => ` ${key}=${JSON.stringify(value)}`)
		.join("")}>`;

/**
 * Whether webpack's processing instruction rules drop the bogus comment `<?…`
 * the input ran out in: cut inside its target, or cut before its `>` with a
 * target other than `xml` or `xml-stylesheet`, which stay comments.
 * @param {string} data the source from the comment's `?` to the end of input
 * @returns {boolean} true where webpack's tree holds no node for it
 */
const droppedAtEnd = (data) => {
	const target = /^\?([A-Za-z_][\w-]*)?([^]?)/.exec(data);
	const name = /** @type {RegExpExecArray} */ (target)[1];
	const after = /** @type {RegExpExecArray} */ (target)[2];
	if (data === "?" || (name !== undefined && after === "")) return true;
	if (name === undefined || !/[\t\n\f\r ?]/.test(after)) return false;
	return !/^xml(?:-stylesheet)?$/i.test(name);
};

/**
 * @param {string} name a doctype's name
 * @param {string} publicId its public identifier, empty where it has none
 * @param {string} systemId its system identifier, empty where it has none
 * @returns {string} the doctype as both trees read it
 */
const doctypeOf = (name, publicId, systemId) =>
	`doctype ${name} ${JSON.stringify(publicId)} ${JSON.stringify(systemId)}`;

/**
 * parse5's tree, as the agreement column reads it. A bogus comment `<?…` the
 * input ran out in is left out where webpack's processing instruction rules
 * drop it, as they are the tree webpack is held to.
 * @param {string} html a document
 * @param {boolean=} scripting whether to parse with scripting on, a `noscript` then holding text
 * @returns {TreeEvents} what it says
 */
const parse5Tree = (html, scripting = false) => {
	const parse5 = /** @type {Parse5} */ (load("parse5"));
	const events = new TreeEvents();
	// Decoding strips a byte order mark before tree construction sees the text;
	// parse5 is handed text, so it would otherwise read one as content.
	const source = html.replace(/^\uFEFF/, "");
	/**
	 * @param {Parse5Node} node a parse5 node
	 */
	const walk = (node) => {
		for (const child of /** @type {Parse5Node[]} */ (node.childNodes)) {
			if (child.nodeName === "#text") {
				events.text(/** @type {string} */ (child.value));
			} else if (child.nodeName === "#comment") {
				const at = child.sourceCodeLocation;
				// parse5 ends a token the input ran out in one past its end, and a
				// closed one at its `>`.
				if (
					at !== undefined &&
					at.endOffset > source.length &&
					source.charCodeAt(at.startOffset + 1) === 0x3f &&
					droppedAtEnd(source.slice(at.startOffset + 1))
				) {
					continue;
				}
				events.leaf(`comment ${JSON.stringify(child.data)}`);
			} else if (child.nodeName === "#documentType") {
				events.leaf(
					doctypeOf(
						/** @type {string} */ (child.name),
						/** @type {string} */ (child.publicId),
						/** @type {string} */ (child.systemId)
					)
				);
			} else {
				const name = /** @type {string} */ (child.tagName);
				events.open(
					name,
					startOf(
						PARSE5_NAMESPACES[/** @type {string} */ (child.namespaceURI)],
						name,
						/** @type {NonNullable<Parse5Node["attrs"]>} */ (child.attrs).map(
							(attribute) => [
								attribute.prefix
									? `${attribute.prefix}:${attribute.name}`
									: attribute.name,
								attribute.value
							]
						)
					)
				);
				walk(child);
				if (child.content !== undefined) {
					events.leaf("#document-fragment");
					walk(child.content);
				}
				events.close(`</${name}>`);
			}
		}
	};
	walk(
		parse5.parse(source, {
			sourceCodeLocationInfo: true,
			scriptingEnabled: scripting
		})
	);
	return events;
};

/**
 * webpack's tree, as the agreement column reads it. A processing instruction is
 * the bogus comment the tokenizer reads `<?…>` as, which webpack tells apart.
 * @param {string} html a document
 * @param {boolean=} scripting whether to parse with scripting on, as the printer does
 * @returns {TreeEvents} what it says
 */
const webpackTree = (html, scripting = false) => {
	const events = new TreeEvents();
	/** @type {Record<number, { enter: (nodePath: HtmlPath) => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {
		[NodeType.Element]: {
			enter: (nodePath) => {
				/** @type {[string, string][]} */
				const attributes = [];
				const count = nodePath.fieldCount(Field.attributes);
				for (let index = 0; index < count; index++) {
					const attribute = nodePath.field(index, Field.attributes);
					attributes.push([
						nodePath.name(attribute),
						nodePath.value(attribute)
					]);
				}
				events.open(
					nodePath.name(),
					startOf(
						NAMESPACE_NAMES[_namespaceOf(nodePath.node)],
						nodePath.name(),
						attributes
					)
				);
			},
			exit: (nodePath) => {
				events.close(`</${nodePath.name()}>`);
			}
		},
		[NodeType.DocumentFragment]: {
			enter: () => {
				events.leaf("#document-fragment");
			},
			exit: () => {}
		},
		[NodeType.Text]: {
			enter: (nodePath) => {
				events.text(nodePath.value());
			},
			exit: () => {}
		},
		[NodeType.Comment]: {
			enter: (nodePath) => {
				events.leaf(`comment ${JSON.stringify(nodePath.value())}`);
			},
			exit: () => {}
		},
		[NodeType.ProcessingInstruction]: {
			enter: (nodePath) => {
				events.leaf(
					`comment ${JSON.stringify(
						html.slice(nodePath.start() + 1, nodePath.end() - 1)
					)}`
				);
			},
			exit: () => {}
		},
		[NodeType.Doctype]: {
			enter: (nodePath) => {
				// The DOM reads an identifier the doctype left out as empty.
				events.leaf(
					doctypeOf(
						nodePath.name(),
						nodePath.textOf(Part.publicId) || "",
						nodePath.textOf(Part.systemId) || ""
					)
				);
			},
			exit: () => {}
		}
	};
	// A walk hands its options to `parseHtml`, which reads `scripting`.
	/** @type {import("../lib/html/syntax-parser").HtmlParseOptions} */
	const options = { scripting };
	new SourceProcessor()
		.use(visitors)
		.process(
			html,
			/** @type {import("../lib/html/syntax-printer").HtmlProcessOptions} */ (
				options
			)
		);
	return events;
};

/** @type {Map<string, import("./compare-tools-harness").TreeReader>} */
const TREE_READERS = new Map([
	["webpack", webpackTree],
	[REFERENCE_PARSER, parse5Tree]
]);

/**
 * What a document says, read by webpack's own parser: the words of its text and
 * each `<style>` sheet in its canonical CSS form, plus, where `tree` is set, every
 * element with its namespace and attribute names, in order. Attribute values,
 * whitespace, comments and `<script>` bodies are left out, as the printer and its
 * renderers respell those by contract (`type=IMAGE` → `image`, a `srcset`'s spaces).
 * @param {string} html a document
 * @param {boolean} tree whether the element tree is read too
 * @param {CssOptions} cssOptions the options the sheets are minified with
 * @returns {{ said: string[], sheets: string[] }} what it says, and each non-empty sheet
 */
const htmlMeaning = (html, tree, cssOptions) => {
	/** @type {string[]} */
	const said = [];
	/** @type {string[]} */
	const sheets = [];
	/** @type {string[]} */
	const open = [];
	/** @type {Record<number, { enter: (nodePath: EXPECTED_ANY) => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {
		[NodeType.Element]: {
			enter: (nodePath) => {
				open.push(nodePath.name());
				if (!tree) return;
				/** @type {string[]} */
				const names = [];
				const count = nodePath.fieldCount(Field.attributes);
				for (let index = 0; index < count; index++) {
					names.push(nodePath.name(nodePath.field(index, Field.attributes)));
				}
				said.push(
					`<${_namespaceOf(nodePath.node)}:${nodePath.name()} ${names
						.sort()
						.join(" ")}>`
				);
			},
			exit: (nodePath) => {
				open.pop();
				if (tree) said.push(`</${nodePath.name()}>`);
			}
		},
		[NodeType.Text]: {
			enter: (nodePath) => {
				const parent = open[open.length - 1];
				if (parent === "script") return;
				const text = nodePath.value();
				if (parent === "style") {
					const css = canonicalCss(text, cssOptions);
					if (css !== "") sheets.push(css);
					return;
				}
				const words = text.replace(/\s+/g, " ").trim();
				if (words !== "") said.push(...words.split(" "));
			},
			exit: () => {}
		}
	};
	new SourceProcessor().use(visitors).process(html, {});
	return { said, sheets };
};

/**
 * Whether the output's sheets say what the source's do, in order. An output
 * sheet may stand for several consecutive source sheets merged into one, and is
 * matched against them joined only then, so an open value can't swallow a sheet.
 * @param {string[]} source the source's canonical sheets
 * @param {string[]} output the output's canonical sheets
 * @param {CssOptions} cssOptions the options the sheets are minified with
 * @returns {boolean} true when every source sheet is accounted for
 */
const sameSheets = (source, output, cssOptions) => {
	let at = 0;
	for (const sheet of output) {
		let joined = "";
		do {
			if (at === source.length) return false;
			joined += source[at++];
		} while (canonicalCss(joined, cssOptions) !== sheet);
	}
	return at === source.length;
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

// --- Invariants -------------------------------------------------------------

// Two relations hold for every document: minifying an already-minified page
// changes nothing, and a value's spelling does not decide what it minifies to.

// A respelling is lexical: a delimiter, a character reference, a name's case.
// Each is checked against the tokenizer, so one that moved the document is dropped.

// Whitespace inside a tag is deliberately not one of them: a tag nothing beats
// is echoed as written, so respelling that would report a decision as a defect.

// `js` is where the test harness writes what a case built, so a sweep that ran
// after a test run would report the same finding twice.

// A web-platform-tests checkout, which the html5lib job alone fetches: its
// thousands of documents are a corpus of their own rather than a default run.
const SKIPPED_FIXTURE_DIRS = new Set(["js", "node_modules", "wpt"]);

// The inputs the unit tests read, one directory each: `html/invariants.unittest.js`
// holds every one of them to these relations, with its own known differences.
const UNIT_INPUT_RE = /^test\/fixtures\/html\/[^/]+\/index\.html$/;

const wantedRelation = filterFrom("RELATION");
const wantedPreset = filterFrom("PRESET");

/**
 * Every invariant this document breaks under one preset.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html the document
 * @param {HtmlPrintOptions} options the preset's printer options
 * @param {CssOptions} cssOptions the preset's CSS options
 * @returns {import("../test/helpers/syntaxInvariants/relations").Report[]} what moved, and the smallest repro found for each
 */
const sweepDocument = (minify, html, options, cssOptions) => {
	const { printed, reports } = wantedRelation("idempotence")
		? idempotence({
				minify,
				source: html,
				says: tokenStream,
				repro: (minified, at) => idempotenceRepro(minify, minified, at)
			})
		: { printed: minify(html), reports: [] };
	if (printed === null) return reports;
	reports.push(...sweepRespellings(minify, html, printed));
	if (wantedRelation("meaning")) {
		// The tree is held only where no option removes elements or attributes,
		// which every other preset's options name.
		const tree =
			!options.removeEmptyElements &&
			!options.removeEmptyAttributes &&
			!options.removeRedundantAttributes &&
			!options.mergeStyles;
		const before = htmlMeaning(html, tree, cssOptions);
		const after = htmlMeaning(printed, tree, cssOptions);
		let at = 0;
		while (at < before.said.length && before.said[at] === after.said[at]) at++;
		if (at < before.said.length || at < after.said.length) {
			reports.push({
				relation: "meaning",
				what: "the minified document says something else",
				repro: `    ${oneLine(
					before.said.slice(at, at + 4).join(" "),
					76
				)}  ->  ${oneLine(after.said.slice(at, at + 4).join(" "), 76)}`
			});
		} else if (!sameSheets(before.sheets, after.sheets, cssOptions)) {
			reports.push({
				relation: "meaning",
				what: "a minified stylesheet says something else",
				repro: `    ${oneLine(before.sheets.join(" "), 76)}  ->  ${oneLine(
					after.sheets.join(" "),
					76
				)}`
			});
		}
	}
	return reports;
};

/**
 * The documents the invariants are swept over: the repo's own fixtures, which
 * are the shapes the printer exists for, plus whatever the comparison installed.
 * @returns {[string, string][]} `[label, html]` for every document
 */
// What the last sweep did not find, read by the report and by the gate.
/** @type {string[]} */
let _missingFixtures = [];

const invariantFixtures = () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const file of collectFiles(
		path.join(ROOT, "test"),
		".html",
		SKIPPED_FIXTURE_DIRS
	)) {
		const label = path.relative(ROOT, file).replace(/\\/g, "/");
		if (UNIT_INPUT_RE.test(label)) continue;
		out.push([label, fs.readFileSync(file, "utf8")]);
	}
	out.push(["App shell (inline critical CSS)", APP_SHELL]);
	// The shapes the comparison builds rather than installs, at a size the
	// bisection can still cut down: what they carry is the shape, not the bulk.
	out.push(["Component library page", componentPage(8)]);
	out.push(["Table report", tablePage(10)]);
	out.push(["Noscript", NOSCRIPT]);
	out.push(["Nested noscript", NESTED_NOSCRIPT]);
	out.push(["Tag soup", TAG_SOUP]);
	out.push(["Web components", WEB_COMPONENTS]);
	out.push(["cold constructs", COLD_CONSTRUCTS]);
	for (const doctype of DOCTYPE_DECLARATIONS) {
		out.push([
			`Doctype ${doctype}`,
			`${doctype}<title>t</title><p><table><tr><td>x</table>`
		]);
	}
	/** @type {string[]} */
	const missing = [];
	for (const [label, file] of INSTALLED_DOCUMENTS) {
		const full = path.join(MODULES, file);
		if (fs.existsSync(full)) out.push([label, fs.readFileSync(full, "utf8")]);
		else missing.push(label);
	}
	for (const [label, file] of INLINED_STYLESHEETS) {
		const full = path.join(MODULES, file);
		if (fs.existsSync(full)) {
			out.push([label, inlineCssPage(label, fs.readFileSync(full, "utf8"))]);
		} else {
			missing.push(label);
		}
	}
	return { corpus: out, missing };
};

const TEMPLATE_DELIMITER_REFERENCES =
	"a template delimiter (`<?`, `<%`) the source spells with character references stays one, as a template engine that reads the page next would run it; spelled literally it is the engine's and stays live";

/**
 * What the sweep reports that the printer owes nothing for. Each entry states
 * the reason, since a divergence with no reason beside it is one nobody can
 * tell from a defect later.
 * @type {readonly import("./compare-tools-harness").Expected[]}
 */
const EXPECTED = [
	{
		relation: "respelling references",
		contains: "<link href=\"&lt;?php echo 'http://foo/' ?>\">",
		source: "test/configCases/html/minimize-attributes/page.html",
		why: TEMPLATE_DELIMITER_REFERENCES
	},
	{
		relation: "agreement",
		contains: '<html:a href="#x">, tool nothing',
		source: [
			"html/declarative-shadow-root/page.html",
			"html/parser-decoded-attribute-values/page.html"
		],
		why: "a declarative shadow root attaches to its host, so the `</a>` after it reconstructs no formatting element around it; parse5 8 predates declarative shadow roots, so the `<a>` lands elsewhere"
	},
	{
		relation: "agreement",
		contains: 'nothing, tool <html:a href="#x">',
		source: [
			"html/declarative-shadow-root/page.html",
			"html/parser-decoded-attribute-values/page.html"
		],
		why: "a declarative shadow root attaches to its host, so the `</a>` after it reconstructs no formatting element around it; parse5 8 predates declarative shadow roots, so the `<a>` lands elsewhere"
	},
	{
		relation: "agreement",
		contains: 'text "\\n\\t\\t\\n\\t\\t", tool text "\\n\\t\\t"',
		source: "html/minimize/page.html",
		why: "a customizable `<select>` keeps its `<button>`; parse5 8 predates customizable selects, so it drops the button and joins the text around it"
	},
	{
		relation: "agreement",
		contains: "select[1]/noscript[1]: parse5 nothing, tool <html:noscript>",
		source: "Noscript",
		why: "a `noscript` in a `select` is read by the in-body rules since customizable selects took the in-select mode out (§13.2.6.4.7); parse5 8 predates them and drops it"
	},
	{
		relation: "agreement",
		contains: "select[1]/noscript[1]: parse5 nothing, tool </noscript>",
		source: "Noscript",
		why: "a `noscript` in a `select` is read by the in-body rules since customizable selects took the in-select mode out (§13.2.6.4.7); parse5 8 predates them and drops it"
	},
	{
		relation: "agreement",
		contains:
			"select[1]/option[1]: parse5 (scripting) <html:option>, tool <html:noscript>",
		source: "Noscript",
		why: "a `noscript` in a `select` is read by the in-body rules since customizable selects took the in-select mode out (§13.2.6.4.7); parse5 8 predates them and drops it"
	},
	{
		relation: "agreement",
		contains: "p[1]: parse5",
		source:
			'Doctype <!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "">',
		why: "a system identifier that is the empty string counts as missing, so this doctype sets quirks mode and the `<table>` stays inside the `<p>` (§13.2.6.4.1); parse5 8 predates that wording and sets limited-quirks mode"
	},
	{
		relation: "respelling quote-double",
		contains: "&#34;",
		source: "style-attribute",
		why: "the value carries both quotes, so one stays a character reference whichever delimiter is picked, and the printer echoes the spelling the source wrote rather than normalizing it — `&#34;` is a byte under `&quot;`, which is the difference reported. Writing `&#34;` everywhere was measured and refused: over the fixtures and wpt's `html/` documents it saves 5 raw bytes and costs 5 gzip, and a re-encoding has to win compressed. No build reads this: `htmlMinify` hands every `style` to the CSS minifier, and that round trip writes `&quot;` for either spelling"
	}
];

/**
 * Sweep mode: hold the printer to its own invariants and report what it breaks.
 * Nothing is installed and nothing is compared to, so this is the cheap half of
 * the script and the one a check can be gated on.
 * @param {(text: string) => void} write receives the report
 * @returns {number} how many distinct findings it named
 */
const invariants = (write) => {
	const built = invariantFixtures();
	// Filtered the same way the corpus is: a run narrowed to one fixture is not
	// short of the ones it was never going to read, and the gate answers for the
	// sweep that happened.
	_missingFixtures = built.missing.filter((label) => wantedFixture(label));
	const corpus = built.corpus.filter(([label]) => wantedFixture(label));
	const presets = PRESETS.filter(([name]) => wantedPreset(name));
	const referenceHeld = agreementInvariant({
		wanted: wantedRelation("agreement"),
		referenceName: REFERENCE_PARSER,
		reference: () => {
			load(REFERENCE_PARSER);
			return parse5Tree;
		},
		tree: webpackTree,
		corpus,
		expected: EXPECTED,
		missing: _missingFixtures
	});
	// The printer reads a document with scripting on, a `noscript` holding text.
	const scriptingHeld = agreementInvariant({
		wanted: wantedRelation("agreement"),
		referenceName: `${REFERENCE_PARSER} (scripting)`,
		reference: () => {
			load(REFERENCE_PARSER);
			return (html) => parse5Tree(html, true);
		},
		tree: (html) => webpackTree(html, true),
		corpus,
		expected: EXPECTED,
		missing: _missingFixtures
	});
	// Filtered like the corpus is: an expectation for a relation, fixture or
	// preset this run was never going to reach matched nothing because nothing
	// asked it to, which is not the divergence having gone away.
	const groups = findingGroups(
		wantedExpectations(
			referenceHeld.expected,
			corpus.map(([label]) => label),
			presets.map(([name]) => name)
		)
	);
	referenceHeld.hold(groups);
	scriptingHeld.hold(groups);
	// Nothing is printed to reach this one, so it is read under no preset: what
	// the parser said about the document it was handed.
	if (wantedRelation("spans")) {
		log(`reading ranges over ${corpus.length} documents …`);
		for (const [label, html] of corpus) {
			for (const report of htmlSpans(html)) groups.add(report, "parse", label);
		}
	}
	if (wantedRelation("slices")) {
		let read = 0;
		let skipped = 0;
		let capped = 0;
		let repeats = 0;
		for (const [label, html] of corpus) {
			const answered = htmlSlices(html);
			read += answered.read;
			skipped += answered.skipped;
			capped += answered.capped;
			repeats += answered.repeats;
			for (const report of answered.reports) groups.add(report, "parse", label);
		}
		log(
			`reparsed ${read} shapes in their own context (${skipped} out of context, ${repeats} repeats, ${capped} past the budget) …`
		);
	}
	if (wantedRelation("purity")) {
		// Under one preset: what is asked is whether reading the same bytes again
		// gives the same answer, which every option set would ask the same way.
		const [, options] = presets[0] || PRESETS[0];
		const print = printerFor(options);
		const { reports, read } = purityRelation(
			corpus.map(([label, html]) => ({
				what: label,
				digest: () => htmlPurityDigest(html, print)
			}))
		);
		for (const report of reports) {
			groups.add(report, "parse", report.repro.trim());
		}
		log(`read ${read} documents twice over …`);
	}
	log(`sweeping ${corpus.length} documents under ${presets.length} presets …`);
	for (const [label, html] of corpus) {
		for (const [preset, options, cssOptions] of presets) {
			for (const report of sweepDocument(
				printerFor(options),
				html,
				options,
				cssOptions
			)) {
				groups.add(report, preset, label);
			}
		}
	}
	if (wantedRelation("idempotence")) {
		let cut = 0;
		for (const [label, html] of corpus) {
			for (const [where, source] of cutsAt(html, HTML_CUTS)) {
				cut++;
				for (const [preset, options] of presets) {
					const minify = printerFor(options);
					const { reports } = idempotence({
						minify,
						source,
						says: tokenStream,
						repro: (minified, at) => idempotenceRepro(minify, minified, at)
					});
					for (const report of reports) {
						groups.add(report, preset, `${label}, cut ${where}`);
					}
				}
			}
		}
		log(`… and ${cut} of them cut short inside a construct …`);
	}
	return groups.write(write);
};

/**
 * The sweep as a section of the comparison's own report, so a run that asks
 * what the output costs is told what it owes as well.
 * @returns {number} how many distinct findings it named
 */
const reportInvariants = () => {
	process.stdout.write("\ninvariants — what the printer owes its own output\n");
	const found = invariants((text) => process.stdout.write(text));
	process.stdout.write(missingReport(_missingFixtures));
	process.stdout.write(`\n${found} finding${found === 1 ? "" : "s"}\n`);
	return found;
};

const main = async () => {
	// Before the install: the relations are webpack's own, so they answer in
	// seconds whether or not there is anything to compare against yet.
	reportInvariants();
	await setup();
	const parse5 = /** @type {Parse5} */ (load("parse5"));
	for (const [label, html] of (await fixtures()).filter(([name]) =>
		wantedFixture(name)
	)) {
		const before = fingerprint(parse5, html);
		const agrees = agreement(REFERENCE_PARSER, TREE_READERS, html);
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
						)}${"peak".padStart(9)}   agrees with ${REFERENCE_PARSER}\n`
					: `  ${stage.padEnd(34)}${"out".padStart(10)}${"gzip".padStart(
							9
						)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
							9
						)}${"ms".padStart(7)}${"cpu".padStart(6)}${"peak".padStart(
							8
						)}${"2nd".padStart(7)}   differs\n`
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
						`  ${tool.name.padEnd(34)} ${
							result.timedOut ? "" : "rejects it: "
						}${result.error}\n`
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
						}   ${await agrees(tool.name)}\n`
					);
					process.stdout.write(formatProfile(result));
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
						cost.peak.padStart(8) +
						formatSecond(result.second).padStart(7)
					}   ${notes.length === 0 ? "-" : notes.slice(0, 4).join(", ")}\n`
				);
				process.stdout.write(formatProfile(result));
			}
		}
	}
};

/**
 * `--invariants`: the relations alone, which need no install.
 * @returns {Promise<void>} resolves once the exit code is set
 */
const reportInvariantsOnly = async () => {
	process.exitCode = sweepExitCode(
		reportInvariants(),
		_missingFixtures,
		process.argv
	);
};

// A lookup rather than a chain of ternaries: each entry point is bound where
// it is named, so reading the dispatch is reading the whole table. `--setup`
// installs the fixtures and stops, without paying for the comparison.
const RUNNERS = new Map(
	/** @type {[string, () => Promise<unknown>][]} */ ([
		["--measure", measure.bind(null, TOOLS)],
		["--setup", setup],
		["--invariants", reportInvariantsOnly]
	])
);

/**
 * Runs the entry point the mode names, defaulting to the whole comparison.
 * @param {string=} mode which entry point to run
 * @returns {Promise<unknown>} what that entry point resolves to
 */
const runMode = (mode = "") => (RUNNERS.get(mode) || main)();

// Only as the entry point, so a test can read the corpus below without running
// the comparison.
const started =
	require.main === module
		? runMode(sweepMode(process.argv))
		: Promise.resolve();

started.catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});

// The documents the cache holds, and the pages a reader builds the rest from.
// The bulk pages stay unexported: what they carry is size, not a construct.
module.exports = {
	APP_SHELL,
	CACHE,
	COLD_CONSTRUCTS,
	EMBEDDED_LEGACY_OPTIONS,
	EMBEDDED_OPTIONS,
	HTML_CUTS,
	INLINED_STYLESHEETS,
	INSTALLED_DOCUMENTS,
	PRESETS,
	SPRITE_WITHIN,
	TAG_SOUP,
	TREE_READERS,
	WEB_COMPONENTS,
	htmlMeaning,
	htmlPurityDigest,
	htmlSlices,
	htmlSpans,
	idempotenceRepro,
	inlineCssPage,
	printerFor,
	runMode,
	sameSheets,
	spritePage,
	sweepDocument,
	sweepRespellings,
	tokenStream
};
