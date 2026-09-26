"use strict";

// cspell:ignore fnames domprops

const acorn = require("acorn");
const carried = require("../../lib/javascript/terser");

// Each top-level option reaches a part of the copy that terser's own compress
// suite never does — `minify`'s option handling, the ESTree conversions, the
// name cache. Each is held to the published package it was copied from.
const SCRIPT = `
/*! keep */ /* drop */
function Widget(name) { this._secret = name; this.label = "Ω \\u2028 \`\${x}\`"; }
Widget.prototype.read = function read() { return this._secret + this.label; };
class Panel extends Widget { get size() { return this._width || 0; } static make() { return new Panel("p"); } }
var cache = { _hidden: 1, shown: [1, 2, 3].map((v) => v * 2) };
if (typeof window !== "undefined") window.Panel = Panel;
sink(Panel.make().read(), cache);
`;

const MODULE = `
import { dep } from "./dep.js";
export class Store { #items = []; add(item) { this.#items.push(item); return this; } get size() { return this.#items.length; } }
export default function create(options = {}) { const { _private, ...rest } = options; return new Store().add(dep(rest)); }
`;

const INPUT_MAP = JSON.stringify({
	version: 3,
	sources: ["original.js"],
	names: [],
	mappings: "AAAA;AACA;AACA",
	sourcesContent: ["a\nb\nc"]
});

/** @type {[string, EXPECTED_ANY][]} */
const OPTIONS = [
	["compress off", { compress: false }],
	["three compress passes", { compress: { passes: 3 } }],
	["ecma 5", { ecma: 5 }],
	["ecma 2020", { ecma: 2020 }],
	["enclose", { enclose: true }],
	["enclose with arguments", { enclose: "window:w" }],
	["ie8", { ie8: true }],
	["keep_classnames", { keep_classnames: true }],
	["keep_classnames by pattern", { keep_classnames: /^P/ }],
	["keep_fnames", { keep_fnames: true }],
	["mangle off", { mangle: false }],
	["property mangling", { mangle: { properties: { regex: /^_/ } } }],
	[
		"property mangling of builtins",
		{ mangle: { properties: { builtins: true, regex: /^[a-z]/ } } }
	],
	["beautify", { format: { beautify: true } }],
	["every comment", { format: { comments: "all" } }],
	["ascii only", { format: { ascii_only: true } }],
	["wrapped functions", { format: { wrap_iife: true, wrap_func_args: true } }],
	["the deprecated output", { output: { semicolons: false } }],
	["safari10", { safari10: true }],
	["toplevel", { toplevel: true }],
	["a source map", { sourceMap: true }],
	[
		"a source map with its sources and url",
		{ sourceMap: { includeSources: true, url: "out.js.map", filename: "out.js" } }
	],
	["an input source map", { sourceMap: { content: INPUT_MAP } }],
	["a terser tree out", { format: { ast: true, code: false } }]
];

/**
 * What a minify answers, in a form two copies can be compared by.
 * @param {(code: EXPECTED_ANY, options: EXPECTED_ANY) => EXPECTED_ANY} minify a minify
 * @param {EXPECTED_ANY} input source, or a tree
 * @param {EXPECTED_ANY} options its options
 * @returns {Promise<string>} the answer
 */
const outcome = async (minify, input, options) => {
	try {
		const result = await minify(input, options);
		const tree =
			result.ast && typeof result.ast.print_to_string === "function"
				? result.ast.print_to_string()
				: result.ast;
		return JSON.stringify({ code: result.code, map: result.map, tree });
	} catch (err) {
		return JSON.stringify({ error: /** @type {Error} */ (err).message });
	}
};

describe("terser as webpack carries it", () => {
	const published = require("terser");

	it("should read the DOM property names and the ESTree conversions only when asked", () => {
		const { execFileSync } = require("child_process");

		const entry = require.resolve("../../lib/javascript/terser");
		// A process of its own, as each worker of the minimizer's pool is: what
		// a minify loads there is held for as long as the pool lives.
		/**
		 * @param {string} options the options, as source
		 * @returns {{ domprops: boolean, estree: boolean }} what the minify read
		 */
		const readBy = (options) =>
			JSON.parse(
				execFileSync(
					process.execPath,
					[
						"-e",
						`require(${JSON.stringify(entry)}).minify("sink(a.b)", ${options}).then(() => {
							const has = (end) => Object.keys(require.cache).some((file) => file.replace(/\\\\/g, "/").endsWith(end));
							process.stdout.write(JSON.stringify({ domprops: has("/terser/domprops.js"), estree: has("/terser/mozilla-ast.js") }));
						});`
					],
					{ encoding: "utf8" }
				)
			);
		expect(readBy("{}")).toEqual({ domprops: false, estree: false });
		expect(readBy("{ mangle: { properties: true } }")).toEqual({
			domprops: true,
			estree: false
		});
		expect(readBy("{ format: { spidermonkey: true, code: false } }")).toEqual({
			domprops: false,
			estree: true
		});
	});

	for (const [source, isModule] of /** @type {[string, boolean][]} */ ([
		[SCRIPT, false],
		[MODULE, true]
	])) {
		const goal = isModule ? "a module" : "a script";

		it.each(OPTIONS)(`should minify ${goal} as terser does: %s`, async (_name, options) => {
			const run = () => ({ module: isModule, ...options });
			expect(await outcome(carried.minify, source, run())).toBe(
				await outcome(published.minify, source, run())
			);
		});

		it(`should write ${goal} as the same ESTree tree`, async () => {
			const run = () => ({
				module: isModule,
				format: { spidermonkey: true, code: false }
			});
			expect(await outcome(carried.minify, source, run())).toBe(
				await outcome(published.minify, source, run())
			);
		});

		it(`should read ${goal} from an ESTree tree`, async () => {
			const read = () =>
				acorn.parse(source, {
					ecmaVersion: "latest",
					sourceType: isModule ? "module" : "script",
					locations: true
				});
			const run = () => ({ module: isModule, parse: { spidermonkey: true } });
			expect(await outcome(carried.minify, read(), run())).toBe(
				await outcome(published.minify, read(), run())
			);
		});

		it(`should fill a name cache for ${goal} as terser does`, async () => {
			const run = () => ({
				module: isModule,
				toplevel: true,
				nameCache: {},
				mangle: { properties: { regex: /^_/ } }
			});
			const ours = run();
			const theirs = run();
			const code = await outcome(carried.minify, source, ours);
			expect(code).toBe(await outcome(published.minify, source, theirs));
			expect(ours.nameCache).toEqual(theirs.nameCache);
		});

		it(`should minify ${goal} synchronously as terser does`, () => {
			expect(carried.minify_sync(source, { module: isModule }).code).toBe(
				published.minify_sync(source, { module: isModule }).code
			);
		});
	}
});
