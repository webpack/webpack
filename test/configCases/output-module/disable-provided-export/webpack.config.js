var webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: "./lib1.js",
		optimization: {
			providedExports: false
		},
		output: {
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		},
		externals: ["react"],
		externalsType: "module"
	},
	{
		entry: "./lib2.js",
		optimization: {
			providedExports: false
		},
		output: {
			library: {
				type: "module",
				export: ["_default"]
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./run.js",
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: `
					import lib1, { foo, React } from './bundle0.mjs';
					import { _default } from './bundle1.mjs';
					let lib1Exports = { default: lib1, foo };
					let lib2Exports = { _default };
					`
			})
		],
		output: {
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		}
	}
];
