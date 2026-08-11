"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	node: { __dirname: false, __filename: false },
	externalsPresets: { node: true },
	output: { chunkFilename: "[name].chunk.js" },
	optimization: { chunkIds: "named" },
	experiments: { html: true }
};
