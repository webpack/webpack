var path = require("path");
var webpack = require("../../");

module.exports = [
	"cheap-eval-source-map",
	"cheap-module-eval-source-map",
	"cheap-module-source-map",
	"cheap-source-map",
	"eval",
	"eval-source-map",
	"hidden-source-map",
	"inline-source-map",
	"nosources-source-map",
	"source-map",
].map(devtool => ({
	entry: {
		bundle: "coffee-loader!./example.coffee",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: `./[name]-${devtool}.js`,
	},
	devtool,
	plugins: [
		new webpack.optimize.CommonsChunkPlugin(["manifest"]),
	],
}));
