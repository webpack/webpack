var path = require("path");
var fs = require("fs");
var Benchmark = require("benchmark");
var webpack = require("../");
var fixtures = path.join(__dirname, "fixtures");
var outputPath = path.join(__dirname, "js");

var benchmarkOptions = {
	defer: true,
	onCycle: function() {
		process.stderr.write(".");
	},
	minSamples: 10
};

function runTimes(compiler, times, deferred) {
	fs.writeFileSync(path.join(fixtures, "0.js"), "module.exports = " + Math.random(), "utf-8");
	compiler.run(function(err, stats) {
		if(err) throw err;
		if(times === 1)
			deferred.resolve();
		else
			runTimes(compiler, times - 1, deferred);
	});
}

var tests = {
	"normal build": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
		webpack({
			context: fixtures,
			entry: "./" + size + ".js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			}
		}, function(err, stats) {
			if(err) throw err;
			deferred.resolve();
		});
	}],
	"eval dev build": [[0, 1, 2, 5, 10, 15], function(size, deferred) {
		webpack({
			context: fixtures,
			entry: "./" + size + ".big.js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			},
			devtool: "eval"
		}, function(err, stats) {
			if(err) throw err;
			deferred.resolve();
		})
	}],
	"sourcemap build": [[0, 1, 2, 5, 10, 15], function(size, deferred) {
		webpack({
			context: fixtures,
			entry: "./" + size + ".big.js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			},
			devtool: "source-map"
		}, function(err, stats) {
			if(err) throw err;
			deferred.resolve();
		})
	}],
	"cheap sourcemap build": [[0, 1, 2, 5, 10, 15], function(size, deferred) {
		webpack({
			context: fixtures,
			entry: "./" + size + ".big.js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			},
			devtool: "cheap-source-map"
		}, function(err, stats) {
			if(err) throw err;
			deferred.resolve();
		})
	}],
	"build w/ chunks": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
		webpack({
			context: fixtures,
			entry: "./" + size + ".async.js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			}
		}, function(err, stats) {
			if(err) throw err;
			deferred.resolve();
		})
	}],
	"build w/ chunks": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
		webpack({
			context: fixtures,
			entry: "./" + size + ".async.js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			}
		}, function(err, stats) {
			if(err) throw err;
			deferred.resolve();
		})
	}],
	"incremental": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
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
	}],
	"incremental cheap sourcemap": [[1, 2, 3, 4, 5, 6], function(size, deferred) {
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
	}],
	"incremental2": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
		var compiler = webpack({
			cache: true,
			context: fixtures,
			entry: "./" + size + ".js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			}
		});
		runTimes(compiler, 3, deferred);
	}],
	"incremental4": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
		var compiler = webpack({
			cache: true,
			context: fixtures,
			entry: "./" + size + ".js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			}
		});
		runTimes(compiler, 5, deferred);
	}],
	"incremental16": [[0, 1, 5, 10, 50, 100, 200], function(size, deferred) {
		var compiler = webpack({
			cache: true,
			context: fixtures,
			entry: "./" + size + ".js",
			output: {
				path: outputPath,
				filename: "bundle.js"
			}
		});
		runTimes(compiler, 17, deferred);
	}],
};

var suite = new Benchmark.Suite;

Object.keys(tests).filter(function(name) {
	if(process.argv.length > 2)
		return name.indexOf(process.argv[2]) >= 0;
	return true;
}).forEach(function(name) {
	var test = tests[name];
	test[0].forEach(function(size) {
		suite.add(name + " " + size, function(deferred) {
			test[1](size, deferred);
		}, benchmarkOptions);
	});
});

suite.on("cycle", function(event) {
	process.stderr.write("\n");
	var b = event.target;
	console.log(b.name + "\t" + Math.floor(1000 * (b.stats.mean - b.stats.moe)) + "\t" + Math.floor(1000 * (b.stats.mean + b.stats.moe)));
});

suite.run({ async: true });
