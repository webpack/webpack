"use strict";

const publicPaths = [
	"auto",
	"/",
	"/static/img/",
	"/static/img/../deep/",
	"//cdn.webpack.js/assets/",
	"",
	"https://webpack.js.org/",
	"https://webpack.js.org/../foo/",
	"https://webpack.js.org/foo/../",
	"https://webpack.js.org./",
	"../",
	"./",
	"../static/",
	"./static/",
	// TODO BUG
	(pathData) => `https://webpack.js.org/${pathData.hash}/`
];

/** @type {import("../../../../").Configuration[]} */
module.exports = publicPaths.map((item, idx) => ({
	name: String(idx),
	target: "web",
	output: {
		chunkFilename: "[name].chunk.js",
		publicPath: item
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /same_root\.(svg)$/,
				type: "asset/resource",
				generator: { filename: "[name][ext]" }
			},
			{
				test: /nested_dir\.(svg)$/,
				type: "asset/resource",
				generator: { filename: "styles/nested/[name][ext]" }
			}
		]
	},
	experiments: {
		css: true
	}
}));
