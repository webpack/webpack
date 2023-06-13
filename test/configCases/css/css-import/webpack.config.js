/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	resolve: {
		byDependency: {
			"css-import": {
				conditionNames: ["custom-name", "..."],
				extensions: [".mycss", "..."]
			}
		}
	},
	module: {
		rules: [
			{
				test: /\.mycss$/,
				loader: "./string-loader",
				type: "css/global"
			},
			{
				test: /\.less$/,
				loader: "less-loader",
				type: "css/global"
			}
		]
	}
};
