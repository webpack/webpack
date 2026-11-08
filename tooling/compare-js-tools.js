/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Compare webpack's own JavaScript parser against the ecosystem's parsers, and
// the ecosystem's printers against each other, over real shipped bundles.

//   node tooling/compare-js-tools.js

// `parse` builds the tree and stops; `beautify` and `minify` print it back out.
// Every table reports best-of-3 wall/cpu ms and the worker's own peak RSS.

// The parse table also says whether a tree agrees with acorn's, which is what
// webpack's own parser is held to — a divergence there is a bug, not a style.

// `FIXTURE=`, `TOOL=` and `STAGE=` narrow the run to rows whose name contains
// what they name, so one cell is re-measured without the whole matrix.

// Each cell runs in a fresh worker (this script with `--measure <stage> <tool>`,
// the source on stdin), so cost is attributable to that one tool.

// The comparison packages are NOT webpack dependencies: they install into
// `node_modules/.cache/`, so nothing here reaches webpack's own tree.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { parse: acornParse } = require("acorn");
const { parse: webpackParse } = require("../lib/javascript/syntax-parser");
// Acorn's own suite, recorded case by case: what `javascript/parser.unittest.js`
// replays, read here for the ranges rather than for the trees.
const ACORN_CORPUS = require("../test/fixtures/acorn-corpus.json");
const {
	JS_CUTS,
	JS_RESPELLINGS,
	PRESETS,
	goalFor,
	jsPurityDigest,
	jsSlices,
	jsSpans,
	minifyOnePass,
	parsesAsLatest,
	printerFor,
	spansEitherGoal,
	sweepRespellings,
	tokenMeaning
} = require("../test/helpers/syntaxInvariants/javascript");
const {
	STAGES,
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
	thrownText,
	wantedExpectations,
	wantedRespelling
} = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const CACHE_NAME = "js-tool-comparison";
const CACHE = path.join(ROOT, "node_modules/.cache", CACHE_NAME);
const MODULES = path.join(CACHE, "node_modules");
const load = loaderFor(CACHE);

// Which goal the fixture is parsed under. A worker is told through the
// environment, since it is handed the source and nothing else.
const SOURCE_TYPE_VARIABLE = "COMPARE_JS_SOURCE_TYPE";

/**
 * @returns {"module" | "script"} the goal the current fixture is parsed under
 */
const sourceType = () =>
	process.env[SOURCE_TYPE_VARIABLE] === "module" ? "module" : "script";

// Bundles as they ship: the ES5 ones every site still loads, the modern ones
// written in classes and modules, and two that dwarf both.

// A path here is what the package publishes, so a bump can move it: React 19
// dropped its UMD builds, and TypeScript 7 is the Go port and publishes no
// bundle to parse at all, which is why neither is named the way it once was.

// The minified rows matter on their own: that is the shape most of what a build
// reads from `node_modules` is in, and it is where a parser's hot loop lives.
/** @type {[string, string, "module" | "script"][]} */
const INSTALLED_FIXTURES = [
	["Preact 11 (ESM)", "preact/dist/preact.mjs", "module"],
	["jQuery 3", "jquery/dist/jquery.js", "script"],
	["jQuery 3 (minified)", "jquery/dist/jquery.min.js", "script"],
	["Moment 2", "moment/moment.js", "script"],
	["axios 1", "axios/dist/axios.js", "script"],
	["Lodash 4", "lodash/lodash.js", "script"],
	["Bootstrap 5", "bootstrap/dist/js/bootstrap.bundle.js", "script"],
	["Chart.js 4", "chart.js/dist/chart.umd.js", "script"],
	["D3 7", "d3/dist/d3.js", "script"],
	["RxJS 7", "rxjs/dist/bundles/rxjs.umd.js", "script"],
	["Immutable 5 (ESM)", "immutable/dist/immutable.es.js", "module"],
	[
		"React DOM 19 (dev)",
		"react-dom/cjs/react-dom-client.development.js",
		"script"
	],
	[
		"React DOM 19 (production)",
		"react-dom/cjs/react-dom-client.production.js",
		"script"
	],
	["core-js 3 (bundle)", "core-js-bundle/index.js", "script"],
	["Vue 3 (ESM)", "vue/dist/vue.esm-browser.js", "module"],
	["Vue 3 (production)", "vue/dist/vue.runtime.global.prod.js", "script"],
	["three (ESM)", "three/build/three.module.js", "module"],
	["pdf.js 6 (ESM)", "pdfjs-dist/build/pdf.mjs", "module"],
	["Swagger UI 5 (bundle)", "swagger-ui-dist/swagger-ui-bundle.js", "script"],
	["ECharts 6", "echarts/dist/echarts.js", "script"],
	["Babel 8 (standalone)", "@babel/standalone/babel.js", "script"]
];

/**
 * @returns {[string, string, "module" | "script"][]} `[label, file, goal]` for every fixture
 */
const fixtures = () =>
	INSTALLED_FIXTURES.map(([label, file, goal]) => [
		label,
		path.join(MODULES, file),
		goal
	]);

/**
 * oxc recovers instead of throwing: it answers with whatever tree or text it
 * managed and puts the diagnostics beside it, which a comparison reads as a
 * refusal rather than as a tool that disagreed.
 * @param {EXPECTED_ANY} result what oxc answered
 * @returns {EXPECTED_ANY} the same answer, where it had no diagnostic
 */
const readOxcResult = (result) => {
	const [first] = result.errors || [];
	if (first !== undefined) throw new Error(first.message || String(first));
	return result;
};

