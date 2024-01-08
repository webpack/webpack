/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		output: {
			filename: "bundle0.[contenthash].a.js",
			assetModuleFilename: "img/[name].a.[contenthash][ext]"
		},
		optimization: {
			moduleIds: "size"
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
			filename: "bundle1.[contenthash].b.js",
			assetModuleFilename: "img/[name].a.[contenthash][ext]"
		},
		optimization: {
			moduleIds: "size"
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
