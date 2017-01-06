var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var checkArrayExpectation = require("./checkArrayExpectation");

var Stats = require("../lib/Stats");
var webpack = require("../lib/webpack");

function copyDiff(src, dest) {
	if(!fs.existsSync(dest))
		fs.mkdirSync(dest);
	var files = fs.readdirSync(src);
	files.forEach(function(filename) {
		var srcFile = path.join(src, filename);
		var destFile = path.join(dest, filename);
		var directory = fs.statSync(srcFile).isDirectory();
		if(directory) {
			copyDiff(srcFile, destFile);
		} else {
			fs.writeFileSync(destFile, fs.readFileSync(srcFile));
		}
	});
}

function remove(src) {
	if(!fs.existsSync(src))
		return;
	var files = fs.readdirSync(src);
	files.forEach(function(filename) {
		var srcFile = path.join(src, filename);
		var directory = fs.statSync(srcFile).isDirectory();
		if(directory) {
			remove(srcFile);
		} else {
			fs.unlinkSync(srcFile);
		}
	});
}

describe("WatchTestCases", function() {
	var casesPath = path.join(__dirname, "watchCases");
	var categories = fs.readdirSync(casesPath);

	categories = categories.map(function(cat) {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			}).sort()
		};
	});
	before(function() {
		var dest = path.join(__dirname, "js");
		if(!fs.existsSync(dest))
			fs.mkdirSync(dest);
		dest = path.join(__dirname, "js", "watch-src");
		if(!fs.existsSync(dest))
			fs.mkdirSync(dest);
	});
	categories.forEach(function(category) {
		before(function() {
			var dest = path.join(__dirname, "js", "watch-src", category.name);
			if(!fs.existsSync(dest))
				fs.mkdirSync(dest);
		})
		describe(category.name, function() {
			category.tests.forEach(function(testName) {
				describe(testName, function() {
					var tempDirectory = path.join(__dirname, "js", "watch-src", category.name, testName);
					var testDirectory = path.join(casesPath, category.name, testName);
					var runs = fs.readdirSync(testDirectory).sort().filter(function(name) {
						return fs.statSync(path.join(testDirectory, name)).isDirectory();
					}).map(function(name) {
						return {
							name: name,
							suite: describe(name, function() {})
						}
					});
					before(function() {
						remove(tempDirectory);
					});
					it("should compile", function(done) {
						this.timeout(30000);
						var outputDirectory = path.join(__dirname, "js", "watch", category.name, testName);

						var options = {};
						var configPath = path.join(testDirectory, "webpack.config.js");
						if(fs.existsSync(configPath))
							options = require(configPath);
						var applyConfig = function(options) {
							if(!options.context) options.context = tempDirectory;
							if(!options.entry) options.entry = "./index.js";
							if(!options.target) options.target = "async-node";
							if(!options.output) options.output = {};
							if(!options.output.path) options.output.path = outputDirectory;
							if(typeof options.output.pathinfo === "undefined") options.output.pathinfo = true;
							if(!options.output.filename) options.output.filename = "bundle.js";
						}
						if(Array.isArray(options)) {
							options.forEach(applyConfig)
						} else {
							applyConfig(options)
						}

						var state = {};
						var runIdx = 0;
						var run = runs[runIdx];
						var lastHash = "";
						copyDiff(path.join(testDirectory, run.name), tempDirectory);

						var compiler = webpack(options);
						var watching = compiler.watch({}, function(err, stats) {
							if(stats.hash === lastHash)
								return;
							lastHash = stats.hash;
							if(run.done)
								return done(new Error("Compilation changed but no change was issued " + lastHash + " != " + stats.hash + " (run " + runIdx + ")"));
							run.done = true;
							if(err) return done(err);
							var statOptions = Stats.presetToOptions("verbose");
							statOptions.colors = false;
							fs.writeFileSync(path.join(outputDirectory, "stats.txt"), stats.toString(statOptions), "utf-8");
							var jsonStats = stats.toJson({
								errorDetails: true
							});
							if(checkArrayExpectation(testDirectory, jsonStats, "error", "Error", done)) return;
							if(checkArrayExpectation(testDirectory, jsonStats, "warning", "Warning", done)) return;
							var exportedTests = 0;

							function _it(title, fn) {
								var test = new Test(title, fn);
								run.suite.addTest(test);
								exportedTests++;
								return test;
							}

							function _require(currentDirectory, module) {
								if(Array.isArray(module) || /^\.\.?\//.test(module)) {
									var fn;
									var content;
									if(Array.isArray(module)) {
										var p = path.join(currentDirectory, module[0]);
										content = module.map(function(p) {
											var p = path.join(currentDirectory, p);
											return fs.readFileSync(p, "utf-8");
										}).join("\n");
									} else {
										var p = path.join(currentDirectory, module);
										content = fs.readFileSync(p, "utf-8");
									}
									fn = vm.runInThisContext("(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE) {" + content + "\n})", p);
									var module = {
										exports: {}
									};
									fn.call(module.exports, _require.bind(null, path.dirname(p)), module, module.exports, path.dirname(p), p, _it, run.name, jsonStats, state);
									return module.exports;
								} else if(testConfig.modules && module in testConfig.modules) {
									return testConfig.modules[module];
								} else return require(module);
							}

							var testConfig = {};
							try {
								// try to load a test file
								testConfig = require(path.join(testDirectory, "test.config.js"));
							} catch(e) {}

							if(testConfig.noTests) return process.nextTick(done);
							_require(outputDirectory, "./bundle.js");

							if(exportedTests < 1) return done(new Error("No tests exported by test case"));
							runIdx++;
							if(runIdx < runs.length) {
								run = runs[runIdx];
								setTimeout(function() {
									copyDiff(path.join(testDirectory, run.name), tempDirectory);
								}, 50);
							} else {
								watching.close();
								process.nextTick(done);
							}
						});
					});
				});
			});
		});
	});
});