// Each entry builds its callable on demand, so the measuring worker loads only
// the one tool it measures — anything else would land in that tool's peak RSS.
/** @type {import("./compare-tools-harness").Tool[]} */
const TOOLS = [
	{
		// The options a build asks for: a node serves its range when something
		// reads it, which is most of what the eager rows below pay for up front.
		name: "webpack",
		stage: "parse",
		create: () => (code) =>
			webpackParse(code, {
				sourceType: sourceType(),
				ecmaVersion: "latest",
				lazyNodes: true,
				locations: false,
				allowHashBang: true
			})
	},
	{
		name: "acorn",
		stage: "parse",
		create: () => {
			const acorn = load("acorn");
			return (code) =>
				acorn.parse(code, {
					sourceType: sourceType(),
					ecmaVersion: "latest",
					ranges: true,
					locations: false,
					allowHashBang: true
				});
		}
	},
	{
		name: "espree",
		stage: "parse",
		create: () => {
			const espree = load("espree");
			return (code) =>
				espree.parse(code, {
					sourceType: sourceType(),
					ecmaVersion: "latest",
					range: true
				});
		}
	},
	{
		name: "meriyah",
		stage: "parse",
		create: () => {
			const meriyah = load("meriyah");
			return (code) =>
				sourceType() === "module"
					? meriyah.parseModule(code, { ranges: true, next: true })
					: meriyah.parseScript(code, { ranges: true, next: true });
		}
	},
	{
		// Pinned to ES2017, so anything newer reads as a refusal rather than a
		// tree — which is the comparison result for a parser that stopped moving.
		name: "esprima",
		stage: "parse",
		create: () => {
			const esprima = load("esprima");
			return (code) =>
				sourceType() === "module"
					? esprima.parseModule(code, { range: true })
					: esprima.parseScript(code, { range: true });
		}
	},
	{
		name: "hermes-parser",
		stage: "parse",
		create: () => {
			const hermes = load("hermes-parser");
			return (code) =>
				hermes.parse(code, { babel: false, sourceType: sourceType() });
		}
	},
	{
		name: "oxc-parser",
		stage: "parse",
		create: () => {
			const oxc = load("oxc-parser");
			const file = sourceType() === "module" ? "input.mjs" : "input.js";
			// It keeps the parentheses as nodes of their own unless told not to,
			// which no other ESTree parser here does.
			return (code) =>
				readOxcResult(oxc.parseSync(file, code, { preserveParens: false }))
					.program;
		}
	},
	{
		name: "@babel/parser",
		stage: "parse",
		create: () => {
			const babel = load("@babel/parser");
			return (code) => babel.parse(code, { sourceType: sourceType() });
		}
	},
	{
		name: "@swc/core",
		stage: "parse",
		create: () => {
			const swc = load("@swc/core");
			return (code) =>
				swc.parseSync(code, {
					syntax: "ecmascript",
					target: "esnext",
					isModule: sourceType() === "module"
				});
		}
	},
	{
		name: "typescript",
		stage: "parse",
		create: () => {
			const ts = load("typescript");
			return (code) =>
				ts.createSourceFile(
					"input.js",
					code,
					ts.ScriptTarget.Latest,
					false,
					ts.ScriptKind.JS
				);
		}
	},
	{
		// astring and escodegen both print an ESTree tree, so the row that differs
		// is the printer rather than the parser feeding it.
		name: "acorn+astring",
		stage: "beautify",
		create: () => {
			const acorn = load("acorn");
			const astring = load("astring");
			return (code) =>
				astring.generate(
					acorn.parse(code, {
						sourceType: sourceType(),
						ecmaVersion: "latest"
					})
				);
		}
	},
	{
		name: "acorn+escodegen",
		stage: "beautify",
		create: () => {
			const acorn = load("acorn");
			const escodegen = load("escodegen");
			return (code) =>
				escodegen.generate(
					acorn.parse(code, {
						sourceType: sourceType(),
						ecmaVersion: "latest"
					})
				);
		}
	},
	{
		name: "@babel/generator",
		stage: "beautify",
		create: () => {
			const babel = load("@babel/parser");
			const exported = load("@babel/generator");
			const generate = exported.default || exported;
			return (code) =>
				generate(babel.parse(code, { sourceType: sourceType() })).code;
		}
	},
	{
		name: "prettier",
		stage: "beautify",
		create: () => {
			const prettier = load("prettier");
			return (code) => prettier.format(code, { parser: "babel" });
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
			return async (code) =>
				(await esbuild.transform(code, { loader: "js" })).code;
		}
	},
	{
		name: "@swc/core",
		stage: "beautify",
		create: () => {
			const swc = load("@swc/core");
			return (code) =>
				swc.transformSync(code, {
					minify: false,
					isModule: sourceType() === "module",
					jsc: { target: "esnext" }
				}).code;
		}
	},
	{
		name: "typescript",
		stage: "beautify",
		create: () => {
			const ts = load("typescript");
			const printer = ts.createPrinter({ removeComments: true });
			return (code) =>
				printer.printFile(
					ts.createSourceFile(
						"input.js",
						code,
						ts.ScriptTarget.Latest,
						false,
						ts.ScriptKind.JS
					)
				);
		}
	},
	{
		// webpack's own printing path: `jsMinify` with every transform off, so the
		// printer webpack owns is read against what it replaced, in one table.
		name: "webpack (format only)",
		stage: "beautify",
		create: () => {
			const jsMinify = require("../lib/javascript/jsMinify");

			return async (code) =>
				(
					await jsMinify(
						{ "input.js": code },
						undefined,
						{
							as: sourceType() === "module" ? "module" : "script",
							compress: false,
							mangle: false,
							format: { beautify: true, comments: false }
						},
						false
					)
				).code;
		}
	},
	{
		// Terser told to neither compress nor mangle is a printer, and the row
		// weighs what its own output format costs against the others'.
		name: "terser (format only)",
		stage: "beautify",
		create: () => {
			const terser = load("terser");
			return async (code) =>
				(
					await terser.minify(code, {
						compress: false,
						mangle: false,
						module: sourceType() === "module",
						format: { beautify: true, comments: false }
					})
				).code;
		}
	},
	{
		// What a `futureDefaults` production build pays: webpack's own minify
		// function, compressing and mangling in its one pass.
		name: "webpack",
		stage: "minify",
		create: () => {
			const jsMinify = require("../lib/javascript/jsMinify");

			return async (code) =>
				(
					await jsMinify(
						{ "input.js": code },
						undefined,
						{ as: sourceType() === "module" ? "module" : "script" },
						false
					)
				).code;
		}
	},
	{
		// The same printer without the minify function around it, so the row above
		// shows what that function's own plumbing costs.
		name: "webpack printer",
		stage: "minify",
		create: () => (code) =>
			minifyOnePass(code, { module: sourceType() === "module" }).code
	},
	{
		name: "terser",
		stage: "minify",
		create: () => {
			const terser = load("terser");
			return async (code) =>
				(await terser.minify(code, { module: sourceType() === "module" })).code;
		}
	},
	{
		// ES5 only, so a modern bundle reads as a refusal — which is why the
		// ecosystem moved off it.
		name: "uglify-js",
		stage: "minify",
		create: () => {
			const uglify = load("uglify-js");
			return (code) => {
				const result = uglify.minify(code);
				if (result.error) throw result.error;
				return result.code;
			};
		}
	},
	{
		name: "esbuild (service)",
		stage: "minify",
		external: true,
		create: () => {
			const esbuild = load("esbuild");
			return async (code) =>
				(await esbuild.transform(code, { loader: "js", minify: true })).code;
		}
	},
	{
		name: "@swc/core",
		stage: "minify",
		create: () => {
			const swc = load("@swc/core");
			return (code) =>
				swc.minifySync(code, { module: sourceType() === "module" }).code;
		}
	},
	{
		name: "oxc-minify",
		stage: "minify",
		create: () => {
			const oxc = load("oxc-minify");
			const file = sourceType() === "module" ? "input.mjs" : "input.js";
			return (code) => readOxcResult(oxc.minifySync(file, code)).code;
		}
	},
	{
		name: "tdewolff/minify",
		stage: "minify",
		create: () => {
			const { minify } = load("@tdewolff/minify");
			return (code) => minify("text/javascript", code);
		}
	}
];

