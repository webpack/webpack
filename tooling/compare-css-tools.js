/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Compare webpack's own CSS parser and printer against the ecosystem's, over
// real framework stylesheets, in the three stages a tool can be asked for.

//   node tooling/compare-css-tools.js

// `parse` builds the tree and stops; `beautify` and `minify` print it back out.
// Every table reports best-of-3 wall/cpu ms and the worker's own peak RSS.

// The two printing tables add what the output weighs — raw and under the
// encodings a CDN serves — and whether it still matches every class it did.

// The run opens with the invariants webpack's own printer owes its output,
// which need no install; `--invariants` prints that section and stops.

// `FIXTURE=`, `TOOL=` and `STAGE=` narrow the run to rows whose name contains
// what they name, so one cell is re-measured without the whole matrix.

// Each cell runs in a fresh worker (this script with `--measure <stage> <tool>`,
// the stylesheet on stdin), so cost is attributable to that one tool.

// The comparison packages are NOT webpack dependencies: they install into
// `node_modules/.cache/`, so nothing here reaches webpack's own tree.

const fs = require("fs");
const path = require("path");
// What every other tool assumes when told no target: current engines only.
// Resolved rather than written out, so it does not go stale.
const MODERN_BROWSERS = require("browserslist")(
	"last 1 chrome version, last 1 firefox version, last 1 safari version, last 1 edge version"
);
const cssMinify = require("../lib/css/cssMinify");
const { SourceProcessor } = require("../lib/css/syntax");
const cssSyntaxParser = require("../lib/css/syntax-parser");

const {
	NodeType,
	TT_AT_KEYWORD,
	TT_DIMENSION,
	TT_EOF,
	TT_FUNCTION,
	TT_HASH,
	TT_IDENTIFIER,
	TT_LEFT_CURLY_BRACKET,
	TT_LEFT_PARENTHESIS,
	TT_LEFT_SQUARE_BRACKET,
	TT_NUMBER,
	TT_PERCENTAGE,
	TT_RIGHT_CURLY_BRACKET,
	TT_RIGHT_PARENTHESIS,
	TT_RIGHT_SQUARE_BRACKET,
	TT_SEMICOLON,
	TT_STRING,
	TT_WHITESPACE,
	TokenStream,
	pickTransforms,
	unescapeIdentifier
} = cssSyntaxParser;

const {
	STAGES,
	collectFiles,
	compress,
	exists,
	filterFrom,
	findingGroups,
	formatCost,
	formatSecond,
	hasher,
	idempotence,
	installPackages,
	kb,
	legalNotices,
	loaderFor,
	log,
	lossColumn,
	measure,
	measureInWorker,
	missingReport,
	oneLine,
	pathSpanWalk,
	purityRelation,
	run,
	shrink,
	signed,
	sliceRelation,
	spans,
	sweepExitCode,
	sweepMode,
	thrownText
} = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "css-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);

// Enough of Tailwind's utility surface to look like a real build. `@source
// inline` expands the braces itself, so the fixture needs no project to scan.
const TAILWIND_APP = `@import "tailwindcss";
@source inline("{,sm:,md:,lg:,hover:,focus:,dark:}{p,px,py,m,mx,my,mt,mb,gap}-{0,1,2,3,4,6,8,12}");
@source inline("{,sm:,md:,lg:,hover:,dark:}{text,bg,border}-{gray,slate,blue,red,green,amber}-{50,100,200,400,500,600,700,900}");
@source inline("{,sm:,md:,lg:}{flex,grid,block,hidden,relative,absolute,items-center,justify-between,w-full,max-w-2xl,rounded,rounded-lg,shadow,shadow-md,border,font-bold,text-sm,text-lg,text-2xl,truncate,underline,transition,z-10,grid-cols-3}");
`;

const TAILWIND_WIDE = `@import "tailwindcss";
@source inline("{sm:,md:,lg:,xl:,2xl:,hover:,focus:,dark:,}{p,m,px,py,mx,my,pt,pb,pl,pr,mt,mb,ml,mr,gap,w,h,text,leading,rounded}-{0,1,2,3,4,6,8,12,16,24,32,48,64,full,auto}");
@source inline("{sm:,md:,lg:,xl:,hover:,focus:,dark:,}{text,bg,border,ring,fill,stroke,shadow,divide,outline,accent,caret,decoration}-{slate,gray,zinc,neutral,stone,red,orange,amber,yellow,lime,green,emerald,teal,cyan,sky,blue,indigo,violet,purple,fuchsia,pink,rose}-{50,100,200,300,400,500,600,700,800,900,950}");
@source inline("{sm:,md:,lg:,xl:,hover:,focus:,}{flex,grid,block,inline,hidden,relative,absolute,fixed,sticky,static,italic,underline,truncate,uppercase}");
`;

// daisyUI is a Tailwind plugin, so its components exist only after a build; the
// candidate lists make Tailwind emit the common ones (unknown names are ignored).
const TAILWIND_DAISYUI = `@import "tailwindcss";
@plugin "daisyui";
@source inline("{alert,avatar,badge,btn,card,checkbox,collapse,divider,drawer,dropdown,footer,hero,input,join,kbd,link,loading,mask,menu,modal,navbar,progress,radio,select,skeleton,stat,step,steps,swap,tab,table,tabs,textarea,toggle,tooltip}");
@source inline("btn-{primary,secondary,accent,neutral,info,success,warning,error,ghost,link,outline,active,disabled,wide,block,circle,square,xs,sm,md,lg,xl}");
@source inline("{alert,badge,checkbox,input,progress,radio,select,textarea,toggle}-{primary,secondary,accent,info,success,warning,error}");
@source inline("{card-body,card-title,card-actions,modal-box,modal-action,navbar-start,navbar-center,navbar-end,menu-title,dropdown-content,collapse-title,collapse-content,drawer-side,drawer-content,hero-content,stat-title,stat-value,stat-desc,join-item,table-zebra,tab-active,loading-spinner,loading-dots}");
`;

// Built rather than installed: a label, the file it lands in, and its source.
/** @type {[string, string, string][]} */
const GENERATED_FIXTURES = [
	["Tailwind 4 (app-sized)", "tailwind-app.css", TAILWIND_APP],
	["Tailwind 4 (wide utilities)", "tailwind-wide.css", TAILWIND_WIDE],
	["Tailwind 4 + daisyUI 5", "tailwind-daisyui.css", TAILWIND_DAISYUI]
];

