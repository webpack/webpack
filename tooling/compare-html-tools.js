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
	NodeType,
	QUOTE_NONE,
	decodeEntities,
	pickTransforms,
	tokenize
} = require("../lib/html/syntax-parser");
const {
	STAGES,
	collectFiles,
	compress,
	filterFrom,
	findingGroups,
	formatCost,
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
	pathSpanWalk,
	shrink,
	signed,
	sliceRelation,
	spans,
	sweepExitCode,
	sweepMode,
	thrownText
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
			await fs.promises.readFile(path.join(MODULES, SPRITE_WITHIN), "utf8")
		)
	]);
	return out;
};
/** @typedef {import("../lib/html/syntax-printer").HtmlPrintOptions} HtmlPrintOptions */

/** @type {HtmlPrintOptions} */
const DEFAULT_OPTIONS = {};

/** @type {HtmlPrintOptions} */
const AGGRESSIVE_OPTIONS = {
	collapseWhitespace: "all",
	mergeStyles: true,
	removeEmptyAttributes: true,
	removeEmptyElements: true,
	removeRedundantAttributes: "all",
	sortAttributes: true,
	sortTokenLists: true,
	removeImpliedTags: true
};

// The option sets the invariants are held over, which are the ones the
// comparison's own webpack rows are measured with.
/** @type {[string, HtmlPrintOptions][]} */
const PRESETS = [
	["default", DEFAULT_OPTIONS],
	["aggressive", AGGRESSIVE_OPTIONS]
];

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

/**
 * @param {HtmlPrintOptions} options one preset's minimizer options
 * @returns {(html: string) => string} the printer those options name
 */
const printerFor = (options) => {
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		transforms: pickTransforms(options),
		...options
	};
	return (html) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(html, printOptions)
		).code;
};

/**
 * @typedef {object} Site
 * @property {number} start where the attribute's `name=value` text begins
 * @property {number} end where it ends, past a closing delimiter
 * @property {string} name the name as the source spelled it
 * @property {string} value its value, decoded
 * @property {number} tagStart the enclosing open tag's start
 * @property {number} tagEnd its end, past the `>`
 */

/**
 * Where the tokenizer reads on from after an attribute: the state machine's own
 * answer, which a callback replaces by returning one of its own.
 * @param {number} valueStart value start, or -1 for a valueless attribute
 * @param {number} valueEnd value end
 * @param {number} nameEnd name end
 * @param {number} quoteType which delimiter the source used
 * @returns {number} the position to read on from
 */
const afterAttribute = (valueStart, valueEnd, nameEnd, quoteType) => {
	if (valueStart === -1) return nameEnd;
	return quoteType === QUOTE_NONE ? valueEnd : valueEnd + 1;
};

/**
 * Whether a name reads as HTML vocabulary rather than as another language's
 * text, which is the printer's own `_isWordSpan` asked of an attribute name.
 * Stated here rather than imported so the sweep keeps a reading of its own.
 * @param {string} name an attribute name as written
 * @returns {boolean} true when the name is a word
 */
const isWordName = (name) => /^[A-Za-z_-][^{}<>]*$/.test(name);

/**
 * Every attribute the tokenizer reports, with the open tag holding it. A close
 * tag's attributes are dropped by the tree builder, so they are dropped here,
 * as is every attribute of a tag carrying template syntax.
 * @param {string} html a document
 * @returns {Site[]} the sites, in source order
 */
const attributeSites = (html) => {
	/** @type {Site[]} */
	const sites = [];
	/** @type {Site[]} */
	let pending = [];
	tokenize(html, 0, {
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const end = afterAttribute(valueStart, valueEnd, nameEnd, quoteType);
			pending.push({
				start: nameStart,
				end,
				name: input.slice(nameStart, nameEnd),
				value:
					valueStart === -1
						? ""
						: decodeEntities(input.slice(valueStart, valueEnd), true),
				tagStart: -1,
				tagEnd: -1
			});
			return end;
		},
		openTag: (input, start, end) => {
			// One name that is not a word makes the whole tag another language's:
			// `{% endif %}` tokenizes as three attributes, of which `if` is a word
			// and would otherwise be respelled into the statement holding it.
			const templated = pending.some((site) => !isWordName(site.name));
			for (const site of pending) {
				if (templated) continue;
				site.tagStart = start;
				site.tagEnd = end;
				sites.push(site);
			}
			pending = [];
			return end;
		},
		closeTag: (input, start, end) => {
			pending = [];
			return end;
		}
	});
	return sites;
};

