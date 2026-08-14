"use strict";

// `baseUri` is hashed only where a baked url actually reads it; elsewhere the code is
// the same under every base, so hashing it would throw away every `[contenthash]`.

const BASE = "https://example.com/base/";

// Overwritten rather than appended: the cache suite runs the same configs several
// times in one process.
/** @type {Map<string, string>} */
const hashes = new Map();

/**
 * @param {string} key what this variant is called in the report below
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const recordModuleHash = (key) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterCodeGeneration.tap("testcase", () => {
				const { chunkGraph } = compilation;
				for (const module of compilation.modules) {
					if (!module.identifier().endsWith("index.js")) continue;
					for (const runtime of chunkGraph.getModuleRuntimes(module)) {
						hashes.set(key, chunkGraph.getModuleHash(module, runtime));
					}
				}
			});
		});
	};

/**
 * @param {string} name variant name, shared by its with- and without-base pair
 * @param {number} index position of this config, so its files stay apart
 * @param {boolean} withBase whether the entry sets a `baseUri`
 * @param {string} publicPath the public path under test
 * @param {boolean=} relative whether the reference keeps the runtime form
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (name, index, withBase, publicPath, relative = false) => ({
	name: `${name}:${withBase ? "base" : "none"}`,
	target: "node",
	mode: "development",
	devtool: false,
	entry: withBase
		? { main: { import: "./index.js", baseUri: BASE } }
		: "./index.js",
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: `bundle${index}.mjs`,
		library: { type: "module" },
		publicPath,
		assetModuleFilename: "[name][ext]"
	},
	module: {
		parser: relative ? { javascript: { url: "relative" } } : {},
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	plugins: [recordModuleHash(`${name}:${withBase ? "base" : "none"}`)]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// `auto` resolves to an absolute url of its own, so nothing reads the base.
	base("auto", 0, false, "auto"),
	base("auto", 1, true, "auto"),
	// Root-absolute reaches the same place from any base.
	base("root", 2, false, "/static/"),
	base("root", 3, true, "/static/"),
	// A relative reference keeps the runtime form, which reads `.b` when it runs.
	base("relative", 4, false, "./", true),
	base("relative", 5, true, "./", true),
	// Here the base really does reach the baked url, so it has to be hashed.
	base("reads-base", 6, false, "./"),
	base("reads-base", 7, true, "./"),
	{
		...base("report", 8, false, "auto"),
		// Compilers run concurrently, so name every pair above as a dependency —
		// otherwise this one can report before they have recorded their hashes.
		dependencies: [
			"auto:none",
			"auto:base",
			"root:none",
			"root:base",
			"relative:none",
			"relative:base",
			"reads-base:none",
			"reads-base:base"
		],
		plugins: [
			function apply() {
				this.hooks.done.tap("testcase", () => {
					for (const name of ["auto", "root", "relative", "reads-base"]) {
						expect(
							`${name} reported: ${hashes.has(`${name}:none`)} ${hashes.has(`${name}:base`)}`
						).toBe(`${name} reported: true true`);
					}
					// The base cannot reach the code, so it must not reach the hash.
					for (const name of ["auto", "root", "relative"]) {
						expect(`${name}: ${hashes.get(`${name}:base`)}`).toBe(
							`${name}: ${hashes.get(`${name}:none`)}`
						);
					}
					// Here it does, and two entries with different bases bake different
					// code — so the hash has to tell them apart.
					expect(hashes.get("reads-base:base")).not.toBe(
						hashes.get("reads-base:none")
					);
				});
			}
		]
	}
];
