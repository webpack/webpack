const path = require("path");
const webpack = require("../../..");
// eslint-disable-next-line node/no-missing-require
const value = require("../../js/buildDepsInput/config-dependency");

require("dep#with#hash/#.js");

process.exitCode = 1;

const options = JSON.parse(process.argv[3]);

const esm = +process.versions.modules >= 83;

if (esm) {
	require("require-dependency-with-exports");
	import("./esm.mjs").then(module => {
		run(module);
	});
} else {
	run({ default: 1, asyncDep: 1 });
}

function run({ default: value2, asyncDep: value3 }) {
	const compiler = webpack(
		{
			mode: "development",
			context: path.resolve(__dirname, "../../js/buildDepsInput"),
			entry: path.resolve(__dirname, "./index"),
			output: {
				path: path.resolve(__dirname, "../../js/buildDeps/" + process.argv[2]),
				libraryTarget: "commonjs2"
			},
			plugins: [
				new webpack.DefinePlugin({
					VALUE: webpack.DefinePlugin.runtimeValue(
						() => JSON.stringify(value),
						{ version: "no" }
					),
					VALUE2: webpack.DefinePlugin.runtimeValue(
						() => JSON.stringify(value2),
						{ version: "no" }
					),
					VALUE3: webpack.DefinePlugin.runtimeValue(
						() => JSON.stringify(value3),
						{ version: "no" }
					),
					VALUE_UNCACHEABLE: webpack.DefinePlugin.runtimeValue(
						() => JSON.stringify(value),
						true
					),
					DEFINED_VALUE: JSON.stringify(options.definedValue || "value")
				})
			],
			infrastructureLogging: {
				level: "verbose",
				debug: /PackFile/
			},
			cache: {
				type: "filesystem",
				cacheDirectory: path.resolve(__dirname, "../../js/buildDepsCache"),
				buildDependencies: {
					defaultWebpack: [],
					config: [
						__filename,
						path.resolve(__dirname, "../../../node_modules/.yarn-integrity")
					].concat(esm ? ["../../fixtures/buildDependencies/esm.mjs"] : []),
					invalid: options.invalidBuildDepdencies
						? ["should-fail-resolving"]
						: [],
					optionalDepsTest: [
						path.resolve(__dirname, "node_modules/dependency-with-optional") +
							"/"
					]
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
				console.log(stats.toString());
				process.exitCode = 0;
				console.log("OK");
			}
		}
	);
}