const setup = async () => {
	await installPackages(CACHE_NAME);
	for (const [, out, source] of GENERATED_FIXTURES) {
		const target = path.join(CACHE, out);
		if (await exists(target)) continue;
		log(`building ${out} …`);
		const input = path.join(CACHE, `${out}.in`);
		await fs.promises.writeFile(input, source);
		await run(
			process.execPath,
			[
				path.join(MODULES, "@tailwindcss/cli/dist/index.mjs"),
				"-i",
				input,
				"-o",
				target
			],
			{ cwd: CACHE }
		);
	}
};

// Every installed stylesheet the comparison runs on: component frameworks, the
// classless ones, and icon/animation/reset sheets that look nothing like them.

// The odd shapes earn their place: an icon font is thousands of one-declaration
// rules, and Open Props is custom properties and almost nothing else.
/** @type {[string, string][]} */
const INSTALLED_FIXTURES = [
	["98.css", "98.css/dist/98.css"],
	["Animate.css 4", "animate.css/animate.css"],
	["Beer CSS 5", "beercss/dist/cdn/beer.css"],
	["Bootstrap 5 (full)", "bootstrap/dist/css/bootstrap.css"],
	["Bootstrap 5 (grid)", "bootstrap/dist/css/bootstrap-grid.css"],
	["Bootstrap Icons 1", "bootstrap-icons/font/bootstrap-icons.css"],
	["Bulma 1", "bulma/css/bulma.css"],
	["Fomantic-UI 2", "fomantic-ui-css/semantic.css"],
	["Font Awesome 6", "@fortawesome/fontawesome-free/css/all.css"],
	["Foundation 6", "foundation-sites/dist/css/foundation.css"],
	["KaTeX 0.18", "katex/dist/katex.css"],
	["Materialize 2", "@materializecss/materialize/dist/css/materialize.css"],
	["Milligram 1", "milligram/dist/milligram.css"],
	["NES.css 2", "nes.css/css/nes.css"],
	["normalize.css 8", "normalize.css/normalize.css"],
	["Open Props 1 (minified)", "open-props/open-props.min.css"],
	["PatternFly 6", "@patternfly/patternfly/patternfly-base.css"],
	["Pico 2", "@picocss/pico/css/pico.css"],
	["Primer 21", "@primer/css/dist/primer.css"],
	["Pure 3", "purecss/build/pure.css"],
	["Radix Themes 3 (components)", "@radix-ui/themes/components.css"],
	["sanitize.css 13", "sanitize.css/sanitize.css"],
	["Semantic UI 2", "semantic-ui-css/semantic.css"],
	["Shoelace 2 (light)", "@shoelace-style/shoelace/dist/themes/light.css"],
	["Spectre 0.5", "spectre.css/dist/spectre.css"],
	["Swiper 14", "swiper/swiper-bundle.css"],
	["Tabler 1", "@tabler/core/dist/css/tabler.css"],
	["Tachyons 4", "tachyons/css/tachyons.css"],
	["UIkit 3", "uikit/dist/css/uikit.css"],
	["Video.js 8", "video.js/dist/video-js.css"],
	["Water.css 2", "water.css/out/water.css"]
];

/**
 * @returns {[string, string][]} `[label, file]` for every fixture
 */
const fixtures = () => [
	.../** @type {[string, string][]} */ (
		INSTALLED_FIXTURES.map(([label, file]) => [label, path.join(MODULES, file)])
	),
	.../** @type {[string, string][]} */ (
		GENERATED_FIXTURES.map(([label, file]) => [label, path.join(CACHE, file)])
	)
];

/** @typedef {import("../lib/css/syntax-parser").CssPrintOptions} CssPrintOptions */

/** @type {CssPrintOptions} */
const DEFAULT_OPTIONS = {};

/** @type {CssPrintOptions} */
const TARGET_OPTIONS = { environment: { browsers: MODERN_BROWSERS } };

/** @type {CssPrintOptions} */
const TARGET_VARS_OPTIONS = {
	environment: { browsers: MODERN_BROWSERS },
	rewriteCustomProperties: true
};

// The option sets the invariants are held over, which are the ones the
// comparison's own webpack rows are measured with.
/** @type {[string, CssPrintOptions][]} */
const PRESETS = [
	["default", DEFAULT_OPTIONS],
	["target", TARGET_OPTIONS],
	["target+vars", TARGET_VARS_OPTIONS]
];

