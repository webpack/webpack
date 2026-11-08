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

const { execFile: execFileCallback } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const zlib = require("zlib");
const cssMinify = require("../lib/css/cssMinify");
const { SourceProcessor } = require("../lib/css/syntax");
const cssSyntaxParser = require("../lib/css/syntax-parser");

const { Flag, NodeType, Part, isIdentStartCodePoint, unescapeIdentifier } =
	cssSyntaxParser;

const {
	CSS_RESPELLINGS,
	DEFAULT_OPTIONS,
	EXPECTED,
	MODERN_BROWSERS,
	PRESETS,
	TARGET_OPTIONS,
	TARGET_VARS_OPTIONS,
	cssCuts,
	cssPurityDigest,
	cssSlices,
	cssSpans,
	printerFor,
	sweepRespellings,
	tokenStream
} = require("../test/helpers/syntaxInvariants/css");
const {
	STAGES,
	TreeEvents,
	agreement,
	agreementInvariant,
	collectFiles,
	compress,
	exists,
	filterFrom,
	findingGroups,
	formatCost,
	formatProfile,
	formatSecond,
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
	purityRelation,
	run,
	sweepExitCode,
	sweepMode,
	wantedExpectations,
	wantedRespelling
} = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "css-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);
const execFile = promisify(execFileCallback);

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

// Packages whose dependency trees dwarf the one stylesheet read from them — a
// component library installs its framework and icons too — are fetched as a
// lone tarball each, pinned in `stylesheets.json`, and only that file is kept.
/** @type {{ label: string, package: string, version: string, file: string, integrity: string }[]} */
const PACKED_STYLESHEETS = require("./comparison/css-tool-comparison/stylesheets.json");

/** @type {[string, string][]} */
const PACKED_FIXTURES = PACKED_STYLESHEETS.map((one) => [
	one.label,
	path.join(
		"stylesheets",
		`${one.package.replace(/^@/, "").replace(/\//g, "-")}-${one.version}`,
		path.basename(one.file)
	)
]);

/**
 * One file out of a gzipped npm tarball, wherever its top directory is named.
 * Reads ustar headers, so a `prefix` field and a pax header in front of a long
 * name both resolve.
 * @param {Buffer} tarball the `.tgz` as fetched
 * @param {string} file the path inside the package
 * @returns {Buffer | undefined} its content, or undefined where it is absent
 */
const extractPackedFile = (tarball, file) => {
	const tar = zlib.gunzipSync(tarball);
	/** @type {string | undefined} */
	let longName;
	for (let at = 0; at + 512 <= tar.length;) {
		const header = tar.subarray(at, at + 512);
		if (header[0] === 0) break;
		const field = (/** @type {number} */ from, /** @type {number} */ to) =>
			header.toString("utf8", from, to).replace(/\0[\s\S]*$/, "");
		const size = Number.parseInt(field(124, 136).trim() || "0", 8);
		const type = field(156, 157);
		const body = tar.subarray(at + 512, at + 512 + size);
		at += 512 + Math.ceil(size / 512) * 512;
		if (type === "x") {
			const match = /\d+ path=([^\n]*)\n/.exec(body.toString("utf8"));
			if (match !== null) longName = match[1];
			continue;
		}
		const prefix = field(345, 500);
		const name =
			longName !== undefined
				? longName
				: prefix.length === 0
					? field(0, 100)
					: `${prefix}/${field(0, 100)}`;
		longName = undefined;
		if (
			(type === "0" || type === "") &&
			name.slice(name.indexOf("/") + 1) === file
		) {
			return Buffer.from(body);
		}
	}
	return undefined;
};

/**
 * Fetch every stylesheet `stylesheets.json` pins that the cache lacks.
 * @returns {Promise<void>}
 */
