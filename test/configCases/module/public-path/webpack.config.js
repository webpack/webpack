"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "auto"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "auto",
			chunkFilename: "async/[id].bundle1.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "auto",
			filename: "initial/bundle2.mjs",
			chunkFilename: "async/[id].bundle2.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle3"),
			module: true,
			publicPath: "auto",
			filename: "initial/bundle3.mjs",
			chunkFilename: "async/[id].bundle3.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: ""
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "",
			chunkFilename: "async/[id].bundle5.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "",
			filename: "initial/bundle6.mjs",
			chunkFilename: "async/[id].bundle6.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle7"),
			module: true,
			publicPath: "",
			filename: "initial/bundle7.mjs",
			chunkFilename: "async/[id].bundle7.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "https://example.com/public/path/"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "https://example.com/public/path/",
			chunkFilename: "async/[id].bundle9.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "https://example.com/public/path/",
			filename: "initial/bundle10.mjs",
			chunkFilename: "async/[id].bundle10.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle11"),
			module: true,
			publicPath: "https://example.com/public/path/",
			filename: "initial/bundle11.mjs",
			chunkFilename: "async/[id].bundle11.mjs"
		}
	},
	{
		devtool: false,
		target: "node",
		output: {
			path: path.resolve(testPath, "./bundle12"),
			module: true,
			publicPath: "auto",
			filename: "initial/bundle12.mjs",
			chunkFilename: "async/[id].bundle12.mjs"
		}
	},
	{
		devtool: false,
		target: ["node", "web"],
		output: {
			path: path.resolve(testPath, "./bundle13"),
			module: true,
			publicPath: "auto",
			filename: "initial/bundle13.mjs",
			chunkFilename: "async/[id].bundle13.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle14"),
			module: true,
			filename: "js/bundle14.mjs",
			chunkFilename: "js/[id].bundle14.mjs"
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			publicPath: "https://example.com/public/path/",
			path: path.resolve(testPath, "./bundle15"),
			module: true,
			filename: "js/bundle15.mjs",
			chunkFilename: "js/[id].bundle15.mjs"
		}
	}
];