// Each entry builds its callable on demand, so the measuring worker loads only
// the one tool it measures — anything else would land in that tool's peak RSS.
/** @type {import("./compare-tools-harness").Tool[]} */
const TOOLS = [
	{
		// `process` with no mode walks the whole stylesheet and prints nothing,
		// which is exactly the parse stage.
		name: "webpack",
		stage: "parse",
		create: () => (css) => new SourceProcessor().process(css)
	},
	{
		name: "postcss",
		stage: "parse",
		create: () => {
			const postcss = load("postcss");
			return (css) => postcss.parse(css);
		}
	},
	{
		name: "css-tree",
		stage: "parse",
		create: () => {
			const cssTree = load("css-tree");
			return (css) => cssTree.parse(css);
		}
	},
	{
		name: "@adobe/css-tools",
		stage: "parse",
		create: () => {
			const adobe = load("@adobe/css-tools");
			return (css) => adobe.parse(css);
		}
	},
	{
		name: "stylis",
		stage: "parse",
		create: () => {
			const stylis = load("stylis");
			return (css) => stylis.compile(css);
		}
	},
	{
		name: "crass",
		stage: "parse",
		create: () => {
			const crass = load("crass");
			return (css) => crass.parse(css);
		}
	},
	{
		name: "webpack",
		stage: "beautify",
		create: () => (css) =>
			new SourceProcessor().process(css, { mode: "beautify" }).code
	},
	{
		// postcss keeps every raw it parsed, so its print reproduces the input —
		// the round-trip floor the other printers are read against.
		name: "postcss",
		stage: "beautify",
		create: () => {
			const postcss = load("postcss");
			return (css) => postcss.parse(css).toString();
		}
	},
	{
		name: "prettier",
		stage: "beautify",
		create: () => {
			const prettier = load("prettier");
			return (css) => prettier.format(css, { parser: "css" });
		}
	},
	{
		// esbuild does the work in a service process of its own, so its cpu and
		// its memory are spent where neither this worker nor `VmHWM` sees them.
		name: "esbuild (service)",
		stage: "beautify",
		external: true,
		create: () => {
			const esbuild = load("esbuild");
			return async (css) =>
				(await esbuild.transform(css, { loader: "css" })).code;
		}
	},
	{
		name: "lightningcss",
		stage: "beautify",
		create: () => {
			const lightningcss = load("lightningcss");
			return (css) =>
				lightningcss
					.transform({
						filename: "input.css",
						code: Buffer.from(css),
						minify: false
					})
					.code.toString("utf8");
		}
	},
	{
		name: "clean-css",
		stage: "beautify",
		create: () => {
			const CleanCSS = load("clean-css");
			return async (css) =>
				(
					await new CleanCSS({
						level: 0,
						format: "beautify",
						returnPromise: true
					}).minify(css)
				).styles;
		}
	},
	{
		name: "@adobe/css-tools",
		stage: "beautify",
		create: () => {
			const adobe = load("@adobe/css-tools");
			return (css) => adobe.stringify(adobe.parse(css));
		}
	},
	{
		name: "crass",
		stage: "beautify",
		create: () => {
			const crass = load("crass");
			return (css) => crass.parse(css).pretty();
		}
	},
	{
		// css-tree and stylis print compact rather than indented, so their rows
		// weigh a bare round-trip: parse and print, no transform.
		name: "css-tree",
		stage: "beautify",
		create: () => {
			const cssTree = load("css-tree");
			return (css) => cssTree.generate(cssTree.parse(css));
		}
	},
	{
		name: "stylis",
		stage: "beautify",
		create: () => {
			const stylis = load("stylis");
			return (css) => stylis.serialize(stylis.compile(css), stylis.stringify);
		}
	},
	{
		name: "webpack",
		stage: "minify",
		create: () => async (css) =>
			(await cssMinify({ "input.css": css }, undefined, DEFAULT_OPTIONS)).code
	},
	{
		// The rivals strip the spellings a modern engine makes dead; webpack, told
		// nothing, keeps them. The two rows say what the target is worth.
		name: "webpack+target",
		stage: "minify",
		create: () => async (css) =>
			(await cssMinify({ "input.css": css }, undefined, TARGET_OPTIONS)).code
	},
	{
		// The rivals shorten a custom property's value the way they shorten any
		// other; webpack holds off unless told, since `getPropertyValue()` reads it.
		name: "webpack+target+vars",
		stage: "minify",
		create: () => async (css) =>
			(await cssMinify({ "input.css": css }, undefined, TARGET_VARS_OPTIONS))
				.code
	},
	{
		name: "esbuild (service)",
		stage: "minify",
		external: true,
		create: () => {
			const esbuild = load("esbuild");
			return async (css) =>
				(await esbuild.transform(css, { loader: "css", minify: true })).code;
		}
	},
	{
		name: "esbuild+target (service)",
		stage: "minify",
		external: true,
		create: () => {
			const esbuild = load("esbuild");
			// esbuild names its targets rather than reading browserslist, so the
			// query resolves to the `<name><major>` strings it accepts.
			const target = MODERN_BROWSERS.map((entry) =>
				entry.replace(" ", "").replace(/\..*$/, "")
			);
			return async (css) =>
				(await esbuild.transform(css, { loader: "css", minify: true, target }))
					.code;
		}
	},
	{
		name: "csso",
		stage: "minify",
		create: () => {
			const csso = load("csso");
			return (css) => csso.minify(css).css;
		}
	},
	{
		name: "clean-css L1",
		stage: "minify",
		create: () => {
			const CleanCSS = load("clean-css");
			return async (css) =>
				(await new CleanCSS({ level: 1, returnPromise: true }).minify(css))
					.styles;
		}
	},
	{
		name: "clean-css L2",
		stage: "minify",
		create: () => {
			const CleanCSS = load("clean-css");
			return async (css) =>
				(await new CleanCSS({ level: 2, returnPromise: true }).minify(css))
					.styles;
		}
	},
	{
		name: "lightningcss",
		stage: "minify",
		create: () => {
			const lightningcss = load("lightningcss");
			return (css) =>
				lightningcss
					.transform({
						filename: "input.css",
						code: Buffer.from(css),
						minify: true
					})
					.code.toString("utf8");
		}
	},
	{
		name: "lightningcss+target",
		stage: "minify",
		create: () => {
			const lightningcss = load("lightningcss");
			const targets = lightningcss.browserslistToTargets(MODERN_BROWSERS);
			return (css) =>
				lightningcss
					.transform({
						filename: "input.css",
						code: Buffer.from(css),
						minify: true,
						targets
					})
					.code.toString("utf8");
		}
	},
	{
		name: "cssnano",
		stage: "minify",
		create: () => {
			const postcss = load("postcss");
			const cssnano = load("cssnano");
			return async (css) =>
				(await postcss([cssnano]).process(css, { from: undefined })).css;
		}
	},
	{
		// The preset cssnano does not ship on by default: it also merges rules,
		// rebases `z-index` and reduces idents, so it diverges where the rest agree.
		name: "cssnano advanced",
		stage: "minify",
		create: () => {
			const postcss = load("postcss");
			const cssnano = load("cssnano");
			const advanced = load("cssnano-preset-advanced");
			return async (css) =>
				(
					await postcss([cssnano({ preset: advanced() })]).process(css, {
						from: undefined
					})
				).css;
		}
	},
	{
		name: "@adobe/css-tools",
		stage: "minify",
		create: () => {
			const adobe = load("@adobe/css-tools");
			return (css) => adobe.stringify(adobe.parse(css), { compress: true });
		}
	},
	{
		name: "tdewolff/minify",
		stage: "minify",
		create: () => {
			const { minify } = load("@tdewolff/minify");
			return (css) => minify("text/css", css);
		}
	},
	{
		// Its documented entry point, which is what a user calls — it panics on a
		// stylesheet with anything much in it, and the row then reads as a refusal.
		name: "@swc/css",
		stage: "minify",
		create: () => {
			const swc = load("@swc/css");
			return (css) => swc.minifySync(Buffer.from(css), {}).code.toString();
		}
	},
	{
		name: "crass",
		stage: "minify",
		create: () => {
			const crass = load("crass");
			return (css) => crass.parse(css).optimize({ o1: true }).toString();
		}
	}
];

/**
 * Every class a stylesheet's selectors mention. Both layers are real parsers —
 * postcss for the rules, postcss-selector-parser for their selectors — because a
 * size win that drops a class is not a size win, and hand-matching `.name` gets
 * the count wrong: a hex escape may swallow its terminating whitespace, so
 * `.\32 xl` and `.\32xl` are one class, and a `.` inside `[href=".foo"]` is not
 * one at all. The parser resolves both, so equivalent re-spellings compare equal.
 * @param {EXPECTED_ANY} postcss the postcss export
 * @param {EXPECTED_ANY} selectorParser the postcss-selector-parser export
 * @param {string} css a stylesheet
 * @returns {Set<string>} the classes it matches on
 */
