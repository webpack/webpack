"use strict";

/**
 * Asserts from the build rather than from `index.js`, which is bundled and would
 * put the needles into the very output it reads.
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertRuntime = () =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = Object.keys(assets)
					.filter((file) => file.endsWith(".mjs"))
					.map((file) => String(assets[file].source()))
					.join("\n");
				expect(source).toContain(
					'process.getBuiltinModule("node:fs").readFile('
				);
				expect(source).not.toContain("import('fs')");
			});
		});
	};

/**
 * @param {string} name config name
 * @param {string | string[]} target target
 * @param {"async" | "sync"} type wasm module type
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (name, target, type) => ({
	name,
	target,
	module: {
		rules: [
			{ test: /\.wat$/, loader: "wast-loader", type: `webassembly/${type}` }
		]
	},
	output: {
		module: true,
		webassemblyModuleFilename: "[id].[hash].wasm"
	},
	experiments: { [`${type}WebAssembly`]: true },
	plugins: [assertRuntime()]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("async", "node22.3", "async"),
	config("sync", "node22.3", "sync"),
	// on node the universal backend takes the same `readFile` branch
	config("universal", ["web", "node22.3"], "async")
];