// The parsers that answer in ESTree, so their trees are comparable with
// acorn's. The rest speak a dialect of their own and are not held to it.
const ESTREE_PARSERS = new Set([
	"webpack",
	"espree",
	"meriyah",
	"esprima",
	"hermes-parser",
	"oxc-parser"
]);

// Positions, source text and per-parser bookkeeping: everything a tree carries
// that is not the tree.
const IGNORED_NODE_KEYS = new Set([
	"start",
	"end",
	"loc",
	"range",
	"raw",
	"parent",
	"comments",
	"tokens",
	"extra",
	"errors",
	"hashbang",
	"leadingComments",
	"trailingComments",
	"innerComments"
]);

/**
 * A value as the comparison reads it: a regexp or bigint literal is not JSON,
 * so it is compared by how it prints, tagged with its type.
 * @param {EXPECTED_ANY} value anything a node holds
 * @returns {string} how it compares
 */
const scalar = (value) =>
	value === null ? "null" : `${typeof value}:${String(value)}`;

/**
 * Where two trees first stop saying the same thing, or `undefined` where they
 * agree. Keys nothing structural depends on are skipped, so the answer is about
 * the parse rather than about how a parser numbers its offsets.
 * @param {EXPECTED_ANY} left the reference tree
 * @param {EXPECTED_ANY} right the tree under test
 * @param {string} at the path walked so far
 * @returns {string | undefined} the first divergence
 */
const keysDifference = (left, right, at) => {
	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right)) {
			return `${at}: acorn ${Array.isArray(left) ? "list" : "value"}, tool ${
				Array.isArray(right) ? "list" : "value"
			}`;
		}
		if (left.length !== right.length) {
			return `${at}: acorn ${left.length} items, tool ${right.length}`;
		}
		for (let i = 0; i < left.length; i++) {
			const found = keysDifference(left[i], right[i], `${at}[${i}]`);
			if (found !== undefined) return found;
		}
		return undefined;
	}
	const leftIsNode = typeof left === "object" && left !== null;
	const rightIsNode = typeof right === "object" && right !== null;
	if (!leftIsNode || !rightIsNode) {
		if (leftIsNode !== rightIsNode || scalar(left) !== scalar(right)) {
			return `${at}: acorn ${scalar(left)}, tool ${scalar(right)}`;
		}
		return undefined;
	}
	if (left.type !== right.type) {
		return `${at}: acorn ${left.type}, tool ${right.type}`;
	}
	// Only the keys the reference carries are compared: a parser attaching extra
	// bookkeeping of its own has not parsed anything differently.
	for (const key of Object.keys(left)) {
		if (IGNORED_NODE_KEYS.has(key)) continue;
		if (typeof left[key] === "function") continue;
		const found = keysDifference(
			left[key],
			right[key],
			at === "" ? key : `${at}.${key}`
		);
		if (found !== undefined) return found;
	}
	return undefined;
};

/**
 * @param {string} name a parse-stage tool
 * @returns {(source: string) => EXPECTED_ANY} its parse callable
 */
const parserNamed = (name) => {
	const tool = TOOLS.find(
		(entry) => entry.stage === "parse" && entry.name === name
	);
	if (tool === undefined) throw new Error(`unknown parse tool ${name}`);
	return tool.create();
};

/**
 * Worker mode: parse the source with acorn and with one other parser, and
 * report where the two trees first disagree.
 * @returns {Promise<void>} resolves after the answer is written
 */
const compare = async () => {
	const [, , , name] = process.argv;
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const source = Buffer.concat(chunks).toString("utf8");
	let answer;
	try {
		const reference = parserNamed("acorn")(source);
		const tree = await parserNamed(name)(source);
		answer = { difference: keysDifference(reference, tree, "") };
	} catch (error) {
		answer = {
			error: String(
				error && /** @type {Error} */ (error).message
					? /** @type {Error} */ (error).message
					: error
			).split("\n", 1)[0]
		};
	}
	process.stdout.write(JSON.stringify(answer));
};

