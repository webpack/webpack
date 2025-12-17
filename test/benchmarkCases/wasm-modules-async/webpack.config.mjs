/** @type {import("../../../types.d.ts").Configuration} */
export default {
	entry: "./index",
	experiments: {
		asyncWebAssembly: true
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	}
};