/**
 * What a document says, as a flat token stream: names folded to lower case and
 * values decoded, so two spellings of one document read identically. Text is
 * decoded wherever it is written, which understates a difference inside a
 * `<script>` rather than reporting an escaping change as a changed document.
 * @param {string} html a document
 * @returns {string} its stream, as the JSON of every token in order
 */
const tokenStream = (html) => {
	/** @type {string[]} */
	const out = [];
	tokenize(html, 0, {
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			out.push(`<${name}${selfClosing ? "/" : ""}`);
			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			out.push(`</${input.slice(nameStart, nameEnd).toLowerCase()}`);
			return end;
		},
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			const value =
				valueStart === -1
					? ""
					: decodeEntities(input.slice(valueStart, valueEnd), true);
			out.push(` ${name}=${value}`);
			return afterAttribute(valueStart, valueEnd, nameEnd, quoteType);
		},
		text: (input, start, end) => {
			out.push(decodeEntities(input.slice(start, end), false));
			return end;
		},
		comment: (input, start, end, dataStart, dataEnd) => {
			out.push(`<!--${input.slice(dataStart, dataEnd)}`);
			return end;
		},
		doctype: (input, start, end, nameStart, nameEnd) => {
			const name =
				nameStart === -1 ? "" : input.slice(nameStart, nameEnd).toLowerCase();
			out.push(`<!doctype ${name}`);
			return end;
		}
	});
	return JSON.stringify(out);
};