/**
 * Every property name the code reads or writes by name, as a real parse rather
 * than a text match: a minifier renaming these changes what the bundle talks to.
 * @param {EXPECTED_ANY} acorn the acorn export
 * @param {string} code JavaScript source
 * @param {"module" | "script"} goal what to parse it as
 * @param {EXPECTED_ANY[]=} comments receives every comment the parse reads
 * @returns {Set<string>} the property names it names
 */
const propertyNames = (acorn, code, goal, comments) => {
	const names = new Set();
	/**
	 * @param {EXPECTED_ANY} node any node
	 */
	const walk = (node) => {
		if (Array.isArray(node)) {
			for (const child of node) walk(child);
			return;
		}
		if (typeof node !== "object" || node === null) return;
		if (node.computed === false) {
			if (node.key && node.key.type === "Identifier") names.add(node.key.name);
			if (node.property && node.property.type === "Identifier") {
				names.add(node.property.name);
			}
		}
		for (const key of Object.keys(node)) {
			if (key === "type" || IGNORED_NODE_KEYS.has(key)) continue;
			walk(node[key]);
		}
	};
	walk(
		acorn.parse(code, {
			sourceType: goal,
			ecmaVersion: "latest",
			allowHashBang: true,
			onComment: comments
		})
	);
	return names;
};

// What terser keeps by default, as a license asks a bundle to: a block comment
// opening `/*!`, or one naming `@license` or `@preserve`.
const LEGAL_COMMENT = /^\**!|@license|@preserve/;

/**
 * The legal notices among a program's comments, read off a real parse, so a
 * `/*!` inside a string, a template or a regular expression is not one.
 * @param {{ type: string, value: string }[]} comments what acorn read
 * @returns {string[]} the legal notices, each as its comment's text
 */
const legalNoticesOf = (comments) =>
	comments
		.filter(
			(comment) => comment.type === "Block" && LEGAL_COMMENT.test(comment.value)
		)
		.map((comment) => comment.value);

const wantedFixture = filterFrom("FIXTURE");
const wantedTool = filterFrom("TOOL");
const wantedStage = filterFrom("STAGE");

// --- Invariants -------------------------------------------------------------

// What a comparison cannot see: the parser agreeing with acorn about the tree
// while disagreeing with the source about where each node sat.

// `js` is where the test harness writes what a case built, and the three spec
// corpora are submodules whose own suites read them.
const SKIPPED_FIXTURE_DIRS = new Set([
	"js",
	"node_modules",
	"wpt",
	"test262-cases",
	"html5lib-tests",
	"css-parsing-tests"
]);

// --- Holding the parser to acorn --------------------------------------------

/**
 * A value as it reads in a difference report, kept short enough to scan.
 * @param {unknown} value either parser's value at the differing path
 * @returns {string} how the value prints
 */
const show = (value) => {
	if (typeof value === "bigint") return `${value}n`;
	if (value instanceof RegExp) return String(value);
	if (typeof value === "object" && value !== null) {
		return Array.isArray(value)
			? `[${value.length} items]`
			: `{${Object.keys(value).sort().join(",")}}`;
	}
	return JSON.stringify(value) || String(value);
};

/**
 * The first place two parse trees disagree, or null when they match: every key,
 * positions included, unlike the comparison's agreement column. Key presence is
 * asked with `in`, since the lazy path serves `range` from a prototype getter.
 * @param {unknown} ours what webpack's parser built
 * @param {unknown} theirs what acorn built
 * @param {string} at the path walked so far
 * @returns {{ at: string, ours: string, acorn: string } | null} the difference
 */
const firstDifference = (ours, theirs, at) => {
	if (ours === theirs) return null;
	const report = { at, ours: show(ours), acorn: show(theirs) };
	if (typeof ours !== typeof theirs) return report;
	if (typeof ours === "number") {
		return Number.isNaN(ours) && Number.isNaN(/** @type {number} */ (theirs))
			? null
			: report;
	}
	if (typeof ours === "bigint") {
		return String(ours) === String(theirs) ? null : report;
	}
	if (typeof ours !== "object" || ours === null || theirs === null) {
		return report;
	}
	if (ours instanceof RegExp || theirs instanceof RegExp) {
		return String(ours) === String(theirs) ? null : report;
	}
	if (Array.isArray(ours) !== Array.isArray(theirs)) return report;
	if (Array.isArray(ours)) {
		const other = /** @type {unknown[]} */ (theirs);
		if (ours.length !== other.length) return report;
		for (let i = 0; i < ours.length; i++) {
			const difference = firstDifference(ours[i], other[i], `${at}[${i}]`);
			if (difference) return difference;
		}
		return null;
	}
	const left = /** @type {Record<string, unknown>} */ (ours);
	const right = /** @type {Record<string, unknown>} */ (theirs);
	const ourKeys = Object.keys(left);
	const theirKeys = Object.keys(right);
	// Whichever side owns more keys covers the other: two same-sized key sets
	// that differ must each hold a key the other lacks.
	for (const key of ourKeys.length >= theirKeys.length ? ourKeys : theirKeys) {
		if (!(key in left)) {
			return { at: `${at}.${key}`, ours: "absent", acorn: show(right[key]) };
		}
		if (!(key in right)) {
			return { at: `${at}.${key}`, ours: show(left[key]), acorn: "absent" };
		}
		const difference = firstDifference(left[key], right[key], `${at}.${key}`);
		if (difference) return difference;
	}
	return null;
};

/**
 * The first few differences, with a count when more were found.
 * @template T
 * @param {T[]} differences everything the run collected
 * @param {number=} limit how many to keep
 * @returns {(T | string)[]} what the assertion prints
 */
const reportable = (differences, limit = 10) =>
	differences.length > limit
		? [
				...differences.slice(0, limit),
				`…and ${differences.length - limit} more`
			]
		: differences;

/**
 * Where webpack's parser and acorn's read one source apart, under the options
 * a build parses with, or null where they agree or acorn refuses it.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {import("../test/helpers/syntaxInvariants/relations").Report[]} the difference, as a finding
 */
