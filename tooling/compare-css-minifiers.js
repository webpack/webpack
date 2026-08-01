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
const { unescapeIdentifier } = require("../lib/css/syntax");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, "node_modules/.cache/css-minifier-comparison");
const MODULES = path.join(CACHE, "node_modules");

const PACKAGES = [
	"bootstrap@5",
	"clean-css@5",
	"csso@5",
	"cssnano@7",
	"esbuild@0.25",
	"lightningcss@1",
	"postcss@8",
	"tailwindcss@4",
	"@tailwindcss/cli@4"
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

/**
 * @param {string} message progress line
 */
const log = (message) => {
	process.stderr.write(`${message}\n`);
};

const setup = () => {
	if (!fs.existsSync(MODULES)) {
		log(`installing comparison packages into ${path.relative(ROOT, CACHE)} …`);
		fs.mkdirSync(CACHE, { recursive: true });
		fs.writeFileSync(
			path.join(CACHE, "package.json"),
			`${JSON.stringify({ name: "css-minifier-comparison", private: true }, null, 2)}\n`
		);
		execFileSync("npm", ["install", "--no-audit", "--no-fund", ...PACKAGES], {
			cwd: CACHE,
			stdio: "inherit"
		});
	}
	for (const [source, out] of [
		[TAILWIND_APP, "tailwind-app.css"],
		[TAILWIND_WIDE, "tailwind-wide.css"]
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

/**
 * @returns {[string, string][]} `[label, file]` for every fixture
 */
const fixtures = () => [
	[
		"Bootstrap 5 (full)",
		path.join(MODULES, "bootstrap/dist/css/bootstrap.css")
	],
	[
		"Bootstrap 5 (grid)",
		path.join(MODULES, "bootstrap/dist/css/bootstrap-grid.css")
	],
	["Tailwind 4 (app-sized)", path.join(CACHE, "tailwind-app.css")],
	["Tailwind 4 (wide utilities)", path.join(CACHE, "tailwind-wide.css")]
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

// A class token, read off selectors a real parser produced — a size win that
// drops one of these is not a size win. A hex escape may swallow one whitespace
// as its terminator (`.\32 xl` is the single class `2xl`), so it has to be
// matched as part of the name, or the *input* tokenizes into the wrong classes.
const ESCAPE = String.raw`\\[\da-fA-F]{1,6}[ \t\n\f\r]?|\\[^\n]`;
const CLASS_RE = new RegExp(
	// eslint-disable-next-line no-irregular-whitespace -- U+00A0 is a range bound here, not whitespace
	String.raw`\.(-?(?:${ESCAPE}|[_a-zA-Z -￿])(?:${ESCAPE}|[-\w -￿])*)`,
	"g"
);

/**
 * Every class a stylesheet's selectors mention, escapes resolved — `.\32 xl` and
 * `.\32xl` are two spellings of one class, and a minifier is free to pick either.
 * @param {EXPECTED_ANY} postcss the postcss export
 * @param {string} css a stylesheet
 * @returns {Set<string>} the classes it matches on
 */
const classSelectors = (postcss, css) => {
	const set = new Set();
	postcss.parse(css).walkRules((/** @type {EXPECTED_ANY} */ rule) => {
		CLASS_RE.lastIndex = 0;
		let m = CLASS_RE.exec(rule.selector);
		while (m !== null) {
			set.add(unescapeIdentifier(m[1]));
			m = CLASS_RE.exec(rule.selector);
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
	for (const [label, file] of fixtures()) {
		// A trailing sourceMappingURL is a build artifact, not stylesheet content,
		// and the minifiers disagree on keeping it.
		const css = fs
			.readFileSync(file, "utf8")
			.replace(/\/\*#\s*sourceMappingURL=[^*]*\*\/\s*$/, "");
		const before = classSelectors(postcss, css);
		const gzipped = zlib.gzipSync(Buffer.from(css), { level: 9 }).length;
		process.stdout.write(
			`\n${label} — ${kb(Buffer.byteLength(css))} (${kb(gzipped)} gzip), ${before.size} classes\n`
		);
		process.stdout.write(
			`${"minifier".padEnd(14)}${"minified".padStart(10)}${"saved".padStart(8)}${"gzip".padStart(10)}${"saved".padStart(8)}${"ms".padStart(7)}   lost\n`
		);
		for (const [name, run] of minifiers()) {
			let out = "";
			let best = Infinity;
			for (let i = 0; i < 3; i++) {
				const started = process.hrtime.bigint();
				out = await run(css);
				const took = Number(process.hrtime.bigint() - started) / 1e6;
				if (took < best) best = took;
			}
			const after = classSelectors(postcss, out);
			const lost = [...before].filter((c) => !after.has(c));
			const outGzip = zlib.gzipSync(Buffer.from(out), { level: 9 }).length;
			process.stdout.write(
				`${
					name.padEnd(14) +
					kb(Buffer.byteLength(out)).padStart(10) +
					`${(100 - (Buffer.byteLength(out) / Buffer.byteLength(css)) * 100).toFixed(1)}%`.padStart(
						8
					) +
					kb(outGzip).padStart(10) +
					`${(100 - (outGzip / gzipped) * 100).toFixed(1)}%`.padStart(8) +
					best.toFixed(0).padStart(7)
				}   ${lost.length === 0 ? "-" : `${lost.length} classes! e.g. ${lost.slice(0, 3).join(", ")}`}\n`
			);
		}
	}
};

main().catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});
