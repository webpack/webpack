"use strict";

const webpack = require("../../../");
const basic = {
	entry: {
		main: "./index"
	},
	output: {
		filename: "bundle.js"
	},
	stats: {
		hash: false,
		timings: false,
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		modules: false
	}
};
module.exports = [
	Object.assign({
		name: "normal"
	}, basic),
	Object.assign({
		name: "children",
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "main",
				children: true,
				minChunks: 3
			})
		]
	}, basic),
	Object.assign({
		name: "async",
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "main",
				children: true,
				async: true,
				minChunks: 3
			})
		]
	}, basic),
	Object.assign({
		name: "deep-children",
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "main",
				children: true,
				deepChildren: true,
				minChunks: 3
			})
		]
	}, basic),
	Object.assign({
		name: "deep-async",
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "main",
				children: true,
				deepChildren: true,
				async: true,
				minChunks: 3
			})
		]
	}, basic),
];