const acornDifference = (source, options) => {
	/** @type {EXPECTED_ANY} */
	let theirs;
	try {
		theirs = acornParse(source, options);
	} catch (_error) {
		// acorn's own defects are its suite's to answer for: what it refuses is
		// held by the test262 suites, not by this one.
		return [];
	}
	const difference = firstDifference(
		webpackParse(source, options),
		theirs,
		"Program"
	);
	if (difference === null) return [];
	return [
		{
			relation: "acorn",
			what: difference.at.replace(/\[\d+\]/g, "[]"),
			repro: `    ours ${oneLine(difference.ours, 60)}, acorn ${oneLine(
				difference.acorn,
				60
			)}`
		}
	];
};

/**
 * What a program cut short reads to: the tree acorn builds where acorn reads
 * it, and otherwise a `SyntaxError`, as acorn's own refusal is.
 * @param {string} source a program cut short
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {import("../test/helpers/syntaxInvariants/relations").Report[]} the difference, as a finding
 */
const cutDifference = (source, options) => {
	try {
		acornParse(source, options);
	} catch (_error) {
		try {
			webpackParse(source, options);
		} catch (error) {
			if (error instanceof SyntaxError) return [];
			return [
				{
					relation: "acorn",
					what: `a cut program throws ${
						/** @type {Error} */ (error).name
					}, not a SyntaxError`,
					repro: `    …${oneLine(source.slice(-60), 60)}`
				}
			];
		}
		return [
			{
				relation: "acorn",
				what: "a cut program acorn rejects reads to a tree",
				repro: `    …${oneLine(source.slice(-60), 60)}`
			}
		];
	}
	try {
		return acornDifference(source, options);
	} catch (error) {
		return [
			{
				relation: "acorn",
				what: "a cut program acorn reads is refused",
				repro: `    …${oneLine(source.slice(-60), 60)}: ${thrownText(error)}`
			}
		];
	}
};

// Divergences already answered for, each with why it stands.
/** @type {import("./compare-tools-harness").Expected[]} */
const EXPECTED = [
	{
		relation: "respelling hex",
		contains: "0x",
		source: "asm-js/asm.js",
		why: "asm.js reads a number's spelling, so the printer keeps it as written"
	},
	{
		relation: "idempotence",
		contains: "{return",
		source: "test/statsCases/track-returned/index.js",
		presets: ["default"],
		why: "an arrow whose one statement is an `if` with a known test returning a value keeps its braces: the `if` prints before the arrow reads what it returns"
	},
	{
		relation: "idempotence",
		contains: "(1)}",
		source:
			"test/configCases/concatenate-modules/top-level-declarations-library-conflict/module.js",
		presets: ["default"],
		why: "a call printing as what its function returns keeps the parentheses that value takes unfolded, which the reprint reads as the constant it folded to"
	},
	{
		relation: "idempotence",
		contains: "(r.entrySeq()",
		source: "Swagger UI 5 (bundle)",
		presets: ["default"],
		why: "`a?(b,c):c` printing as `a&&(b),c` parenthesizes a call left of `,`: an unread call may print as its arguments' sequence or what its function returns, which the printed text no longer tells apart"
	}
];

const wantedPreset = filterFrom("PRESET");

const wantedRelation = filterFrom("RELATION");

// The inputs the unit tests read, one directory each: `javascript/invariants.unittest.js`
// holds every one of them to these relations, with its own known differences.
const UNIT_INPUT_RE = /^test\/fixtures\/javascript\/[^/]+\/index\.js$/;

// What the last sweep did not find, read by the report and by the gate.
/** @type {string[]} */
let _missingFixtures = [];

/**
 * What the invariants are swept over: every script the repo ships, acorn's own
 * corpus with the options each case names, and whatever bundles the comparison
 * installed — which are the shape most of what a build reads is in.
 * @returns {{ corpus: [string, string, EXPECTED_ANY][], missing: string[] }} `[label, source, options]` for each, and the fixtures not built
 */
const invariantFixtures = () => {
	/** @type {[string, string, EXPECTED_ANY][]} */
	const out = [];
	for (const file of collectFiles(
		path.join(ROOT, "test"),
		".js",
		SKIPPED_FIXTURE_DIRS
	)) {
		const label = path.relative(ROOT, file).replace(/\\/g, "/");
		if (UNIT_INPUT_RE.test(label)) continue;
		out.push([label, fs.readFileSync(file, "utf8"), undefined]);
	}
	// Every production in every edition, under the options acorn tests it with:
	// the corpus is recorded from acorn's own suite, so a range the parser gets
	// wrong in a construct no fixture writes is still reached.
	for (const one of ACORN_CORPUS.cases) {
		out.push([`acorn corpus: ${one.file}`, one.code, one.options]);
	}

	/** @type {string[]} */
	const missing = [];
	for (const [label, file, goal] of fixtures()) {
		if (fs.existsSync(file)) {
			out.push([
				label,
				fs.readFileSync(file, "utf8"),
				{ sourceType: goal, ecmaVersion: "latest", ranges: true }
			]);
		} else {
			missing.push(label);
		}
	}
	return { corpus: out, missing };
};

/**
 * Sweep mode: hold the parser and the printer to their own invariants and
 * report what they break. Nothing is installed and nothing is compared to, so
 * this is the cheap half of the script and the one a check can be gated on.
 * @param {(text: string) => void} write receives the report
 * @returns {Promise<number>} how many distinct findings it named
 */
