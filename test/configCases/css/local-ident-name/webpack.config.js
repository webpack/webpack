"use strict";

const common = {
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.less$/,
				type: "css/auto",
				use: ["less-loader"],
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
