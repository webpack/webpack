const { HttpsUriPlugin } = require("../../../../").experiments.schemes;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.md$/,
				loader: "./loaders/md-loader"
			}
		]
	},
	plugins: [new HttpsUriPlugin()]
};