const invariants = async (write) => {
	const built = invariantFixtures();
	// Filtered the same way the corpus is: a run narrowed to one fixture is not
	// short of the ones it was never going to read, and the gate answers for the
	// sweep that happened.
	_missingFixtures = built.missing.filter((label) => wantedFixture(label));
	const corpus = built.corpus.filter(([label]) => wantedFixture(label));
	const presets = PRESETS.filter(([name]) => wantedPreset(name));
	// Filtered like the corpus is: an expectation for a relation, fixture or
	// preset this run was never going to reach matched nothing because nothing
	// asked it to, which is not the divergence having gone away.
	const groups = findingGroups(
		wantedExpectations(
			EXPECTED,
			corpus.map(([label]) => label),
			presets.map(([name]) => name)
		)
	);
	if (wantedRelation("spans")) {
		let refused = 0;
		for (const [label, source, options] of corpus) {
			let reports;
			if (options === undefined) {
				reports = spansEitherGoal(source);
			} else {
				try {
					reports = jsSpans(source, options);
				} catch (_error) {
					reports = null;
				}
			}
			// A fixture the parser refuses is one the suites are asserting it
			// refuses, so it is counted rather than reported: the number moving is
			// the signal.
			if (reports === null) {
				refused++;
				continue;
			}
			for (const report of reports) groups.add(report, "parse", label);
		}
		log(
			`read ranges over ${
				corpus.length - refused
			} sources (${refused} the parser refuses) …`
		);
	}
	if (wantedRelation("slices")) {
		let read = 0;
		let skipped = 0;
		let capped = 0;
		let repeats = 0;
		for (const [label, source, options] of corpus) {
			const settled = options === undefined ? goalFor(source) : options;
			if (settled === null) continue;
			const answered = jsSlices(source, settled);
			if (answered === null) continue;
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
		// Printed alone: a compress pass over every source twice costs four
		// minutes for state the printer, not the compressor, is asked to hold.
		const [, presetOptions] = /** @type {[string, EXPECTED_ANY]} */ (
			PRESETS.find(([name]) => name === "format")
		);
		/** @type {import("../test/helpers/syntaxInvariants/relations").PuritySource[]} */
		const sources = [];
		for (const [label, source, options] of corpus) {
			const settled = options === undefined ? goalFor(source) : options;
			if (settled === null) continue;
			const { minify } = printerFor(
				minifyOnePass,
				presetOptions,
				settled.sourceType === "module"
			);
			sources.push({
				what: label,
				digest: () => jsPurityDigest(source, settled, minify)
			});
		}
		const { reports, read } = purityRelation(sources);
		for (const report of reports) {
			groups.add(report, "parse", report.repro.trim());
		}
		log(`read ${read} sources twice over …`);
	}
	// What the parser is held to everywhere else, asked of every fixture: acorn's
	// own corpus is left out, as the parser's unit tests replay its trees.
	if (wantedRelation("acorn")) {
		let read = 0;
		let cuts = 0;
		for (const [label, source, options] of corpus) {
			if (label.startsWith("acorn corpus: ")) continue;
			const settled = options === undefined ? goalFor(source) : options;
			if (settled === null) continue;
			read++;
			for (const report of acornDifference(source, settled)) {
				groups.add(report, "parse", label);
			}
			for (const [where, cut] of cutsAt(source, JS_CUTS)) {
				cuts++;
				for (const report of cutDifference(cut, settled)) {
					groups.add(report, "parse", `${label}, cut ${where}`);
				}
			}
		}
		log(`held ${read} trees to acorn's …`);
		log(`… and ${cuts} of them cut short inside a construct …`);
	}
	// The printer's two relations share a sweep: both need the output, and
	// printing it twice to ask two questions of it would double the run.
	const wantsIdempotence = wantedRelation("idempotence");
	const wantsRespelling = JS_RESPELLINGS.some((respelling) =>
		wantedRespelling(respelling.name)
	);
	const wantsBehavior = wantedRelation("behavior");
	if (wantsIdempotence || wantsRespelling || wantsBehavior) {
		// Only what a script does before it returns is compared: a promise it
		// leaves rejected, such as an `import()` with no loader, is ignored, and
		// for the rest of the run, as one may settle after the sweep.
		const ignore = () => {};
		if (wantsBehavior) process.on("unhandledRejection", ignore);
		let ran = 0;
		// Respelling asks the first preset, behavior the ones printing alone.
		const printing = presets.filter(
			([name, presetOptions], i) =>
				wantsIdempotence ||
				(wantsRespelling && i === 0) ||
				(wantsBehavior && presetOptions.compress === false)
		);
		let read = 0;
		for (const [label, source, options] of corpus) {
			const settled = options === undefined ? goalFor(source) : options;
			// Read as a build reads it, at the latest edition: a corpus case only
			// an older edition parses is the parser's to hold, not the printer's.
			if (
				settled === null ||
				!parsesAsLatest(source, settled.sourceType === "module")
			) {
				continue;
			}
			read++;
			const module = settled.sourceType === "module";
			/**
			 * @param {string} text a program
			 * @returns {string} what it says
			 */
			const says = (text) => tokenMeaning(text, module);
			for (const [preset, presetOptions] of printing) {
				const { minify, reprint } = printerFor(
					minifyOnePass,
					presetOptions,
					module
				);
				const { printed, reports } = wantsIdempotence
					? idempotence({ minify, reprint, source, says })
					: { printed: minify(source), reports: [] };
				for (const report of reports) groups.add(report, preset, label);
				// Compressed or renamed, what a script observes may change by
				// contract; printed alone, nothing it does may.
				if (
					printed !== null &&
					wantsBehavior &&
					!module &&
					presetOptions.compress === false
				) {
					const reports = behaviorDifference(source, printed);
					if (reports !== null) ran++;
					for (const report of reports || []) {
						groups.add(report, preset, label);
					}
				}
				// Under the first preset only: whether a spelling decides the
				// output is the same question under every option set, and each
				// asking of it is a full minify of the whole program.
				if (printed === null || !wantsRespelling || preset !== presets[0][0]) {
					continue;
				}
				for (const report of sweepRespellings(
					minify,
					source,
					module,
					printed
				)) {
					groups.add(report, preset, label);
				}
			}
		}
		log(`printed ${read} sources under ${printing.length} presets …`);
		if (wantsBehavior) {
			log(`ran ${ran} printed scripts against their sources …`);
		}
	}
	return groups.write(write);
};

// The scripts `behavior` runs: short enough that a run costs little, and
// bounded so one that loops is skipped rather than hanging the sweep.
const BEHAVIOR_MAX_LENGTH = 20000;
const BEHAVIOR_TIMEOUT = 200;
// Every run reads the same clock and random numbers, so a script reading them
// still answers for its printed form.
const BEHAVIOR_PRELUDE =
	"Math.random = () => 0.5;" +
	"Date = new Proxy(Date, { construct: (D, a) => new D(...(a.length ? a : [0])), apply: (D) => String(new D(0)) });" +
	"Date.now = () => 0;";

/**
 * What a script prints and, where it throws, the error's kind and message or the
 * thrown value, run in a fresh context: a function prints as `[function]`, as
 * its text is the printer's.
 * @param {string} code the script
 * @returns {string | null} its transcript, null where it timed out
 */
const behaviorOf = (code) => {
	/** @type {string[]} */
	const lines = [];
	/**
	 * @param {unknown} value a logged value
	 * @returns {string} it, as the transcript holds it
	 */
	const show = (value) =>
		typeof value === "function" ? "[function]" : String(value);
	const context = vm.createContext({
		console: {
			log: (/** @type {unknown[]} */ ...values) =>
				lines.push(values.map(show).join(" "))
		}
	});
	vm.runInContext(BEHAVIOR_PRELUDE, context);
	try {
		vm.runInContext(code, context, { timeout: BEHAVIOR_TIMEOUT });
	} catch (error) {
		try {
			const isObject = error !== null && typeof error === "object";
			const {
				code: reason,
				name,
				message
			} = /** @type {{ code?: unknown, name?: unknown, message?: unknown }} */ (
				isObject ? error : {}
			);
			if (reason === "ERR_SCRIPT_EXECUTION_TIMEOUT") return null;
			const kind = typeof name === "string" ? name : typeof error;
			// JavaScriptCore quotes the failing source text, which a printer may
			// rewrite, as `(evaluating '…')`; V8 never writes it.
			const value =
				typeof message === "string"
					? message.replace(/ \(evaluating '[\s\S]*'\)$/, "")
					: isObject
						? ""
						: show(error);
			lines.push(`threw <${kind}>${value ? ` ${value}` : ""}`);
		} catch (_error) {
			// A thrown object whose own properties throw when read.
			lines.push("threw <unreadable>");
		}
	}
	return lines.join("\n");
};

/**
 * Whether a printed script still prints and throws what its source does.
 * @param {string} source the script
 * @param {string} printed what the printer wrote of it
 * @returns {import("../test/helpers/syntaxInvariants/relations").Report[] | null} what differs, empty where it runs the same, null where it was not run
 */
const behaviorDifference = (source, printed) => {
	if (source.length > BEHAVIOR_MAX_LENGTH) return null;
	const expected = behaviorOf(source);
	// A script whose two runs differ answers for nothing.
	if (expected === null || behaviorOf(source) !== expected) return null;
	const got = behaviorOf(printed);
	if (got === expected) return [];
	return [
		{
			relation: "behavior",
			what: got === null ? "times out" : "runs otherwise",
			repro: `    ${oneLine(expected, 80)}\n      -> ${
				got === null ? "<timeout>" : oneLine(got, 80)
			}`
		}
	];
};

/**
 * The sweep as a section of the comparison's own report, so a run that asks
 * what the parser costs is told what it owes as well.
 * @returns {Promise<number>} how many distinct findings it named
 */
const reportInvariants = async () => {
	process.stdout.write(
		"\ninvariants — what the parser owes its source and the printer its output\n"
	);
	const found = await invariants((text) => process.stdout.write(text));
	process.stdout.write(missingReport(_missingFixtures));
	process.stdout.write(`\n${found} finding${found === 1 ? "" : "s"}\n`);
	return found;
};

/**
 * `--invariants`: the relations alone, which need no install.
 * @returns {Promise<void>} resolves once the exit code is set
 */
const reportInvariantsOnly = async () => {
	const found = await reportInvariants();
	process.exitCode = sweepExitCode(found, _missingFixtures, process.argv);
};

/**
 * @param {string} stage which table
 * @returns {string} its header line
 */
const header = (stage) =>
	stage === "parse"
		? `  ${"parse".padEnd(22)}${"ms".padStart(8)}${"cpu".padStart(
				7
			)}${"peak".padStart(9)}   agrees with acorn\n`
		: `  ${stage.padEnd(22)}${"out".padStart(10)}${"gzip".padStart(
				9
			)}${"saved".padStart(8)}${"brotli".padStart(9)}${"zstd".padStart(
				9
			)}${"ms".padStart(7)}${"cpu".padStart(6)}${"peak".padStart(
				8
			)}${"2nd".padStart(7)}   round-trip\n`;

const main = async () => {
	// Before the install: the relations are webpack's own, so they answer
	// whether or not there is anything to compare against yet.
	await reportInvariants();
	await installPackages(CACHE_NAME);
	const acorn = load("acorn");
	for (const [label, file, goal] of fixtures().filter(([name]) =>
		wantedFixture(name)
	)) {
		const code = await fs.promises.readFile(file, "utf8");
		process.env[SOURCE_TYPE_VARIABLE] = goal;
		/** @type {{ type: string, value: string }[]} */
		const comments = [];
		const before = propertyNames(acorn, code, goal, comments);
		const notices = legalNoticesOf(comments);
		const input = await compress(Buffer.from(code));
		process.stdout.write(
			`\n${label} — ${kb(input.raw)} (${kb(input.gzip)} gzip, ${kb(
				input.brotli
			)} brotli, ${kb(input.zstd)} zstd), ${goal}, ${
				before.size
			} property names\n`
		);
		for (const stage of STAGES.filter(wantedStage)) {
			const tools = TOOLS.filter(
				(tool) => tool.stage === stage && wantedTool(tool.name)
			);
			if (tools.length === 0) continue;
			process.stdout.write(header(stage));
			for (const tool of tools) {
				const result = await measureInWorker(
					__filename,
					stage,
					tool.name,
					code
				);
				if ("error" in result) {
					// A tool rejecting the source outright is a comparison result too.
					process.stdout.write(
						`  ${tool.name.padEnd(22)} ${
							result.timedOut ? "" : "rejects it: "
						}${result.error}\n`
					);
					continue;
				}
				const cost = formatCost(result, tool.external);
				if (stage === "parse") {
					process.stdout.write(
						`  ${
							tool.name.padEnd(22) +
							cost.wall.padStart(8) +
							cost.cpu.padStart(7) +
							cost.peak.padStart(9)
						}   ${await agreement(tool.name, code)}\n`
					);
					process.stdout.write(formatProfile(result));
					continue;
				}
				const printed = /** @type {string} */ (result.code);
				const out = await compress(Buffer.from(printed));
				process.stdout.write(
					`  ${
						tool.name.padEnd(22) +
						kb(out.raw).padStart(10) +
						kb(out.gzip).padStart(9) +
						`${(100 - (out.gzip / input.gzip) * 100).toFixed(1)}%`.padStart(8) +
						kb(out.brotli).padStart(9) +
						kb(out.zstd).padStart(9) +
						cost.wall.padStart(7) +
						cost.cpu.padStart(6) +
						cost.peak.padStart(8) +
						formatSecond(result.second).padStart(7)
					}   ${roundTrip(acorn, before, notices, printed, goal)}\n`
				);
				process.stdout.write(formatProfile(result));
			}
		}
	}
};

/**
 * What the parse table's last column says: acorn is the reference, an ESTree
 * parser is held to it, and anything else answers in a tree of its own.
 * @param {string} name the parser
 * @param {string} code the fixture
 * @returns {Promise<string>} the cell
 */
const agreement = async (name, code) => {
	if (name === "acorn") return "reference";
	if (!ESTREE_PARSERS.has(name)) return "own dialect";
	const answer = await compareInWorker(name, code);
	if ("error" in answer) return `could not compare: ${answer.error}`;
	if (answer.difference === undefined) return "yes";
	const said = answer.difference;
	return `no — ${said.length > 120 ? `${said.slice(0, 119)}…` : said}`;
};

/**
 * @param {string} name the parser to hold against acorn
 * @param {string} input the source
 * @returns {Promise<{ difference: string | undefined } | { error: string }>} where they first differ
 */
const compareInWorker = (name, input) =>
	new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [__filename, "--compare", name], {
			stdio: ["pipe", "pipe", "inherit"],
			env: process.env
		});
		/** @type {Buffer[]} */
		const chunks = [];
		child.stdout.on("data", (chunk) => chunks.push(chunk));
		child.on("error", reject);
		child.on("close", (code) => {
			const output = Buffer.concat(chunks).toString("utf8");
			if (code !== 0) {
				resolve({ error: `comparing ${name} exited with ${code}` });
				return;
			}
			try {
				resolve(JSON.parse(output));
			} catch (_error) {
				resolve({ error: `comparing ${name} wrote ${output.slice(0, 80)}` });
			}
		});
		child.stdin.end(input);
	});

