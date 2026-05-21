"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		publicPath: "GLOBAL/",
		assetModuleFilename: "file[ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				resourceQuery: /^\?plain$/,
				type: "asset/resource",
				generator: {
					publicPath: "plain/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?empty$/,
				type: "asset/resource",
				generator: {
					publicPath: ""
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?fname$/,
				type: "asset/resource",
				generator: {
					publicPath: "fname/[name][ext]/[base]/[path]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?modid$/,
				type: "asset/resource",
				generator: {
					publicPath: "modid/[id]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?modhash$/,
				type: "asset/resource",
				generator: {
					publicPath: "modhash/[modulehash]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?ch$/,
				type: "asset/resource",
				generator: {
					publicPath: "ch/[contenthash:8]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?hash$/,
				type: "asset/resource",
				generator: {
					publicPath: "h/[hash]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?rt$/,
				type: "asset/resource",
				generator: {
					publicPath: "rt/[runtime]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?fn$/,
				type: "asset/resource",
				generator: {
					publicPath: () => "fn/[contenthash:8]/"
				}
			},
			{
				test: /\.png$/,
				resourceQuery: /^\?combined$/,
				type: "asset/resource",
				generator: {
					publicPath: "c/[runtime]/[id]/[contenthash:6]/"
				}
			},
			{
				test: /\.jpg$/,
				type: "asset/resource",
				generator: {
					publicPath: "jpg/[contenthash:10]/[name][ext]/"
				}
			},
			{
				test: /\.svg$/,
				type: "asset/resource",
				generator: {
					publicPath: "svg/[hash]/[ext]/"
				}
			}
		]
	}
};
