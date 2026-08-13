"use strict";

// A `module` library exports its entry's top-level declarations natively, so the
// definitions written into the exports object are read by nobody — and neither is
// `__webpack_require__.d` nor the `.o` it calls. An entry the runtime still has to
// wrap keeps them, because there the object is what the export is read from.

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
 * @returns {import("../../../../").Configuration} config
 */
const variant = (name, entry, assert) => ({
	mode: "production",
	devtool: false,
	entry,
	target: "node14",
	output: {
		filename: `${name}.mjs`,
		chunkFilename: `${name}-[name].mjs`,
		module: true,
		library: { type: "module" }
	},
	optimization: { concatenateModules: false, minimize: false },
	experiments: { outputModule: true },
	plugins: [assertBundle(`${name}.mjs`, assert)]
});

// Built here so the assertions don't self-match this file's source.
const define = `${"__webpack_require__"}.d(`;
const requireScope = `${"__webpack_require__"}`;

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
	})
];
