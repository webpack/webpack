"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ type: "module", mode: "development" },
	{ type: "module", mode: "production" },
	{ type: "modern-module", mode: "development" },
	{ type: "modern-module", mode: "production" }
].map(({ type, mode }, index) => ({
	mode,
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type } }
	},
	output: {
		module: true,
		filename: `[name]-${type}-${index}.mjs`
	},
	externalsType: "module",
	externals: {
		"./library.mjs": `./library-${type}-${index}.mjs`,
		external: `./external-${type}-${index}.mjs`
	},
	optimization: { concatenateModules: false },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("testcase", (compilation) => {
					const filename = path.resolve(__dirname, "external.js");
					compilation.fileDependencies.add(filename);
					compilation.hooks.processAssets.tap("testcase", () => {
						compilation.emitAsset(
							`external-${type}-${index}.mjs`,
							new compiler.webpack.sources.RawSource(fs.readFileSync(filename))
						);
					});
				});
			}
		}
	]
}));
