"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "remote",
		target: "webworker",
		entry: {},
		experiments: { outputModule: true },
		output: {
			module: true,
			filename: "remote-[name].mjs",
			chunkFilename: "remote-[id].mjs",
			uniqueName: "remote"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "remote",
				filename: "remote-container.mjs",
				library: { type: "module" },
				exposes: ["./module"]
			})
		]
	},
	{
		name: "host",
		target: "web",
		experiments: { outputModule: true },
		output: {
			module: true,
			filename: "[name].mjs",
			chunkFilename: "[id].mjs",
			uniqueName: "host"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "host",
				remoteType: "module",
				remotes: {
					remote: "./remote-container.mjs",
					scripted: "script scripted@https://test.cases/path/scripted.js"
				}
			})
		]
	}
];