const fetchPackedStylesheets = async () => {
	for (const [i, one] of PACKED_STYLESHEETS.entries()) {
		const target = path.join(CACHE, PACKED_FIXTURES[i][1]);
		if (await exists(target)) continue;
		log(`fetching ${one.package}@${one.version} …`);
		const directory = path.dirname(target);
		await fs.promises.mkdir(directory, { recursive: true });
		// On Windows `npm` is a `.cmd`, which only a shell runs, and a shell joins
		// arguments unquoted: the tarball lands in `cwd`, so no path is one.
		const { stdout } = await execFile(
			"npm",
			["pack", `${one.package}@${one.version}`, "--json"],
			{
				cwd: directory,
				maxBuffer: 64 * 1024 * 1024,
				shell: process.platform === "win32"
			}
		);
		const [packed] = JSON.parse(stdout);
		const tarball = path.join(directory, packed.filename);
		if (packed.integrity !== one.integrity) {
			throw new Error(
				`${one.package}@${one.version} is ${packed.integrity}, pinned as ${one.integrity}`
			);
		}
		const content = extractPackedFile(
			await fs.promises.readFile(tarball),
			one.file
		);
		await fs.promises.rm(tarball);
		if (content === undefined) {
			throw new Error(`${one.package}@${one.version} holds no ${one.file}`);
		}
		await fs.promises.writeFile(target, content);
	}
};

const setup = async () => {
	await installPackages(CACHE_NAME);
	await fetchPackedStylesheets();
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
	),
	...PACKED_FIXTURES.map(
		([label, file]) =>
			/** @type {[string, string]} */ ([label, path.join(CACHE, file)])
	)
];

/** @typedef {import("../lib/css/syntax-parser").CssPath} CssPath */

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

// --- Parser agreement -------------------------------------------------------

// css-tree is the reference the trees are held to; postcss builds the same
// rules, at-rules and declarations. The others build trees of their own.
const REFERENCE_PARSER = "css-tree";

/**
 * A prelude or value as the readers compare it: comments dropped, whitespace
 * runs collapsed. Each side's own source text, so no printer respells it.
 * @param {string} text what the source wrote
 * @returns {string} it compared
 */
const comparedText = (text) =>
	text
		.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, " ")
		.replace(/\s+/g, " ")
		.trim();

/**
 * Whether a declaration's name opens with an identifier, which is all the spec
 * reads as one: an IE hack such as `*zoom` is a parse error, dropped.
 * @param {string} name a declaration's name
 * @returns {boolean} true when the spec keeps the declaration
 */
const startsIdentifier = (name) => {
	const first = name.charCodeAt(0);
	if (first === 0x2d) {
		const second = name.charCodeAt(1);
		return isIdentStartCodePoint(second) || second === 0x2d || second === 0x5c;
	}
	return isIdentStartCodePoint(first) || first === 0x5c;
};

/**
 * @param {TreeEvents} events the tree so far
 * @param {string} property a declaration's name
 * @param {string} value its value
 * @param {boolean} important whether it carries `!important`
 * @param {(name: string) => string} decode the reader's own escape decoder, read the name with
 */
const declaration = (events, property, value, important, decode) => {
	if (!startsIdentifier(property)) return;
	events.leaf(
		`${decode(property)}: ${comparedText(value)}${
			important ? " !important" : ""
		}`
	);
};

/**
 * @param {string} name an at-rule's name
 * @param {string} prelude its prelude
 * @param {boolean} block whether it has a block
 * @param {(name: string) => string} decode the reader's own escape decoder, read the name with
 * @returns {string} what its start says, as every reader writes it
 */
const atRuleOf = (name, prelude, block, decode) => {
	const compared = comparedText(prelude);
	return `@${decode(name)}${compared === "" ? "" : ` ${compared}`}${
		block ? " {" : ";"
	}`;
};

/**
 * css-tree's tree, as the agreement column reads it. A prelude or value is
 * read off its source range. Inside a style rule, css-tree gives up on a block
 * mixing declarations and rules, and reads an at-rule's block as rules alone, so
 * both are read again below.
 * @param {string} css a stylesheet
 * @returns {TreeEvents} what it says
 */
