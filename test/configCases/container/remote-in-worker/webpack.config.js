"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "remote",
		target: "webworker",
		entry: {},
		output: {
			filename: "remote-[name].js",
			chunkFilename: "remote-[id].js",
			publicPath: "https://test.cases/path/",
			uniqueName: "remote"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "remote",
				filename: "remote-container.js",
				library: { type: "self", name: "remote" },
				exposes: ["./module"]
			})
		]
	},
	{
		name: "host",
		target: "web",
		output: {
			filename: "[name].js",
			uniqueName: "host",
			trustedTypes: true
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "host",
				remoteType: "script",
				remotes: {
					remote: "remote@https://test.cases/path/remote-container.js",
					missing: "missing@https://test.cases/path/missing-container.js"
				}
			})
		]
	}
];
