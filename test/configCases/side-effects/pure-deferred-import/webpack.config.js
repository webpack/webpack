"use strict";

const target = `async-node${process.versions.node.split(".").map(Number)[0]}`;

/**
 * Snapshots the emitted bundle, so the annotation is reviewed as part of the
 * whole printed output rather than pinned by a substring.
 * @param {string} name emitted bundle name
 * @returns {(compiler: import("../../../../types").Compiler) => void} plugin
 */
const snapshotBundle = (name) => (compiler) => {
	compiler.hooks.compilation.tap(
		"test",
		(/** @type {import("../../../../types").Compilation} */ compilation) => {
			compilation.hooks.afterProcessAssets.tap(
				"test",
				(
					/** @type {Record<string, import("webpack-sources").Source>} */ assets
				) => {
					expect(assets[name].source()).toMatchSnapshot();
				}
			);
		}
	);
};

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		name: "plain",
		target,
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
		target,
		mode: "production",
		experiments: { deferImport: true },
		// A CommonJS module cannot join the concatenation, so it stays an external
		// member of it and `ConcatenatedModule` renders the deferred loader itself.
		optimization: { concatenateModules: true },
		plugins: [snapshotBundle("bundle1.js")]
	}
];
