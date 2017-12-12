var path = require("path");

module.exports = {
	entry: {
		main: "./example"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].chunkhash.js",
		chunkFilename: "[chunkhash].js"
	},
};
