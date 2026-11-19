"use strict";

const path = require("path");
const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");

/** @type {import("../../../../").Configuration} */
const base = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: "./loaders/css-loader"
			},
			{
				test: /\.md$/,
				loader: "./loaders/md-loader"
			},
			{
				test: /\.txt$/,
				dependency: { not: "url" },
				type: "asset/source"
			},
			{
				test: /LICENSE$/,
				dependency: { not: "url" },
				type: "asset/source"
			}
		]
	}
};

const frozen = true;
const allowedUris = ["http://localhost:9990/"];

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		name: "frozen-verify",
		...base,
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				upgrade: true,
				frozen
			})
		]
	},
	{
		name: "dev-defaults",
		...base,
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				// written at run time, so each config suite keeps its own
				lockfileLocation: path.join(testPath, "dev-defaults.webpack.lock"),
				cacheLocation: path.join(__dirname, "dev-defaults.webpack.lock.data"),
				upgrade: false,
				frozen: false
			})
		]
	},
	{
		name: "prod-defaults",
		...base,
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				upgrade: false,
				frozen
			})
		]
	},
	{
		name: "no-cache",
		...base,
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				cacheLocation: false,
				frozen
			})
		]
	},
	{
		name: "errors",
		...base,
		entry: "./index.errors.js",
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				upgrade: true,
				frozen: true
			})
		]
	},
	{
		name: "security-userinfo-bypass",
		...base,
		entry: "./index.security.js",
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				upgrade: false,
				frozen: false
			})
		]
	},
	{
		name: "encoding-case",
		...base,
		entry: "./index.encoding-case.js",
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				lockfileLocation: path.join(testPath, "encoding-case.webpack.lock"),
				cacheLocation: false,
				upgrade: false,
				frozen: false
			})
		]
	},
	{
		name: "decompression-errors",
		...base,
		entry: "./index.decompression-errors.js",
		plugins: [
			new HttpUriPlugin({
				allowedUris,
				lockfileLocation: path.join(
					testPath,
					"decompression-errors.webpack.lock"
				),
				cacheLocation: false,
				upgrade: false,
				frozen: false
			})
		]
	}
];
