"use strict";

// Bun aborts in its node:vm SourceTextModule.link() and Deno hard-panics
// ("Module not found") on less-loader's `import("less")`; on both load the CJS
// less so it skips the dynamic import.
const lessLoader =
	process.versions.bun || process.versions.deno
		? { loader: "less-loader", options: { implementation: require("less") } }
		: "less-loader";

const common = {
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.less$/,
				type: "css/auto",
				use: [lessLoader],
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
					},
					{
						resourceQuery: /\?fullhash-length$/,
						generator: {
							localIdentName: "[fullhash:4]-[local]"
						}
					},
					{
						resourceQuery: /\?hash-digest$/,
						generator: {
							localIdentName: "[local]__[hash:base64:5]"
						}
					},
					{
						resourceQuery: /\?contenthash-digest$/,
						generator: {
							localIdentName: "[contenthash:base64:8]-[local]"
						}
					},
					{
						resourceQuery: /\?fullhash-digest$/,
						generator: {
							localIdentName: "[local]__[fullhash:base64url:5]"
						}
					},
					{
						resourceQuery: /\?modulehash$/,
						generator: {
							localIdentName: "[modulehash]-[local]"
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
