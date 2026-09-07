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
const {
	STAGES,
	compress,
	exists,
	filterFrom,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker,
	run
} = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "css-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);

const PACKAGES = [
	"98.css@0.1",
	"@adobe/css-tools@4",
	"animate.css@4",
	"beercss@5",
	"bootstrap@5",
	"bulma@1",
	"clean-css@5",
	"crass@0.12",
	"css-tree@3",
	"csso@5",
	"cssnano@7",
	"cssnano-preset-advanced@9",
	"daisyui@5",
	"esbuild@0.25",
	"@fortawesome/fontawesome-free@6",
	"fomantic-ui-css@2",
	"foundation-sites@6",
	"lightningcss@1",
	"materialize-css@1",
	"milligram@1",
	"normalize.css@8",
	"@patternfly/patternfly@6",
	"@picocss/pico@2",
	"postcss@8",
	"postcss-selector-parser@7",
	"prettier@3",
	"@primer/css@21",
	"purecss@3",
	"sanitize.css@13",
	"@shoelace-style/shoelace@2",
	"spectre.css@0.5",
	"stylis@4",
	"@swc/css@0.0.28",
	"semantic-ui-css@2",
	"@tabler/core@1",
	"tachyons@4",
	"tailwindcss@4",
	"@tdewolff/minify@2",
	"@tailwindcss/cli@4",
	"uikit@3",
	"water.css@2"
];

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

const setup = async () => {
	await installPackages(CACHE_NAME, PACKAGES);
	for (const [source, out] of [
		[TAILWIND_APP, "tailwind-app.css"],
		[TAILWIND_WIDE, "tailwind-wide.css"],
		[TAILWIND_DAISYUI, "tailwind-daisyui.css"]
	]) {
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
/** @type {[string, string][]} */
const INSTALLED_FIXTURES = [
	["98.css", "98.css/dist/98.css"],
	["Animate.css 4", "animate.css/animate.css"],
	["Beer CSS 5", "beercss/dist/cdn/beer.css"],
	["Bootstrap 5 (full)", "bootstrap/dist/css/bootstrap.css"],
	["Bootstrap 5 (grid)", "bootstrap/dist/css/bootstrap-grid.css"],
	["Bulma 1", "bulma/css/bulma.css"],
	["Fomantic-UI 2", "fomantic-ui-css/semantic.css"],
	["Font Awesome 6", "@fortawesome/fontawesome-free/css/all.css"],
	["Foundation 6", "foundation-sites/dist/css/foundation.css"],
	["Materialize 1", "materialize-css/dist/css/materialize.css"],
	["Milligram 1", "milligram/dist/milligram.css"],
	["normalize.css 8", "normalize.css/normalize.css"],
	["PatternFly 6", "@patternfly/patternfly/patternfly-base.css"],
	["Pico 2", "@picocss/pico/css/pico.css"],
	["Primer 21", "@primer/css/dist/primer.css"],
	["Pure 3", "purecss/build/pure.css"],
	["sanitize.css 13", "sanitize.css/sanitize.css"],
	["Semantic UI 2", "semantic-ui-css/semantic.css"],
	["Shoelace 2 (light)", "@shoelace-style/shoelace/dist/themes/light.css"],
	["Spectre 0.5", "spectre.css/dist/spectre.css"],
	["Tabler 1", "@tabler/core/dist/css/tabler.css"],
	["Tachyons 4", "tachyons/css/tachyons.css"],
	["UIkit 3", "uikit/dist/css/uikit.css"],
	["Water.css 2", "water.css/out/water.css"]
];

/**
 * @returns {[string, string][]} `[label, file]` for every fixture
 */
const fixtures = () => [
	.../** @type {[string, string][]} */ (
		INSTALLED_FIXTURES.map(([label, file]) => [label, path.join(MODULES, file)])
	),
	["Tailwind 4 (app-sized)", path.join(CACHE, "tailwind-app.css")],
	["Tailwind 4 (wide utilities)", path.join(CACHE, "tailwind-wide.css")],
	["Tailwind 4 + daisyUI 5", path.join(CACHE, "tailwind-daisyui.css")]
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
		name: "esbuild",
		stage: "beautify",
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
		create: () => async (css) => (await cssMinify({ "input.css": css })).code
	},
	{
		// The rivals strip the spellings a modern engine makes dead; webpack, told
		// nothing, keeps them. The two rows say what the target is worth.
		name: "webpack+target",
		stage: "minify",
		create: () => async (css) =>
			(
				await cssMinify({ "input.css": css }, undefined, {
					environment: { browsers: MODERN_BROWSERS }
				})
			).code
	},
	{
		// The rivals shorten a custom property's value the way they shorten any
		// other; webpack holds off unless told, since `getPropertyValue()` reads it.
		name: "webpack+target+vars",
		stage: "minify",
		create: () => async (css) =>
			(
				await cssMinify({ "input.css": css }, undefined, {
					environment: { browsers: MODERN_BROWSERS },
					rewriteCustomProperties: true
				})
			).code
	},
	{
		name: "esbuild",
		stage: "minify",
		create: () => {
			const esbuild = load("esbuild");
			return async (css) =>
				(await esbuild.transform(css, { loader: "css", minify: true })).code;
		}
	},
	{
		name: "esbuild+target",
		stage: "minify",
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

const main = async () => {
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
					? `  ${"parse".padEnd(20)}${"ms".padStart(8)}${"cpu".padStart(
							7
						)}${"peak".padStart(9)}\n`
					: `  ${stage.padEnd(20)}${"out".padStart(10)}${"gzip".padStart(
							9
						)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
							9
						)}${"ms".padStart(7)}${"cpu".padStart(6)}${"peak".padStart(
							8
						)}   lost\n`
			);
			for (const tool of tools) {
				const result = await measureInWorker(__filename, stage, tool.name, css);
				if ("error" in result) {
					// A tool rejecting the stylesheet outright is a comparison result too.
					process.stdout.write(
						`  ${tool.name.padEnd(20)} rejects it: ${result.error}\n`
					);
					continue;
				}
				if (stage === "parse") {
					process.stdout.write(
						`  ${
							tool.name.padEnd(20) +
							result.wall.toFixed(0).padStart(8) +
							result.cpu.toFixed(0).padStart(7) +
							`${(result.peak / 1024).toFixed(0)} MB`.padStart(9)
						}\n`
					);
					continue;
				}
				const code = /** @type {string} */ (result.code);
				const after = classSelectors(postcss, selectorParser, code);
				const lost = [...before].filter((name) => !after.has(name));
				const out = await compress(Buffer.from(code));
				process.stdout.write(
					`  ${
						tool.name.padEnd(20) +
						kb(out.raw).padStart(10) +
						kb(out.gzip).padStart(9) +
						`${(100 - (out.gzip / input.gzip) * 100).toFixed(1)}%`.padStart(8) +
						kb(out.brotli).padStart(9) +
						kb(out.zstd).padStart(9) +
						result.wall.toFixed(0).padStart(7) +
						result.cpu.toFixed(0).padStart(6) +
						`${(result.peak / 1024).toFixed(0)} MB`.padStart(8)
					}   ${
						lost.length === 0
							? "-"
							: `${lost.length} classes! e.g. ${lost.slice(0, 3).join(", ")}`
					}\n`
				);
			}
		}
	}
};

(process.argv[2] === "--measure" ? measure(TOOLS) : main()).catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});