const classSelectors = (postcss, selectorParser, css) => {
	const set = new Set();
	const collect = selectorParser((/** @type {EXPECTED_ANY} */ root) => {
		root.walkClasses((/** @type {EXPECTED_ANY} */ node) => set.add(node.value));
	});
	postcss.parse(css).walkRules((/** @type {EXPECTED_ANY} */ rule) => {
		// A selector the parser rejects is not a class source worth guessing at.
		try {
			collect.processSync(rule.selector);
		} catch (_error) {
			// ignore
		}
	});
	return set;
};

const wantedFixture = filterFrom("FIXTURE");
const wantedTool = filterFrom("TOOL");
const wantedStage = filterFrom("STAGE");

// --- Invariants -------------------------------------------------------------

// What a comparison cannot see, because being a few bytes off its own best is
// not being worse than another tool: a second pass that moves the stylesheet.

// A stylesheet the repo ships is a shape the printer exists for, so the sweep
// reads `test/**/*.css` rather than the handful of fixtures timings need.

// `js` is where the test harness writes what a case built, so a sweep that ran
// after a test run would report the same finding twice.

// A web-platform-tests checkout, which the html5lib job alone fetches: its
// thousands of stylesheets are a corpus of their own rather than a default run.
const SKIPPED_FIXTURE_DIRS = new Set(["js", "node_modules", "wpt"]);

/**
 * @param {CssPrintOptions} options one preset's minimizer options
 * @returns {(css: string) => string} the printer those options name
 */
const printerFor = (options) => {
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		transforms: pickTransforms(options),
		...options
	};
	return (css) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(css, printOptions)
		).code;
};

// Each token type by what a report calls it, read off the exports rather than
// listed, so a type the tokenizer gains is named without editing this.
/** @type {Map<number, string>} */
const TOKEN_TYPE_NAMES = new Map();
for (const [name, value] of Object.entries(cssSyntaxParser)) {
	if (name.startsWith("TT_") && typeof value === "number") {
		TOKEN_TYPE_NAMES.set(value, name.slice(3).toLowerCase().replace(/_/g, " "));
	}
}

// How much of a stylesheet one cut keeps at most, where the source offers a
// construct that small: the cost is two prints of it under every preset.
const CUT_CONSTRUCT_LIMIT = 2048;

/**
 * The stylesheet cut short inside and just after one token of each type, since
 * the end of the input is where the tokenizer and the parser close what the
 * source left open. Each cut keeps only the top-level construct it falls in,
 * which is all the end of the input can reach — the first one small enough.
 * @param {string} css a stylesheet
 * @returns {[string, string][]} `[where, cut]` for each place it was cut
 */
const cssCuts = (css) => {
	/** @type {Map<number, [number, number, number]>} */
	const first = new Map();
	/** @type {Set<number>} */
	const small = new Set();
	const stream = new TokenStream(css);
	let depth = 0;
	let construct = 0;
	for (;;) {
		const token = stream.consume();
		const type = token.type;
		if (type === TT_EOF) break;
		if (!small.has(type)) {
			if (token.end - construct <= CUT_CONSTRUCT_LIMIT) {
				first.set(type, [construct, token.start, token.end]);
				small.add(type);
			} else if (!first.has(type)) {
				first.set(type, [construct, token.start, token.end]);
			}
		}
		if (
			type === TT_FUNCTION ||
			type === TT_LEFT_PARENTHESIS ||
			type === TT_LEFT_SQUARE_BRACKET ||
			type === TT_LEFT_CURLY_BRACKET
		) {
			depth++;
		} else if (
			depth !== 0 &&
			(type === TT_RIGHT_PARENTHESIS ||
				type === TT_RIGHT_SQUARE_BRACKET ||
				type === TT_RIGHT_CURLY_BRACKET)
		) {
			depth--;
			if (depth === 0 && type === TT_RIGHT_CURLY_BRACKET) construct = token.end;
		} else if (depth === 0 && type === TT_SEMICOLON) {
			construct = token.end;
		}
	}
	/** @type {[string, string][]} */
	const cuts = [];
	for (const [type, [from, start, end]] of first) {
		const name = TOKEN_TYPE_NAMES.get(type) || String(type);
		if (end - start > 1) {
			cuts.push([
				`inside a ${name}`,
				css.slice(from, start + ((end - start) >> 1))
			]);
		}
		cuts.push([`after a ${name}`, css.slice(from, end)]);
	}
	return cuts;
};

/**
 * What a stylesheet says, as a flat token stream: whitespace runs collapse to
 * one marker (dropping a comment leaves the run either side of it), so only a
 * token the printer actually rewrote separates two outputs. A respelling is one,
 * which is why `#FFF` -> `#fff` between two passes reads as `differs` here.
 * @param {string} css a stylesheet
 * @returns {string} its stream, as the JSON of every token in order
 */
const tokenStream = (css) => {
	const stream = new TokenStream(css);
	/** @type {string[]} */
	const out = [];
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		if (token.type === TT_WHITESPACE) {
			if (out[out.length - 1] !== " ") out.push(" ");
			continue;
		}
		out.push(`${token.type}:${css.slice(token.start, token.end)}`);
	}
	return JSON.stringify(out);
};

/** @type {Record<number, string>} */
const NODE_TYPE_NAMES = {};
for (const [name, type] of Object.entries(NodeType)) {
	NODE_TYPE_NAMES[type] = name;
}

// Which types state a sub-range of their own. One accessor view answers every
// property for every node, so reading `nameStart` off a token reports whatever
// that column holds for it — the type decides, never what came back.
const NAMED = new Set([
	NodeType.Declaration,
	NodeType.AtRule,
	NodeType.Function
]);
const BLOCKED = new Set([NodeType.AtRule, NodeType.QualifiedRule]);

/**
 * The sub-ranges a node names, as the span relation reads them.
 * @param {import("../lib/css/syntax-parser").CssPath} nodePath the accessor
 * @returns {readonly [string, number, number][] | undefined} each `[name, start, end]`
 */
const cssInnerRanges = (nodePath) => {
	const type = nodePath.type();
	/** @type {[string, number, number][]} */
	const inner = [];
	if (NAMED.has(type)) {
		inner.push(["name", nodePath.nameStart(), nodePath.nameEnd()]);
	}
	if (BLOCKED.has(type)) {
		inner.push(["block", nodePath.blockStart(), nodePath.blockEnd()]);
	}
	return inner.length === 0 ? undefined : inner;
};

