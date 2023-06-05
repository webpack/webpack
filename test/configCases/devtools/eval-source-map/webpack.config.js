const devtool = "eval-source-map";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		devtool
	},
	{
		devtool,
		optimization: {
			moduleIds: "natural"
		}
	},
	{
		devtool,
		optimization: {
			moduleIds: "named"
		}
	},
	{
		devtool,
		optimization: {
			moduleIds: "deterministic"
		}
	},
	{
		devtool,
		optimization: {
			moduleIds: "size"
		}
	},
	{
		entry: "./index?foo=bar",
		devtool,
		optimization: {
			moduleIds: "named"
		}
	},
	{
		entry: "./index.js?foo=bar",
		devtool,
		optimization: {
			moduleIds: "named"
		}
	},
	{
		entry: "alias",
		devtool,
		optimization: {
			moduleIds: "named"
		},
		resolve: {
			alias: {
				alias: "./index?foo=bar"
			}
		}
	},
	{
		entry: "pkg",
		devtool,
		optimization: {
			moduleIds: "named"
		}
	},
	{
		entry: "./index.ts?foo=bar",
		devtool,
		optimization: {
			moduleIds: "named"
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					loader: "ts-loader",
					options: {
						transpileOnly: true
					}
				}
			]
		}
	}
];
