/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Compare webpack's own CSS minifier against the ecosystem's on real framework
// stylesheets, reporting size, speed and — the part a size table hides — whether
// the output still contains everything the input did.
//
//   node tooling/compare-css-minifiers.js
//
// The comparison packages are NOT webpack dependencies: they are installed into
// `node_modules/.cache/css-minifier-comparison` on first run, so nothing here
// reaches webpack's own dependency tree.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const cssMinify = require("../lib/css/cssMinify");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "node_modules/.cache/css-minifier-comparison");
const MODULES = path.join(CACHE, "node_modules");

const PACKAGES = [
	"animate.css@4",
	"bootstrap@5",
	"bulma@1",
	"clean-css@5",
	"csso@5",
	"cssnano@7",
	"daisyui@5",
	"esbuild@0.25",
	"@fortawesome/fontawesome-free@6",
	"foundation-sites@6",
	"lightningcss@1",
	"materialize-css@1",
	"milligram@1",
	"normalize.css@8",
	"@picocss/pico@2",
	"postcss@8",
	"postcss-selector-parser@7",
	"@primer/css@21",
	"purecss@3",
	"sanitize.css@13",
	"semantic-ui-css@2",
	"tachyons@4",
	"tailwindcss@4",
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

/**
 * @param {string} message progress line
 */
const log = (message) => {
	process.stderr.write(`${message}\n`);
};

const setup = () => {
	const manifest = path.join(CACHE, "package.json");
	// Reinstall when the package list changes, so an existing cache picks up
	// newly added fixtures instead of failing on their missing files.
	const installed =
		fs.existsSync(MODULES) && fs.existsSync(manifest)
			? JSON.parse(fs.readFileSync(manifest, "utf8")).comparisonPackages
			: undefined;
	if (JSON.stringify(installed) !== JSON.stringify(PACKAGES)) {
		log(`installing comparison packages into ${path.relative(ROOT, CACHE)} …`);
		fs.mkdirSync(CACHE, { recursive: true });
		if (!fs.existsSync(manifest)) {
			fs.writeFileSync(
				manifest,
				`${JSON.stringify(
					{ name: "css-minifier-comparison", private: true },
					null,
					2
				)}\n`
			);
		}
		execFileSync("npm", ["install", "--no-audit", "--no-fund", ...PACKAGES], {
			cwd: CACHE,
			stdio: "inherit"
		});
		// Recorded only after the install succeeded.
		const written = JSON.parse(fs.readFileSync(manifest, "utf8"));
		written.comparisonPackages = PACKAGES;
		fs.writeFileSync(manifest, `${JSON.stringify(written, null, 2)}\n`);
	}
	for (const [source, out] of [
		[TAILWIND_APP, "tailwind-app.css"],
		[TAILWIND_WIDE, "tailwind-wide.css"],
		[TAILWIND_DAISYUI, "tailwind-daisyui.css"]
	]) {
		const target = path.join(CACHE, out);
		if (fs.existsSync(target)) continue;
		log(`building ${out} …`);
		const input = path.join(CACHE, `${out}.in`);
		fs.writeFileSync(input, source);
		execFileSync(
			process.execPath,
			[
				path.join(MODULES, "@tailwindcss/cli/dist/index.mjs"),
				"-i",
				input,
				"-o",
				target
			],
			{ cwd: CACHE, stdio: "inherit" }
		);
	}
};

/**
 * @param {string} name package name
 * @returns {EXPECTED_ANY} the package's export
 */
const load = (name) => require(path.join(MODULES, name));

// Every installed stylesheet the comparison runs on: the component frameworks,
// the class-light/classless ones, and the non-framework solutions (icon fonts,
// animation and reset sheets) whose CSS looks nothing like a framework's.
/** @type {[string, string][]} */
const INSTALLED_FIXTURES = [
	["Animate.css 4", "animate.css/animate.css"],
	["Bootstrap 5 (full)", "bootstrap/dist/css/bootstrap.css"],
	["Bootstrap 5 (grid)", "bootstrap/dist/css/bootstrap-grid.css"],
	["Bulma 1", "bulma/css/bulma.css"],
	["Font Awesome 6", "@fortawesome/fontawesome-free/css/all.css"],
	["Foundation 6", "foundation-sites/dist/css/foundation.css"],
	["Materialize 1", "materialize-css/dist/css/materialize.css"],
	["Milligram 1", "milligram/dist/milligram.css"],
	["normalize.css 8", "normalize.css/normalize.css"],
	["Pico 2", "@picocss/pico/css/pico.css"],
	["Primer 21", "@primer/css/dist/primer.css"],
	["Pure 3", "purecss/build/pure.css"],
	["sanitize.css 13", "sanitize.css/sanitize.css"],
	["Semantic UI 2", "semantic-ui-css/semantic.css"],
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

/**
 * @returns {[string, (css: string) => string | Promise<string>][]} `[label, minify]` for every minifier
 */
const minifiers = () => {
	const postcss = load("postcss");
	const cssnano = load("cssnano");
	const lightningcss = load("lightningcss");
	const csso = load("csso");
	const CleanCSS = load("clean-css");
	const esbuild = load("esbuild");
	return [
		["webpack", (css) => cssMinify({ "input.css": css }).code],
		[
			"esbuild",
			(css) => esbuild.transformSync(css, { loader: "css", minify: true }).code
		],
		["csso", (css) => csso.minify(css).css],
		["clean-css L1", (css) => new CleanCSS({ level: 1 }).minify(css).styles],
		["clean-css L2", (css) => new CleanCSS({ level: 2 }).minify(css).styles],
		[
			"lightningcss",
			(css) =>
				lightningcss
					.transform({
						filename: "input.css",
						code: Buffer.from(css),
						minify: true
					})
					.code.toString("utf8")
		],
		[
			"cssnano",
			async (css) =>
				(await postcss([cssnano]).process(css, { from: undefined })).css
		]
	];
};

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

/**
 * @param {number} bytes a byte count
 * @returns {string} the count in KB, one decimal
 */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const main = async () => {
	setup();
	const postcss = load("postcss");
	const selectorParser = load("postcss-selector-parser");
	for (const [label, file] of fixtures()) {
		// A trailing sourceMappingURL is a build artifact, not stylesheet content,
		// and the minifiers disagree on keeping it.
		const css = fs
			.readFileSync(file, "utf8")
			.replace(/\/\*#\s*sourceMappingURL=[^*]*\*\/\s*$/, "");
		const before = classSelectors(postcss, selectorParser, css);
		const gzipped = zlib.gzipSync(Buffer.from(css), { level: 9 }).length;
		process.stdout.write(
			`\n${label} — ${kb(Buffer.byteLength(css))} (${kb(gzipped)} gzip), ${
				before.size
			} classes\n`
		);
		process.stdout.write(
			`${"minifier".padEnd(14)}${"minified".padStart(10)}${"saved".padStart(
				8
			)}${"gzip".padStart(10)}${"saved".padStart(8)}${"ms".padStart(
				7
			)}   lost\n`
		);
		for (const [name, run] of minifiers()) {
			let out = "";
			let best = Infinity;
			try {
				for (let i = 0; i < 3; i++) {
					const started = process.hrtime.bigint();
					out = await run(css);
					const took = Number(process.hrtime.bigint() - started) / 1e6;
					if (took < best) best = took;
				}
			} catch (error) {
				// A tool rejecting the stylesheet outright is a comparison result too.
				process.stdout.write(
					`${name.padEnd(14)}   rejects it: ${
						String(
							error && /** @type {Error} */ (error).message
								? /** @type {Error} */ (error).message
								: error
						).split("\n", 1)[0]
					}\n`
				);
				continue;
			}
			const after = classSelectors(postcss, selectorParser, out);
			const lost = [...before].filter((c) => !after.has(c));
			const outGzip = zlib.gzipSync(Buffer.from(out), { level: 9 }).length;
			process.stdout.write(
				`${
					name.padEnd(14) +
					kb(Buffer.byteLength(out)).padStart(10) +
					`${(
						100 -
						(Buffer.byteLength(out) / Buffer.byteLength(css)) * 100
					).toFixed(1)}%`.padStart(8) +
					kb(outGzip).padStart(10) +
					`${(100 - (outGzip / gzipped) * 100).toFixed(1)}%`.padStart(8) +
					best.toFixed(0).padStart(7)
				}   ${
					lost.length === 0
						? "-"
						: `${lost.length} classes! e.g. ${lost.slice(0, 3).join(", ")}`
				}\n`
			);
		}
	}
};

main().catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});
