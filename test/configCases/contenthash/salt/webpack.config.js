/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "bundle0.[contenthash].js",
			assetModuleFilename: "[name].[contenthash][ext]",
			hashSalt: "1"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/resource"
				}
			]
		}
	},
	{
		output: {
			filename: "bundle1.[contenthash].js",
			assetModuleFilename: "[name].[contenthash][ext]",
			hashSalt: "1"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/resource"
				}
			]
		}
	},
	{
		output: {
			filename: "bundle2.[contenthash].js",
			assetModuleFilename: "[name].[contenthash][ext]",
			hashSalt: "2"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/resource"
				}
			]
		}
	}
];
