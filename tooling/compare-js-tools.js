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
const { parse: webpackParse } = require("../lib/javascript/syntax-parser");
// Acorn's own suite, recorded case by case: what `WebpackParser.unittest.js`
// replays, read here for the ranges rather than for the trees.
const ACORN_CORPUS = require("../test/fixtures/acorn-corpus.json");
const {
	STAGES,
	collectFiles,
	compress,
	filterFrom,
	findingGroups,
	formatCost,
	hasher,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker,
	missingReport,
	pathSpanWalk,
	purityRelation,
	sliceRelation,
	spans,
	sweepExitCode,
	sweepMode
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
	["Preact 10 (ESM)", "preact/dist/preact.module.js", "module"],
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
	["Babel 7 (standalone)", "@babel/standalone/babel.js", "script"]
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
		// webpack's own printing path: `jsMinify` with every transform off, which
		// today prints through terser. The row is here so that a printer webpack
		// owns is read against what it replaced, in the same table.
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
		// What a production build pays: webpack's own minify function under the
		// options `optimization.minimize` defaults to, whose second compress pass
		// is why this row is not a like for like against terser's default row.
		name: "webpack (2 passes)",
		stage: "minify",
		create: () => {
			const jsMinify = require("../lib/javascript/jsMinify");

			return async (code) =>
				(
					await jsMinify(
						{ "input.js": code },
						undefined,
						{
							as: sourceType() === "module" ? "module" : "script",
							compress: { passes: 2 }
						},
						false
					)
				).code;
		}
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
const firstDifference = (left, right, at) => {
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
			const found = firstDifference(left[i], right[i], `${at}[${i}]`);
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
		const found = firstDifference(
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
		answer = { difference: firstDifference(reference, tree, "") };
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
 * @returns {Set<string>} the property names it names
 */
const propertyNames = (acorn, code, goal) => {
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
			allowHashBang: true
		})
	);
	return names;
};

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

// Neither a child nor a range: `start` and `end` are the range itself, `range`
// and `loc` restate it, and `type` is a string.
const NOT_CHILD_KEYS = new Set(["type", "start", "end", "range", "loc"]);

/**
 * The nodes one ESTree node holds, in whatever order its keys are in.
 * @param {EXPECTED_ANY} node an ESTree node
 * @returns {EXPECTED_ANY[]} the nodes it holds
 */
const childNodesOf = (node) => {
	/** @type {EXPECTED_ANY[]} */
	const children = [];
	for (const key of Object.keys(node)) {
		if (NOT_CHILD_KEYS.has(key)) continue;
		const value = node[key];
		if (value === null || typeof value !== "object") continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item !== null && typeof item.type === "string") children.push(item);
			}
		} else if (typeof value.type === "string") {
			children.push(value);
		}
	}
	return children;
};

/**
 * Hold the parser's ranges to what they claim about the source they came from.
 *
 * `siblings` is off because ESTree says two siblings may share a range rather
 * than because webpack's parser drifts: a shorthand `{ a }` carries `key` and
 * `value` as separate nodes over the same bytes, and `{ a = 1 }` nests the
 * key's range inside the value's `AssignmentPattern`. Asking for it reports
 * 6136 of those over the fixtures and not one defect.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {import("./compare-tools-harness").Report[]} what the ranges broke
 */
const jsSpans = (source, options) =>
	spans({
		length: source.length,
		contains: true,
		siblings: false,
		walk: pathSpanWalk({
			length: source.length,
			run: (enter, exit) => {
				const root = webpackParse(source, options);
				// WHY: an explicit stack, not recursion — the acorn corpus carries a
				// case nesting hundreds of arrays, which overflows a recursive walk
				// well before the parser that built it minds.
				/** @type {{ node: EXPECTED_ANY, children: EXPECTED_ANY[], index: number }[]} */
				const stack = [{ node: root, children: childNodesOf(root), index: 0 }];
				enter(root);
				while (stack.length > 0) {
					const top = stack[stack.length - 1];
					if (top.index === top.children.length) {
						exit(top.node);
						stack.pop();
						continue;
					}
					const child = top.children[top.index++];
					enter(child);
					stack.push({
						node: child,
						children: childNodesOf(child),
						index: 0
					});
				}
			},
			start: (node) => node.start,
			end: (node) => node.end,
			name: (node) => node.type,
			inner: () => undefined
		})
	});

