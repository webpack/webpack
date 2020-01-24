"use strict";

const EnvironmentPlugin = require("../../../../").EnvironmentPlugin;

process.env.AAA = "aaa";
process.env.BBB = "bbb";
process.env.CCC = "ccc";
process.env.EEE = "eee";
process.env.FFF = "fff";
process.env.GGG = "ggg";
process.env.III = "";
process.env.LLL = "lll";

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
		name: "jjj",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [new EnvironmentPlugin("JJJ", { errorLevel: "error" })]
	},
	{
		name: "lllmmm",
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false
		},
		plugins: [
			new EnvironmentPlugin(
				{
					LLL: "lll-default",
					MMM: "mmm"
				},
				{ errorLevel: "error" }
			)
		]
	}
];