const cssTreeTree = (css) => {
	const cssTree = load("css-tree");
	const events = new TreeEvents();
	/**
	 * @param {EXPECTED_ANY} node a css-tree node
	 * @returns {string} its source
	 */
	const source = (node) =>
		node === null
			? ""
			: comparedText(css.slice(node.loc.start.offset, node.loc.end.offset));
	/**
	 * @param {number} start where to parse from
	 * @param {number} end where to stop
	 * @param {string} context what to parse it as
	 * @returns {EXPECTED_ANY[]} the nodes it holds
	 */
	const parse = (start, end, context) => [
		...cssTree.parse(css.slice(start, end), {
			context,
			positions: true,
			offset: start,
			parseValue: false,
			parseAtrulePrelude: false,
			parseCustomProperty: false
		}).children
	];
	/**
	 * Part of a style rule's block, read as declarations, else as rules,
	 * whichever reads its start; what neither does reads `unparsed`. Each pass
	 * reads past one node, so a `Raw` node it leaves is shorter.
	 * @param {number} start where the part starts
	 * @param {number} end where it ends
	 */
	const reread = (start, end) => {
		let at = start;
		while (at < end) {
			let nodes = parse(at, end, "declarationList");
			if (nodes.length === 0) return;
			if (nodes[0].type === "Raw") nodes = parse(at, end, "stylesheet");
			if (nodes.length === 0 || nodes[0].type === "Raw") {
				events.leaf(`unparsed ${comparedText(css.slice(at, end))}`);
				return;
			}
			at = end;
			for (let i = 0; i < nodes.length; i++) {
				// Read as rules, a declaration after one runs into the next
				// selector, which a `;` gives away: read on from it afresh.
				if (
					i > 0 &&
					nodes[i].type === "Rule" &&
					source(nodes[i].prelude).includes(";")
				) {
					at = nodes[i].loc.start.offset;
					break;
				}
				walk([nodes[i]], true);
			}
		}
	};
	/**
	 * @param {Iterable<EXPECTED_ANY>} list a css-tree list
	 * @param {boolean} nested whether it is inside a style rule
	 */
	const walk = (list, nested) => {
		for (const node of list) {
			if (node.type === "Rule") {
				const prelude = source(node.prelude);
				events.open(prelude, `rule ${prelude}`);
				walk(node.block.children, true);
				events.close("}");
			} else if (node.type === "Atrule") {
				const { block } = node;
				events.open(
					`@${node.name}`,
					atRuleOf(
						node.name,
						source(node.prelude),
						Boolean(block),
						cssTree.ident.decode
					)
				);
				if (block && nested) {
					const { start, end } = block.loc;
					reread(
						start.offset + 1,
						css.charCodeAt(end.offset - 1) === 0x7d
							? end.offset - 1
							: end.offset
					);
				} else if (block) {
					walk(block.children, false);
				}
				events.close(block ? "}" : "");
			} else if (node.type === "Declaration") {
				declaration(
					events,
					node.property,
					source(node.value),
					node.important,
					cssTree.ident.decode
				);
			} else if (node.type === "Raw") {
				// A stray `;` is no statement: the spec discards it (§5.4.5).
				if (/^[\s;]*$/.test(source(node))) continue;
				if (nested) {
					reread(node.loc.start.offset, node.loc.end.offset);
				} else {
					events.leaf(`unparsed ${source(node)}`);
				}
			}
		}
	};
	walk(parse(0, css.length, "stylesheet"), false);
	return events;
};

/**
 * One node of webpack's tree, held until its block is complete.
 * @typedef {object} HeldNode
 * @property {number} start where it starts in the stylesheet
 * @property {string} name its name in the path, or "" for a declaration
 * @property {string} said what its start says, or the declaration itself
 * @property {string | undefined} end what its end says; none for a declaration
 * @property {HeldNode[]} children what its block holds
 */

/**
 * webpack's tree, as the agreement column reads it. The walk visits a block's
 * declarations before its nested rules (the parse-css.js model, §5.4.5), so a
 * block's contents are put back in source order, the order a printer keeps.
 * @param {string} css a stylesheet
 * @returns {TreeEvents} what it says
 */
