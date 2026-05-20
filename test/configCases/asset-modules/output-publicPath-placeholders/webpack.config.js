"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: {
		plain: { import: "./plain.js", publicPath: "plain/" },
		fullhash: { import: "./fullhash.js", publicPath: "fh/[fullhash]/" },
		fullhashLen: {
			import: "./fullhashLen.js",
			publicPath: "fhl/[fullhash:8]/"
		},
		combined: {
			import: "./combined.js",
			publicPath: "c/[fullhash]/sub/[fullhash:6]/"
		},
		fnString: { import: "./fnString.js", publicPath: () => "fnstr/" },
		fnHash: {
			import: "./fnHash.js",
			publicPath: (data) => `fnhash/${data.hash}/`
		},
		fnPlaceholder: {
			import: "./fnPlaceholder.js",
			publicPath: () => "fnph/[fullhash:8]/"
		}
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	}
};
