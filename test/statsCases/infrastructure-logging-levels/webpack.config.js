"use strict";

const InfrastructureLogPlugin = require("./InfrastructureLogPlugin");

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		output: { filename: "verbose.js" },
		stats: "none",
		infrastructureLogging: { level: "verbose" },
		plugins: [new InfrastructureLogPlugin("Verbose")]
	},
	{
		mode: "production",
		entry: "./index",
		output: { filename: "debug.js" },
		stats: "none",
		infrastructureLogging: { level: "error", debug: /Debugged/ },
		plugins: [new InfrastructureLogPlugin("Debugged")]
	},
	{
		mode: "production",
		entry: "./index",
		output: { filename: "none.js" },
		stats: "none",
		infrastructureLogging: { level: "none" },
		plugins: [new InfrastructureLogPlugin("Silenced")]
	}
];