const webpackTree = (css) => {
	/** @type {HeldNode} */
	const root = { start: 0, name: "", said: "", end: "", children: [] };
	/** @type {HeldNode[]} */
	const open = [root];
	/**
	 * @param {number} start where the node starts
	 * @param {string} name its name in the path
	 * @param {string} said what its start says
	 * @param {string | undefined} end what its end says
	 */
	const hold = (start, name, said, end) => {
		/** @type {HeldNode} */
		const node = { start, name, said, end, children: [] };
		open[open.length - 1].children.push(node);
		if (end !== undefined) open.push(node);
	};
	/** @type {Record<number, { enter: (nodePath: CssPath) => void, exit: (nodePath: CssPath) => void }>} */
	const visitors = {
		[NodeType.QualifiedRule]: {
			enter: (nodePath) => {
				// A rule the input ends before its block opens is a parse error, dropped.
				const block = /** @type {[number, number]} */ (
					nodePath.rangeOf(Part.block)
				);
				const prelude = comparedText(
					nodePath.source(nodePath.start(), block[0])
				);
				hold(nodePath.start(), prelude, `rule ${prelude}`, "}");
			},
			exit: () => {
				open.pop();
			}
		},
		[NodeType.AtRule]: {
			enter: (nodePath) => {
				const block = nodePath.rangeOf(Part.block);
				const name = /** @type {[number, number]} */ (
					nodePath.rangeOf(Part.name)
				);
				const prelude = nodePath.source(
					name[1],
					block ? block[0] : nodePath.end()
				);
				const written = nodePath.source(name[0], name[1]);
				hold(
					nodePath.start(),
					`@${written}`,
					atRuleOf(
						written,
						block ? prelude : prelude.replace(/;\s*$/, ""),
						block !== null,
						unescapeIdentifier
					),
					block ? "}" : ""
				);
			},
			exit: () => {
				open.pop();
			}
		},
		[NodeType.Declaration]: {
			enter: (nodePath) => {
				const name = /** @type {[number, number]} */ (
					nodePath.rangeOf(Part.name)
				);
				const value = nodePath.rangeOf(Part.value);
				const held = new TreeEvents();
				declaration(
					held,
					nodePath.source(name[0], name[1]),
					value ? nodePath.source(value[0], value[1]) : "",
					nodePath.flag(Flag.important),
					unescapeIdentifier
				);
				for (const [, , said] of held.list) {
					hold(nodePath.start(), "", said, undefined);
				}
				nodePath.skipChildren();
			},
			exit: () => {}
		}
	};
	new SourceProcessor().use(visitors).process(css, {});
	const events = new TreeEvents();
	/**
	 * @param {HeldNode[]} nodes one block's contents
	 */
	const emit = (nodes) => {
		for (const node of nodes.sort((a, b) => a.start - b.start)) {
			if (node.end === undefined) {
				events.leaf(node.said);
				continue;
			}
			events.open(node.name, node.said);
			emit(node.children);
			events.close(node.end);
		}
	};
	emit(root.children);
	return events;
};

/**
 * postcss's tree, as the agreement column reads it: each prelude and value as
 * the source wrote it, which postcss keeps in `raws` where a comment cleaned it,
 * and each declaration's name with the IE hack (`_`, `*`) it moves into `raws`.
 * @param {string} css a stylesheet
 * @returns {TreeEvents} what it says
 */
const postcssTree = (css) => {
	const postcss = load("postcss");
	// postcss keeps names as written, so they are read with the reference's decoder.
	const { decode } = load("css-tree").ident;
	const events = new TreeEvents();
	/**
	 * @param {EXPECTED_ANY} parent a postcss container
	 */
	const walk = (parent) => {
		for (const node of parent.nodes) {
			if (node.type === "rule") {
				const prelude = comparedText(
					node.raws.selector ? node.raws.selector.raw : node.selector
				);
				events.open(prelude, `rule ${prelude}`);
				walk(node);
				events.close("}");
			} else if (node.type === "atrule") {
				events.open(
					`@${node.name}`,
					atRuleOf(node.name, node.params, node.nodes !== undefined, decode)
				);
				if (node.nodes) walk(node);
				events.close(node.nodes ? "}" : "");
			} else if (node.type === "decl") {
				declaration(
					events,
					/** @type {RegExpExecArray} */ (
						/[^\s;]*$/.exec(node.raws.before)
					)[0] + node.prop,
					node.raws.value ? node.raws.value.raw : node.value,
					Boolean(node.important),
					decode
				);
			}
		}
	};
	walk(postcss.parse(css));
	return events;
};

