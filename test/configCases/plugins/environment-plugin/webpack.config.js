"use strict";

const EnvironmentPlugin = require("../../../../").EnvironmentPlugin;

process.env.AAA = "aaa";
process.env.BBB = "bbb";
process.env.CCC = "ccc";
process.env.EEE = "eee";
process.env.FFF = "fff";
process.env.GGG = "ggg";
process.env.III = "";
process.env.MY_ENV = "env1";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "aaa",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [new EnvironmentPlugin("AAA")]
	},
	{
		name: "bbbccc",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [new EnvironmentPlugin("BBB", "CCC")]
	},
	{
		name: "ddd",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [new EnvironmentPlugin("DDD")]
	},
	{
		name: "eeefff",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [new EnvironmentPlugin(["EEE", "FFF"])]
	},
	{
		name: "ggghhh",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [
			new EnvironmentPlugin({
				GGG: "ggg-default",
				HHH: "hhh"
			})
		]
	},
	{
		name: "iii",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [new EnvironmentPlugin("III")]
	},
	{
		name: "import-meta-env",
		entry: "./support-import-meta-env",
		plugins: [new EnvironmentPlugin("MY_ENV")]
	}
];
