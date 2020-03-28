const path = require("path");
const fs = require("fs");
const Benchmark = require("benchmark");
const webpack = require("../");
const fixtures = path.join(__dirname, "fixtures");
const outputPath = path.join(__dirname, "js");

const benchmarkOptions = {
	defer: true,
	onCycle: function () {
		process.stderr.write(".");
	},
	minSamples: 10
};

function runTimes(compiler, times, deferred) {
	fs.writeFileSync(
		path.join(fixtures, "0.js"),
		"module.exports = " + Math.random(),
		"utf-8"
	);
	compiler.run(err => {
		if (err) throw err;
		if (times === 1) deferred.resolve();
		else runTimes(compiler, times - 1, deferred);
	});
}

const tests = {
	"normal build": [
		[0, 1, 5, 10, 50, 100, 200],
		(size, deferred) => {
			webpack(
				{
					context: fixtures,
					entry: `./${size}.js`,
					output: {
						path: outputPath,
						filename: "bundle.js"
					}
				},
				err => {
					if (err) throw err;
					deferred.resolve();
				}
			);
		}
	],
	"eval dev build": [
		[0, 1, 2, 5, 10, 15],
		(size, deferred) => {
			webpack(
				{
					context: fixtures,
					entry: `./${size}.big.js`,
					output: {
						path: outputPath,
						filename: "bundle.js"
					},
					devtool: "eval"
				},
				err => {
					if (err) throw err;
					deferred.resolve();
				}
			);
		}
	],
	"sourcemap build": [
		[0, 1, 2, 5, 10, 15],
		(size, deferred) => {
			webpack(
				{
					context: fixtures,
					entry: `./${size}.big.js`,
					output: {
						path: outputPath,
						filename: "bundle.js"
					},
					devtool: "source-map"
				},
				err => {
					if (err) throw err;
					deferred.resolve();
				}
			);
		}
	],
	"cheap sourcemap build": [
		[0, 1, 2, 5, 10, 15],
		(size, deferred) => {
			webpack(
				{
					context: fixtures,
					entry: `./${size}.big.js`,
					output: {
						path: outputPath,
						filename: "bundle.js"
					},
					devtool: "cheap-source-map"
				},
				err => {
					if (err) throw err;
					deferred.resolve();
				}
			);
		}
	],
	"build w/ chunks": [
		[0, 1, 5, 10, 50, 100, 200],
		(size, deferred) => {
			webpack(
				{
					context: fixtures,
					entry: `./${size}.async.js`,
					output: {
						path: outputPath,
						filename: "bundle.js"
					}
				},
				err => {
					if (err) throw err;
					deferred.resolve();
				}
			);
		}
	],
	incremental: [
		[0, 1, 5, 10, 50, 100, 200],
		(size, deferred) => {
			var compiler = webpack({
				cache: true,
				context: fixtures,
				entry: "./" + size + ".js",
				output: {
					path: outputPath,
					filename: "bundle.js"
				}
			});
			runTimes(compiler, 2, deferred);
		}
	],
	"incremental cheap sourcemap": [
		[1, 2, 3, 4, 5, 6],
		(size, deferred) => {
			var compiler = webpack({
				cache: true,
				context: fixtures,
				entry: "./200.js",
				output: {
					path: outputPath,
					filename: "bundle.js"
				},
				devtool: "cheap-source-map"
			});
			runTimes(compiler, size, deferred);
		}
	],
	incremental2: [
		[0, 1, 5, 10, 50, 100, 200],
		(size, deferred) => {
			var compiler = webpack({
				cache: true,
				context: fixtures,
				entry: `./${size}.js`,
				output: {
					path: outputPath,
					filename: "bundle.js"
				}
			});
			runTimes(compiler, 3, deferred);
		}
	],
	incremental4: [
		[0, 1, 5, 10, 50, 100, 200],
		(size, deferred) => {
			var compiler = webpack({
				cache: true,
				context: fixtures,
				entry: `./${size}.js`,
				output: {
					path: outputPath,
					filename: "bundle.js"
				}
			});
			runTimes(compiler, 5, deferred);
		}
	],
	incremental16: [
		[0, 1, 5, 10, 50, 100, 200],
		(size, deferred) => {
			var compiler = webpack({
				cache: true,
				context: fixtures,
				entry: `./${size}.js`,
				output: {
					path: outputPath,
					filename: "bundle.js"
				}
			});
			runTimes(compiler, 17, deferred);
		}
	]
};

const suite = new Benchmark.Suite();

Object.keys(tests)
	.filter(name =>
		process.argv.length > 2 ? name.includes(process.argv[2]) : true
	)
	.forEach(name => {
		const test = tests[name];
		test[0].forEach(size => {
			suite.add(
				`${name} ${size}`,
				deferred => {
					test[1](size, deferred);
				},
				benchmarkOptions
			);
		});
	});

suite.on("cycle", event => {
	process.stderr.write("\n");
	const b = event.target;
	console.log(
		b.name +
			"\t" +
			Math.floor(1000 * (b.stats.mean - b.stats.moe)) +
			"\t" +
			Math.floor(1000 * (b.stats.mean + b.stats.moe))
	);
});

suite.run({
	async: true
});
