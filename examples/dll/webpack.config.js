var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: {
		alpha: ["./alpha", "./a", "module"],
		beta: ["./beta", "./b"]
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "MyDll.[name].js",
		library: "[name]_[hash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "js", "[name]-manifest.json"),
			name: "[name]_[hash]"
		})
	]
};
