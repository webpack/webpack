"use strict";

/**
 * Names the given chunks by their own content, which `output` alone cannot do for some
 * chunks and not others.
 * @param {string[]} names chunk names to rename
 * @returns {import("../../../../").WebpackPluginFunction} the plugin
 */
const nameConsumersByContent = (names) => (compiler) => {
	compiler.hooks.compilation.tap("NameConsumersByContent", (compilation) => {
		compilation.hooks.afterChunks.tap("NameConsumersByContent", (chunks) => {
			for (const chunk of chunks) {
				const chunkName = chunk.name;
				if (typeof chunkName === "string" && names.includes(chunkName)) {
					chunk.filenameTemplate = "[name].[contenthash].mjs";
				}
			}
		});
	});
};

// One module duplicated into chunks at two output depths, so each copy needs its own
// `../` path — resolved per asset, and folded into names nothing else repairs.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	plugins: [nameConsumersByContent(["flat", "nested/deep"])],
	output: {
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: {
		realContentHash: false,
		chunkIds: "named",
		splitChunks: false
	}
};
