"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].[chunkhash:8].[contenthash:8].js",
		chunkFilename: "[name].[chunkhash:8].[contenthash:8].js"
	},
	optimization: {
		chunkIds: "named",
		emitOnErrors: true
	},
	experiments: {
		css: true,
		asyncWebAssembly: true
	},
	module: {
		rules: [
			{
				type: "asset/source",
				test: /source\.txt$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "asset/source error message"
					}
				}
			},
			{
				type: "asset/resource",
				test: /file\.svg$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "asset/resource error message"
					}
				}
			},
			{
				type: "asset/resource",
				test: /other\.svg$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "asset/resource other error message"
					}
				}
			},
			{
				type: "asset/inline",
				test: /inline\.txt$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "asset/inline error message"
					}
				}
			},
			{
				type: "css",
				test: /style\.css$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "css error message"
					}
				}
			},
			{
				type: "asset/resource",
				test: /in-style\.png$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "asset/resource in css error message"
					}
				}
			},
			{
				type: "asset/source",
				test: /in-style-source\.png$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "asset/source in css error message"
					}
				}
			},
			{
				type: "javascript/auto",
				test: /module\.js$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "javascript/auto error message"
					}
				}
			},
			{
				type: "json",
				test: /file\.json$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "json error message"
					}
				}
			},
			{
				type: "json",
				test: /other\.json$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "json other error message"
					}
				}
			},
			{
				type: "css/auto",
				generator: {
					exportsOnly: true
				},
				test: /style\.modules\.css$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "css/auto error message"
					}
				}
			},
			{
				type: "webassembly/async",
				test: /async-wasm\.wat$/,
				use: {
					loader: "./loader.js",
					options: {
						message: "webassembly/async error message"
					}
				}
			}
		]
	}
};
