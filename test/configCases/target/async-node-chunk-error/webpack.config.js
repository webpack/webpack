"use strict";

const { RawSource } = require("webpack-sources");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "async-node",
	output: {
		chunkFilename: "[name].js"
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap("Test", () => {
					compilation.updateAsset("broken.js", new RawSource("not valid {"));
				});
			});
		}
	]
};