/**
 * Hold the parser's ranges to what they claim about the stylesheet they came
 * from. CSS owes every part of the relation: a component value sits inside the
 * declaration that holds it, and two of them never overlap.
 * @param {string} css a stylesheet
 * @returns {import("./compare-tools-harness").Report[]} what the ranges broke
 */
const cssSpans = (css) =>
	spans({
		length: css.length,
		contains: true,
		siblings: true,
		walk: pathSpanWalk({
			length: css.length,
			run: (enter, exit) => {
				/** @type {Record<number, { enter: typeof enter, exit: typeof exit }>} */
				const visitors = {};
				for (const type of Object.values(NodeType)) {
					visitors[type] = { enter, exit };
				}
				new SourceProcessor().use(visitors).process(css, {});
			},
			start: (nodePath) => nodePath.start(),
			end: (nodePath) => nodePath.end(),
			name: (nodePath) => NODE_TYPE_NAMES[nodePath.type()],
			// A comment reaches the walk from the tokenizer rather than from the
			// tree, so it arrives before the rule holding it has opened.
			structural: (nodePath) => nodePath.type() !== NodeType.Comment,
			inner: cssInnerRanges
		})
	});

// What a node's own source has to be wrapped in to parse on its own. A rule
// stands alone; a declaration needs a rule around it and a component value a
// declaration, which is the offset shift each answer is read back through.
/** @type {Record<number, [string, string]>} */
const CSS_SLICE_CONTEXT = {
	[NodeType.AtRule]: ["", ""],
	[NodeType.QualifiedRule]: ["", ""],
	[NodeType.Declaration]: ["a{", "}"]
};

const CSS_VALUE_CONTEXT = /** @type {[string, string]} */ (["a{b:", "}"]);

// Reparsing every node costs a parse of its own, so a stylesheet would cost its
// size times its depth. Each one is capped at this many times its own bytes,
// spent leaves first, which is where a range is most likely to be wrong.
const SLICE_BUDGET_FACTOR = 4;

/**
 * @typedef {{ type: number, start: number, end: number, size: number }} NodeRun
 */

/**
 * Every node in one stylesheet, in post-order with the size of its subtree —
 * which is what lets a subtree be read as a run rather than walked again. A
 * comment is left out: it reaches the walk from the tokenizer, so it would land
 * in whichever node happened to be open.
 * @param {string} css a stylesheet
 * @returns {NodeRun[]} each node, children before parents
 */
const cssNodeRuns = (css) => {
	/** @type {NodeRun[]} */
	const runs = [];
	// How many nodes each open node has collected, so a size is a sum rather
	// than a second descent.
	/** @type {number[]} */
	const held = [0];
	/** @type {Record<number, { enter: () => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const type of Object.values(NodeType)) {
		visitors[type] = {
			enter: () => {
				held.push(0);
			},
			exit: (nodePath) => {
				const inside = /** @type {number} */ (held.pop());
				if (nodePath.type() === NodeType.Comment) return;
				const size = inside + 1;
				held[held.length - 1] += size;
				runs.push({
					type: nodePath.type(),
					start: nodePath.start(),
					end: nodePath.end(),
					size
				});
			}
		};
	}
	new SourceProcessor().use(visitors).process(css, {});
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
		out.push(
			`${NODE_TYPE_NAMES[one.type]}[${one.start - node.start},${
				one.end - node.start
			})`
		);
	}
	return out.join(" ");
};

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, wrapped in the least context that lets them parse, give that node
 * back.
 * @param {string} css a stylesheet
 * @returns {{ reports: import("./compare-tools-harness").Report[], read: number, skipped: number, capped: number, repeats: number }} what broke, how many answered, and what was left out
 */
const cssSlices = (css) => {
	const runs = cssNodeRuns(css);
	/** @type {import("./compare-tools-harness").SliceCandidate[]} */
	const candidates = [];
	let budget = css.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	// One shape is one question: a bundle carries the same `Identifier[0,3)`
	// hundreds of thousands of times, and reparsing each one asks nothing the
	// first did not. Spends the budget on the shapes a source actually holds.
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		const said = runDigest(runs, at);
		// Before the budget, not after: a shape already asked about must not spend
		// what is left, or a bundle's millionth identifier crowds out every
		// composite node in it.
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = css.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		const [prefix, suffix] = CSS_SLICE_CONTEXT[node.type] || CSS_VALUE_CONTEXT;
		candidates.push({
			what: NODE_TYPE_NAMES[node.type],
			said,
			reparse: () => {
				/** @type {NodeRun[]} */
				let again;
				try {
					again = cssNodeRuns(`${prefix}${text}${suffix}`);
				} catch (_error) {
					return null;
				}
				// The node this slice is meant to be, where the wrapper put it. Read
				// out of its stylesheet the parser can take these bytes for something
				// else, or for nothing: what they lacked is context, not a range.
				const want = again.findIndex(
					(one) =>
						one.type === node.type &&
						one.start === prefix.length &&
						one.end === prefix.length + text.length
				);
				return want === -1 ? null : runDigest(again, want);
			}
		});
	}
	return { ...sliceRelation(candidates), capped, repeats };
};

/**
 * What one parse of a stylesheet amounts to: every node's type and range, the
 * names and values it derived, and the bytes the printer makes of it.
 *
 * WHY: the derived values are the point, not the offsets. An unescaped name or
 * a cached word can come back from the last parse with every offset still
 * right, and printing reads all of them — so the output is digested too, which
 * covers the derived fields a node type does not name here.
 * @param {string} css a stylesheet
 * @param {(css: string) => string} print the printer to read it back out with
 * @returns {string} the digest
 */
const cssPurityDigest = (css, print) => {
	const digest = hasher();
	/** @type {Record<number, { enter: () => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	const read = (/** @type {EXPECTED_ANY} */ nodePath) => {
		const type = nodePath.type();
		digest.update(
			`${NODE_TYPE_NAMES[type]}[${nodePath.start()},${nodePath.end()})`
		);
		if (NAMED.has(type)) {
			digest.update(`|${nodePath.name()}|${nodePath.unescapedName()}`);
		}
		digest.update("\n");
	};
	for (const type of Object.values(NodeType)) {
		visitors[type] = { enter: () => {}, exit: read };
	}
	try {
		new SourceProcessor().use(visitors).process(css, {});
		digest.update(print(css));
	} catch (error) {
		return `refused: ${/** @type {Error} */ (error).message}`;
	}
	return digest.hex();
};

