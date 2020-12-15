const path = require("path");
const webpack = require("../../..");
// eslint-disable-next-line node/no-missing-require
const value = require("../../js/buildDepsInput/config-dependency");

process.exitCode = 1;

const options = JSON.parse(process.argv[3]);

const compiler = webpack(
	{
		mode: "development",
		context: __dirname,
		entry: "./index",
		output: {
			path: path.resolve(__dirname, "../../js/buildDeps/" + process.argv[2]),
			libraryTarget: "commonjs2"
		},
		plugins: [
			new webpack.DefinePlugin({
				VALUE: JSON.stringify(value),
				VALUE_UNCACHEABLE: webpack.DefinePlugin.runtimeValue(
					() => JSON.stringify(value),
					true
				)
			})
		],
		infrastructureLogging: {
			level: "verbose"
		},
		cache: {
			type: "filesystem",
			cacheDirectory: path.resolve(__dirname, "../../js/buildDepsCache"),
			buildDependencies: {
				config: [
					__filename,
					path.resolve(__dirname, "../../../node_modules/.yarn-integrity")
				],
				invalid: options.invalidBuildDepdencies ? ["should-fail-resolving"] : []
			}
		},
		snapshot: {
			managedPaths: [path.resolve(__dirname, "../../../node_modules")]
		}
	},
	(err, stats) => {
		if (err) {
			return console.log(err);
		}
		if (stats.hasErrors()) {
			return console.log(stats.toString({ all: false, errors: true }));
		}
		if (options.buildTwice) {
			compiler.run((err, stats) => {
				if (err) {
					return console.log(err);
				}
				if (stats.hasErrors()) {
					return console.log(stats.toString({ all: false, errors: true }));
				}
				process.exitCode = 0;
				console.log("OK");
			});
		} else {
			process.exitCode = 0;
			console.log("OK");
		}
	}
);
