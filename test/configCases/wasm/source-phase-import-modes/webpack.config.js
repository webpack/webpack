"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");

/** @type {import("../../../../").Configuration[]} */
const configurations = [
	{ target: "node", output: { module: false } },
	{ target: "node", output: { module: true } },
	{ target: "async-node", output: { module: false } },
	{ target: "universal", output: { module: true } }
];

// The web target's streaming Wasm APIs require a native Response in the harness.
if (supportsResponse()) {
	configurations.push({ target: "web", output: { module: false } });
}

module.exports = configurations.map((options) => ({
	...options,
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: { asyncWebAssembly: true, sourceImport: true }
}));
