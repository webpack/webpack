const {
	experiments: {
		schemes: { HttpsUriPlugin }
	}
} = require("../../../../");

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
