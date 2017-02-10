var path = require("path");
module.exports = {
	entry: {
		bundle: ["./a", "./b"]
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js",
		exportAllModules: true
	}
}