/**
 * Parse one source the way a build would, as a module where that reads and as a
 * script otherwise.
 * @param {string} source a script or a module
 * @returns {import("./compare-tools-harness").Report[] | null} what its ranges broke, or null where the parser refused it
 */
const spansEitherGoal = (source) => {
	const options = goalFor(source);
	return options === null ? null : jsSpans(source, options);
};

// Both goals a build reads a file under, in the order it tries them.
const GOALS = /** @type {("module" | "script")[]} */ (["module", "script"]);

/**
 * The options one source parses under, as a build would read it: a module where
 * that works and a script otherwise.
 * @param {string} source a script or a module
 * @returns {EXPECTED_ANY} those options, or null where the parser refuses it either way
 */
const goalFor = (source) => {
	for (const sourceType of GOALS) {
		// The options a build parses with, so what is held is what ships:
		// `ranges` is on there, and a range is what this reads.
		/** @type {import("../lib/javascript/syntax-parser").ParserOptions} */
		const options = {
			sourceType,
			ecmaVersion: "latest",
			ranges: true,
			allowHashBang: true
		};
		try {
			webpackParse(source, options);
			return options;
		} catch (_error) {
			continue;
		}
	}
	return null;
};

/**
 * @typedef {{ what: string, start: number, end: number, size: number }} NodeRun
 */

/**
 * Every node in one source, in post-order with the size of its subtree — which
 * is what lets a subtree be read as a run rather than walked again.
 * @param {EXPECTED_ANY} root the tree
 * @returns {NodeRun[]} each node, children before parents
 */
const nodeRuns = (root) => {
	/** @type {NodeRun[]} */
	const runs = [];
	/** @type {{ node: EXPECTED_ANY, children: EXPECTED_ANY[], index: number, held: number }[]} */
	const stack = [
		{ node: root, children: sortedChildren(root), index: 0, held: 0 }
	];
	while (stack.length > 0) {
		const top = stack[stack.length - 1];
		if (top.index === top.children.length) {
			const size = top.held + 1;
			stack.pop();
			if (stack.length > 0) stack[stack.length - 1].held += size;
			runs.push({
				what: top.node.type,
				start: top.node.start,
				end: top.node.end,
				size
			});
			continue;
		}
		const child = top.children[top.index++];
		stack.push({
			node: child,
			children: sortedChildren(child),
			index: 0,
			held: 0
		});
	}
	return runs;
};

/**
 * @param {EXPECTED_ANY} node an ESTree node
 * @returns {EXPECTED_ANY[]} the nodes it holds, in source order
 */
const sortedChildren = (node) =>
	childNodesOf(node).sort((a, b) => a.start - b.start || a.end - b.end);

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
 * What a node's own source may have to be wrapped in to stand alone, widest
 * context last. Parentheses let an object literal, a function expression or a
 * class expression open a statement.
 *
 * WHY: the function and class contexts are this relation's normalization, not
 * a convenience. Out of context `yield x` and `await x` are not invalid, they
 * are an identifier and a call, and `super.x` and `return` are only syntax
 * inside a method and a function — so a slice read at the top level is
 * reported for meaning something else when only its extent is owed. Each is
 * tried under the source's own options, which is why the ladder runs from the
 * edition-neutral ones up: a case pinned to ES6 cannot parse `async function*`,
 * and its `yield` would read as an identifier if that were the only context
 * offering a generator.
 * @type {[string, string][]}
 */
