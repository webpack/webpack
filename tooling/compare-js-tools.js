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
const { parse: webpackParse } = require("../lib/javascript/syntax");
const {
	STAGES,
	compress,
	filterFrom,
	formatCost,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker
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

const PACKAGES = [
	"@babel/generator@7",
	"@babel/parser@7",
	"@babel/standalone@7",
	"@swc/core@1",
	"@tdewolff/minify@2",
	"acorn@8",
	"astring@1",
	"axios@1",
	"bootstrap@5",
	"chart.js@4",
	"core-js-bundle@3",
	"d3@7",
	"echarts@6",
	"escodegen@2",
	"esbuild@0.25",
	"espree@11",
	"esprima@4",
	"hermes-parser@0.37",
	"jquery@3",
	"lodash@4",
	"meriyah@7",
	"immutable@5",
	"moment@2",
	"oxc-minify@0.149",
	"oxc-parser@0.149",
	"pdfjs-dist@6",
	"preact@10",
	"prettier@3",
	"react-dom@18",
	"react@18",
	"rxjs@7",
	"swagger-ui-dist@5",
	"terser@5",
	"three@0.185",
	"typescript@5",
	"uglify-js@3",
	"vue@3"
];

// Bundles as they ship: the ES5 ones every site still loads, the modern ones
// written in classes and modules, and two that dwarf both.

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
	["React DOM 18 (dev)", "react-dom/umd/react-dom.development.js", "script"],
	[
		"React DOM 18 (production)",
		"react-dom/umd/react-dom.production.min.js",
		"script"
	],
	["core-js 3 (bundle)", "core-js-bundle/index.js", "script"],
	["Vue 3 (ESM)", "vue/dist/vue.esm-browser.js", "module"],
	["Vue 3 (production)", "vue/dist/vue.runtime.global.prod.js", "script"],
	["three (ESM)", "three/build/three.module.js", "module"],
	["pdf.js 6 (ESM)", "pdfjs-dist/build/pdf.mjs", "module"],
	["Swagger UI 5 (bundle)", "swagger-ui-dist/swagger-ui-bundle.js", "script"],
	["ECharts 6", "echarts/dist/echarts.js", "script"],
	["Babel 7 (standalone)", "@babel/standalone/babel.js", "script"],
	["TypeScript 5", "typescript/lib/typescript.js", "script"]
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
				oxc.parseSync(file, code, { preserveParens: false }).program;
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
			return (code) => oxc.minifySync(file, code).code;
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
	await installPackages(CACHE_NAME, PACKAGES);
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

const mode = process.argv[2];
(mode === "--measure"
	? measure(TOOLS)
	: mode === "--compare"
		? compare()
		: main()
).catch((error) => {
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
});
