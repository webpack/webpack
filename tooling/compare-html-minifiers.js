/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// `node tooling/compare-html-minifiers.js` — size, cost and DOM safety against
// the ecosystem's HTML minifiers, each cell in its own worker so cpu and memory
// are attributable. The packages compared against install into
// `node_modules/.cache/`, never webpack's dependency tree.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { promisify } = require("util");
const zlib = require("zlib");

const htmlMinify = require("../lib/html/htmlMinify");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "node_modules/.cache/html-minifier-comparison");
const MODULES = path.join(CACHE, "node_modules");

const PACKAGES = [
	"bootstrap@5",
	"@minify-html/node@0.15",
	"@picocss/pico@2",
	"@swc/html@1",
	"cssnano@7",
	"html-minifier-next@8",
	"html-minifier-terser@7",
	"html5-boilerplate@9",
	"htmlnano@2",
	"marked@15",
	"parse5@7",
	"postcss@8",
	"svgo@3",
	"swagger-ui-dist@5",
	"water.css@2"
];

/**
 * @param {string} message progress line
 */
const log = (message) => {
	process.stderr.write(`${message}\n`);
};

/**
 * @param {string} file a path
 * @returns {Promise<boolean>} whether it exists
 */
const exists = (file) =>
	fs.promises.access(file).then(
		() => true,
		() => false
	);

/**
 * @param {string} command executable
 * @param {string[]} args its arguments
 * @param {object=} options spawn options
 * @returns {Promise<void>} resolves when it exits cleanly
 */
