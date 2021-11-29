/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "bundle0.[contenthash].js",
			assetModuleFilename: "img/[name].[contenthash][ext]"
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
			assetModuleFilename: "asset/[name].[contenthash][ext]"
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
			assetModuleFilename: "asset/[name].[contenthash][ext]"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/resource",
					generator: {
						publicPath: "/public/"
					}
				}
			]
		}
	},
	{
		output: {
			filename: "bundle3.[contenthash].js",
			assetModuleFilename: "asset/[name].[contenthash][ext]"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/inline"
				}
			]
		}
	},
	{
		output: {
			filename: "bundle4.[contenthash].js",
			assetModuleFilename: "asset/[name].[contenthash][ext]"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/inline",
					generator: {
						dataUrl: {
							encoding: false
						}
					}
				}
			]
		}
	},
	{
		output: {
			filename: "bundle5.[contenthash].js",
			assetModuleFilename: "asset/[name].[contenthash][ext]"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/source",
					generator: {
						dataUrl: {
							mimetype: "text/plain"
						}
					}
				}
			]
		}
	},
	{
		output: {
			filename: "bundle6.[contenthash].js",
			assetModuleFilename: "asset/[name].[contenthash][ext]"
		},
		module: {
			rules: [
				{
					test: /\.jpg$/,
					type: "asset/resource",
					generator: {
						// should result in same hash as bundle2
						publicPath: () => "/public/"
					}
				}
			]
		}
	}
];
