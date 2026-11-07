"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: () => ({
		bundle: "./index.js",
		...(currentWatchStep.step === "3"
			? { fourth: "./shared.js", fifth: "./shared.js" }
			: { second: "./shared.js", third: "./shared.js" }),
		...(currentWatchStep.step === "2" ? { fourth: "./shared.js" } : {})
	}),
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /shared\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.finishMake.tap("SharedEntryConnections", (compilation) => {
				let rootConnections = 0;
				for (const module of compilation.modules) {
					for (const connection of compilation.moduleGraph.getIncomingConnections(
						module
					)) {
						if (!connection.originModule) rootConnections++;
					}
				}
				expect(rootConnections).toBe(compilation.entries.size);
			});
		}
	]
};
