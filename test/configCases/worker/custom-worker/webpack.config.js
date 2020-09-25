module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worker: ["default from web-worker", "..."]
				}
			}
		]
	}
};