const AMPERSAND = /&/g;
const QUOTATION_MARK = /"/g;
const APOSTROPHE = /'/g;
// The characters the unquoted attribute value state ends on or rejects.
const BARE_UNSAFE = /[\t\n\f\r "'=<>`]/;
const ASCII_NAME = /^[a-z][a-z0-9-]*$/;

/**
 * @param {string} value a decoded value
 * @returns {boolean} whether it holds a C0 control character
 */
const hasControl = (value) => {
	for (const character of value) {
		if (/** @type {number} */ (character.codePointAt(0)) < 0x20) return true;
	}
	return false;
};

/**
 * @param {string} value a decoded value
 * @param {string} delimiter the delimiter it will be written in
 * @returns {string} the value as that delimiter's contents
 */
const escapeQuoted = (value, delimiter) => {
	const escaped = value.replace(AMPERSAND, "&amp;");
	return delimiter === '"'
		? escaped.replace(QUOTATION_MARK, "&#34;")
		: escaped.replace(APOSTROPHE, "&#39;");
};

/**
 * @param {string} value a decoded value
 * @returns {string | null} the value with no delimiter, or null where it needs one
 */
const bareValue = (value) => {
	if (value === "") return null;
	const escaped = value.replace(AMPERSAND, "&amp;");
	// A trailing `/` would fuse with the tag's `>` into a self-closing flag.
	if (BARE_UNSAFE.test(escaped) || escaped.endsWith("/")) return null;
	return escaped;
};

/**
 * @param {string} value a decoded value
 * @returns {string | null} every character of it as a numeric reference
 */
const asReferences = (value) => {
	// A reference bypasses the preprocessor, so an encoded CR would survive where
	// a written one is folded to LF — a different value, not a respelling of one.
	if (value === "" || hasControl(value)) return null;
	let out = "";
	for (const character of value) {
		const code = /** @type {number} */ (character.codePointAt(0));
		out += `&#x${code.toString(16)};`;
	}
	return out;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the row is labelled
 * @property {(site: Site, html: string) => string | null} write the attribute's new source text, or null to leave it alone
 * @property {((html: string) => boolean)=} skips whether a document is out of this respelling's reach
 */

/** @type {Respelling[]} */
const RESPELLINGS = [
	{
		name: "quote-double",
		write: (site) => `${site.name}="${escapeQuoted(site.value, '"')}"`
	},
	{
		name: "quote-single",
		write: (site) => `${site.name}='${escapeQuoted(site.value, "'")}'`
	},
	{
		name: "unquote",
		write: (site) => {
			const bare = bareValue(site.value);
			return bare === null ? null : `${site.name}=${bare}`;
		}
	},
	{
		name: "references",
		write: (site) => {
			const referenced = asReferences(site.value);
			return referenced === null ? null : `${site.name}="${referenced}"`;
		}
	},
	{
		// An attribute name is matched case-insensitively in the HTML namespace
		// only, so a document carrying foreign content is left alone whole.
		name: "name-case",
		skips: (html) => /<\s*(?:svg|math)[\s/>]/i.test(html),
		write: (site, html) =>
			ASCII_NAME.test(site.name)
				? `${site.name.toUpperCase()}${html.slice(
						site.start + site.name.length,
						site.end
					)}`
				: null
	}
];

/**
 * @param {string} html a document
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {string} the document, respelled
 */
const respell = (html, sites, respelling) => {
	let out = "";
	let read = 0;
	for (const site of sites) {
		const written = respelling.write(site, html);
		if (written === null) continue;
		out += html.slice(read, site.start) + written;
		read = site.end;
	}
	return out + html.slice(read);
};

// `bytes` is one output longer than the other, `differs` the two saying different
// things — which a missed boolean collapse reads as, not a worse defect than it.
/** @typedef {{ kind: "differs" | "bytes" | "throws", delta: number, mutated: string, note: string }} Finding */

/**
 * Whether respelling these sites moved the output, and how. An output of the
 * same length saying the same thing is not a finding: webpack keeps the source's
 * spelling where nothing beats it, so a delimiter survives on purpose.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html a document
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {Finding | null} what moved, or null
 */
const spellingFinding = (minify, html, minified, sites, respelling) => {
	const mutated = respell(html, sites, respelling);
	if (mutated === html) return null;
	// Verified against the tokenizer rather than argued for: a respelling that
	// moved the document is dropped instead of reported.
	if (tokenStream(mutated) !== tokenStream(html)) return null;
	/** @type {string} */
	let answer;
	try {
		answer = minify(mutated);
	} catch (error) {
		return {
			kind: "throws",
			delta: 0,
			mutated,
			note: thrownText(error)
		};
	}
	if (answer === minified) return null;
	const says = tokenStream(answer) !== tokenStream(minified);
	if (!says && answer.length === minified.length) return null;
	return {
		kind: says ? "differs" : "bytes",
		delta: answer.length - minified.length,
		mutated,
		note: ""
	};
};

/**
 * The enclosing tag on its own, where the finding survives being cut out of the
 * page — which is the whole of a repro someone can paste into a test.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html a document
 * @param {Site[]} sites the sites the finding shrank to
 * @param {Respelling} respelling how they are respelled
 * @returns {{ source: string, minified: string, mutated: string, answer: string } | null} the repro, or null where the page carries it
 */
const reproduce = (minify, html, sites, respelling) => {
	const { tagStart, tagEnd } = sites[0];
	if (sites.some((site) => site.tagStart !== tagStart)) return null;
	const source = html.slice(tagStart, tagEnd);
	// The slice carries the tag's other attributes too, and respelling those
	// would report the whole tag where the bisection named one attribute.
	const blamed = new Set(sites.map((site) => site.start - tagStart));
	try {
		const minified = minify(source);
		const found = spellingFinding(
			minify,
			source,
			minified,
			attributeSites(source).filter((site) => blamed.has(site.start)),
			respelling
		);
		if (found === null) return null;
		return {
			source,
			minified,
			mutated: found.mutated,
			answer: minify(found.mutated)
		};
	} catch (_error) {
		return null;
	}
};

/**
 * The tag in the output a difference falls inside, minified on its own. It is a
 * repro only where minifying that tag alone moves it too.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} minified one pass's output
 * @param {number} at where the second pass first differs
 * @returns {{ source: string, again: string } | null} the repro, or null
 */
const idempotenceRepro = (minify, minified, at) => {
	let found = "";
	tokenize(minified, 0, {
		openTag: (input, start, end) => {
			if (start <= at && at < end) found = input.slice(start, end);
			return end;
		}
	});
	if (found === "") return null;
	try {
		const again = minify(found);
		return again === found ? null : { source: found, again };
	} catch (_error) {
		return null;
	}
};

/** @type {Record<number, string>} */
const NODE_TYPE_NAMES = {};
for (const [name, type] of Object.entries(NodeType)) {
	NODE_TYPE_NAMES[type] = name;
}

/**
 * The sub-ranges an element states: its own opening tag, and the name and value
 * of every attribute the source wrote into that tag. §13.2 merges a second
 * `<html>` or `<body>` tag's attributes onto the element already open, so an
 * attribute can be written outside the tag holding it and is left to the tag it
 * was written in.
 * @param {import("../lib/html/syntax-parser").HtmlPath} nodePath the accessor
 * @returns {readonly [string, number, number][] | undefined} each `[name, start, end]`
 */
const htmlInnerRanges = (nodePath) => {
	if (nodePath.type() !== NodeType.Element) return undefined;
	const start = nodePath.start();
	const tagEnd = nodePath.tagEnd();
	// The parser inserted this element, or the adoption agency cloned it: no tag
	// was written, so it states no offsets to hold.
	if (tagEnd <= start) return undefined;
	/** @type {[string, number, number][]} */
	const inner = [["opening tag", start, tagEnd]];
	const count = nodePath.attributeCount();
	for (let index = 0; index < count; index++) {
		const attribute = nodePath.attributeAt(index);
		const nameStart = nodePath.attributeNameStart(attribute);
		const nameEnd = nodePath.attributeNameEnd(attribute);
		if (nameStart < start || nameStart >= tagEnd) continue;
		inner.push(["attribute name", nameStart, nameEnd]);
		inner.push([
			"attribute value",
			nodePath.attributeValueStart(attribute),
			nodePath.attributeValueEnd(attribute)
		]);
	}
	return inner;
};

/**
 * Hold the parser's ranges to what they claim about the document they came
 * from. HTML owes less here than CSS does, and the two exclusions are §13.2
 * rather than slack — turning them on reports 4031 and 22 findings over the
 * fixtures. An element's end is its start tag's until an end tag is read, so
 * `<html>` in a document omitting `</html>` ends before the `<body>` it holds;
 * and an element left open is closed by the next tag, so `<p>a<p>b` gives two
 * paragraphs whose ranges share those bytes.
 * @param {string} html a document
 * @returns {import("./compare-tools-harness").Report[]} what the ranges broke
 */
const htmlSpans = (html) =>
	spans({
		length: html.length,
		contains: false,
		siblings: false,
		walk: pathSpanWalk({
			length: html.length,
			run: (enter, exit) => {
				/** @type {Record<number, { enter: typeof enter, exit: typeof exit }>} */
				const visitors = {};
				for (const type of Object.values(NodeType)) {
					visitors[type] = { enter, exit };
				}
				new SourceProcessor().use(visitors).process(html, {});
			},
			start: (nodePath) => nodePath.start(),
			end: (nodePath) => nodePath.end(),
			name: (nodePath) => NODE_TYPE_NAMES[nodePath.type()],
			inner: htmlInnerRanges
		})
	});

/**
 * @typedef {{ what: string, type: number, tag: string, start: number, end: number, size: number, lo: number, hi: number, context: string }} NodeRun
 */

// Reparsing every node costs a parse of its own, so a document would cost its
// size times its depth. Each one is capped at this many times its own bytes.
const SLICE_BUDGET_FACTOR = 4;

/**
 * Every node in one document, in post-order with the size of its subtree —
 * which is what lets a subtree be read as a run rather than walked again. `lo`
 * and `hi` are how far that subtree reaches, and `context` the tag the node sat
 * in, which is what the fragment parsing algorithm needs to read it back.
 * @param {string} html a document
 * @param {string=} fragmentContext the element to parse it as the contents of
 * @returns {NodeRun[]} each node, children before parents
 */
const htmlNodeRuns = (html, fragmentContext) => {
	/** @type {NodeRun[]} */
	const runs = [];
	/** @type {{ held: number, lo: number, hi: number, tag: string }[]} */
	const stack = [{ held: 0, lo: html.length, hi: 0, tag: "" }];
	/** @type {Record<number, { enter: (nodePath: EXPECTED_ANY) => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const type of Object.values(NodeType)) {
		visitors[type] = {
			enter: (nodePath) => {
				stack.push({
					held: 0,
					lo: html.length,
					hi: 0,
					tag: nodePath.type() === NodeType.Element ? nodePath.tagName() : ""
				});
			},
			exit: (nodePath) => {
				const frame = /** @type {EXPECTED_ANY} */ (stack.pop());
				const type = nodePath.type();
				const tag = type === NodeType.Element ? nodePath.tagName() : "";
				const start = nodePath.start();
				const end = nodePath.end();
				const size = frame.held + 1;
				const lo = Math.min(frame.lo, start);
				const hi = Math.max(frame.hi, end);
				const parent = stack[stack.length - 1];
				parent.held += size;
				parent.lo = Math.min(parent.lo, lo);
				parent.hi = Math.max(parent.hi, hi);
				runs.push({
					what: `${NODE_TYPE_NAMES[type]}${tag === "" ? "" : `:${tag}`}`,
					type,
					tag,
					start,
					end,
					size,
					lo,
					hi,
					context: parent.tag
				});
			}
		};
	}
	new SourceProcessor()
		.use(visitors)
		.process(html, fragmentContext === undefined ? {} : { fragmentContext });
	return runs;
};

