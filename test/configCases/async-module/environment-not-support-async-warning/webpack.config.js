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
		"external-promise": "promise Promise.resolve('promise.js')"
	},
	experiments: {
		asyncWebAssembly: true
	}
};