const JS_SLICE_CONTEXTS = [
	["", ""],
	["(", ")"],
	// Named, because an anonymous function declaration cannot open a statement.
	["function f(){", "}"],
	["function* f(){", "}"],
	["async function f(){", "}"],
	["async function* f(){", "}"],
	["class X extends Y{ m(){", "} }"],
	["class X extends Y{ async *m(){", "} }"]
];

// Reparsing every node costs a parse of its own, so a source would cost its
// size times its depth. Each one is capped at this many times its own bytes,
// spent leaves first, which is where a range is most likely to be wrong.
const SLICE_BUDGET_FACTOR = 4;

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, wrapped in the least context that lets them parse, give that node
 * back.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {{ reports: import("./compare-tools-harness").Report[], read: number, skipped: number, capped: number, repeats: number } | null} what broke, how many answered and how many the budget cut, or null where the parser refuses the source
 */
const jsSlices = (source, options) => {
	/** @type {EXPECTED_ANY} */
	let root;
	try {
		root = webpackParse(source, options);
	} catch (_error) {
		// One of the corpus cases asserting the parser refuses it.
		return null;
	}
	const runs = nodeRuns(root);
	/** @type {import("./compare-tools-harness").SliceCandidate[]} */
	const candidates = [];
	let budget = source.length * SLICE_BUDGET_FACTOR;
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
		const text = source.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		candidates.push({
			what: node.what,
			said,
			reparse: () => {
				/** @type {string | null} */
				let disagreed = null;
				for (const [prefix, suffix] of JS_SLICE_CONTEXTS) {
					/** @type {NodeRun[]} */
					let again;
					try {
						again = nodeRuns(
							webpackParse(`${prefix}${text}${suffix}`, options)
						);
					} catch (_error) {
						continue;
					}
					// The node this slice is meant to be, where the wrapper put it.
					const want = again.findIndex(
						(one) =>
							one.what === node.what &&
							one.start === prefix.length &&
							one.end === prefix.length + text.length
					);
					if (want === -1) continue;
					const answer = runDigest(again, want);
					if (answer === said) return answer;
					if (disagreed === null) disagreed = answer;
				}
				// Nothing here stood these bytes alone, so what they lacked is a
				// context rather than a range: a labelled `break` needs its label.
				return disagreed;
			}
		});
	}
	return { ...sliceRelation(candidates), capped, repeats };
};

// What `catchStackOverflow` raises, whose position is where the stack ran out.
const STACK_REFUSAL = "Not enough stack space to parse input";

/**
 * What one parse of a source amounts to: every node's type and range and every
 * primitive a node carries, in walk order.
 *
 * WHY: the derived values are the point, not the offsets. A cached word, an
 * interned name or a reused column can hand back the last parse's answer with
 * every offset still right, so an identifier's `name`, a literal's `value` and
 * `raw`, an operator and a regexp's flags all go in. Read off the node's own
 * keys rather than a list of types, so a production added later is covered
 * without this being edited.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {string} the digest
 */
const jsPurityDigest = (source, options) => {
	const digest = hasher();
	/** @type {EXPECTED_ANY} */
	let root;
	try {
		root = webpackParse(source, options);
	} catch (error) {
		// A refusal is an answer too, and one that has to be the same answer: a
		// source rejected only after something else was read is state leaking.
		const message = /** @type {Error} */ (error).message;
		// Except this one. Running out of stack is a fact about the machine, and
		// the position it names is wherever the call depth around the parse
		// happened to run out, so only that it happened is owed.
		return message.startsWith(STACK_REFUSAL)
			? `refused: ${STACK_REFUSAL}`
			: `refused: ${message}`;
	}
	/** @type {EXPECTED_ANY[]} */
	const stack = [root];
	while (stack.length > 0) {
		const node = /** @type {EXPECTED_ANY} */ (stack.pop());
		digest.update(`${node.type}[${node.start},${node.end})`);
		/** @type {EXPECTED_ANY[]} */
		const children = [];
		for (const key of Object.keys(node)) {
			if (NOT_CHILD_KEYS.has(key)) continue;
			const value = node[key];
			if (value === null || typeof value !== "object") {
				digest.update(`|${key}=${String(value)}`);
				continue;
			}
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item !== null && typeof item.type === "string") {
						children.push(item);
					}
				}
			} else if (typeof value.type === "string") {
				children.push(value);
			} else {
				// A regexp literal's `regex`, an import attribute's `with`: a plain
				// object the parser filled in rather than a node.
				for (const inner of Object.keys(value)) {
					digest.update(`|${key}.${inner}=${String(value[inner])}`);
				}
			}
		}
		digest.update("\n");
		for (let index = children.length - 1; index >= 0; index--) {
			stack.push(children[index]);
		}
	}
	return digest.hex();
};

