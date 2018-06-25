"use strict";

// Have to test [hash] and [chunkhash] separately to avoid
// "Cannot use [chunkhash] or [contenthash] for chunk in 'bundle1.[hash].[hash:16].[chunkhash].[chunkhash:16].[name].[id].[query].js' (use [hash] instead)"
var testAllButHash = "[chunkhash].[chunkhash:16].[name].[id].[query]";
var testHash = "[hash].[hash:16]";

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