/**
 * What one node's subtree says: its shape and the offsets inside it, read
 * against the node's own start so the same construct digests the same wherever
 * it was found.
 * @param {readonly NodeRun[]} runs every node in post-order
 * @param {number} at which one to digest
 * @returns {string} its digest
 */
const runDigest = (runs, at) => {
	const node = runs[at];
	/** @type {string[]} */
	const out = [];
	for (let index = at - node.size + 1; index <= at; index++) {
		const one = runs[index];
		out.push(`${one.what}[${one.start - node.start},${one.end - node.start})`);
	}
	return out.join(" ");
};

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, read back as the contents of the element they sat in, give that node
 * back.
 *
 * The context is the whole point here. §13.2 decides what a tag means from the
 * insertion mode it is read in, so `<td>x</td>` on its own is not a cell at all
 * — the parser drops it and foster-parents the text. Handing the enclosing tag
 * to the fragment parsing algorithm is the spec's own answer to that, and it is
 * what the browser does for `innerHTML`.
 *
 * Two shapes are left out rather than normalized: an element the parser
 * inserted or cloned wrote no tag to slice, and an element whose end is its
 * start tag's — §13.2 leaves it there until an end tag is read — has a range
 * that does not hold its own children, so there is no slice to reparse.
 * @param {string} html a document
 * @returns {{ reports: import("./compare-tools-harness").Report[], read: number, skipped: number, capped: number, repeats: number }} what broke, how many answered, and what was left out
 */