const run = (command, args, options) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "inherit", "inherit"],
			...options
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with ${code}`));
		});
	});

const setup = async () => {
	const manifest = path.join(CACHE, "package.json");
	// Reinstall when the package list changes, so an existing cache picks up
	// newly added fixtures instead of failing on their missing files.
	const installed =
		(await exists(MODULES)) && (await exists(manifest))
			? JSON.parse(await fs.promises.readFile(manifest, "utf8"))
					.comparisonPackages
			: undefined;
	if (JSON.stringify(installed) === JSON.stringify(PACKAGES)) return;
	log(`installing comparison packages into ${path.relative(ROOT, CACHE)} …`);
	await fs.promises.mkdir(CACHE, { recursive: true });
	if (!(await exists(manifest))) {
		await fs.promises.writeFile(
			manifest,
			`${JSON.stringify(
				{ name: "html-minifier-comparison", private: true },
				null,
				2
			)}\n`
		);
	}
	await run("npm", ["install", "--no-audit", "--no-fund", ...PACKAGES], {
		cwd: CACHE
	});
	// Recorded only after the install succeeded.
	const written = JSON.parse(await fs.promises.readFile(manifest, "utf8"));
	written.comparisonPackages = PACKAGES;
	await fs.promises.writeFile(
		manifest,
		`${JSON.stringify(written, null, 2)}\n`
	);
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
	for (const [label, file] of [
		[
			"HTML5 Boilerplate 9",
			path.join(MODULES, "html5-boilerplate/dist/index.html")
		],
		["Swagger UI 5", path.join(MODULES, "swagger-ui-dist/index.html")]
	]) {
		out.push([label, await fs.promises.readFile(file, "utf8")]);
	}
	out.push(["App shell (inline critical CSS)", APP_SHELL]);
	out.push(["Component library page", componentPage(400)]);
	// Real framework stylesheets, classless through component-sized, inlined
	// whole: whether each tool minifies, passes through, or mangles a large
	// `<style>` decides these pages.
	for (const [label, file] of [
		["Pico 2 classless (inlined)", "@picocss/pico/css/pico.classless.css"],
		["Water.css 2 (inlined)", "water.css/out/water.css"],
		["Bootstrap 5 (inlined)", "bootstrap/dist/css/bootstrap.css"]
	]) {
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
		["webpack CHANGELOG (rendered)", path.join(ROOT, "CHANGELOG.md")]
	]) {
		out.push([label, marked.parse(await fs.promises.readFile(file, "utf8"))]);
	}
	return out;
};

// Each entry is a factory so the measuring worker loads only the one tool it
// measures — anything else would show up in that tool's peak RSS. The async API
// is used wherever a tool offers one; minify-html only ships sync.
/** @type {[string, () => (html: string) => string | Promise<string>][]} */
const MINIFIERS = [
	// Two rows per tool: its defaults, and everything it will do when asked.
	[
		"webpack",
		() => async (html) => (await htmlMinify({ "input.html": html })).code
	],
	[
		"webpack (aggressive)",
		() => async (html) =>
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
	],
	[
		"html-minifier-next",
		() => {
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
	],
	[
		"html-minifier-next (aggressive)",
		() => {
			const manifest = load("html-minifier-next/package.json");
			const loading = import(
				pathToFileURL(
					path.join(MODULES, "html-minifier-next", manifest.exports["."].import)
				).href
			);
			// The html-minifier-terser row's options plus the four this fork adds
			// that leave the rendered page alone. `removeUnusedCSS` and `minifySVG`
			// are left out: both are told to change what the page renders.
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
	],
	[
		"html-minifier-terser",
		() => {
			const terser = load("html-minifier-terser");
			return (html) => terser.minify(html, {});
		}
	],
	[
		"html-minifier-terser (aggressive)",
		() => {
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
	],
	[
		"minify-html",
		() => {
			const minifyHtml = load("@minify-html/node");
			return (html) => minifyHtml.minify(Buffer.from(html), {}).toString();
		}
	],
	[
		"minify-html (aggressive)",
		() => {
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
	],
	[
		"htmlnano",
		() => {
			const htmlnano = load("htmlnano");
			return async (html) =>
				(await htmlnano.process(html, {}, htmlnano.presets.safe)).html;
		}
	],
	[
		"htmlnano (aggressive)",
		() => {
			const htmlnano = load("htmlnano");
			return async (html) =>
				(await htmlnano.process(html, {}, htmlnano.presets.max)).html;
		}
	],
	[
		"@swc/html",
		() => {
			const swc = load("@swc/html");
			return async (html) => (await swc.minify(Buffer.from(html), {})).code;
		}
	],
	[
		"@swc/html (aggressive)",
		() => {
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
	]
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
			// A whitespace-only node between two inline boxes renders as a space,
			// so losing it is a difference — but never under `<head>` / `<html>`,
			// where nothing renders it. Recorded as a run, not a count: dropping a
			// comment merges the nodes either side, which is no loss at all.
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

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);
// Node < 22.15 has no zstd in zlib — the column reads "-" there.
const zstdCompress =
	typeof zlib.zstdCompress === "function"
		? promisify(zlib.zstdCompress)
		: undefined;

/**
 * @param {Buffer} buffer content
 * @returns {Promise<number | undefined>} the zstd size, where zlib has zstd
 */
const zstdSize = async (buffer) => {
	if (zstdCompress === undefined) return undefined;
	return (
		await zstdCompress(buffer, {
			params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 }
		})
	).length;
};

/** @typedef {{ raw: number, gzip: number, brotli: number, zstd: number | undefined }} Sizes */

/**
 * What the bytes weigh under the encodings a CDN serves — the same settings as
 * `test/CodeSizeTestCases.size.js`, so numbers line up across the two reports.
 * @param {Buffer} buffer content
 * @returns {Promise<Sizes>} its size under each encoding
 */
const compress = async (buffer) => ({
	raw: buffer.length,
	gzip: (await gzip(buffer, { level: 9 })).length,
	brotli: (
		await brotliCompress(buffer, {
			params: {
				[zlib.constants.BROTLI_PARAM_QUALITY]: 11,
				[zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
			}
		})
	).length,
	zstd: await zstdSize(buffer)
});

/**
 * @param {number | undefined} bytes a byte count
 * @returns {string} the count in KB, one decimal ("-" when unmeasurable)
 */
const kb = (bytes) =>
	bytes === undefined ? "-" : `${(bytes / 1024).toFixed(1)} KB`;

/** @typedef {{ code: string, wall: number, cpu: number, peak: number } | { error: string }} Measurement */

/**
 * Worker mode: run one minifier over stdin, reporting best-of-three wall and cpu
 * and the `maxRSS` (KB) it added over this process's floor — absolute would
 * report the runner, since the kernel bills a child its parent's pre-exec copy.
 * @param {string} name a `MINIFIERS` entry's name
 * @returns {Promise<void>} resolves after the report is written
 */
const measure = async (name) => {
	const entry = MINIFIERS.find(([minifier]) => minifier === name);
	if (entry === undefined) throw new Error(`unknown minifier ${name}`);
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const html = Buffer.concat(chunks).toString("utf8");
	// Read before the tool is loaded: everything above this is the inherited
	// floor plus the document itself, neither of which the tool is charged for.
	const floor = process.resourceUsage().maxRSS;
	/** @type {Measurement} */
	let report;
	try {
		const minify = entry[1]();
		// Half of these tools are native binaries, at full speed on their first
		// call; the other half are JavaScript, which is still being compiled on it.
		// Timing from cold reports the JavaScript ones' warm-up rather than their
		// throughput — webpack's own minifier takes ~5x its steady-state time on
		// the first call and settles by the sixth — and a build minifies many
		// assets in one process, so steady state is what a user gets. Bounded by
		// time as well as by count, so a slow tool on a large document is not
		// multiplied while a fast one still reaches it.
		const warmStarted = process.hrtime.bigint();
		for (let i = 0; i < 8; i++) {
			await minify(html);
			if (Number(process.hrtime.bigint() - warmStarted) / 1e6 > 500) break;
		}
		let code = "";
		let wall = Infinity;
		let cpu = Infinity;
		for (let i = 0; i < 3; i++) {
			const cpuStarted = process.cpuUsage();
			const started = process.hrtime.bigint();
			code = await minify(html);
			wall = Math.min(wall, Number(process.hrtime.bigint() - started) / 1e6);
			const used = process.cpuUsage(cpuStarted);
			cpu = Math.min(cpu, (used.user + used.system) / 1e3);
		}
		report = {
			code,
			wall,
			cpu,
			peak: Math.max(0, process.resourceUsage().maxRSS - floor)
		};
	} catch (error) {
		report = {
			error: String(
				error && /** @type {Error} */ (error).message
					? /** @type {Error} */ (error).message
					: error
			).split("\n", 1)[0]
		};
	}
	process.stdout.write(JSON.stringify(report));
};

/**
 * @param {string} name a `MINIFIERS` entry's name
 * @param {string} input the document
 * @returns {Promise<Measurement>} the worker's report
 */
const measureInWorker = (name, input) =>
	new Promise((resolve, reject) => {
		// Through a bare-node stub: spawned directly, the worker inherits this
		// runner's fixtures and parse5 tree as its `maxRSS` floor.
		const child = spawn(
			process.execPath,
			[
				"-e",
				"require('child_process').spawn(process.execPath,[process.argv[1],'--measure',process.argv[2]],{stdio:'inherit'}).on('close',(c)=>process.exit(c))",
				__filename,
				name
			],
			{
				stdio: ["pipe", "pipe", "inherit"]
			}
		);
		/** @type {Buffer[]} */
		const chunks = [];
		child.stdout.on("data", (chunk) => chunks.push(chunk));
		child.on("error", reject);
		child.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`measuring ${name} exited with ${code}`));
				return;
			}
			resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
		});
		child.stdin.end(input);
	});

const main = async () => {
	await setup();
	const parse5 = /** @type {Parse5} */ (load("parse5"));
	for (const [label, html] of await fixtures()) {
		const before = fingerprint(parse5, html);
		const input = await compress(Buffer.from(html));
		process.stdout.write(
			`\n${label} — ${kb(input.raw)} (${kb(input.gzip)} gzip, ${kb(
				input.brotli
			)} brotli, ${kb(input.zstd)} zstd), ${before.elements.size} tags\n`
		);
		// `saved` reads off gzip — what a user downloads — with raw the tiebreak.
		process.stdout.write(
			`${"minifier".padEnd(34)}${"minified".padStart(10)}${"gzip".padStart(
				9
			)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
				9
			)}${"ms".padStart(6)}${"cpu".padStart(6)}${"mem".padStart(8)}   differs\n`
		);
		for (const [name] of MINIFIERS) {
			const result = await measureInWorker(name, html);
			if ("error" in result) {
				// A tool rejecting the document outright is a comparison result too.
				process.stdout.write(
					`${name.padEnd(34)}   rejects it: ${result.error}\n`
				);
				continue;
			}
			const after = fingerprint(parse5, result.code);
			const notes = [
				...missing(before.elements, after.elements, before.empty).map(
					(entry) => `<${entry}`
				),
				...missing(before.attributes, after.attributes, before.empty)
			];
			if (before.text !== after.text) notes.push("text");
			const out = await compress(Buffer.from(result.code));
			process.stdout.write(
				`${
					name.padEnd(34) +
					kb(out.raw).padStart(10) +
					kb(out.gzip).padStart(9) +
					`${(100 - (out.gzip / input.gzip) * 100).toFixed(1)}%`.padStart(8) +
					kb(out.brotli).padStart(9) +
					kb(out.zstd).padStart(9) +
					result.wall.toFixed(0).padStart(6) +
					result.cpu.toFixed(0).padStart(6) +
					`${(result.peak / 1024).toFixed(0)} MB`.padStart(8)
				}   ${notes.length === 0 ? "-" : notes.slice(0, 4).join(", ")}\n`
			);
		}
	}
};

// Only as the entry point, so the documents below can be required from a test.
if (require.main === module) {
	(process.argv[2] === "--measure" ? measure(process.argv[3]) : main()).catch(
		(error) => {
			log(String(error && error.stack ? error.stack : error));
			process.exitCode = 1;
		}
	);
}

// The documents that are files rather than pages this builds, for a reader that
// is not this script.
module.exports.APP_SHELL = APP_SHELL;
module.exports.CACHE = CACHE;
module.exports.INLINED_STYLESHEETS = /** @type {[string, string][]} */ ([
	["Pico 2 classless (inlined)", "@picocss/pico/css/pico.classless.css"],
	["Water.css 2 (inlined)", "water.css/out/water.css"],
	["Bootstrap 5 (inlined)", "bootstrap/dist/css/bootstrap.css"]
]);
module.exports.INSTALLED_DOCUMENTS = /** @type {[string, string][]} */ ([
	["HTML5 Boilerplate 9", "html5-boilerplate/dist/index.html"],
	["Swagger UI 5", "swagger-ui-dist/index.html"]
]);

// The pages built here rather than installed. A reader that cannot await builds
// the same documents from these.
module.exports.inlineCssPage = inlineCssPage;
