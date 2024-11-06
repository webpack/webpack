/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.less$/,
				use: "less-loader",
				type: "css/auto"
			}
		]
	},
	experiments: {
		css: true
	}
};
