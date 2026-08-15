"use strict";

// A `module` library exports top-level declarations natively, so the exports object
// and `.d`/`.o` have no reader; a wrapped entry keeps them, being read from it.

/**
 * @param {string} assetName emitted entry asset to assert on
 * @param {(source: string) => void} assert what the emitted bundle must look like
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertBundle = (assetName, assert) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				assert(String(assets[assetName].source()));
			});
		});
	};

/**
 * @param {string} name output asset base name
 * @param {string} entry entry module
 * @param {(source: string) => void} assert what the emitted bundle must look like
 * @param {("production" | "development")=} mode which mode to build in
 * @param {boolean=} avoidEntryIife whether the entry may be inlined without an IIFE
 * @returns {import("../../../../").Configuration} config
 */
const variant = (
	name,
	entry,
	assert,
	mode = "production",
	avoidEntryIife = undefined
) => ({
	mode,
	devtool: false,
	entry,
	target: "node14",
	output: {
		filename: `${name}.mjs`,
		chunkFilename: `${name}-[name].mjs`,
		module: true,
		library: { type: "module" }
	},
	optimization: { concatenateModules: false, minimize: false, avoidEntryIife },
	experiments: { outputModule: true },
	plugins: [assertBundle(`${name}.mjs`, assert)]
});

// Built here so the assertions don't self-match this file's source.
const define = `${"__webpack_require__"}.d(`;
const requireScope = `${"__webpack_require__"}`;
const defineGetters = `${"__webpack_require__"}.d =`;
const markNamespace = `${"__webpack_require__"}.r(`;
const defineMarkNamespace = `${"__webpack_require__"}.r =`;

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	variant("inlined", "./lib.js", (source) => {
		expect(source).toMatch(/export \{[^}]*\banswer\b/);
		// Nothing is read off the exports object, so no runtime is needed at all.
		expect(source).not.toContain(requireScope);
	}),
	variant("wrapped", "./wrapped.js", (source) => {
		// The registry hands the exports object back, so the definitions stay.
		expect(source).toContain(define);
	}),
	// Development keeps every export used, so the `__esModule` marker survives the
	// usage analysis that prunes it in production — it has to go on its own merit.
	variant(
		"inlined-dev",
		"./lib.js",
		(source) => {
			expect(source).toMatch(/export \{[^}]*\banswer\b/);
			expect(source).not.toContain(requireScope);
		},
		"development"
	),
	variant(
		"wrapped-dev",
		"./wrapped.js",
		(source) => {
			// Read back off the exports object here, so the marker stays — and whatever
			// calls it must also be defined.
			expect(source).toContain(markNamespace);
			expect(source).toContain(defineMarkNamespace);
		},
		"development"
	),
	// A sibling module in the chunk wraps the entry in an IIFE, which re-emits the
	// taken-over exports source — so the helpers it calls must survive.
	variant(
		"sibling-dev",
		"./with-sibling.js",
		(source) => {
			expect(source).toContain(define);
			expect(source).toContain(defineGetters);
			expect(source).toContain(markNamespace);
			expect(source).toContain(defineMarkNamespace);
		},
		"development"
	),
	// Inlined past the sibling, so the entry's own definitions go — but the sibling
	// still marks its namespace, and that helper has to stay behind for it.
	variant(
		"sibling-inlined-dev",
		"./with-sibling.js",
		(source) => {
			expect(source).not.toContain(define);
			expect(source).not.toContain(defineGetters);
			expect(source).toContain(markNamespace);
			expect(source).toContain(defineMarkNamespace);
		},
		"development",
		true
	)
];