/** @type {Map<string, import("./compare-tools-harness").TreeReader>} */
const TREE_READERS = new Map([
	["webpack", webpackTree],
	["postcss", postcssTree],
	[REFERENCE_PARSER, cssTreeTree]
]);

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

// The inputs the unit tests read, one directory each: `css/invariants.unittest.js`
// holds every one of them to these relations, with its own known differences.
const UNIT_INPUT_RE = /^test\/fixtures\/css\/[^/]+\/index\.css$/;

const wantedRelation = filterFrom("RELATION");
const wantedPreset = filterFrom("PRESET");

/**
 * The stylesheets the invariants are swept over: the repo's own fixtures, plus
 * whatever framework stylesheets the comparison installed.
 * @returns {[string, string][]} `[label, css]` for every stylesheet
 */
// What the last sweep did not find, read by the report and by the gate.
/** @type {string[]} */
let _missingFixtures = [];

// A stylesheet for the branches the corpus never takes: every reducer shape
// below counted zero over every stylesheet on disk, and each stands beside a
// value it must decline, which is what reads the guard and not the branch.
const COLD_BRANCHES = `.m1{transform:matrix(2,0,0,3,0,0)}
.m2{transform:matrix(1,0,0,1,10,20)}
.m3{transform:matrix(0,1,-1,0,0,0)}
.m4{transform:matrix(0,-1,1,0,0,0)}
.m5{transform:matrix(1,2,3,4,5,6)}
.d1{transform:matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,10,20,0,1)}
.d2{transform:matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,10,20,30,1)}
.d3{transform:matrix3d(2,0,0,0,0,3,0,0,0,0,4,0,0,0,0,1)}
.d4{transform:matrix3d(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)}
.z1{transform:scale3d(1,1,2)}
.z2{transform:rotate3d(1,1,0,45deg)}
.r0{color:rgb(from #808080 r g b)}
.r1{color:rgba(from #808080 r g b / 0.5)}
.r2{color:hsl(from #808080 h s l)}
.r3{color:hsla(from #808080 h s l / 0.5)}
.r4{color:hwb(from #808080 h w b)}
.r5{color:lab(from #808080 l a b)}
.r6{color:oklab(from #808080 l a b)}
.r7{color:lch(from #808080 l c h)}
.r8{color:oklch(from #808080 l c h)}
.r9{color:color(from #808080 srgb r g b)}
.r10{color:rgb(from currentcolor r g b)}
.f1{color:rgb(from oklch(0.5 0.1 200) r g b)}
.f2{color:rgb(from color-mix(in oklch,red,blue) r g b)}
.f3{color:color-mix(in oklch,oklch(70% .3 30),oklch(50% .2 250))}
.f4{color:oklch(from red calc(l * 0.8) c h)}
.u1{background:url(a\\(b\\).png)}
.k1 col || .k1 td{color:red}
`;
// The constructs the installed corpus barely reaches: each is in two of its
// stylesheets or fewer, several in none. Written in the shapes the rewrites act
// on — the same rule twice, a rule between two, and nested for the hoist.
const COLD_CONSTRUCTS = `@layer reset;
@layer reset, components, utilities;
@import url("a.css") layer(components) supports(display:grid) screen;
@view-transition{navigation:auto}
@view-transition{navigation:auto}
@font-feature-values F{@styleset{a:1}}
@font-feature-values F{@styleset{a:1}}
@font-palette-values --p{font-family:F;base-palette:1}
@font-palette-values --p{font-family:F;base-palette:1}
@position-try --t{inset:1px;margin:2px}
@position-try --t{inset:1px;margin:2px}
@counter-style c{system:cyclic;symbols:"x";suffix:" "}
@property --l{syntax:"<length>";inherits:false;initial-value:0px}
@layer a;
@layer a{.p1{top:0}}
@layer a;
@layer a{.p2{top:0}}
.m1{width:rem(10px,3px);height:mod(10px,3px)}
.m2{top:abs(-5px);left:sign(-3)}
.m3{width:pow(2,3)*1px;height:sqrt(16)*1px}
.m4{top:hypot(3px,4px);left:exp(1)*1px}
.m5{transform:rotate(atan2(1,1))}
.m6{width:round(up,10.2px,1px)}
.m7{width:round(up,10.2px,1px)}
.m8{width:calc(abs(-5px) + sqrt(16) * 1px)}
.a1{top:anchor(--x top);width:anchor-size(--x width)}
.i1{background:cross-fade(url(a.png) 50%,url(b.png))}
.i2{background:element(#src)}
.i3{background:image-set(url(a.png) 1x,url(b.png) 2x)}
.i4{background-image:paint(worklet)}
.c1{color:device-cmyk(0 0 0 1);background:device-cmyk(0 0 0 1)}
.c2{color:color(display-p3 1 0 0)}
.c3{color:color(display-p3 1 0 0)}
.s1:user-invalid{color:red}
.s2:fullscreen{color:red}
.s3:defined{color:red}
.s4:state(checked){color:red}
.s5::part(label){color:red}
.s6::slotted(span){color:red}
.t1:defined{top:0}
.mid{left:0}
.t2:defined{top:0}
.n1{&:defined{top:0}&:fullscreen{top:0}}
.n2{.x:state(on){top:0}.y:state(on){top:0}}
@supports selector(:has(a)){.f1{color:red}}
@supports not (display:grid){.f2{color:red}}
@media not all and (min-width:1px){.f3{color:red}}`;

