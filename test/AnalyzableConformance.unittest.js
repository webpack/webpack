"use strict";

const os = require("os");
const path = require("path");
const {
	checkAnalyzableConformance,
	literalSpecifiersOf
} = require("./helpers/analyzableConformance");

// A directory nothing writes to, so every read falls through to the sources the
// fake carries rather than to a file some other run left behind.
const ROOT = path.join(os.tmpdir(), "analyzable-conformance-unittest");

/**
 * A compilation shaped the way the check reads one, so a walk can be driven
 * without a build. Every chunk holds one file and one asset of the same name.
 * @param {object} options what the fake holds
 * @param {Record<string, string>} options.files emitted javascript, by name
 * @param {string[]} options.entry names the entrypoint carries
 * @param {string[]=} options.bailouts reasons the build recorded
 * @param {(string | false)=} options.devtool the devtool it was built with
 * @returns {EXPECTED_ANY} the fake compilation
 */
const fakeCompilation = ({ files, entry, bailouts = [], devtool = false }) => {
	const names = Object.keys(files);
	return {
		outputOptions: { module: true, path: ROOT },
		options: { devtool },
		errors: [],
		assets: Object.fromEntries(
			names.map((name) => [name, { source: () => files[name] }])
		),
		chunks: names.map((name) => ({ files: [name] })),
		entrypoints: new Map([["main", { getFiles: () => entry }]]),
		modules: [{}],
		chunkGraph: { getChunkRuntimeModulesIterable: () => [] },
		runtimeTemplate: { analyzableBailoutsOf: () => bailouts }
	};
};

describe("AnalyzableConformance", () => {
	describe("literalSpecifiersOf", () => {
		it("should read every specifier a lexer and an AST can name", () => {
			const specifiers = literalSpecifiersOf(
				[
					'import "./static.mjs";',
					'export const lazy = () => import("./lazy.mjs");',
					'export const url = new URL("./asset.txt", import.meta.url);'
				].join("\n")
			);

			expect(specifiers.sort()).toEqual([
				"./asset.txt",
				"./lazy.mjs",
				"./static.mjs"
			]);
		});

		it("should leave out a specifier built rather than written", () => {
			const specifiers = literalSpecifiersOf(
				[
					"const name = globalThis.name;",
					"export const lazy = () => import(name);",
					'export const other = () => import("./" + name);',
					"export const url = new URL(name, import.meta.url);"
				].join("\n")
			);

			expect(specifiers).toEqual([]);
		});

		it("should keep the imports of a module acorn cannot parse", () => {
			// The lexer reads phase imports acorn is behind on, and a foreign
			// bundler reads the file the same way.
			const specifiers = literalSpecifiersOf(
				'import defer * as ns from "./deferred.mjs";'
			);

			expect(specifiers).toEqual(["./deferred.mjs"]);
		});
	});

	describe("checkAnalyzableConformance", () => {
		it("should accept a chunk an entry imports by name", () => {
			const findings = checkAnalyzableConformance(
				fakeCompilation({
					files: {
						"main.mjs": 'export const lazy = () => import("./lazy.mjs");',
						"lazy.mjs": "export default 1;"
					},
					entry: ["main.mjs"]
				})
			);

			expect(findings).toEqual([]);
		});

		it("should read a name through the public path it is served under", () => {
			const findings = checkAnalyzableConformance(
				fakeCompilation({
					files: {
						"main.mjs": 'import("/static/lazy.mjs");',
						"lazy.mjs": "export default 1;"
					},
					entry: ["main.mjs"]
				})
			);

			expect(findings).toEqual([]);
		});

		it("should report a chunk only the runtime reaches", () => {
			const findings = checkAnalyzableConformance(
				fakeCompilation({
					files: {
						"main.mjs": 'export const lazy = () => __webpack_require__.e("1");',
						"lazy.mjs": "export default 1;"
					},
					entry: ["main.mjs"]
				})
			);

			expect(findings).toEqual([
				"no literal specifier reaches lazy.mjs, and nothing was recorded about why"
			]);
		});

		it("should take a recorded reason as the answer for that chunk", () => {
			const findings = checkAnalyzableConformance(
				fakeCompilation({
					files: {
						"main.mjs": 'export const lazy = () => __webpack_require__.e("1");',
						"lazy.mjs": "export default 1;"
					},
					entry: ["main.mjs"],
					bailouts: ['output.chunkFormat is "array-push"']
				})
			);

			expect(findings).toEqual([]);
		});

		it("should take an eval devtool as the answer, since it hides them all", () => {
			const findings = checkAnalyzableConformance(
				fakeCompilation({
					files: {
						"main.mjs": 'eval("import(\\"./lazy.mjs\\")");',
						"lazy.mjs": "export default 1;"
					},
					entry: ["main.mjs"],
					devtool: "eval"
				})
			);

			expect(findings).toEqual([]);
		});

		it("should report a name nothing emitted", () => {
			const findings = checkAnalyzableConformance(
				fakeCompilation({
					files: { "main.mjs": 'import "./gone.mjs";' },
					entry: ["main.mjs"]
				})
			);

			expect(findings).toEqual([
				"main.mjs names ./gone.mjs, which was not emitted"
			]);
		});
	});
});
