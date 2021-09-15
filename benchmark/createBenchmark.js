const webpack = require("../");
const path = require("path");

webpack(
	{
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
		optimization: {
			moduleIds: "named"
		},
		plugins: [
			new webpack.IgnorePlugin(/^(fsevents|terser)$/),
			new webpack.NormalModuleReplacementPlugin(
				/^.\/loadLoader$/,
				path.resolve(__dirname, "./createBenchmark/loadLoader")
			)
		]
	},
	(err, stats) => {
		console.log(stats.toString());
	}
);