const invariantFixtures = () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const file of collectFiles(
		path.join(ROOT, "test"),
		".css",
		SKIPPED_FIXTURE_DIRS
	)) {
		const label = path.relative(ROOT, file).replace(/\\/g, "/");
		if (UNIT_INPUT_RE.test(label)) continue;
		out.push([label, fs.readFileSync(file, "utf8")]);
	}
	// Written rather than installed: what ships repeats what ships, and these are
	// the constructs it does not.
	out.push(["cold constructs", COLD_CONSTRUCTS]);
	/** @type {string[]} */
	const missing = [];
	for (const [label, file] of fixtures()) {
		if (fs.existsSync(file)) out.push([label, fs.readFileSync(file, "utf8")]);
		else missing.push(label);
	}
	out.push(["cold branches", COLD_BRANCHES]);
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
	const referenceHeld = agreementInvariant({
		wanted: wantedRelation("agreement"),
		referenceName: REFERENCE_PARSER,
		reference: () => {
			load(REFERENCE_PARSER);
			return cssTreeTree;
		},
		tree: webpackTree,
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
	const wantsRespelling = CSS_RESPELLINGS.some((one) =>
		wantedRespelling(one.name)
	);
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
		const agrees = agreement(REFERENCE_PARSER, TREE_READERS, css);
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
						)}${"peak".padStart(9)}   agrees with ${REFERENCE_PARSER}\n`
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
						`  ${tool.name.padEnd(26)} ${
							result.timedOut ? "" : "rejects it: "
						}${result.error}\n`
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
						}   ${await agrees(tool.name)}\n`
					);
					process.stdout.write(formatProfile(result));
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

// Where the cache holds each fixture, for a reader that is not this script.
module.exports = {
	CACHE,
	COLD_BRANCHES,
	INSTALLED_FIXTURES,
	GENERATED_FIXTURES: /** @type {[string, string][]} */ (
		GENERATED_FIXTURES.map(([label, file]) => [label, file])
	),
	PACKED_FIXTURES,
	TREE_READERS,
	runMode,
	PRESETS,
	cssCuts,
	cssPurityDigest,
	cssSlices,
	cssSpans,
	printerFor,
	sweepRespellings,
	tokenStream
};
