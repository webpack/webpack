/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Compare webpack's own CSS minifier against the ecosystem's on real framework
// stylesheets, reporting what the output weighs (raw and under the encodings a
// CDN serves), what producing it costs (wall time, cpu time, peak memory) and —
// the part a size table hides — whether it still contains everything the input
// did.
//
//   node tooling/compare-css-minifiers.js
//
// Each minifier × fixture cell runs in a fresh worker process (this script
// re-invoked with `--measure <minifier>`, the stylesheet on stdin), so cpu and
// peak RSS are attributable to that one tool instead of to whatever ran before
// it in a shared process.
//
// The comparison packages are NOT webpack dependencies: they are installed into
// `node_modules/.cache/css-minifier-comparison` on first run, so nothing here
// reaches webpack's own dependency tree.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
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
	if (JSON.stringify(installed) !== JSON.stringify(PACKAGES)) {
		log(`installing comparison packages into ${path.relative(ROOT, CACHE)} …`);
		await fs.promises.mkdir(CACHE, { recursive: true });
		if (!(await exists(manifest))) {
			await fs.promises.writeFile(
				manifest,
				`${JSON.stringify(
					{ name: "css-minifier-comparison", private: true },
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
	}
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

// Each entry is a factory so the measuring worker loads only the one tool it
// measures — anything else would show up in that tool's peak RSS. The async API
// is used wherever a tool offers one; csso and lightningcss only ship sync.
/** @type {[string, () => (css: string) => string | Promise<string>][]} */
const MINIFIERS = [
	["webpack", () => (css) => cssMinify({ "input.css": css }).code],
	[
		"esbuild",
		() => {
			const esbuild = load("esbuild");
			return async (css) =>
				(await esbuild.transform(css, { loader: "css", minify: true })).code;
		}
	],
	[
		"csso",
		() => {
			const csso = load("csso");
			return (css) => csso.minify(css).css;
		}
	],
	[
		"clean-css L1",
		() => {
			const CleanCSS = load("clean-css");
			return async (css) =>
				(await new CleanCSS({ level: 1, returnPromise: true }).minify(css))
					.styles;
		}
	],
	[
		"clean-css L2",
		() => {
			const CleanCSS = load("clean-css");
			return async (css) =>
				(await new CleanCSS({ level: 2, returnPromise: true }).minify(css))
					.styles;
		}
	],
	[
		"lightningcss",
		() => {
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
	],
	[
		"cssnano",
		() => {
			const postcss = load("postcss");
			const cssnano = load("cssnano");
			return async (css) =>
				(await postcss([cssnano]).process(css, { from: undefined })).css;
		}
	]
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
 * Worker mode: run one minifier over the stylesheet on stdin and report the
 * output with its cost. Wall and cpu are the best of three runs; peak is the
 * process's `maxRSS` (KB), which deliberately includes loading the tool — that
 * is part of what running it costs. The one understatement is esbuild, whose
 * service process works outside this process's accounting.
 * @param {string} name a `MINIFIERS` entry's name
 * @returns {Promise<void>} resolves after the report is written
 */
const measure = async (name) => {
	const entry = MINIFIERS.find(([minifier]) => minifier === name);
	if (entry === undefined) throw new Error(`unknown minifier ${name}`);
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const css = Buffer.concat(chunks).toString("utf8");
	/** @type {Measurement} */
	let report;
	try {
		const minify = entry[1]();
		let code = "";
		let wall = Infinity;
		let cpu = Infinity;
		for (let i = 0; i < 3; i++) {
			const cpuStarted = process.cpuUsage();
			const started = process.hrtime.bigint();
			code = await minify(css);
			wall = Math.min(wall, Number(process.hrtime.bigint() - started) / 1e6);
			const used = process.cpuUsage(cpuStarted);
			cpu = Math.min(cpu, (used.user + used.system) / 1e3);
		}
		report = { code, wall, cpu, peak: process.resourceUsage().maxRSS };
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
 * @param {string} input the stylesheet
 * @returns {Promise<Measurement>} the worker's report
 */
const measureInWorker = (name, input) =>
	new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [__filename, "--measure", name], {
			stdio: ["pipe", "pipe", "inherit"]
		});
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
	const postcss = load("postcss");
	const selectorParser = load("postcss-selector-parser");
	for (const [label, file] of fixtures()) {
		// A trailing sourceMappingURL is a build artifact, not stylesheet content,
		// and the minifiers disagree on keeping it.
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
		process.stdout.write(
			`${"minifier".padEnd(14)}${"minified".padStart(10)}${"saved".padStart(
				8
			)}${"gzip".padStart(9)}${"brotli".padStart(9)}${"zstd".padStart(
				9
			)}${"ms".padStart(6)}${"cpu".padStart(6)}${"peak".padStart(8)}   lost\n`
		);
		for (const [name] of MINIFIERS) {
			const result = await measureInWorker(name, css);
			if ("error" in result) {
				// A tool rejecting the stylesheet outright is a comparison result too.
				process.stdout.write(
					`${name.padEnd(14)}   rejects it: ${result.error}\n`
				);
				continue;
			}
			const after = classSelectors(postcss, selectorParser, result.code);
			const lost = [...before].filter((c) => !after.has(c));
			const out = await compress(Buffer.from(result.code));
			process.stdout.write(
				`${
					name.padEnd(14) +
					kb(out.raw).padStart(10) +
					`${(100 - (out.raw / input.raw) * 100).toFixed(1)}%`.padStart(8) +
					kb(out.gzip).padStart(9) +
					kb(out.brotli).padStart(9) +
					kb(out.zstd).padStart(9) +
					result.wall.toFixed(0).padStart(6) +
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
};

(process.argv[2] === "--measure" ? measure(process.argv[3]) : main()).catch(
	(error) => {
		log(String(error && error.stack ? error.stack : error));
		process.exitCode = 1;
	}
);
