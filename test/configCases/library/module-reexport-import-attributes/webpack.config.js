"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ type: "module", minimize: false },
	{ type: "module", minimize: true },
	{ type: "modern-module", minimize: false },
	{ type: "modern-module", minimize: true }
].map(({ type, minimize }, index) => ({
	mode: minimize ? "production" : "development",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type } }
	},
	output: { module: true, filename: `[name]${index}.mjs` },
	externalsType: "module",
	externals: ["./data.json"],
	optimization: { minimize },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("testcase", (compilation) => {
					compilation.hooks.processAssets.tap("testcase", () => {
						compilation.emitAsset(
							"data.json",
							new compiler.webpack.sources.RawSource('{"answer":42}')
						);
					});
				});
			}
		}
	]
}));
