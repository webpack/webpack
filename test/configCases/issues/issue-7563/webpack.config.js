"use strict";

// [fullhash] and [chunkhash] must be used separately
const testAllButHash = "[chunkhash].[chunkhash:16].[name].[id].[query]";
const testHash = "[fullhash].[fullhash:16]";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "webworker-all",
		target: "webworker",
		output: {
			filename: "bundle.webworker-all." + testAllButHash + ".js"
		}
	},
	{
		name: "webworker-hash",
		target: "webworker",
		output: {
			filename: "bundle.webworker-hash." + testHash + ".js"
		}
	},
	{
		name: "node-all",
		target: "node",
		output: {
			filename: "bundle.node-all." + testAllButHash + ".js"
		}
	},
	{
		name: "node",
		target: "node",
		output: {
			filename: "bundle.node-hash." + testHash + ".js"
		}
	},
	{
		name: "async-node-all",
		target: "async-node",
		output: {
			filename: "bundle.async-node-all." + testAllButHash + ".js"
		}
	},
	{
		name: "async-node-hash",
		target: "async-node",
		output: {
			filename: "bundle.async-node-hash." + testHash + ".js"
		}
	},
	{
		name: "web-all",
		target: "web",
		output: {
			filename: "bundle.web-all." + testAllButHash + ".js"
		}
	},
	{
		name: "web-hash",
		target: "web",
		output: {
			filename: "bundle.web-hash." + testHash + ".js"
		}
	}
];
