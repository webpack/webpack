module.exports = {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/experimental"
			}
		]
	}
};