const htmlSlices = (html) => {
	const runs = htmlNodeRuns(html);
	/** @type {import("./compare-tools-harness").SliceCandidate[]} */
	const candidates = [];
	let budget = html.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	let skipped = 0;
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		// No tag to slice, no range holding its own subtree, or nothing to be the
		// contents of: each is the document saying where the node came from.
		if (
			node.end <= node.start ||
			node.start > node.lo ||
			node.end < node.hi ||
			node.context === ""
		) {
			skipped++;
			continue;
		}
		const said = runDigest(runs, at);
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = html.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		candidates.push({
			what: node.what,
			said,
			reparse: () => {
				/** @type {NodeRun[]} */
				let again;
				try {
					again = htmlNodeRuns(text, node.context);
				} catch (_error) {
					return null;
				}
				const want = again.findIndex(
					(one) =>
						one.what === node.what && one.start === 0 && one.end === text.length
				);
				return want === -1 ? null : runDigest(again, want);
			}
		});
	}
	const answered = sliceRelation(candidates);
	return { ...answered, skipped: answered.skipped + skipped, capped, repeats };
};

const wantedRelation = filterFrom("RELATION");
const wantedSpelling = filterFrom("SPELLING");
const wantedPreset = filterFrom("PRESET");

/**
 * Every respelling this document's output depends on.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html the document
 * @param {string} minified what it minifies to
 * @returns {import("./compare-tools-harness").Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (minify, html, minified) => {
	/** @type {import("./compare-tools-harness").Report[]} */
	const reports = [];
	if (!wantedRelation("respelling")) return reports;
	const sites = attributeSites(html);
	for (const respelling of RESPELLINGS.filter((one) =>
		wantedSpelling(one.name)
	)) {
		if (respelling.skips !== undefined && respelling.skips(html)) continue;
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(minify, html, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const carried =
			found.kind === "throws" ? sites : shrink(holds, sites, found.kind);
		// Read off the sites that were kept, so the byte count is the repro's and
		// not every respelled attribute's added up.
		const blamed = (carried === sites ? found : holds(carried)) || found;
		const repro =
			blamed.kind === "throws"
				? null
				: reproduce(minify, html, carried, respelling);
		reports.push({
			relation: `respelling ${respelling.name}`,
			what:
				blamed.kind === "throws"
					? `threw: ${blamed.note}`
					: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro:
				repro === null
					? `    ${oneLine(html.slice(carried[0].tagStart, carried[0].tagEnd), 80)}   (only in the page)`
					: `    ${oneLine(repro.source, 76)}  ->  ${oneLine(repro.minified, 76)}\n    ${oneLine(repro.mutated, 76)}  ->  ${oneLine(repro.answer, 76)}`
		});
	}
	return reports;
};

