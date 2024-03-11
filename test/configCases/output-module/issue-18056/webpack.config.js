var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "node",
		entry: {
			import: "./index.js"
		},
		optimization: {
			providedExports: false,
			usedExports: true
		},
		output: {
			libraryTarget: "module",
			module: true,
			chunkFormat: "module"
		},
		experiments: {
			outputModule: true
		},
		externals: ["react"],
		externalsType: "module"
	},
	{
		entry: "./run.js",
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner:
					"import mod, { m } from './bundle0.mjs';\nlet issue18056 = { default: mod, m };"
			})
		],
		output: {
			module: true,
			chunkFormat: "module"
		},
		experiments: {
			outputModule: true
		}
	}
];
