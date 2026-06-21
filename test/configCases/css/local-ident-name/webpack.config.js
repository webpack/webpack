"use strict";

const common = {
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.less$/,
				type: "css/auto",
				// Use the CJS less; less-loader's default `import("less")` crashes Bun's vm.
				use: [
					{
						loader: "less-loader",
						options: { implementation: require("less") }
					}
				],
				generator: {
					localIdentName: "[path][name][ext]__[local]"
				}
			},
			{
				test: /\.css$/,
				type: "css/auto",
				oneOf: [
					{
						resourceQuery: /\?hash$/,
						generator: {
							localIdentName: "[hash]"
						}
					},
					{
						resourceQuery: /\?hash-local$/,
						generator: {
							localIdentName: "[hash]-[local]"
						}
					},
					{
						resourceQuery: /\?path-name-local$/,
						generator: {
							localIdentName: "[path][name]__[local]"
						}
					},
					{
						resourceQuery: /\?file-local$/,
						generator: {
							localIdentName: "[file]__[local]"
						}
					},
					{
						resourceQuery: /\?q$/,
						resourceFragment: /#f$/,
						generator: {
							localIdentName: "[file][query][fragment]__[local]"
						}
					},
					{
						resourceQuery: /\?uniqueName-id-contenthash$/,
						generator: {
							localIdentName: "[uniqueName]-[id]-[contenthash]"
						}
					},
					{
						resourceQuery: /\?uniquename-local$/,
						generator: {
							localIdentName: "[uniquename]__[local]"
						}
					},
					{
						resourceQuery: /\?hash-local-custom$/,
						generator: {
							localIdentHashSalt: "salt",
							localIdentHashDigest: "base26",
							localIdentHashDigestLength: 16,
							localIdentName: "[hash]-[local]"
						}
					}
				]
			}
		]
	},
	experiments: {
		css: true
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		...common,
		target: "web"
	},
	{
		...common,
		target: "node"
	}
];
