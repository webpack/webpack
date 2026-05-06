"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @typedef {import("../../../../").PathData} PathData */
/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {"link" | "text" | "css-style-sheet" | "style"} ExportType */

const EXPORT_TYPES =
	/** @type {ExportType[]} */
	(["link", "text", "css-style-sheet", "style"]);

/**
 * @param {ExportType} exportType css parser exportType
 * @returns {Configuration} webpack configuration
 */
const createConfig = (exportType) => ({
	name: exportType,
	target: "web",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.less$/,
				use: ["./remove-source-map-url-loader", "less-loader"]
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-1$/,
				generator: {
					// TODO do we need to support `[hash]` as  `[fullhash]` here
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashDigest: "base64url",
					localIdentHashDigestLength: 5
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-2$/,
				generator: {
					localIdentName: "-1[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-3$/,
				generator: {
					localIdentName: "--[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-4$/,
				generator: {
					localIdentName: "__[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-5$/,
				generator: {
					localIdentName: "[local]--[fullhash]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-6$/,
				generator: {
					localIdentName: "😀- -[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-7$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashFunction: "sha256",
					localIdentHashDigestLength: 10
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-8$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashFunction: "xxhash64",
					localIdentHashDigestLength: 6
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-9$/,
				generator: {
					/**
					 * @param {PathData} pathData path data
					 * @returns {string} local ident name
					 */
					localIdentName: (pathData) =>
						`prefix-${pathData.filename}---${pathData.local}---${pathData.hash}-postfix`
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-10$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashSalt: "my-custom-salt"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-11$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashDigest: "hex",
					localIdentHashDigestLength: 8
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-12$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashDigest: "base64",
					localIdentHashDigestLength: 8
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-13$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashFunction: "md4",
					localIdentHashDigest: "base64url",
					localIdentHashDigestLength: 6
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-14$/,
				generator: {
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashFunction: "sha256",
					localIdentHashSalt: "another-salt",
					localIdentHashDigest: "hex",
					localIdentHashDigestLength: 12
				}
			}
		],
		parser: {
			css: {
				exportType
			}
		}
	},
	resolve: {
		alias: {
			// Migration example
			"~test": path.resolve(__dirname, "node_modules/test")
		}
	},
	experiments: {
		css: true
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env.EXPORT_TYPE": JSON.stringify(exportType)
		})
	]
});

module.exports = EXPORT_TYPES.map(createConfig);
