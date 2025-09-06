"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		entry: "./extract1",
		devtool: "source-map",
		module: {
			rules: [
				{
					extractSourceMap: true
				}
			]
		}
	},
	{
		target: "node",
		entry: "./extract2",
		devtool: "source-map",
		module: {
			rules: [
				{
					extractSourceMap: true
				}
			]
		}
	},
	{
		target: "node",
		entry: "./extract3",
		devtool: "source-map",
		module: {
			rules: [
				{
					extractSourceMap: true
				}
			]
		}
	},
	{
		target: "node",
		entry: "./extract4",
		devtool: "source-map",
		experiments: {
			buildHttp: {
				allowedUris: [() => true],
				lockfileLocation: path.resolve(__dirname, "./lock-files/lock.json"),
				cacheLocation: path.resolve(__dirname, "./lock-files/test"),
				frozen: false
			}
		},
		module: {
			rules: [
				{
					extractSourceMap: true
				}
			]
		}
	},
	{
		entry: "./remove-comment",
		devtool: "source-map",
		module: {
			rules: [
				{
					extractSourceMap: true
				}
			]
		}
	}
];