/**
 * What a printing table's last column says: whether the output parses back, and
 * whether it still names every property and keeps every legal notice the input did.
 * @param {EXPECTED_ANY} acorn the acorn export
 * @param {Set<string>} before the input's property names
 * @param {string[]} notices the legal notices the input carries
 * @param {string} printed what the tool wrote
 * @param {"module" | "script"} goal what to parse it as
 * @returns {string} the cell
 */
const roundTrip = (acorn, before, notices, printed, goal) => {
	/** @type {Set<string>} */
	let after;
	/** @type {{ type: string, value: string }[]} */
	const comments = [];
	try {
		after = propertyNames(acorn, printed, goal, comments);
	} catch (error) {
		return `will not parse back: ${
			String(/** @type {Error} */ (error).message).split("\n", 1)[0]
		}`;
	}
	const lost = [...before].filter((name) => !after.has(name));
	// Matched notice by notice: one changed, or another written twice in
	// its place, is one dropped as surely as a missing one.
	/** @type {Map<string, number>} */
	const kept = new Map();
	for (const notice of legalNoticesOf(comments)) {
		kept.set(notice, (kept.get(notice) || 0) + 1);
	}
	let dropped = 0;
	for (const notice of notices) {
		const count = kept.get(notice) || 0;
		if (count === 0) dropped++;
		else kept.set(notice, count - 1);
	}
	/** @type {string[]} */
	const parts = [];
	if (lost.length > 0) {
		parts.push(`${lost.length} names! e.g. ${lost.slice(0, 3).join(", ")}`);
	}
	if (dropped > 0) {
		parts.push(`${dropped} legal notice${dropped === 1 ? "" : "s"}!`);
	}
	return parts.length === 0 ? "-" : parts.join(", ");
};

