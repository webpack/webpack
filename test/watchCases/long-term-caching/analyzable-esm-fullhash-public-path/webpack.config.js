"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		filename: "bundle.mjs",
		chunkFilename: "[name].mjs",
		// The full hash is baked into the analyzable literal; each rebuild must
		// re-substitute the new hash even though bundle.mjs's own content is unchanged.
		publicPath: "https://cdn.example.com/[fullhash]/"
	}
};
