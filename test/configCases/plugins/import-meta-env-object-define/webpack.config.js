"use strict";

const { DefinePlugin, EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		publicPath: "/assets/"
	},
	plugins: [
		new DefinePlugin({
			"import.meta.env": {
				A: JSON.stringify("a"),
				RUNTIME: DefinePlugin.runtimeValue(() => JSON.stringify("env-rv"), {
					version: "1"
				}),
				NESTED: {
					X: JSON.stringify("x")
				},
				LIST: [JSON.stringify("l1"), JSON.stringify("l2")]
			},
			"import.meta.env.B": JSON.stringify("b"),
			"import.meta.env.__proto__": JSON.stringify("proto-value"),
			"import.meta.env.PUBLIC_PATH": "__webpack_require__.p"
		}),
		new EnvironmentPlugin({
			ENV_C: "c"
		})
	]
};