const wantedRelation = filterFrom("RELATION");

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
		out.push([
			path.relative(ROOT, file).replace(/\\/g, "/"),
			fs.readFileSync(file, "utf8"),
			undefined
		]);
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
 * Sweep mode: hold the parser to its own invariants and report what it breaks.
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
	const groups = findingGroups();
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
			`read ranges over ${corpus.length - refused} sources (${refused} the parser refuses) …`
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
		/** @type {import("./compare-tools-harness").PuritySource[]} */
		const sources = [];
		for (const [label, source, options] of corpus) {
			const settled = options === undefined ? goalFor(source) : options;
			if (settled === null) continue;
			sources.push({
				what: label,
				digest: () => jsPurityDigest(source, settled)
			});
		}
		const { reports, read } = purityRelation(sources);
		for (const report of reports) {
			groups.add(report, "parse", report.repro.trim());
		}
		log(`read ${read} sources twice over …`);
	}
	return groups.write(write);
};

/**
 * The sweep as a section of the comparison's own report, so a run that asks
 * what the parser costs is told what it owes as well.
 * @returns {number} how many distinct findings it named
 */
const reportInvariants = () => {
	process.stdout.write("\ninvariants — what the parser owes its own source\n");
	const found = invariants((text) => process.stdout.write(text));
	process.stdout.write(missingReport(_missingFixtures));
	process.stdout.write(`\n${found} finding${found === 1 ? "" : "s"}\n`);
	return found;
};

/**
 * `--invariants`: the relations alone, which need no install.
 * @returns {Promise<void>} resolves once the exit code is set
 */
const reportInvariantsOnly = async () => {
	const found = reportInvariants();
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
			)}   round-trip\n`;

const main = async () => {
	await installPackages(CACHE_NAME);
	const acorn = load("acorn");
	for (const [label, file, goal] of fixtures().filter(([name]) =>
		wantedFixture(/** @type {string} */ (name))
	)) {
		const code = await fs.promises.readFile(file, "utf8");
		process.env[SOURCE_TYPE_VARIABLE] = goal;
		const before = propertyNames(
			acorn,
			code,
			/** @type {"module" | "script"} */ (goal)
		);
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
						`  ${tool.name.padEnd(22)} rejects it: ${result.error}\n`
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
						cost.peak.padStart(8)
					}   ${roundTrip(
						acorn,
						before,
						printed,
						/** @type {"module" | "script"} */ (goal)
					)}\n`
				);
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
 * whether it still names every property the input did.
 * @param {EXPECTED_ANY} acorn the acorn export
 * @param {Set<string>} before the input's property names
 * @param {string} printed what the tool wrote
 * @param {"module" | "script"} goal what to parse it as
 * @returns {string} the cell
 */
const roundTrip = (acorn, before, printed, goal) => {
	/** @type {Set<string>} */
	let after;
	try {
		after = propertyNames(acorn, printed, goal);
	} catch (error) {
		return `will not parse back: ${
			String(/** @type {Error} */ (error).message).split("\n", 1)[0]
		}`;
	}
	const lost = [...before].filter((name) => !after.has(name));
	return lost.length === 0
		? "-"
		: `${lost.length} names! e.g. ${lost.slice(0, 3).join(", ")}`;
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

module.exports = { runMode };
