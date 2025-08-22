"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		entry: "./extract1",
		devtool: "source-map",
		module: {
			rules: [
				{
					extractSourceMap: {
						errorSeverity: "warn"
					}
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
