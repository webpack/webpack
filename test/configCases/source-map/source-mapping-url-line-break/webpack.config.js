"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map",
	entry: {
		main: "./index.js",
		other: "./other.js"
	},
	output: {
		// The query ends in ".css", but the asset is still JavaScript.
		filename: (pathData) =>
			pathData.chunk.name === "other" ? "other.js?a*/b.css" : "[name].js",
		chunkFilename: "[name].js"
	}
};
