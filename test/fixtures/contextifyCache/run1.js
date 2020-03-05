const path = require("path");
const webpack = require("../../..");

process.exitCode = 1;

webpack(
	{
		mode: "development",
		context: __dirname,
		devtool: false,
		entry: "./a",
		output: {
			path: path.resolve(__dirname, "../../js/contextifyOutput/" + process.argv[2]),
			libraryTarget: "commonjs2"
		},
		infrastructureLogging: {
			// Optional: print more verbose logging about caching
			level: "verbose"
		},
		cache: {
			type: "filesystem",
			portable: true,
			cacheDirectory: path.resolve(__dirname, ".cache"),
			buildDependencies: {
				config: [
					path.resolve(__dirname, "../../../node_modules/.yarn-integrity")
				]
			},
			managedPaths: [path.resolve(__dirname, "../../../node_modules")]
		},
		resolve: {
			alias: {
				'~': __dirname,
			}
		}
	},
	(err, stats) => {
		if (err) {
			return console.log(err);
		}
		if (stats.hasErrors()) {
			return console.log(stats.toString({ all: false, errors: true }));
		}
		process.exitCode = 0;
		console.log("OK");
	}
);
