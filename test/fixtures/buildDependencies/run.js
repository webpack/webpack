const path = require("path");
const webpack = require("../../..");

process.exitCode = 1;

webpack(
	{
		mode: "development",
		context: __dirname,
		entry: "./index",
		output: {
			path: path.resolve(__dirname, "../../js/buildDeps/" + process.argv[2]),
			libraryTarget: "commonjs2"
		},
		cache: {
			type: "filesystem",
			cacheDirectory: path.resolve(__dirname, "../../js/buildDepsCache"),
			buildDependencies: {
				config: [__filename]
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
