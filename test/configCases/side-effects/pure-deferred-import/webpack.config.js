"use strict";

/** @type {(name: string) => (compiler: import("../../../../types").Compiler) => void} */
const snapshotBundle = (name) => (compiler) => {
	compiler.hooks.compilation.tap(
		"test",
		(/** @type {import("../../../../types").Compilation} */ compilation) => {
			compilation.hooks.afterProcessAssets.tap(
				"test",
				(
					/** @type {Record<string, import("webpack-sources").Source>} */ assets
				) => {
					// Named: the two compilers run concurrently, so an unnamed snapshot
					// would key on call order and the two bundles could swap places.
					expect(assets[name].source()).toMatchSnapshot(name);
				}
			);
		}
	);
};

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		name: "plain",
		target: "node",
		mode: "production",
		// The annotation is only written into output another build reads back.
		output: {
			filename: "bundle0.mjs",
			library: { type: "module" },
			module: true
		},
		experiments: { deferImport: true, outputModule: true },
		optimization: {
			// Renders the deferred import through `importStatement`.
			concatenateModules: false
		},
		plugins: [snapshotBundle("bundle0.mjs")]
	},
	{
		name: "concatenated",
		target: "node",
		mode: "production",
		output: {
			filename: "bundle1.mjs",
			library: { type: "module" },
			module: true
		},
		experiments: { deferImport: true, outputModule: true },
		// A CommonJS module cannot join the concatenation, so it stays an external
		// member of it and `ConcatenatedModule` renders the deferred loader itself.
		optimization: { concatenateModules: true },
		plugins: [snapshotBundle("bundle1.mjs")]
	}
];
