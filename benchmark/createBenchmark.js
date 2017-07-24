const webpack = require("webpack");
const path = require("path");

webpack({
	context: __dirname,
	entry: "./createBenchmark/entry.js",
	output: {
		path: __dirname,
		filename: "benchmark-bundle.js"
	},
	target: "node",
	node: {
		__dirname: false
	},
	plugins: [
		new webpack.NamedModulesPlugin(),
		new webpack.IgnorePlugin(/^(fsevents|uglify-js)$/),
		new webpack.NormalModuleReplacementPlugin(/^.\/loadLoader$/, path.resolve(__dirname, "./createBenchmark/loadLoader"))
	]
}, function(err, stats) {
	console.log(stats.toString());
});