// A lookup rather than a chain of ternaries: each entry point is bound where
// it is named, so reading the dispatch is reading the whole table. `--setup`
// installs the corpus and stops, without paying for the comparison.
const RUNNERS = new Map(
	/** @type {[string, () => Promise<unknown>][]} */ ([
		["--measure", measure.bind(null, TOOLS)],
		["--compare", compare],
		["--setup", installPackages.bind(null, CACHE_NAME)],
		["--invariants", reportInvariantsOnly]
	])
);

/**
 * Runs the entry point the mode names, defaulting to the whole comparison.
 * @param {string=} mode which entry point to run
 * @returns {Promise<unknown>} what that entry point resolves to
 */
const runMode = (mode = "") => (RUNNERS.get(mode) || main)();

// Only as the entry point, the way the CSS and HTML scripts guard: requiring
// this file otherwise starts the whole comparison, so nothing could read the
// dispatch above without paying ten minutes for it.
const started =
	require.main === module
		? runMode(sweepMode(process.argv))
		: Promise.resolve();

started.catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});

module.exports = {
	JS_CUTS,
	PRESETS,
	behaviorDifference,
	cutDifference,
	firstDifference,
	goalFor,
	jsPurityDigest,
	jsSlices,
	minifyOnePass,
	parsesAsLatest,
	printerFor,
	reportable,
	roundTrip,
	runMode,
	show,
	spansEitherGoal,
	sweepRespellings,
	tokenMeaning
};
