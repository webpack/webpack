"use strict";

const { terserMinify } = require("minimizer-webpack-plugin");
const jsMinify = require("../../lib/javascript/jsMinify");

/** @typedef {import("../../lib/javascript/jsMinify")} JsMinify */

const SCRIPT = `
/*! @license MIT - keep me */
// a line comment
"use strict";
function unusedHelper(a, b) { return a + b; }
sink(function outer() {
	const list = [1, 2, 3].map((value) => value * 2);
	if (list.length > 0) { console.log(list); } else { console.log("empty"); }
	return list;
});
`;

const MODULE = `
/*! @preserve banner */
import { readFile } from "node:fs/promises";
export async function read(path) {
	const text = await readFile(path, "utf8");
	return text.length > 0 ? text : undefined;
}
`;

const HANDLER = 'if (window.x) { console.log("clicked", event); } else { alert("no"); }';

const INPUT_MAP = {
	version: 3,
	sources: ["input.js"],
	names: [],
	mappings: ""
};

/**
 * Every comment-selection shape the plugin accepts, paired with the source and
 * production it is exercised against.
 * @type {[string, { [file: string]: string }, import("terser").MinifyOptions & { as?: "script" | "module" | "event-handler" }, EXPECTED_ANY][]}
 */
const CASES = [
	["defaults", { "script.js": SCRIPT }, { compress: { passes: 2 } }, true],
	["extraction off", { "script.js": SCRIPT }, { compress: { passes: 2 } }, false],
	["extract by pattern", { "script.js": SCRIPT }, {}, /@license/],
	["extract by condition", { "script.js": SCRIPT }, {}, { condition: "some" }],
	["extract nothing named", { "script.js": SCRIPT }, {}, { condition: false }],
	["keep every comment", { "script.js": SCRIPT }, { format: { comments: "all" } }, false],
	["keep no comment", { "script.js": SCRIPT }, { format: { comments: false } }, true],
	["deprecated output spelling", { "script.js": SCRIPT }, { output: { comments: "all" } }, false],
	["compress off", { "script.js": SCRIPT }, { compress: false }, true],
	["mangle off", { "script.js": SCRIPT }, { mangle: false }, true],
	["ecma 5", { "script.js": SCRIPT }, { ecma: 5 }, true],
	["module goal", { "module.mjs": MODULE }, { as: "module" }, true],
	["module option", { "module.mjs": MODULE }, { module: true }, true],
	["event handler", { "handler.js": HANDLER }, { as: "event-handler" }, true],
	["script goal", { "script.js": SCRIPT }, { as: "script" }, true]
];

describe("jsMinify", () => {
	for (const [name, input, options, extractComments] of CASES) {
		for (const withMap of [false, true]) {
			const label = withMap ? `${name} (with source map)` : name;

			it(`should minify: ${label}`, async () => {
				const result = await jsMinify(
					input,
					withMap ? INPUT_MAP : undefined,
					{ ...options },
					extractComments
				);

				expect(result.code).toMatchSnapshot();
				expect(result.extractedComments).toMatchSnapshot();
				// Wrapping a handler body moves every position, so that answer
				// carries no map however the asset was mapped.
				const mapped = withMap && options.as !== "event-handler";
				expect(typeof result.map).toBe(mapped ? "object" : "undefined");
			});

			// The plugin's own terser entry point is what webpack dispatched to
			// before this function existed, so it states the behaviour to keep.
			it(`should match the reference minifier: ${label}`, async () => {
				const args =
					/** @type {[{ [file: string]: string }, EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY]} */ ([
						input,
						withMap ? INPUT_MAP : undefined,
						options,
						extractComments
					]);
				const mine = await jsMinify(args[0], args[1], { ...args[2] }, args[3]);
				const reference = await terserMinify(
					args[0],
					args[1],
					{ ...args[2] },
					args[3]
				);

				expect(mine.code).toBe(reference.code);
				expect(mine.extractedComments).toEqual(reference.extractedComments);
				expect(mine.map).toEqual(reference.map);
			});
		}
	}

	it("should report a parse error rather than throwing a different shape", async () => {
		await expect(jsMinify({ "broken.js": "function (" })).rejects.toThrow();
	});

	it("should claim JavaScript assets only", () => {
		expect(jsMinify.filter("app.js")).toBe(true);
		expect(jsMinify.filter("app.mjs?v=1")).toBe(true);
		expect(jsMinify.filter("app.cjs")).toBe(true);
		expect(jsMinify.filter("styles.css")).toBe(false);
		expect(jsMinify.getTypes()).toEqual(["javascript"]);
		expect(jsMinify.supportsWorkerThreads()).toBe(true);
	});

	it("should report terser's version, so a cache entry follows it", () => {
		expect(jsMinify.getMinimizerVersion()).toBe(
			require("terser/package.json").version
		);
	});
});
