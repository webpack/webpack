const path = require("path");
const webpack = require("../../..");
const CatchCacheHitPlugin = require("./CatchCacheHitPlugin");

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
		},
		plugins: [
			new CatchCacheHitPlugin(
				new Map(
					[
						[/^resolve\/normal.*\/a(\.js)?$/, 'resolve-a.js'],
						[/^resolve\/normal.*\/b(\.js)?$/, 'resolve-b.js'],
						[/^!module!.*\/a(\.js)?$/, 'a.js'],
						[/^!module!.*\/b(\.js)?$/, 'b.js'],
					]
				)
			)
		]
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
