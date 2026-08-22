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
		mode: "production",
		experiments: { deferImport: true },
		optimization: {
			// Renders the deferred import through `importStatement`.
			concatenateModules: false
		},
		plugins: [snapshotBundle("bundle0.js")]
	},
	{
		name: "concatenated",
		mode: "production",
		experiments: { deferImport: true },
		// A CommonJS module cannot join the concatenation, so it stays an external
		// member of it and `ConcatenatedModule` renders the deferred loader itself.
		optimization: { concatenateModules: true },
		plugins: [snapshotBundle("bundle1.js")]
	}
];
