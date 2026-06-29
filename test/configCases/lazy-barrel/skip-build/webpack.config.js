"use strict";

const path = require("path");

/** @typedef {import("../../../../").NormalModule} NormalModule */

// Modules of `heavy-lib` that must stay deferred when only `used` is imported.
const deferred = new Set(
	["unused.js", "deep.js"].map((f) =>
		path.resolve(__dirname, "node_modules/heavy-lib", f)
	)
);

/** @type {(concatenateModules: boolean) => import("../../../../").Configuration} */
const config = (concatenateModules) => ({
	mode: "production",
	optimization: {
		sideEffects: true,
		providedExports: true,
		usedExports: true,
		concatenateModules,
		minimize: false
	},
	module: {
		// A loader that throws if it runs on the unused subtree; lazy barrel must
		// never factorize/build those modules, so it must never execute (#15643).
		rules: [
			{
				test: /heavy-lib[\\/](unused|deep)\.js$/,
				use: require.resolve("./boom-loader.js")
			}
		]
	},
	plugins: [
		(compiler) => {
			const created = new Set();
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.buildModule.tap("Test", (module) => {
					created.add(/** @type {NormalModule} */ (module).resource);
				});
			});
			compiler.hooks.done.tap("Test", () => {
				for (const module of deferred) {
					expect(created.has(module)).toBe(false);
				}
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
