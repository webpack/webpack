"use strict";

const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");
const ServerPlugin = require("./server");

const serverPlugin = new ServerPlugin(9990);
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
			}
		]
	}
};

const frozen = true;
const allowedUris = [
	"http://localhost:9990/",
	"https://raw.githubusercontent.com/"
];

module.exports = [
	{
		name: "frozen-verify",
		...base,
		plugins: [
			serverPlugin,
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
			serverPlugin,
			new HttpUriPlugin({
				allowedUris,
				upgrade: false,
				frozen: false
			})
		]
	},
	{
		name: "prod-defaults",
		...base,
		plugins: [
			serverPlugin,
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
			serverPlugin,
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
			serverPlugin,
			new HttpUriPlugin({
				allowedUris,
				upgrade: true,
				frozen: true
			})
		]
	}
];
