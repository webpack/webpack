"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	// `es5` has neither `async`/`await` nor generators, so async modules can be
	// lowered to neither and the warning must still fire.
	target: ["node", "es5"],
	output: {
		environment: {
			dynamicImport: true,
			asyncFunction: false
		},
		importFunctionName: "((name) => Promise.resolve({ request: name }))"
	},
	externals: {
		"external-module": ["module module.js", "request"],
		"external-import": ["import import.js", "request"],
		"external-promise": "promise Promise.resolve('promise.js')",
		"external-script": "script scriptGlobal@https://example.com/script.js"
	},
	experiments: {
		asyncWebAssembly: true
	}
};