/**
 * What a stylesheet says, token by token, with each one's value as the parser
 * resolves it rather than as the source wrote it: an escape resolved, a string
 * without its delimiters, a number as its value and its unit folded.
 *
 * WHY: this is what a respelling has to be judged against. The raw stream
 * `idempotence` reads would call `8PX` and `8px`, or `"a"` and `'a'`, two
 * different outputs — so every respelling would report the printer for keeping
 * a spelling that says exactly what the other one says.
 * @param {string} css a stylesheet
 * @returns {string} its meaning, as the JSON of every token in order
 */
const tokenMeaning = (css) => {
	const stream = new TokenStream(css);
	/** @type {string[]} */
	const out = [];
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		const text = css.slice(token.start, token.end);
		out.push(`${token.type}:${canonicalToken(token.type, text, token)}`);
	}
	return JSON.stringify(out);
};

/**
 * One token's value as the parser resolves it.
 * @param {number} type which token it is
 * @param {string} text the token as the source spelled it
 * @param {EXPECTED_ANY} token the token, for a dimension's unit
 * @returns {string} its value
 */
const canonicalToken = (type, text, token) => {
	if (type === TT_IDENTIFIER) return unescapeIdentifier(text);
	// The sigil is not part of the name, and an at-rule name is matched
	// case-insensitively where an identifier is not.
	if (type === TT_AT_KEYWORD) {
		return unescapeIdentifier(text.slice(1)).toLowerCase();
	}
	if (type === TT_HASH) return unescapeIdentifier(text.slice(1));
	if (type === TT_FUNCTION) {
		return unescapeIdentifier(text.slice(0, -1)).toLowerCase();
	}
	if (type === TT_STRING) return unescapeIdentifier(text.slice(1, -1));
	if (type === TT_DIMENSION) {
		const at = token.unitStart - token.start;
		return `${Number(text.slice(0, at))}${text.slice(at).toLowerCase()}`;
	}
	if (type === TT_NUMBER || type === TT_PERCENTAGE) {
		return String(Number(type === TT_PERCENTAGE ? text.slice(0, -1) : text));
	}
	return text;
};

/**
 * @typedef {object} Site
 * @property {number} start where the token begins
 * @property {number} end where it ends
 * @property {number} type which token it is
 * @property {string} text the token as the source spelled it
 * @property {number} unitStart where a dimension's unit begins, or -1
 */

/**
 * Where a custom property's value sits. Its value is an arbitrary token stream
 * the spec keeps as authored — `var()` substitutes it into somewhere else, so
 * nothing may normalize it — which makes it the one region where how something
 * was spelled decides the output on purpose.
 * @param {string} css a stylesheet
 * @returns {[number, number][]} each range, in source order
 */
const customPropertyRanges = (css) => {
	/** @type {[number, number][]} */
	const ranges = [];
	/** @type {Record<number, { enter: () => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {
		[NodeType.Declaration]: {
			enter: () => {},
			exit: (nodePath) => {
				if (nodePath.name().startsWith("--")) {
					ranges.push([nodePath.start(), nodePath.end()]);
				}
			}
		}
	};
	new SourceProcessor().use(visitors).process(css, {});
	return ranges;
};

/**
 * Every token a respelling could rewrite, in source order.
 * @param {string} css a stylesheet
 * @returns {Site[]} the sites
 */
const cssSites = (css) => {
	const kept = customPropertyRanges(css);
	const stream = new TokenStream(css);
	/** @type {Site[]} */
	const sites = [];
	// Both are in source order, so the ranges are walked alongside the tokens
	// rather than searched for each one: a stylesheet of custom properties holds
	// thousands, and asking every token about all of them is quadratic.
	let range = 0;
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		while (range < kept.length && kept[range][1] <= token.start) range++;
		if (range < kept.length && token.start >= kept[range][0]) continue;
		sites.push({
			start: token.start,
			end: token.end,
			type: token.type,
			text: css.slice(token.start, token.end),
			unitStart: token.type === TT_DIMENSION ? token.unitStart : -1
		});
	}
	return sites;
};

/**
 * One character of an identifier written as the escape §4.3.7 resolves to the
 * same character, which is the spelling a minifier comparing raw text misses.
 * @param {string} name an identifier, or the name part of one
 * @returns {string | null} it with its first ASCII letter escaped, or null
 */
const asEscaped = (name) => {
	const at = name.search(/[a-z]/i);
	if (at === -1) return null;
	const code = name.charCodeAt(at).toString(16);
	// The space ends the escape, so the character after it stays its own.
	return `${name.slice(0, at)}\\${code} ${name.slice(at + 1)}`;
};

/**
 * @param {string} text a string token as written, delimiters included
 * @param {string} quote the delimiter to write it with
 * @returns {string | null} the same string under that delimiter, or null
 */