/**
 * Every invariant this document breaks under one preset.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html the document
 * @returns {import("./compare-tools-harness").Report[]} what moved, and the smallest repro found for each
 */
const sweepDocument = (minify, html) => {
	const { printed, reports } = wantedRelation("idempotence")
		? idempotence({
				minify,
				source: html,
				says: tokenStream,
				repro: (minified, at) => idempotenceRepro(minify, minified, at)
			})
		: { printed: minify(html), reports: [] };
	if (printed === null) return reports;
	return [...reports, ...sweepRespellings(minify, html, printed)];
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
		out.push([
			path.relative(ROOT, file).replace(/\\/g, "/"),
			fs.readFileSync(file, "utf8")
		]);
	}
	out.push(["App shell (inline critical CSS)", APP_SHELL]);
	// The shapes the comparison builds rather than installs, at a size the
	// bisection can still cut down: what they carry is the shape, not the bulk.
	out.push(["Component library page", componentPage(8)]);
	out.push(["Table report", tablePage(10)]);
	out.push(["Tag soup", TAG_SOUP]);
	out.push(["Web components", WEB_COMPONENTS]);
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

/**
 * What the sweep reports that the printer owes nothing for. Each entry states
 * the reason, since a divergence with no reason beside it is one nobody can
 * tell from a defect later.
 * @type {readonly import("./compare-tools-harness").Expected[]}
 */
const EXPECTED = [
	{
		relation: "respelling quote-double",
		contains: "&#34;",
		source: "style-attribute",
		why: "the value carries both quotes, so one is escaped whichever delimiter is picked and the printer's own `&quot;` costs a byte more than the `&#34;` the source wrote — it writes the shorter of the two, which is the source"
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
	// Filtered like the corpus is: an expectation for a relation this run was
	// never going to reach matched nothing because nothing asked it to, which is
	// not the divergence having gone away.
	const groups = findingGroups(
		EXPECTED.filter((entry) => wantedRelation(entry.relation))
	);
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
	log(`sweeping ${corpus.length} documents under ${presets.length} presets …`);
	for (const [label, html] of corpus) {
		for (const [preset, options] of presets) {
			for (const report of sweepDocument(printerFor(options), html)) {
				groups.add(report, preset, label);
			}
		}
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
						cost.peak.padStart(8) +
						formatSecond(result.second).padStart(7)
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
	const mode = sweepMode(process.argv);
	// The sweep alone, for a caller that wants the relations without the ten
	// minutes the comparison costs; a full run prints the same section.
	if (mode === "--invariants") {
		process.exitCode = sweepExitCode(
			reportInvariants(),
			_missingFixtures,
			process.argv
		);
	} else {
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
}

// The documents the cache holds, and the pages a reader builds the rest from.
// The bulk pages stay unexported: what they carry is size, not a construct.
module.exports = {
	APP_SHELL,
	CACHE,
	INLINED_STYLESHEETS,
	INSTALLED_DOCUMENTS,
	SPRITE_WITHIN,
	TAG_SOUP,
	WEB_COMPONENTS,
	inlineCssPage,
	spritePage
};
