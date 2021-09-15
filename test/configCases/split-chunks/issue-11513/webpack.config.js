/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index",
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
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				test: {
					name: "test",
					minChunks: 2,
					minSize: {
						javascript: 100,
						webassembly: 100
					}
				}
			}
		}
	},
	experiments: {
		asyncWebAssembly: true
	}
};