const asQuoted = (text, quote) => {
	const had = text[0];
	if (had !== '"' && had !== "'") return null;
	if (had === quote) return null;
	// Unterminated at end of input: re-delimiting it would close it.
	if (text.length < 2 || text[text.length - 1] !== had) return null;
	const body = text.slice(1, -1);
	// Already escaped for the old delimiter, and the new one is not escaped at
	// all: both would have to be rewritten, so leave those alone.
	if (body.includes("\\") || body.includes(quote)) return null;
	return `${quote}${body}${quote}`;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the row is labelled
 * @property {(site: Site) => string | null} write the token's new source text, or null to leave it alone
 */

/**
 * Each writes the same value a different way, which the spec says in so many
 * words: §4.3.7 for an escape, an ASCII case-insensitive match for a unit and
 * an at-rule name.
 *
 * WHY: an identifier is deliberately not case-respelled, though a property name
 * and a keyword are case-insensitive too. Which of those an identifier is
 * depends on where it sits, and a class, an id, a custom property, a font
 * family and a counter name are all case-sensitive — so a case respelling there
 * would report the printer for keeping a distinction the source made.
 * @type {Respelling[]}
 */
const CSS_RESPELLINGS = [
	{
		name: "escape",
		write: (site) => (site.type === TT_IDENTIFIER ? asEscaped(site.text) : null)
	},
	{
		name: "quote-double",
		write: (site) => (site.type === TT_STRING ? asQuoted(site.text, '"') : null)
	},
	{
		name: "quote-single",
		write: (site) => (site.type === TT_STRING ? asQuoted(site.text, "'") : null)
	},
	{
		name: "leading-zero",
		write: (site) => {
			if (site.type !== TT_NUMBER && site.type !== TT_DIMENSION) return null;
			const written = site.text.replace(/^([+-]?)\./, "$10.");
			return written === site.text ? null : written;
		}
	},
	{
		name: "unit-case",
		write: (site) => {
			if (site.unitStart === -1) return null;
			const unit = site.text.slice(site.unitStart - site.start);
			const upper = unit.toUpperCase();
			return upper === unit
				? null
				: `${site.text.slice(0, site.unitStart - site.start)}${upper}`;
		}
	},
	{
		name: "at-keyword-case",
		write: (site) => {
			if (site.type !== TT_AT_KEYWORD) return null;
			const upper = site.text.toUpperCase();
			return upper === site.text ? null : upper;
		}
	}
];

// A divergence the printer has not answered for yet, with what it is. Read by
// the report and the gate: an entry matching nothing is itself a finding, so
// the fix retires its entry rather than leaving it to rot.
/** @type {import("./compare-tools-harness").Expected[]} */
const EXPECTED = [
	{
		relation: "respelling escape",
		// Every one of them writes an escape, and nothing else in this relation
		// does, so the backslash is what they have in common.
		contains: "\\",
		why: "the printed name keeps the source's spelling, so an escaped one costs the bytes the escape takes — the lookups behind it read the unescaped name, which is what `fix(css): read an escaped property name as the name it spells` settled. Unescaping the printed name where the plain spelling is valid would retire this; it is a re-encoding, so it has to show a compressed win first"
	},
	{
		relation: "respelling leading-zero",
		contains: "-> 0",
		why: "the printer leaves scientific notation alone on purpose — `_normalizeNumber` says so in as many words — so `opacity:0.2e2` keeps every byte, and an `@supports` prelude is kept as authored because it is a feature test rather than a declaration to print. Both are judgements to revisit rather than defects; retire this entry if either changes"
	}
];

/**
 * @param {string} css a stylesheet
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {string} the stylesheet, respelled
 */
const respell = (css, sites, respelling) => {
	let out = "";
	let read = 0;
	for (const site of sites) {
		const written = respelling.write(site);
		if (written === null) continue;
		out += css.slice(read, site.start) + written;
		read = site.end;
	}
	return out + css.slice(read);
};

/** @typedef {{ kind: "differs" | "bytes" | "throws", delta: number, note: string }} Finding */

/**
 * Whether respelling these sites moved the output, and how. An output of the
 * same length saying the same thing is not a finding: webpack keeps the
 * source's spelling where nothing beats it.
 * @param {(css: string) => string} minify the printer under test
 * @param {string} css a stylesheet
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {Finding | null} what moved, or null
 */
const spellingFinding = (minify, css, minified, sites, respelling) => {
	const mutated = respell(css, sites, respelling);
	if (mutated === css) return null;
	// Verified against the tokenizer rather than argued for: a respelling that
	// moved the stylesheet is dropped instead of reported.
	if (tokenMeaning(mutated) !== tokenMeaning(css)) return null;
	/** @type {string} */
	let answer;
	try {
		answer = minify(mutated);
	} catch (error) {
		return { kind: "throws", delta: 0, note: thrownText(error) };
	}
	if (answer === minified) return null;
	const says = tokenMeaning(answer) !== tokenMeaning(minified);
	if (!says && answer.length === minified.length) return null;
	return {
		kind: says ? "differs" : "bytes",
		delta: answer.length - minified.length,
		note: ""
	};
};

/**
 * What the report shows for a set of sites: how they were written, and how the
 * respelling writes them, each cut to a line around the first place they part.
 * @param {Site[]} sites the sites carrying the finding
 * @param {Respelling} respelling how they are respelled
 * @returns {string} the repro
 */
const reproOf = (sites, respelling) => {
	const from = sites.map((site) => site.text).join(" ");
	const to = sites.map((site) => respelling.write(site) || site.text).join(" ");
	// Shown from where they part rather than from the start, which for sites
	// past the line is the same prefix twice with the respelling itself cut off
	// — where the entry answering for it, read off this string, misses it too.
	let at = 0;
	while (at < from.length && at < to.length && from[at] === to[at]) at++;
	const start = at < 60 ? 0 : at - 16;
	const cut = (/** @type {string} */ text) =>
		start === 0 ? text : `…${text.slice(start)}`;
	return `    ${oneLine(cut(from), 76)}\n      -> ${oneLine(cut(to), 76)}`;
};

/**
 * Every respelling this stylesheet's output depends on.
 * @param {(css: string) => string} minify the printer under test
 * @param {string} css a stylesheet
 * @param {string} minified what it minifies to
 * @returns {import("./compare-tools-harness").Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (minify, css, minified) => {
	/** @type {import("./compare-tools-harness").Report[]} */
	const reports = [];
	const sites = cssSites(css);
	for (const respelling of CSS_RESPELLINGS.filter((one) =>
		wantedSpelling(one.name)
	)) {
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(minify, css, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const relation = `respelling ${respelling.name}`;
		// Bisecting costs a minify of the whole stylesheet per step, and it is
		// there to name a repro for something that needs looking at. A divergence
		// already answered for needs none, so the sites it was found over stand.
		const answered = EXPECTED.some(
			(entry) =>
				entry.relation === relation &&
				reproOf(sites, respelling).includes(entry.contains)
		);
		const carried =
			found.kind === "throws" || answered
				? sites
				: shrink(holds, sites, found.kind);
		const blamed = (carried === sites ? found : holds(carried)) || found;
		reports.push({
			relation,
			what:
				blamed.kind === "throws"
					? `threw: ${blamed.note}`
					: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro: reproOf(carried, respelling)
		});
	}
	return reports;
};

const wantedRelation = filterFrom("RELATION");
const wantedSpelling = filterFrom("SPELLING");
const wantedPreset = filterFrom("PRESET");

/**
 * The stylesheets the invariants are swept over: the repo's own fixtures, plus
 * whatever framework stylesheets the comparison installed.
 * @returns {[string, string][]} `[label, css]` for every stylesheet
 */
// What the last sweep did not find, read by the report and by the gate.
/** @type {string[]} */
let _missingFixtures = [];

const invariantFixtures = () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const file of collectFiles(
		path.join(ROOT, "test"),
		".css",
		SKIPPED_FIXTURE_DIRS
	)) {
		out.push([
			path.relative(ROOT, file).replace(/\\/g, "/"),
			fs.readFileSync(file, "utf8")
		]);
	}
	/** @type {string[]} */
	const missing = [];
	for (const [label, file] of fixtures()) {
		if (fs.existsSync(file)) out.push([label, fs.readFileSync(file, "utf8")]);
		else missing.push(label);
	}
	return { corpus: out, missing };
};

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
		EXPECTED.filter(
			(entry) =>
				wantedRelation(entry.relation) && wantedSpelling(entry.relation)
		)
	);
	// Nothing is printed to reach this one, so it is read under no preset: what
	// the parser said about the stylesheet it was handed.
	if (wantedRelation("spans")) {
		log(`reading ranges over ${corpus.length} stylesheets …`);
		for (const [label, css] of corpus) {
			for (const report of cssSpans(css)) groups.add(report, "parse", label);
		}
	}
	if (wantedRelation("slices")) {
		let read = 0;
		let skipped = 0;
		let capped = 0;
		let repeats = 0;
		for (const [label, css] of corpus) {
			const answered = cssSlices(css);
			read += answered.read;
			skipped += answered.skipped;
			capped += answered.capped;
			repeats += answered.repeats;
			for (const report of answered.reports) groups.add(report, "parse", label);
		}
		log(
			`reparsed ${read} shapes on their own (${skipped} out of context, ${repeats} repeats, ${capped} past the budget) …`
		);
	}
	if (wantedRelation("purity")) {
		// Under one preset: what is asked is whether reading the same bytes again
		// gives the same answer, which every option set would ask the same way.
		const [, options] = presets[0] || PRESETS[0];
		const print = printerFor(options);
		const { reports, read } = purityRelation(
			corpus.map(([label, css]) => ({
				what: label,
				digest: () => cssPurityDigest(css, print)
			}))
		);
		for (const report of reports) {
			groups.add(report, "parse", report.repro.trim());
		}
		log(`read ${read} stylesheets twice over …`);
	}
	// The printer's two relations share a sweep: both need the output, and
	// printing it twice to ask two questions of it would double the run.
	const wantsIdempotence = wantedRelation("idempotence");
	const wantsRespelling = wantedRelation("respelling");
	if (wantsIdempotence || wantsRespelling) {
		log(
			`sweeping ${corpus.length} stylesheets under ${presets.length} presets …`
		);
		for (const [label, css] of corpus) {
			for (const [preset, options] of presets) {
				const print = printerFor(options);
				const { printed, reports } = wantsIdempotence
					? idempotence({ minify: print, source: css, says: tokenStream })
					: { printed: print(css), reports: [] };
				for (const report of reports) groups.add(report, preset, label);
				// Under the first preset only: whether a spelling decides the
				// output is the same question under every option set, and each
				// asking of it is a full minify of the whole stylesheet.
				if (printed === null || !wantsRespelling || preset !== presets[0][0]) {
					continue;
				}
				for (const report of sweepRespellings(print, css, printed)) {
					groups.add(report, preset, label);
				}
			}
		}
	}
	if (wantsIdempotence) {
		let cut = 0;
		for (const [label, css] of corpus) {
			for (const [where, source] of cssCuts(css)) {
				cut++;
				for (const [preset, options] of presets) {
					const { reports } = idempotence({
						minify: printerFor(options),
						source,
						says: tokenStream
					});
					for (const report of reports) {
						groups.add(report, preset, `${label}, cut ${where}`);
					}
				}
			}
		}
		log(`… and ${cut} of them cut short inside a token …`);
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
	const postcss = load("postcss");
	const selectorParser = load("postcss-selector-parser");
	for (const [label, file] of fixtures().filter(([name]) =>
		wantedFixture(name)
	)) {
		// A trailing sourceMappingURL is a build artifact, not stylesheet content,
		// and the tools disagree on keeping it.
		const css = (await fs.promises.readFile(file, "utf8")).replace(
			/\/\*#\s*sourceMappingURL=[^*]*\*\/\s*$/,
			""
		);
		const before = classSelectors(postcss, selectorParser, css);
		const noticesBefore = legalNotices(css);
		const input = await compress(Buffer.from(css));
		process.stdout.write(
			`\n${label} — ${kb(input.raw)} (${kb(input.gzip)} gzip, ${kb(
				input.brotli
			)} brotli, ${kb(input.zstd)} zstd), ${before.size} classes\n`
		);
		for (const stage of STAGES.filter(wantedStage)) {
			const tools = TOOLS.filter(
				(tool) => tool.stage === stage && wantedTool(tool.name)
			);
			if (tools.length === 0) continue;
			process.stdout.write(
				stage === "parse"
					? `  ${"parse".padEnd(26)}${"ms".padStart(8)}${"cpu".padStart(
							7
						)}${"peak".padStart(9)}\n`
					: `  ${stage.padEnd(26)}${"out".padStart(10)}${"gzip".padStart(
							9
						)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
							9
						)}${"ms".padStart(7)}${"cpu".padStart(6)}${"peak".padStart(
							8
						)}${"2nd".padStart(7)}   lost\n`
			);
			for (const tool of tools) {
				const result = await measureInWorker(__filename, stage, tool.name, css);
				if ("error" in result) {
					// A tool rejecting the stylesheet outright is a comparison result too.
					process.stdout.write(
						`  ${tool.name.padEnd(26)} rejects it: ${result.error}\n`
					);
					continue;
				}
				const cost = formatCost(result, tool.external);
				if (stage === "parse") {
					process.stdout.write(
						`  ${
							tool.name.padEnd(26) +
							cost.wall.padStart(8) +
							cost.cpu.padStart(7) +
							cost.peak.padStart(9)
						}\n`
					);
					continue;
				}
				const code = /** @type {string} */ (result.code);
				const after = classSelectors(postcss, selectorParser, code);
				const lost = [...before].filter((name) => !after.has(name));
				const notices = noticesBefore - legalNotices(code);
				const out = await compress(Buffer.from(code));
				process.stdout.write(
					`  ${
						tool.name.padEnd(26) +
						kb(out.raw).padStart(10) +
						kb(out.gzip).padStart(9) +
						`${(100 - (out.gzip / input.gzip) * 100).toFixed(1)}%`.padStart(8) +
						kb(out.brotli).padStart(9) +
						kb(out.zstd).padStart(9) +
						cost.wall.padStart(7) +
						cost.cpu.padStart(6) +
						cost.peak.padStart(8) +
						formatSecond(result.second).padStart(7)
					}   ${lossColumn(lost.length, lost.slice(0, 3), notices)}\n`
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

// Where the cache holds each fixture, for a reader that is not this script.
module.exports = {
	CACHE,
	INSTALLED_FIXTURES,
	GENERATED_FIXTURES: /** @type {[string, string][]} */ (
		GENERATED_FIXTURES.map(([label, file]) => [label, file])
	)
};
